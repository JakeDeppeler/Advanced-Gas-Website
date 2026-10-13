import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { StockBoard, type ProductPick, type VanGroup } from "@/components/portal/StockBoard";
import { ToolBoard } from "@/components/portal/ToolBoard";
import { SECTIONS, dueState, fullName, isLow, isSection, keptVanLines, listMoves, listStock, type StockItem, type StockSection } from "@/lib/portal/stock";
import { listOrders } from "@/lib/portal/van";
import { listUsers, listVehicles } from "@/lib/portal/db";
import { VAN_PLANT, VAN_STOCK, itemKey } from "@/lib/portal/vanChecks";
import { PB_CATEGORIES } from "@/lib/portal/installPrices";
import { shelfProducts } from "@/lib/portal/pricebook";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { OrderAnswer } from "@/components/portal/OfficeAnswers";
import { Card, Empty, Group, Pill, Row, Tabs } from "@/components/portal/kit/Kit";
import { Arrived } from "@/components/portal/stock/Arrived";
import { listStockLines, shelfMatch, type StockLine } from "@/lib/ordering/stockLines";
import { loadSuppliers } from "@/lib/ordering/db";
import "@/app/trade/trade.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Factory stock — Team portal" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const REASON: Record<StockSection, Record<string, string>> = {
  materials: { taken: "Took", delivered: "Delivered", returned: "Put back", count: "Stocktake" },
  systems: { taken: "Took", delivered: "Delivered", returned: "Put back", count: "Stocktake" },
  tools: { taken: "Signed out", returned: "Back in", count: "Added", delivered: "Delivered" },
};
const n = (v: number) => v.toLocaleString("en-AU");

/**
 * Every model the pricebook carries, by shelf, for adding a system without
 * retyping it — marked where the factory already has a line for it.
 */
function pricebookPicks(systems: StockItem[]): ProductPick[] {
  const lc = (s: string | null) => (s ?? "").trim().toLowerCase();
  const kept = (id: string, brand: string, name: string) =>
    systems.some((i) => i.productId === id || (lc(i.brand) === lc(brand) && lc(i.name) === lc(name)));
  return PB_CATEGORIES.flatMap((c) => {
    try {
      return shelfProducts(c.key).map((p) => ({ id: p.id, brand: p.brand, name: p.name, shelf: c.label, kept: kept(p.id, p.brand, p.name) }));
    } catch {
      return [];
    }
  });
}

/**
 * The factory, in the order it gets used: the materials on the shelf, the
 * systems waiting to go in, then the tools that go out and come back. The
 * office keeps it — nothing upstream knows what is in the factory — and every
 * change is a movement, so each part's count matches the log under it.
 */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" });

