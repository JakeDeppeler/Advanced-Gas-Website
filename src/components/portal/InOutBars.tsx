import { money } from "@/lib/portal/format";
import type { MonthPoint } from "@/lib/portal/xero";

/**
 * Money in and money out for each of the last twelve months, as pairs of
 * bars — The year's opening panel, to the Finance · The year mock.
 *
 * In is always the left bar of a pair and out the right, and the legend says
 * so, so the two don't rely on navy against orange to be told apart. A month
 * Xero didn't answer for is drawn as an empty track, never as a zero.
 */
export function InOutBars({ points, months }: { points: MonthPoint[]; months: string[] }) {
  const have = points.filter((p) => p.ok);
  const max = Math.max(1, ...have.flatMap((p) => [p.income, p.expenses]));
  const kept = have.reduce((n, p) => n + p.netProfit, 0);
  const byLabel = new Map(points.map((p) => [p.label, p]));

  return (
    <section className="pt-panel pt-iob">
      <div className="pt-iob__head">
        <h2 className="pt-panel__h">Last 12 months, month by month</h2>
        {have.length > 0 && (
          <span className="pt-iob__kept">
            Kept <b className={kept < 0 ? "is-neg" : ""}>{money(kept)}</b>
          </span>
        )}
      </div>
      <div className="pt-iob__plot" role="img" aria-label={have.length ? "Money in and money out by month" : "No monthly figures yet"}>
        {months.map((m) => {
          const p = byLabel.get(m);
          const ok = p?.ok;
          return (
            <div key={m} className="pt-iob__month" title={ok ? `${p!.full}: in ${money(p!.income)}, out ${money(p!.expenses)}` : `${m}: no figures`}>
              <div className="pt-iob__pair">
                <span className="pt-iob__bar pt-iob__bar--in" style={{ height: ok ? `${Math.max(1.5, (p!.income / max) * 100)}%` : undefined }} />
                <span className="pt-iob__bar pt-iob__bar--out" style={{ height: ok ? `${Math.max(1.5, (p!.expenses / max) * 100)}%` : undefined }} />
              </div>
              <span className="pt-iob__lbl">{m}</span>
            </div>
          );
        })}
      </div>
      <div className="pt-iob__legend">
        <span><i className="pt-iob__key pt-iob__key--in" />Money in <em>(left)</em></span>
        <span><i className="pt-iob__key pt-iob__key--out" />Money out <em>(right)</em></span>
        {have.length === 0 && <span className="pt-iob__note">Monthly figures fill in from Xero</span>}
      </div>
    </section>
  );
}
