import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, Ic } from "@/components/portal/TradeShell";
import { TradeStock } from "@/components/portal/TradeStock";
import { dbConfigured, vehicleFor } from "@/lib/portal/db";
import { isLow, listMoves, listStock } from "@/lib/portal/stock";

export const dynamic = "force-dynamic";
export const metadata = { title: "Factory stock — Trade portal" };

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const day = d.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const time = d.toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
  return day === today ? `today ${time}` : `${d.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" })} ${time}`;
};

/** What's on the factory shelf, and log what you take. */
export default async function TradeFactory() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const [items, moves, van] = await Promise.all([
    listStock(),
    listMoves(12),
    user.id && dbConfigured() ? vehicleFor(user.id).catch(() => null) : null,
  ]);
  const low = (items ?? []).filter(isLow).length;
  const lastCount = moves.find((m) => m.reason === "count");
  const taken = moves.filter((m) => m.reason === "taken").slice(0, 6);

  return (
    <TradeShell user={user} active="van" title="Factory stock" sub="What's on the shelf, and log what you take">
      <section className="tr-card tr-row" style={{ padding: "14px 22px" }}>
        <span className="tr-row__ic tr-row__ic--grey"><Ic n="box" /></span>
        <span className="tr-row__k">
          <strong>The factory</strong>
          <span>{lastCount ? `Counted by ${lastCount.who ?? "the office"} ${when(lastCount.at)}` : "No stocktake logged yet"} · take it, log it, it&rsquo;s off the shelf</span>
        </span>
        {low > 0 && <span className="tr-chip tr-chip--warn">{low} running low</span>}
      </section>

      {items == null ? (
        <p className="tr-card tr-empty">The factory list can&rsquo;t be read right now.</p>
      ) : (
        <TradeStock items={items} vanName={van?.name ?? null}>
          <section className="tr-card">
            <h2 style={{ paddingBottom: 6 }}>Taken lately</h2>
            {taken.length ? (
              <div className="tr-rows">
                {taken.map((m) => (
                  <div key={m.id} className="tr-row" style={{ minHeight: 0, padding: "10px 0" }}>
                    <span className="tr-row__k">
                      <strong style={{ fontSize: 16 }}>{m.item} × {Math.abs(m.change)}</strong>
                      <span>{[m.who, m.forWhat, when(m.at)].filter(Boolean).join(" · ")}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="tr-empty">Nothing taken yet.</p>}
          </section>
        </TradeStock>
      )}
    </TradeShell>
  );
}
