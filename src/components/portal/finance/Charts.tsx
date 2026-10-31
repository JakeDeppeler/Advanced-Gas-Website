import Link from "next/link";
import type { MonthRow } from "@/lib/portal/yearGoal";
import type { OwedInvoice } from "@/lib/portal/run/money";
import { money } from "@/lib/portal/run/month";
import { Pill, status2 } from "@/components/portal/kit/Kit";

/**
 * Finance › Overview's pictures: the month against its goal, each month of
 * the year against its own, and what's owed by how late it is. Plain SVG and
 * CSS, coloured from the theme's tokens so they read in light and dark, every
 * bar carrying its figure in words as well.
 */

const k = (n: number) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);

/**
 * This month so far against the month's goal, with where each goal says it
 * should be by today marked on the bar: the year's goal solid, the lower goal
 * ($2.5M under $3M) dotted. The bar takes the status's colour, its word
 * beside it: under the lower goal's mark behind, between the two close, at
 * the goal's on track, 10% past it ahead.
 */
export function MonthTrack({ label, income, goal, byNow, daysLeft, lowerShare = null, goalName, lowerName = null }: {
  label: string; income: number; goal: number; byNow: number; daysLeft: number;
  /** The lower goal as a share of the year's goal; null when there's only one. */
  lowerShare?: number | null; goalName?: string; lowerName?: string | null;
}) {
  const pct = goal > 0 ? income / goal : 0;
  const mark = goal > 0 ? Math.min(1, byNow / goal) : 0;
  const lowerMark = lowerShare != null ? mark * lowerShare : null;
  const st = status2(income, lowerShare != null ? byNow * lowerShare : null, byNow);
  const delta = income - byNow;
  const lowerByNow = lowerShare != null ? byNow * lowerShare : null;
  // Between the two goals the bar is amber, so the words say both halves:
  // what it has cleared as well as what it's short of. Red alone there would
  // contradict the status beside it.
  const said = delta >= 0
    ? { k: "g", t: `${money(delta)} ahead${goalName ? ` of the ${goalName} goal` : ""}` }
    : lowerByNow != null && income >= lowerByNow
      ? { k: "", t: `${money(income - lowerByNow)} past the ${lowerName ?? "lower"} goal, ${money(-delta)} short of ${goalName ?? "the goal"}` }
      : { k: "b", t: `${money(-delta)} behind${goalName ? ` the ${goalName} goal` : ""}` };
  return (
    <section className="pk-card fo-hero" aria-label={`${label} so far`}>
      <div className="fo-hh"><b>{label} so far</b><span>{daysLeft === 0 ? "the last day" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}</span><Pill st={st} /></div>
      <div className="fo-big"><span className="fo-fig">{money(income)}</span><span>of {money(goal)} this month{goalName ? ` toward ${goalName}` : ""} · {Math.round(pct * 100)}%</span></div>
      <div className="fo-track" role="img" aria-label={`${Math.round(pct * 100)}% of the month's goal, ${Math.round(mark * 100)}% expected by today`}>
        <i className={`st-${st.k}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
        {lowerMark != null && <span className="fo-mk lower" style={{ left: `${lowerMark * 100}%` }} />}
        <span className="fo-mk" style={{ left: `${mark * 100}%` }} />
      </div>
      <div className="fo-leg">
        <span><i className={`st-${st.k}`} />Invoiced so far, ex GST</span>
        {lowerByNow != null && <span><i className="mk lower" />{lowerName ? `${lowerName} goal` : "Lower goal"} by today, {money(lowerByNow)}</span>}
        <span><i className="mk" />{goalName ? `${goalName} goal` : "Where it should be"} by today, {money(byNow)}</span>
        <b className={said.k || undefined}>{said.t}</b>
      </div>
    </section>
  );
}

/**
 * Each month of the goal's year: what was invoiced as a bar, the month's own
 * goal as a tick across it. A month that made its goal is green, this one
 * orange, the rest dark; months to come show their goal alone.
 */
export function MonthBars({ months, now }: { months: MonthRow[]; now: number }) {
  const W = 640, H = 250, L = 46, R = 8, T = 22, B = 26;
  const top = Math.max(1, ...months.map((m) => Math.max(m.goal, m.income ?? 0)));
  const step = top > 200_000 ? 100_000 : top > 100_000 ? 50_000 : top > 40_000 ? 20_000 : 10_000;
  const max = Math.ceil(top / step) * step;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / months.length, bw = slot * 0.56;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fo-chart" role="img" aria-label="Invoiced each month against its goal">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="fo-grid" />
          <text x={L - 6} y={y(t) + 4} className="fo-ax" textAnchor="end">{k(t)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const x = L + i * slot + (slot - bw) / 2;
        const has = m.started && m.income != null;
        const cls = i === now ? "now" : has && m.income! >= m.goal ? "met" : "under";
        return (
          <g key={m.label}>
            {has && <rect x={x} y={y(Math.max(0, m.income!))} width={bw} height={Math.max(0, y(0) - y(Math.max(0, m.income!)))} rx={4} className={`fo-bar ${cls}`} />}
            {/* Above whichever is higher, the bar or its goal, so the tick never strikes the figure through. */}
            {has && <text x={x + bw / 2} y={y(Math.max(0, m.income!, m.goal)) - 7} className="fo-val" textAnchor="middle">{k(m.income!)}</text>}
            <line x1={x - 3} x2={x + bw + 3} y1={y(m.goal)} y2={y(m.goal)} className={`fo-gl${m.started ? "" : " later"}`} />
            <text x={x + bw / 2} y={H - 8} className="fo-ax" textAnchor="middle">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

const BANDS = [
  { k: "due", label: "Not due yet", from: -Infinity, to: 0 },
  { k: "d30", label: "1–30 days over", from: 1, to: 30 },
  { k: "d60", label: "31–60 days over", from: 31, to: 60 },
  { k: "old", label: "Over 60 days", from: 61, to: Infinity },
];

/** What's owed to us, split by how late it is: one bar, and the figure for each part beside it. */
export function OwedByAge({ list }: { list: OwedInvoice[] }) {
  const total = list.reduce((t, i) => t + i.amountDue, 0);
  const parts = BANDS.map((b) => {
    const rows = list.filter((i) => i.daysOver >= b.from && i.daysOver <= b.to);
    return { ...b, n: rows.length, sum: rows.reduce((t, i) => t + i.amountDue, 0) };
  });
  return (
    <div className="fo-owed">
      <div className="fo-stack" role="img" aria-label={parts.map((p) => `${p.label} ${money(p.sum)}`).join(", ")}>
        {parts.filter((p) => p.sum > 0).map((p) => <span key={p.k} className={p.k} style={{ width: `${(p.sum / Math.max(1, total)) * 100}%` }} />)}
      </div>
      {parts.map((p) => (
        <div key={p.k} className="fo-row">
          <span><i className={p.k} />{p.label}{p.n ? <em>{p.n} {p.n === 1 ? "invoice" : "invoices"}</em> : null}</span>
          <b>{money(p.sum)}</b>
        </div>
      ))}
      <Link className="fo-more" href="/portal/money">Who owes it ›</Link>
    </div>
  );
}
