import Link from "next/link";
import type { MonthRow } from "@/lib/portal/yearGoal";
import type { OwedInvoice } from "@/lib/portal/run/money";
import { money } from "@/lib/portal/run/month";

/**
 * Finance › Overview's pictures: the month against its goal, each month of
 * the year against its own, and what's owed by how late it is. Plain SVG and
 * CSS, coloured from the theme's tokens so they read in light and dark, every
 * bar carrying its figure in words as well.
 */

const k = (n: number) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);

/** This month so far against the month's goal, with where it should be by today marked on the bar. */
export function MonthTrack({ label, income, goal, byNow, daysLeft }: { label: string; income: number; goal: number; byNow: number; daysLeft: number }) {
  const pct = goal > 0 ? income / goal : 0;
  const mark = goal > 0 ? Math.min(1, byNow / goal) : 0;
  const delta = income - byNow;
  return (
    <section className="pk-card fo-hero" aria-label={`${label} so far`}>
      <div className="fo-hh"><b>{label} so far</b><span>{daysLeft === 0 ? "the last day" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}</span></div>
      <div className="fo-big"><span className="fo-fig">{money(income)}</span><span>of the {money(goal)} goal · {Math.round(pct * 100)}%</span></div>
      <div className="fo-track" role="img" aria-label={`${Math.round(pct * 100)}% of the month's goal, ${Math.round(mark * 100)}% expected by today`}>
        <i className={pct >= mark ? "ok" : "low"} style={{ width: `${Math.min(100, pct * 100)}%` }} />
        <span className="fo-mk" style={{ left: `${mark * 100}%` }} />
      </div>
      <div className="fo-leg">
        <span><i className={pct >= mark ? "ok" : "low"} />Invoiced so far, ex GST</span>
        <span><i className="mk" />Where it should be today, {Math.round(mark * 100)}%</span>
        <b className={delta >= 0 ? "g" : "b"}>{delta >= 0 ? `${money(delta)} ahead` : `${money(-delta)} behind`}</b>
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