export default async function StockPage({ searchParams }: { searchParams: { s?: string; v?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Factory stock" forWhom="managers" />;

  const section: StockSection = isSection(searchParams.s) ? searchParams.s : "materials";
  // On the shelf, To order and Sent, like the orders themselves: what's here,
  // what needs ordering, and what's been ordered and is on its way.
  const view = searchParams.v === "order" ? "order" : searchParams.v === "sent" ? "sent" : "shelf";
  const all = await listStock();
  const [lines, suppliers] = await Promise.all([
    listStockLines().catch(() => null),
    loadSuppliers().catch(() => []),
  ]);
  const supplierName = new Map(suppliers.map((x) => [x.id, x.name]));
  const drafts = (lines ?? []).filter((l) => l.status === "draft");
  const onWay = (lines ?? []).filter((l) => l.status !== "draft" && !l.receivedAt);
  const monthAgo = Date.now() - 30 * 86_400_000;
  const arrived = (lines ?? []).filter((l) => l.receivedAt && Date.parse(l.receivedAt) > monthAgo).sort((a, b) => b.receivedAt!.localeCompare(a.receivedAt!));
  // Low lines with nothing already on an order for them.
  const lowAll = (all ?? []).filter(isLow);
  const ordered = (i: StockItem) => [...drafts, ...onWay].some((l) => shelfMatch(l, [i]) != null);
  const lowToOrder = lowAll.filter((i) => !ordered(i));
  const toOrderN = drafts.length + lowToOrder.length;
  const lineSub = (l: StockLine) => [`${n(l.qty)} ×`, supplierName.get(l.supplierId) ?? l.supplierId, l.poNumber].join(" · ");
  const items = (all ?? []).filter((i) => i.section === section);
  const [moves, orders, vans, people] = await Promise.all([
    listMoves(40, items.map((i) => i.id)),
    section === "materials" ? listOrders({ open: true, limit: 30 }) : Promise.resolve([]),
    listVehicles().catch(() => []),
    section === "tools" ? listUsers().catch(() => []) : Promise.resolve([]),
  ]);
  const vanName = new Map(vans.map((v) => [v.id, v.name]));
  const today = isoDateMelbourne(new Date());
  const per = (s: StockSection) => (all ?? []).filter((i) => i.section === s);
  const low = items.filter(isLow);
  const uncounted = items.filter((i) => i.countedAt == null).length;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const takenWeek = moves.filter((m) => m.reason === "taken" && Date.parse(m.at) > weekAgo).length;

  const counted = (i: StockItem) => ({
    id: i.id, name: i.name, brand: i.brand, unit: i.unit, qty: i.qty, minQty: i.minQty,
    location: i.location, category: i.category, countedAt: i.countedAt, low: isLow(i),
  });

  // The van sheet, marked with what the factory already keeps under its name.
  const have = keptVanLines(items);
  const vanGroups: VanGroup[] = VAN_STOCK.map((g) => ({
    group: g.group,
    lines: g.items.map((it) => ({
      key: itemKey(g.group, it.item), item: it.item, unit: it.unit === "ea" ? "each" : it.unit, min: it.min,
      have: have.has(itemKey(g.group, it.item)),
    })),
  }));

  const tools = items.map((i) => ({
    id: i.id, name: i.name, serial: i.serial, location: i.location, category: i.category,
    holder: i.holder, out: i.qty < 1, dueOn: i.dueOn, due: dueState(i.dueOn, today),
  }));
  const toolsDue = tools.filter((t) => t.due === "over").length;
  const toolsSoon = tools.filter((t) => t.due === "soon").length;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Factory stock</h1>
        <p>
          The materials on the shelf, the systems waiting to go in, and the tools that go out and come back. Take
          something, put it back or count it, and the log keeps up.
        </p>
      </div>

      <div className="pk" style={{ marginBottom: 14 }}>
        <Tabs on={view} label="Shelf, to order or sent" items={[
          { key: "shelf", label: "On the shelf", href: section === "materials" ? "/portal/stock" : `/portal/stock?s=${section}` },
          { key: "order", label: "To order", href: "/portal/stock?v=order", count: lines ? toOrderN : undefined, red: lowToOrder.length > 0 },
          { key: "sent", label: "Sent", href: "/portal/stock?v=sent", count: lines ? onWay.length : undefined },
        ]} />
      </div>

      {view === "order" ? (
        <div className="pk">
          {lines == null && <Empty>The orders can&rsquo;t be read right now, so this can&rsquo;t say what&rsquo;s on order.</Empty>}
          <Card title="On orders still to send" aside={<Link href="/portal/supply/next-week">Orders › To order ›</Link>}>
            {drafts.length ? (
              <Group>
                {drafts.map((l) => <Row key={l.id} href="/portal/supply/next-week" title={l.name} sub={lineSub(l)} end={<Pill st={{ k: "mid", w: "Draft — not sent" }} />} />)}
              </Group>
            ) : <Empty>No stock on a draft order. Add some to a supplier&rsquo;s order with + Add stock on Orders › To order.</Empty>}
          </Card>
          <Card title="Low on the shelf" aside="at or under its low mark, with nothing on order">
            {lowToOrder.length ? (
              <Group>
                {lowToOrder.map((i) => (
                  <Row key={i.id} href="/portal/supply/next-week" title={fullName(i)} sub={`${n(i.qty)} ${i.unit} left · low at ${n(i.minQty)} · ${i.section === "systems" ? "Systems" : "Materials"}`}
                    end={<Pill st={{ k: i.qty <= 0 ? "bad" : "mid", w: i.qty <= 0 ? "None left" : "Low" }} />} />
                ))}
              </Group>
            ) : <Empty>{lowAll.length ? "Everything that's low is already on an order." : "Nothing is at or under its low mark."}</Empty>}
          </Card>
        </div>
      ) : view === "sent" ? (
        <div className="pk">
          {lines == null && <Empty>The orders can&rsquo;t be read right now, so this can&rsquo;t say what&rsquo;s on its way.</Empty>}
          <Card title="On its way" aside="sent to the supplier · press Arrived when it comes in and it goes on the shelf">
            {onWay.length ? (
              <Group>
                {onWay.map((l) => <Row key={l.id} title={l.name} sub={`${lineSub(l)}${l.sentAt ? ` · sent ${day(l.sentAt)}` : ""}`} end={<Arrived lineId={l.id} what={l.name} />} />)}
              </Group>
            ) : <Empty>Nothing on its way. Stock added to an order shows here once the order&rsquo;s sent.</Empty>}
          </Card>
          <Card title="Arrived" aside="the last 30 days">
            {arrived.length ? (
              <Group>
                {arrived.map((l) => <Row key={l.id} title={l.name} sub={`${lineSub(l)} · in ${day(l.receivedAt!)}${l.receivedBy ? ` · ${l.receivedBy}` : ""}`} end={<Pill st={{ k: "good", w: "On the shelf" }} />} />)}
              </Group>
            ) : <Empty>Nothing marked arrived in the last 30 days.</Empty>}
          </Card>
        </div>
      ) : (<>
      <nav className="pt-tabs" aria-label="The factory">
        {SECTIONS.map((s) => (
          <Link
            key={s.key}
            href={s.key === "materials" ? "/portal/stock" : `/portal/stock?s=${s.key}`}
            aria-current={s.key === section ? "page" : undefined}
            className={`pt-tab${s.key === section ? " is-on" : ""}`}
          >
            {s.label}
            {all && <span className="pt-tab__n">{n(per(s.key).length)}</span>}
          </Link>
        ))}
      </nav>

      {all == null ? (
        <div className="pt-note pt-note--warn"><strong>The stock list can&rsquo;t be read.</strong> Nothing has been lost — the database didn&rsquo;t answer.</div>
      ) : section === "tools" ? (
        <>
          <Figs
            cols={3}
            items={[
              { label: "On the register", feature: true, value: n(tools.length), sub: tools.length ? `${n(tools.filter((t) => !t.out).length)} in the factory now` : "add the first one below" },
              { label: "Out", value: n(tools.filter((t) => t.out).length), sub: tools.some((t) => t.out) ? tools.filter((t) => t.out).slice(0, 2).map((t) => `${t.name} with ${t.holder ?? "?"}`).join(", ") : "everything is in the factory" },
              {
                label: "Test & tag", value: n(toolsDue),
                sub: toolsDue ? `overdue${toolsSoon ? ` · ${toolsSoon} more due in a fortnight` : ""}` : toolsSoon ? `none overdue · ${toolsSoon} due in a fortnight` : tools.some((t) => t.dueOn) ? "none overdue" : "no dates recorded yet",
              },
            ]}
          />
          <ToolBoard
            tools={tools}
            canSave
            kinds={VAN_PLANT.map((g) => g.group)}
            names={[...new Set(VAN_PLANT.flatMap((g) => g.items.map((i) => i.item)))]}
            people={[...people.filter((p) => p.active).map((p) => p.name), ...vans.filter((v) => v.active).map((v) => v.name)]}
          />
        </>
      ) : section === "systems" ? (
        <>
          <Figs
            cols={3}
            items={[
              { label: "Units in the factory", feature: true, value: n(items.reduce((t, i) => t + (i.countedAt ? Math.max(0, i.qty) : 0), 0)), sub: items.length ? `across ${n(items.length)} ${items.length === 1 ? "model" : "models"}${uncounted ? ` · ${uncounted} not counted yet` : ""}` : "add the first one below" },
              { label: "Low", value: n(low.length), sub: low.length ? low.slice(0, 2).map((i) => (i.brand ? `${i.brand} ${i.name}` : i.name)).join(", ") + (low.length > 2 ? "…" : "") : "no model at or under its minimum" },
              { label: "Taken this week", value: n(takenWeek), sub: "units out of the factory to a job" },
            ]}
          />
          <StockBoard section="systems" items={items.map(counted)} canSave kinds={PB_CATEGORIES.map((c) => c.label)} products={pricebookPicks(items)} />
        </>
      ) : (
        <>
          <Figs
            cols={3}
            items={[
              { label: "Lines on the shelf", feature: true, value: n(items.length), sub: items.length ? (uncounted ? `${n(uncounted)} not counted yet` : "all counted") : "start from the van list below" },
              { label: "Low", value: n(low.length), sub: low.length ? low.slice(0, 3).map((i) => i.name).join(", ") + (low.length > 3 ? "…" : "") : "nothing at or under its minimum" },
              { label: "Taken this week", value: n(takenWeek), sub: "times something came off the shelf" },
            ]}
          />
          {/* Factory first, then Reece: what the crew asked for sits beside the
              shelf it might come off, so a line already on it never gets ordered. */}
          <div className="tr-embed">
            <section className="tr-card" id="orders">
              <h2 style={{ paddingBottom: 4 }}>Parts the crew asked for · {orders.length} open</h2>
              {orders.length ? (
                <div className="tr-rows">
                  {orders.map((o) => <OrderAnswer key={o.id} o={o} van={o.vehicleId ? vanName.get(o.vehicleId) ?? null : null} canAnswer={can(user, "vehicles")} />)}
                </div>
              ) : <p className="tr-empty">Nothing open. Orders sent from the iPad land here.</p>}
            </section>
          </div>
          <StockBoard section="materials" items={items.map(counted)} canSave kinds={VAN_STOCK.map((g) => g.group)} vanGroups={vanGroups} />
        </>
      )}

      {all != null && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">{section === "tools" ? "Who had what" : "Who took what"}</h2>
          {moves.length === 0 ? (
            <p className="pt-rep__empty">Nothing recorded yet.</p>
          ) : (
            <div className="pt-fleet__wrap">
              <table className="pt-fleet pt-otab">
                <thead><tr><th>When</th><th>Who</th><th>What</th>{section !== "tools" && <th className="pt-otab__num">How many</th>}<th>{section === "tools" ? "To / from" : "For"}</th></tr></thead>
                <tbody>
                  {moves.map((m) => (
                    <tr key={m.id}>
                      <td>{when(m.at)}</td>
                      <td>{m.who || "—"}</td>
                      <td><strong>{m.item}</strong><span className="pt-fleet__sub">{REASON[section][m.reason] ?? m.reason}</span></td>
                      {section !== "tools" && <td className="pt-otab__num">{m.change > 0 ? `+${m.change}` : m.change}</td>}
                      <td>{m.forWhat || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      </>)}
    </PortalShell>
  );
}
