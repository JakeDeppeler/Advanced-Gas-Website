import Link from "next/link";
import { Delta, Mover, headlines, money, rankMovers, signed, type PLDetail } from "@/components/portal/plParts";

/**
 * The profit & loss in short, for the Finance overview: the headline figures
 * against the same run of days last month, and the handful of accounts that
 * moved furthest. The whole statement lives a click away.
 */
export function PLSummary({
  now, before, nowLabel, beforeLabel,
}: { now: PLDetail; before: PLDetail | null; nowLabel: string; beforeLabel: string }) {
  const heads = headlines(now, before);
  const movers = rankMovers(now, before).slice(0, 4);

  const inD = before ? now.income - before.income : null;
  const outD = before ? (now.costOfSales + now.operatingExpenses) - (before.costOfSales + before.operatingExpenses) : null;
  const profitD = before ? now.netProfit - before.netProfit : null;

  return (
    <section className="pt-panel">
      <div className="pt-ov__charthead">
        <h2 className="pt-panel__h">Profit &amp; loss</h2>
        <Link href="/portal/finance/pl" className="pt-ov__more">Full statement →</Link>
      </div>
      <p className="pt-panel__sub">
        <strong>{nowLabel}</strong>{before ? <>, against <strong>{beforeLabel}</strong>.</> : "."}
      </p>

      <div className="pt-pl__heads">
        {heads.map((h) => (
          <div key={h.label} className="pt-pl__head">
            <span className="pt-pl__headlabel">{h.label}</span>
            <strong className={`pt-pl__headval${h.now < 0 ? " is-neg" : ""}`}>{money(h.now)}</strong>
            {h.before !== null ? <Delta kind={h.kind} now={h.now} before={h.before} /> : <span className="pt-pl__delta is-flat">—</span>}
          </div>
        ))}
      </div>

      {before && profitD !== null && inD !== null && outD !== null && (
        <p className="pt-pl__read">
          Money in is <strong className={inD >= 0 ? "is-good" : "is-bad"}>{signed(inD)}</strong> and money out is{" "}
          <strong className={outD <= 0 ? "is-good" : "is-bad"}>{signed(outD)}</strong>, so profit is{" "}
          <strong className={profitD >= 0 ? "is-good" : "is-bad"}>{signed(profitD)}</strong>.
        </p>
      )}

      {movers.length > 0 && (
        <div className="pt-pl__movers">
          {movers.map((r) => <Mover key={`${r.section}|${r.label}`} row={r} />)}
        </div>
      )}
    </section>
  );
}
