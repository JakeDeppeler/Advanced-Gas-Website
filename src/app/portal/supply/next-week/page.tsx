import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Bad, Good, Grid, Head, Say, Tabs, Tile } from "@/components/portal/kit/Kit";
import { Locked } from "@/components/portal/Locked";
import { NextWeekOrders } from "@/components/portal/NextWeekOrders";
import { money } from "@/lib/portal/format";
import {
  appointmentsSynced, listWeekOrders, loadAlreadyOrdered, loadHolds, loadOrderingSettings, loadSuppliers, loadWeekInputs, type Hold,
  type PoWithLines,
} from "@/lib/ordering/db";
import { loadJobNoteSuppliers } from "@/lib/ordering/stJobNotes";
import { linesTotal, nextWeek, planWeek, thisWeek, weekLabel, type Problem, type Supplier, lineKey } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// "Order all" sends one email after another (Mitsubishi with its form) from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "Next week — Team portal" };

export default async function NextWeekPage({ searchParams }: { searchParams: { week?: string; tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const which = searchParams?.week === "this" ? "this" : "next";
  const view = searchParams?.tab === "sent" ? "sent" : "todo";
  const href = (v: "todo" | "sent", w: "next" | "this") => {
    const q = [v === "sent" ? "tab=sent" : null, w === "this" ? "week=this" : null].filter(Boolean).join("&");
    return `/portal/supply/next-week${q ? `?${q}` : ""}`;
  };
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
  try {
    const [o, s, inputs, already, sy, settings, h] = await Promise.all([
      listWeekOrders(week), loadSuppliers(), loadWeekInputs(week), loadAlreadyOrdered(), appointmentsSynced(), loadOrderingSettings(), loadHolds(),
    ]);
    orders = o;
    holds = h;
    suppliers = s;
    noted = await loadJobNoteSuppliers(s).catch(() => []);
    synced = sy;
    replyTo = settings.replyTo;
    delivery = { factoryInstructions: settings.factoryInstructions, deliveryNote: settings.deliveryNote, pickupInstructions: settings.pickupInstructions };
    // Worked out live rather than stored with the drafts, so fixing a quote
    // or assigning a crew clears its line here straight away.
    problems = planWeek({ week, ...inputs, suppliers: s, alreadyOrdered: already, skip: new Set(h.map((x) => lineKey(x.job_id, x.sku_id))) }).problems;
  } catch {
    dbReady = false;
  }

  const live = orders.filter((o) => o.status !== "cancelled");
  const toApprove = live.filter((o) => o.status === "draft");
  const sent = live.filter((o) => o.status === "sent" || o.status === "approved");
  const goods = live.filter((o) => o.kind === "order");
  const value = goods.reduce((t, o) => t + linesTotal(o.lines), 0);

  return (
    <PortalShell user={user}>
      <div className="pk" style={{ marginBottom: 14 }}>
        <Head
          title={view === "sent" ? "Sent" : "To order"}
          sub={`${which === "this" ? "This week" : "Next week"} · ${weekLabel(week)}`}
          info={view === "sent" ? [
            ["Sent", `Everything approved and sent for the week, to the suppliers and the electrician. An order lands here by itself the moment it goes.`],
            ["Replies", `Suppliers' replies come back to ${replyTo || "the office"}.`],
          ] : [
            ["Drafted for you", "Built from the installs booked for the week, and kept up to date as bookings come in."],
            ["Nothing goes until it's approved", "No order reaches a supplier or the electrician until it's approved here."],
            ["Can't order", "A line that can't be ordered — no supplier, no model on the quote, no crew — says why, so it can be fixed in ServiceTitan."],
          ]}
        />
        <div className="pk-rev-bar">
          {/* To order is what's still to approve; an order moves to Sent by
              itself once it's gone. The week stays put when you switch. */}
          <Tabs on={view} label="To order or sent" items={[
            { key: "todo", label: "To order", href: href("todo", which), count: dbReady ? toApprove.length : undefined, red: toApprove.length > 0 },
            { key: "sent", label: "Sent", href: href("sent", which), count: dbReady ? sent.length : undefined },
          ]} />
          <Tabs on={which} label="Which week" items={[
            { key: "next", label: "Next week", href: href(view, "next") },
            { key: "this", label: "This week", href: href(view, "this") },
          ]} />
        </div>
        {dbReady && (
          <>
            <Say>
              {view === "sent"
                ? <>{sent.length ? <>{sent.length} {sent.length === 1 ? "order has" : "orders have"} gone for {which === "this" ? "this" : "next"} week.</> : <>Nothing sent for {which === "this" ? "this" : "next"} week yet.</>}{" "}</>
                : toApprove.length ? <Bad>{toApprove.length} {toApprove.length === 1 ? "order is" : "orders are"} waiting to be approved.</Bad> : <Good>Nothing waiting to approve.</Good>}{" "}
              {problems.length > 0 ? <Bad>{problems.length} {problems.length === 1 ? "line can't" : "lines can't"} be ordered — listed below.</Bad> : null}
            </Say>
            <Grid cols={problems.length > 0 ? 4 : 3}>
              <Tile label="To approve" st={toApprove.length ? { k: "mid", w: "Waiting" } : { k: "good", w: "All done" }} fig={String(toApprove.length)} frac={live.length ? (live.length - toApprove.length) / live.length : null}
                sub={`${live.length} ${live.length === 1 ? "order" : "orders"} for the week`} />
              <Tile label="Goods" st={{ k: "none", w: "" }} fig={value ? money(value) : "—"} frac={null} sub="ex GST, at pricebook cost" />
              <Tile label="Electrician" st={{ k: "none", w: "" }} fig={String(live.filter((o) => o.kind === "work_order").length)} frac={null} sub="site visits booked" href="/portal/supply/work-orders" />
              {problems.length > 0 && <Tile label="Can't order" st={{ k: "bad", w: "Fix it" }} fig={String(problems.length)} frac={null} sub="listed below, with why" />}
            </Grid>
          </>
        )}
      </div>

      <NextWeekOrders
        which={which}
        view={view}
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
      />
    </PortalShell>
  );
}
