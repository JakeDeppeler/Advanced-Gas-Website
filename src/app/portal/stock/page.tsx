import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { StockBoard } from "@/components/portal/StockBoard";
import { isLow, listMoves, listStock } from "@/lib/portal/stock";
import { listOrders } from "@/lib/portal/van";
import { listVehicles } from "@/lib/portal/db";
import { OrderAnswer } from "@/components/portal/OfficeAnswers";
import "@/app/trade/trade.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Factory stock — Team portal" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const REASON: Record<string, string> = { taken: "Took", delivered: "Delivered", returned: "Put back", count: "Stocktake" };

/**
 * What's on the factory shelf, and who took what. The office keeps this list —
 * nothing upstream knows what is on the shelf — and every change is a
 * movement, so the count always matches the log under it.
 */
export default async function StockPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Factory stock" forWhom="managers" />;

  const [items, moves, orders, vans] = await Promise.all([listStock(), listMoves(40), listOrders({ open: true, limit: 30 }), listVehicles().catch(() => [])]);
  const vanName = new Map(vans.map((v) => [v.id, v.name]));
  const low = (items ?? []).filter(isLow);
  const takenWeek = moves.filter((m) => m.reason === "taken" && Date.now() - Date.parse(m.at) < 7 * 86_400_000).length;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Factory stock</h1>
        <p>What&rsquo;s on the shelf, what&rsquo;s running low, and who took what. Take something, put it back or count the shelf, and the log keeps up.</p>
      </div>

      {items == null ? (
        <div className="pt-note pt-note--warn"><strong>The stock list can&rsquo;t be read.</strong> Nothing has been lost — the database didn&rsquo;t answer.</div>
      ) : (
        <>
          <Figs
            cols={3}
            items={[
              { label: "Lines on the shelf", feature: true, value: items.length.toLocaleString("en-AU"), sub: items.length ? "things we keep" : "add the first one below" },
              { label: "Low", value: low.length.toLocaleString("en-AU"), sub: low.length ? low.slice(0, 3).map((i) => i.name).join(", ") + (low.length > 3 ? "…" : "") : "nothing at or under its minimum" },
              { label: "Taken this week", value: takenWeek.toLocaleString("en-AU"), sub: "times something came off the shelf" },
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
          <StockBoard items={items.map((i) => ({ ...i, low: isLow(i) }))} canSave />
          <section className="pt-panel">
            <h2 className="pt-panel__h">Who took what</h2>
            {moves.length === 0 ? (
              <p className="pt-rep__empty">Nothing taken or added yet.</p>
            ) : (
              <div className="pt-fleet__wrap">
                <table className="pt-fleet pt-otab">
                  <thead><tr><th>When</th><th>Who</th><th>What</th><th className="pt-otab__num">How many</th><th>For</th></tr></thead>
                  <tbody>
                    {moves.map((m) => (
                      <tr key={m.id}>
                        <td>{when(m.at)}</td>
                        <td>{m.who || "—"}</td>
                        <td><strong>{m.item}</strong><span className="pt-fleet__sub">{REASON[m.reason] ?? m.reason}</span></td>
                        <td className="pt-otab__num">{m.change > 0 ? `+${m.change}` : m.change}</td>
                        <td>{m.forWhat || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PortalShell>
  );
}
