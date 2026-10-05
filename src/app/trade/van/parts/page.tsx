import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, VanTabs } from "@/components/portal/TradeShell";
import { PartsOrder, type PartRow } from "@/components/portal/PartsOrder";
import { Chip } from "@/components/portal/tradeVan";
import { dbConfigured, listVanChecks, vehicleFor } from "@/lib/portal/db";
import { listOrders } from "@/lib/portal/van";
import { listStock } from "@/lib/portal/stock";
import { VAN_STOCK, itemKey } from "@/lib/portal/vanChecks";
import { NEEDED_BY, partChip } from "@/lib/portal/vanParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order parts — Trade portal" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Order parts: restock the van or order for a job. Factory first — the shelf
 * is shown beside every line it has — then the office orders from Reece.
 */
export default async function TradeParts({ searchParams }: { searchParams: { low?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const van = user.id && dbConfigured() ? await vehicleFor(user.id).catch(() => null) : null;
  const [sheets, shelf, orders] = await Promise.all([
    van ? listVanChecks(van.id, "stock", 1).catch(() => []) : [],
    listStock(),
    user.id ? listOrders({ vehicleId: van?.id, limit: 8 }) : [],
  ]);
  const counted = sheets[0]?.items ?? {};
  // Matched on the van sheet's group and name, which is how a materials list
  // started from the sheet is kept — "Cap 1/2"" is brass in one group and
  // B-Press in two others. A line kept under its name alone still matches on
  // the name. One nobody has counted shows as unknown, not as none.
  const materials = (shelf ?? []).filter((i) => i.section === "materials");
  const qtyOf = (i: (typeof materials)[number]) => (i.countedAt ? i.qty : null);
  const byGroup = new Map(materials.map((i) => [`${norm(i.category ?? "")}|${norm(i.name)}`, qtyOf(i)]));
  const byName = new Map(materials.map((i) => [norm(i.name), qtyOf(i)]));

  const rows: PartRow[] = VAN_STOCK.flatMap((g) => g.items.map((it) => {
    const k = itemKey(g.group, it.item);
    const gk = `${norm(g.group)}|${norm(it.item)}`;
    return {
      key: k, item: it.item, group: g.group, unit: it.unit, min: it.min,
      onVan: counted[k]?.qty ?? null,
      atFactory: byGroup.has(gk) ? byGroup.get(gk) ?? null : byName.get(norm(it.item)) ?? null,
    };
  }));
  const mine = orders.filter((o) => o.requestedBy === user.name || o.vehicleId === van?.id);

  return (
    <TradeShell user={user} active="van" title="Order parts" sub="Restock the van or order for a job · factory first, then the office orders from Reece">
      <VanTabs on="parts" />
      <PartsOrder
        rows={rows}
        groups={VAN_STOCK.map((g) => g.group)}
        prefillLow={searchParams.low === "1"}
        hasVan={!!van}
        factoryPlace=""
      />

      <section className="tr-card">
        <h2 style={{ paddingBottom: 6 }}>Your orders</h2>
        {mine.length ? (
          <div className="tr-rows">
            {mine.map((o) => (
              <div className="tr-row" key={o.id}>
                <span className="tr-row__k">
                  <strong style={{ fontSize: 16.5 }}>{o.lines.map((l) => `${l.item} ×${l.qty}`).join(", ")}</strong>
                  <span>
                    {[
                      o.forWhat === "job" ? `For ${o.job}` : "Restocking the van",
                      o.deliver === "pickup" ? "picking up from Reece" : "to the factory",
                      `needed ${NEEDED_BY.find((n) => n.k === o.neededBy)?.label.toLowerCase()}`,
                      new Date(o.createdAt).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" }),
                    ].join(" · ")}
                  </span>
                </span>
                <Chip c={partChip(o)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="tr-empty">Nothing ordered yet. What you send lands with the office, and its status shows here.</p>
        )}
      </section>
    </TradeShell>
  );
}
