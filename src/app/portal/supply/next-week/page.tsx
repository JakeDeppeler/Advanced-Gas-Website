import { getSettings } from "@/lib/portal/db";
import { loadFromStock, loadStocked } from "@/lib/ordering/stocked";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { NextWeekOrders, type LaterJob, type UnbookedSale } from "@/components/portal/NextWeekOrders";
import {
  appointmentsSynced, listWeekOrders, loadAlreadyOrdered, loadHolds, loadOrderingSettings, loadSuppliers, loadUnbooked, loadWeekInputs, type Hold,
  type PoWithLines, type UnbookedLine,
} from "@/lib/ordering/db";
import { loadJobNoteSuppliers } from "@/lib/ordering/stJobNotes";
import { dayLabel, estKey, isoAddDays, type OrderLine, lineKeys, nextWeek, planWeek, thisWeek, weekLabel, type OrderedLine, type Problem, type Supplier, lineKey, problemKey } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// "Order all" sends one email after another (Mitsubishi with its form) from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "To order · Team portal" };

/**
 * Sold quotes not booked in yet, a card each, their gear split by supplier,
 * and for each supplier whether it's on an order already. The electrician
 * isn't offered: he's booked against an install date, and there isn't one.
 */
function unbookedSales(rows: UnbookedLine[], suppliers: Supplier[], drafts: PoWithLines[], already: Map<string, OrderedLine>, shelf: Set<string>): UnbookedSale[] {
  const byId = new Map(suppliers.map((x) => [x.id, x]));
  const drafted = new Map<string, string>();
  for (const p of drafts) for (const l of p.lines) for (const k of lineKeys(l)) drafted.set(k, p.po_number);
  const sales = new Map<number, UnbookedSale>();
  for (const r of rows) {
    const sale = sales.get(r.estimate_id) ?? {
      estimateId: r.estimate_id, customer: r.customer_name, suburb: r.suburb, what: r.estimate_name, soldOn: r.sold_on ? r.sold_on.slice(0, 10) : null,
      total: r.total_inc, quoteJob: r.quote_job_number, jobId: r.quote_job_id, customerId: r.customer_id, groups: [], issues: [],
    };
    sales.set(r.estimate_id, sale);
    if (r.issue) { sale.issues.push(`${r.sku_name ?? "An item"}: ${r.issue.toLowerCase()}`); continue; }
    const sup = r.supplier_id ? byId.get(r.supplier_id) : undefined;
    if (!sup || !sup.active || sup.method === "work_order") continue;
    let g = sale.groups.find((x) => x.supplierId === sup.id);
    if (!g) { g = { supplierId: sup.id, supplier: sup.name, items: [], cost: 0, ordered: null, drafted: null }; sale.groups.push(g); }
    const k = estKey(r.estimate_id, r.sku_id);
    const cost = (r.unit_cost ?? 0) * Number(r.qty);
    // From the factory: listed, but not counted in what the order will cost.
    const fromShelf = shelf.has(k);
    const ordered = already.get(k)?.po_number ?? null;
    g.items.push({ name: r.supplier_model ?? r.sku_name ?? "Item", qty: Number(r.qty), skuId: r.sku_id, cost, shelf: fromShelf, ordered });
    if (!fromShelf && !ordered) g.cost += cost;
    if (!ordered && drafted.has(k)) g.drafted = drafted.get(k)!;
  }
  // A supplier's part of the sale is done once every line is ordered or from the
  // factory; until then the rest still shows, to be ordered.
  for (const sale of sales.values()) for (const g of sale.groups) {
    if (g.items.every((i) => i.ordered || i.shelf) && g.items.some((i) => i.ordered)) g.ordered = g.items.find((i) => i.ordered)!.ordered;
  }
  return [...sales.values()].filter((x) => x.groups.length || x.issues.length);
}

/** How far past the two drafted weeks the booked jobs are shown: everything booked, in practice. */
const LATER_DAYS = 180;

/**
 * Booked jobs past the two drafted weeks, by supplier and job: shown so they
 * can be ordered early. Reece stays at two weeks: it's ordered into maX by
 * hand, and a list months long would bury what's due. Anything already
 * ordered, on a draft, held, or coming from the factory is left out.
 */
function laterJobs(lines: OrderLine[], suppliers: Supplier[], taken: Set<string>, already: Map<string, OrderedLine>): LaterJob[] {
  const byId = new Map(suppliers.map((x) => [x.id, x]));
  const jobs = new Map<string, LaterJob>();
  for (const l of lines) {
    if (l.issue || !l.supplier_id) continue;
    const sup = byId.get(l.supplier_id);
    if (!sup || !sup.active || sup.method === "work_order" || sup.method === "reece_cart") continue;
    const keys = lineKeys(l);
    if (keys.some((k) => taken.has(k) || already.has(k))) continue;
    const k = `${sup.id}:${l.job_id}`;
    const j = jobs.get(k) ?? { supplierId: sup.id, jobId: l.job_id, jobNumber: l.job_number, customer: l.customer_name, suburb: l.suburb, install: l.install_date, items: [], cost: 0 };
    jobs.set(k, j);
    const qty = Number(l.qty ?? 1);
    j.items.push({ name: l.supplier_model ?? l.sku_name ?? "Item", qty, cost: (l.unit_cost ?? 0) * qty });
    j.cost += (l.unit_cost ?? 0) * qty;
  }
  return [...jobs.values()].sort((a, b) => (a.install ?? "").localeCompare(b.install ?? ""));
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
  let later: LaterJob[] = [];
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
      loadFromStock().catch(() => []),
      // Its own catch: the jobs further out are extra, not what the page stands on.
      loadWeekInputs({ start: isoAddDays(nw.end, 1), end: isoAddDays(nw.end, LATER_DAYS) }).catch(() => null),
    ] as const);
    const [oThis, oNext, s, inThis, inNext, already, sy, settings, h, nt, st, dis, ub, fs, inLater] = await readAll()
      .catch(() => new Promise<void>((r) => setTimeout(r, 1500)).then(readAll));
    orders = [...oThis, ...oNext];
    if (ub) unbooked = unbookedSales(ub, s, orders.filter((o) => o.status === "draft"), already, new Set(fs.map((x) => x.key)));
    // A hold keeps the model it was held under; the pricebook may have been
    // corrected since (20401's heads went from AP35 to AP25), so the live
    // quote's model wins wherever the job is still in the two weeks.
    const live = new Map([...inThis.lines, ...inNext.lines].map((l) => [lineKey(l.job_id, l.sku_id), l.supplier_model]));
    if (inLater) {
      const taken = new Set([
        ...orders.filter((o) => o.status === "draft").flatMap((o) => o.lines.flatMap((l) => lineKeys(l))),
        ...h.map((x) => lineKey(x.job_id, x.sku_id)),
        ...fs.map((x) => x.key),
      ]);
      later = laterJobs(inLater.lines, s, taken, already);
    }
    holds = h.map((x) => ({ ...x, sku_name: live.get(lineKey(x.job_id, x.sku_id)) ?? x.sku_name }));
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


  return (
    <PortalShell user={user}>
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
        later={later}
      />
    </PortalShell>
  );
}
