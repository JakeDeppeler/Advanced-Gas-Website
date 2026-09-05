import Link from "next/link";
import { Delta, SpendList, headlines, money, signed, topSpend, type PLDetail } from "@/components/portal/plParts";

/**
 * The profit & loss in short, for the Finance overview, over whatever window
 * the money chart above it is showing.
 *
 * When the window ran at a loss the useful question isn't what changed, it's
 * where the money went — so the biggest spends lead, and the shortfall is
 * stated plainly rather than left to be worked out from two cards.
 */
export function PLSummary({
  now, before, nowLabel, beforeLabel,
}: { now: PLDetail; before: PLDetail | null; nowLabel: string; beforeLabel: string }) {
  const heads = headlines(now, before);
  const spend = topSpend(now, 6);
  const moneyOut = now.costOfSales + now.operatingExpenses;
  const atLoss = now.netProfit < 0;

  const inD = before ? now.income - before.income : null;
  const outD = before ? moneyOut - (before.costOfSales + before.operatingExpenses) : null;
  const profitD = before ? now.netProfit - before.netProfit : null;

  return (
    <section className="pt-panel">
      <div className="pt-ov__charthead">
        <h2 className="pt-panel__h">Where that money went</h2>
        <Link href="/portal/finance/pl" className="pt-ov__more">Full statement →</Link>
      </div>
      <p className="pt-panel__sub">
        The profit &amp; loss for <strong>{nowLabel}</strong> — the same stretch the chart above is showing{before ? <>, against <strong>{beforeLabel}</strong></> : null}.
      </p>

      {atLoss && (
        <div className="pt-pl__loss">
          <strong>Money out was {money(Math.abs(now.netProfit))} more than money in</strong> over {nowLabel}. Here is where the bulk of it went.
        </div>
      )}

      <div className="pt-pl__heads">
        {heads.map((h) => (
          <div key={h.label} className="pt-pl__head">
            <span className="pt-pl__headlabel">{h.label}</span>
            <strong className={`pt-pl__headval${h.now < 0 ? " is-neg" : ""}`}>{money(h.now)}</strong>
            {h.before !== null ? <Delta kind={h.kind} now={h.now} before={h.before} /> : <span className="pt-pl__delta is-flat">—</span>}
          </div>
        ))}
      </div>

      {spend.length > 0 && (
        <>
          <h3 className="pt-pl__subh">Biggest spends{spend.length > 1 ? ` — the top ${spend.length} of ${money(moneyOut)} out` : ""}</h3>
          <SpendList lines={spend} />
        </>
      )}

      {before && profitD !== null && inD !== null && outD !== null && (
        <p className="pt-pl__read">
          Against {beforeLabel}, money in is <strong className={inD >= 0 ? "is-good" : "is-bad"}>{signed(inD)}</strong> and money out is{" "}
          <strong className={outD <= 0 ? "is-good" : "is-bad"}>{signed(outD)}</strong>, so profit is{" "}
          <strong className={profitD >= 0 ? "is-good" : "is-bad"}>{signed(profitD)}</strong>.{" "}
          <Link href="/portal/finance/pl" className="pt-pl__inline">See which accounts moved →</Link>
        </p>
      )}
    </section>
  );
}
