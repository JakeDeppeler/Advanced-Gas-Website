import { getSettings } from "@/lib/portal/db";
import { loadStocked } from "@/lib/ordering/stocked";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Bad, Good, Head, Say } from "@/components/portal/kit/Kit";
import { Locked } from "@/components/portal/Locked";
import { NextWeekOrders, type UnbookedSale } from "@/components/portal/NextWeekOrders";
import {
  appointmentsSynced, listWeekOrders, loadAlreadyOrdered, loadHolds, loadOrderingSettings, loadSuppliers, loadUnbooked, loadWeekInputs, type Hold,
  type PoWithLines, type UnbookedLine,
} from "@/lib/ordering/db";
import { loadJobNoteSuppliers } from "@/lib/ordering/stJobNotes";
import { dayLabel, estKey, lineKeys, nextWeek, planWeek, thisWeek, weekLabel, type OrderedLine, type Problem, type Supplier, lineKey, problemKey } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// "Order all" sends one email after another (Mitsubishi with its form) from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "To order · Team portal" };

/**
 * Sold quotes not booked in yet, a card each, their gear split by supplier,
 * and for each supplier whether it's on an order already. The electrician
 * isn't offered: he's booked against an install date, and there isn't one.
 */
function unbookedSales(rows: UnbookedLine[], suppliers: Supplier[], drafts: PoWithLines[], already: Map<string, OrderedLine>): UnbookedSale[] {
  const byId = new Map(suppliers.map((x) => [x.id, x]));
  const drafted = new Map<string, string>();
  for (const p of drafts) for (const l of p.lines) for (const k of lineKeys(l)) drafted.set(k, p.po_number);
  const sales = new Map<number, UnbookedSale>();
  for (const r of rows) {
    const sale = sales.get(r.estimate_id) ?? {
      estimateId: r.estimate_id, customer: r.customer_name, suburb: r.suburb, what: r.estimate_name, soldOn: r.sold_on ? r.sold_on.slice(0, 10) : null,
      total: r.total_inc, quoteJob: r.quote_job_number, groups: [], issues: [],
    };
    sales.set(r.estimate_id, sale);
    if (r.issue) { sale.issues.push(`${r.sku_name ?? "An item"}: ${r.issue.toLowerCase()}`); continue; }
    const sup = r.supplier_id ? byId.get(r.supplier_id) : undefined;
    if (!sup || !sup.active || sup.method === "work_order") continue;
    let g = sale.groups.find((x) => x.supplierId === sup.id);
    if (!g) { g = { supplierId: sup.id, supplier: sup.name, items: [], cost: 0, ordered: null, drafted: null }; sale.groups.push(g); }
    g.items.push({ name: r.supplier_model ?? r.sku_name ?? "Item", qty: Number(r.qty) });
    g.cost += (r.unit_cost ?? 0) * Number(r.qty);
    const k = estKey(r.estimate_id, r.sku_id);
    if (already.has(k)) g.ordered = already.get(k)!.po_number;
    else if (drafted.has(k)) g.drafted = drafted.get(k)!;
  }
  return [...sales.values()].filter((x) => x.groups.length || x.issues.length);
}

/**
 * To order › To order: this week's and next week's orders as one checklist,
 * by when each is needed. There used to be a switch between the two weeks,
 * which made the office check both to know nothing was waiting; the week an
 * order was drafted for is the drafting's business, not the reader's. The
 * figures that were tiles over it are the list's own groups now.
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
  let unbooked: UnbookedSale[] = [];
  try {
    // Everything in one go: each is a round trip to Tokyo.
    // Read twice before giving up: these views are heavy, and while the sync
    // is writing they can run past the database's 8-second limit. One slow
    // read used to blank the whole page as "the database isn't reachable".
    const readAll = () => Promise.all([
      listWeekOrders(tw), listWeekOrders(nw), loadSuppliers(), loadWeekInputs(tw), loadWeekInputs(nw), loadAlreadyOrdered(), appointmentsSynced(), loadOrderingSettings(), loadHolds(),
      loadSuppliers().then((x) => loadJobNoteSuppliers(x)).catch(() => [] as string[]),
      loadStocked().catch(() => []),
      getSettings<{ keys?: string[] }>("order-problems-dismissed").catch(() => null),
      // Its own catch: a failed read of the sold-not-booked list leaves the rest of the page standing.
      loadUnbooked().catch(() => null),
    ] as const);
    const [oThis, oNext, s, inThis, inNext, already, sy, settings, h, nt, st, dis, ub] = await readAll()
      .catch(() => new Promise<void>((r) => setTimeout(r, 1500)).then(readAll));
    orders = [...oThis, ...oNext];
    if (ub) unbooked = unbookedSales(ub, s, orders.filter((o) => o.status === "draft"), already);
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
  const aheadOpen = unbooked.filter((x) => x.groups.some((g) => !g.ordered && !g.drafted)).length;
  const soonest = waiting.map((o) => o.kind === "work_order" ? o.details?.date : o.lines.map((l) => l.install_date).filter(Boolean).sort()[0]).filter((d): d is string => !!d).sort()[0];

  return (
    <PortalShell user={user}>
      <div className="pk" style={{ marginBottom: 14 }}>
        <Head
          title="To order"
          sub={`This week and next · ${weekLabel({ start: tw.start, end: nw.end })}`}
          info={[
            ["Drafted for you", "Built from the installs booked this week and next, and kept up to date as bookings come in. Next week starts drafting on Wednesday."],
            ["Nothing goes until it's sent", "No supplier order goes until someone presses its Send button here. A contractor's work order goes by itself once its job is booked, unless To order › Automation says otherwise."],
            ["Can't order", "A line that can't be ordered, no supplier, no model on the quote, no crew, says why, so it can be fixed in ServiceTitan."],
          ]}
        />
        {dbReady && (
          <>
            <Say>
              {waiting.length
                ? <><Bad>{waiting.length} {waiting.length === 1 ? "order is" : "orders are"} waiting to be sent</Bad>{soonest ? <>, the first for an install on {dayLabel(soonest)}</> : null}.</>
                : <Good>Nothing waiting to be sent.</Good>}{" "}
              {problems.length > 0 ? <Bad>{problems.length} {problems.length === 1 ? "line can't" : "lines can't"} be ordered yet.</Bad> : null}{" "}
              {aheadOpen > 0 ? <>{aheadOpen} sold {aheadOpen === 1 ? "job" : "jobs"} can be ordered ahead.</> : null}
            </Say>
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
        unbooked={unbooked}
      />
    </PortalShell>
  );
}
