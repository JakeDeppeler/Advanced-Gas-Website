import { getSettings } from "@/lib/portal/db";
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
import { dayLabel, linesTotal, nextWeek, planWeek, thisWeek, weekLabel, type Problem, type Supplier, lineKey, problemKey } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// "Order all" sends one email after another (Mitsubishi with its form) from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "To order · Team portal" };

/**
 * Orders › To order: this week's and next week's orders in one list, soonest
 * install first. There used to be a switch between the two weeks, which made
 * the office check both to know nothing was waiting; the week an order was
 * drafted for is the drafting's business, not the reader's.
 */
export default async function NextWeekPage({ searchParams }: { searchParams: { week?: string; tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  // Sent is its own tab now, every order that's gone, by supplier.
  if (searchParams?.tab === "sent") redirect("/portal/supply/sent");
  const tw = thisWeek(new Date()), nw = nextWeek(new Date());

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
  try {
    // Everything in one go: each is a round trip to Tokyo.
    const supP = loadSuppliers();
    const [oThis, oNext, s, inThis, inNext, already, sy, settings, h, nt, st, dis] = await Promise.all([
      listWeekOrders(tw), listWeekOrders(nw), supP, loadWeekInputs(tw), loadWeekInputs(nw), loadAlreadyOrdered(), appointmentsSynced(), loadOrderingSettings(), loadHolds(),
      supP.then((x) => loadJobNoteSuppliers(x)).catch(() => [] as string[]),
      loadStocked().catch(() => []),
      getSettings<{ keys?: string[] }>("order-problems-dismissed").catch(() => null),
    ]);
    orders = [...oThis, ...oNext];
    holds = h;
    suppliers = s;
    noted = nt;
    stocked = st.map((x) => x.key);
    allDrafts = orders.filter((d) => d.status === "draft" && d.kind === "order").map((d) => ({ id: d.id, po: d.po_number, supplier: d.supplier_id, week: d.week_of }));
    synced = sy;
    replyTo = settings.replyTo;
    delivery = { factoryInstructions: settings.factoryInstructions, deliveryNote: settings.deliveryNote, pickupInstructions: settings.pickupInstructions };
    // Worked out live rather than stored with the drafts, so fixing a quote
    // or assigning a crew clears its line here straight away.
    // Dismissed ones stay out until what's wrong with the job changes. A job
    // whose install sits in both weeks' inputs is said once.
    const dismissed = new Set(dis?.keys ?? []);
    const skip = new Set(h.map((x) => lineKey(x.job_id, x.sku_id)));
    const seen = new Set<string>();
    problems = [
      ...planWeek({ week: tw, ...inThis, suppliers: s, alreadyOrdered: already, skip }).problems,
      ...planWeek({ week: nw, ...inNext, suppliers: s, alreadyOrdered: already, skip }).problems,
    ].filter((p) => { const k = problemKey(p); if (dismissed.has(k) || seen.has(k)) return false; seen.add(k); return true; });
  } catch {
    dbReady = false;
  }

  const live = orders.filter((o) => o.status !== "cancelled");
  const waiting = live.filter((o) => o.status === "draft");
  const value = waiting.filter((o) => o.kind === "order").reduce((t, o) => t + linesTotal(o.lines), 0);
  const visits = waiting.filter((o) => o.kind === "work_order").length;
  const soonest = waiting.map((o) => o.kind === "work_order" ? o.details?.date : o.lines.map((l) => l.install_date).filter(Boolean).sort()[0]).filter((d): d is string => !!d).sort()[0];

  return (
    <PortalShell user={user}>
      <div className="pk" style={{ marginBottom: 14 }}>
        <Head
          title="To order"
          sub={`This week and next · ${weekLabel({ start: tw.start, end: nw.end })}`}
          info={[
            ["Drafted for you", "Built from the installs booked this week and next, and kept up to date as bookings come in. Next week starts drafting on Wednesday."],
            ["Nothing goes until it's sent", "No order reaches a supplier or the electrician until someone presses its Send button here."],
            ["Can't order", "A line that can't be ordered, no supplier, no model on the quote, no crew, says why, so it can be fixed in ServiceTitan."],
          ]}
        />
        {dbReady && (
          <>
            <Say>
              {waiting.length
                ? <><Bad>{waiting.length} {waiting.length === 1 ? "order is" : "orders are"} waiting to be sent</Bad>{soonest ? <>, the first for an install on {dayLabel(soonest)}</> : null}.</>
                : <Good>Nothing waiting to be sent.</Good>}{" "}
              {problems.length > 0 ? <Bad>{problems.length} {problems.length === 1 ? "line can't" : "lines can't"} be ordered yet.</Bad> : null}
            </Say>
            <Grid cols={2}>
              <Tile label="Not sent yet" st={waiting.length ? { k: "mid", w: "To send" } : { k: "good", w: "All sent" }} fig={String(waiting.length)} frac={null}
                sub={[value ? `${money(value)} of gear ex GST` : null, visits ? `${visits} electrician ${visits === 1 ? "visit" : "visits"}` : null].filter(Boolean).join(" · ") || "nothing to send"} />
              <Tile label="Can't order yet" st={problems.length ? { k: "bad", w: "Fix in ServiceTitan" } : { k: "good", w: "None" }} fig={String(problems.length)} frac={null}
                sub={problems.length ? "listed below, each with why" : "every booked install can be ordered"} />
            </Grid>
          </>
        )}
      </div>

      <NextWeekOrders
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
