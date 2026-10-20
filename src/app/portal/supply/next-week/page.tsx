import { getSettings } from "@/lib/portal/db";
import { sbSelect } from "@/lib/dashboard/db";
import { loadStocked } from "@/lib/ordering/stocked";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Bad, Good, Grid, Head, Say, Tile } from "@/components/portal/kit/Kit";
import { Locked } from "@/components/portal/Locked";
import { NextWeekOrders } from "@/components/portal/NextWeekOrders";
import { money } from "@/lib/portal/format";
import {
  appointmentsSynced, listWeekOrders, loadAlreadyOrdered, loadHolds, loadOrderingSettings, loadSuppliers, loadWeekInputs, type Hold,
  type PoWithLines,
} from "@/lib/ordering/db";
import { loadJobNoteSuppliers } from "@/lib/ordering/stJobNotes";
import { linesTotal, nextWeek, planWeek, thisWeek, weekLabel, type Problem, type Supplier, lineKey, problemKey } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// "Order all" sends one email after another (Mitsubishi with its form) from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "Next week · Team portal" };

export default async function NextWeekPage({ searchParams }: { searchParams: { week?: string; tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const which = searchParams?.week === "this" ? "this" : "next";
  // Sent is its own tab now, every order that's gone, by supplier.
  if (searchParams?.tab === "sent") redirect("/portal/supply/sent");
  const week = which === "this" ? thisWeek(new Date()) : nextWeek(new Date());

  // A failed read is not an empty week: dbReady carries the difference.
  let orders: PoWithLines[] = [];
  let holds: Hold[] = [];
  let suppliers: Supplier[] = [];
  let problems: Problem[] = [];
  let synced = true;
  let replyTo = "";
  let delivery: { factoryInstructions?: string; deliveryNote?: string; pickupInstructions?: string } = {};
  let dbReady = true;
  let noted: string[] = [];
  let stocked: string[] = [];
  // Every supplier order still a draft, this week and next: a card offers to make a supplier's into one bulk order.
  let allDrafts: { id: number; po: string; supplier: string; week: string }[] = [];
  const waiting: Record<"next" | "this", number | null> = { next: null, this: null };
  try {
    // Everything in one go: these used to come one after another once the
    // first lot was back, and each is a round trip to Tokyo.
    const nw = nextWeek(new Date()), tw = thisWeek(new Date());
    const supP = loadSuppliers();
    const [o, s, inputs, already, sy, settings, h, nt, st, drafts, dis] = await Promise.all([
      listWeekOrders(week), supP, loadWeekInputs(week), loadAlreadyOrdered(), appointmentsSynced(), loadOrderingSettings(), loadHolds(),
      supP.then((x) => loadJobNoteSuppliers(x)).catch(() => [] as string[]),
      loadStocked().catch(() => []),
      // What's waiting to approve in each week, for the counts on the week pills.
      sbSelect<{ id: number; po_number: string; supplier_id: string; kind: string; week_of: string }>("purchase_orders", `select=id,po_number,supplier_id,kind,week_of&status=eq.draft&week_of=in.(${tw.start},${nw.start})`).catch(() => null),
      getSettings<{ keys?: string[] }>("order-problems-dismissed").catch(() => null),
    ]);
    orders = o;
    holds = h;
    suppliers = s;
    noted = nt;
    stocked = st.map((x) => x.key);
    if (drafts) allDrafts = drafts.filter((d) => d.kind === "order").map((d) => ({ id: d.id, po: d.po_number, supplier: d.supplier_id, week: d.week_of }));
    if (drafts) { waiting.next = drafts.filter((d) => d.week_of === nw.start).length; waiting.this = drafts.filter((d) => d.week_of === tw.start).length; }
    synced = sy;
    replyTo = settings.replyTo;
    delivery = { factoryInstructions: settings.factoryInstructions, deliveryNote: settings.deliveryNote, pickupInstructions: settings.pickupInstructions };
    // Worked out live rather than stored with the drafts, so fixing a quote
    // or assigning a crew clears its line here straight away.
    // Dismissed ones stay out until what's wrong with the job changes.
    const dismissed = new Set(dis?.keys ?? []);
    problems = planWeek({ week, ...inputs, suppliers: s, alreadyOrdered: already, skip: new Set(h.map((x) => lineKey(x.job_id, x.sku_id))) }).problems
      .filter((p) => !dismissed.has(problemKey(p)));
  } catch {
    dbReady = false;
  }

  const live = orders.filter((o) => o.status !== "cancelled");
  const toApprove = live.filter((o) => o.status === "draft");
  const goods = live.filter((o) => o.kind === "order");
  const value = goods.reduce((t, o) => t + linesTotal(o.lines), 0);

  return (
    <PortalShell user={user}>
      <div className="pk" style={{ marginBottom: 14 }}>
        <Head
          title="To order"
          sub={`${which === "this" ? "This week" : "Next week"} · ${weekLabel(week)}`}
          info={[
            ["Drafted for you", "Built from the installs booked for the week, and kept up to date as bookings come in."],
            ["Nothing goes until it's approved", "No order reaches a supplier or the electrician until it's approved here."],
            ["Can't order", "A line that can't be ordered, no supplier, no model on the quote, no crew, says why, so it can be fixed in ServiceTitan."],
          ]}
        />
        <div className="pk-rev-bar nw-bar">
          {/* Each week its own pill, with what's waiting to approve in that
              week as a badge on its corner, like the counts on the top bar.
              What's been sent is the Sent tab. */}
          <nav className="nw-weeks" aria-label="Which week">
            {([["next", "Next week"], ["this", "This week"]] as const).map(([k, label]) => {
              const n = waiting[k];
              return (
                <a key={k} href={k === "this" ? "/portal/supply/next-week?week=this" : "/portal/supply/next-week"} className={`nw-week${which === k ? " on" : ""}`} aria-current={which === k ? "page" : undefined}>
                  {label}
                  {n ? <span className="nw-badge" aria-label={`${n} waiting to approve`}>{n}</span> : null}
                </a>
              );
            })}
          </nav>
        </div>
        {dbReady && (
          <>
            <Say>
              {toApprove.length ? <Bad>{toApprove.length} {toApprove.length === 1 ? "order is" : "orders are"} waiting to be approved.</Bad> : <Good>Nothing waiting to approve.</Good>}{" "}
              {problems.length > 0 ? <Bad>{problems.length} {problems.length === 1 ? "line can't" : "lines can't"} be ordered, listed below.</Bad> : null}
            </Say>
            <Grid cols={problems.length > 0 ? 4 : 3}>
              <Tile label="To approve" st={toApprove.length ? { k: "mid", w: "Waiting" } : { k: "good", w: "All done" }} fig={String(toApprove.length)} frac={live.length ? (live.length - toApprove.length) / live.length : null}
                sub={`${live.length} ${live.length === 1 ? "order" : "orders"} for the week`} />
              <Tile label="Goods" st={{ k: "none", w: "" }} fig={value ? money(value) : ""} frac={null} sub="ex GST, at pricebook cost" />
              <Tile label="Electrician" st={{ k: "none", w: "" }} fig={String(live.filter((o) => o.kind === "work_order").length)} frac={null} sub="site visits booked" href="/portal/supply/work-orders" />
              {problems.length > 0 && <Tile label="Can't order" st={{ k: "bad", w: "Fix it" }} fig={String(problems.length)} frac={null} sub="listed below, with why" />}
            </Grid>
          </>
        )}
      </div>

      <NextWeekOrders
        which={which}
        view="todo"
        dbReady={dbReady}
        appointmentsSynced={synced}
        orders={orders}
        suppliers={suppliers}
        problems={problems}
        holds={holds}
        notedSuppliers={noted}
        testTo={user.email}
        alwaysCc={replyTo}
        delivery={delivery}
        stocked={stocked}
        allDrafts={allDrafts}
      />
    </PortalShell>
  );
}
