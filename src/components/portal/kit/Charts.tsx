/**
 * The prototype's two charts, drawn on the server as SVG. One scale places
 * the marks, the gridlines and the labels, and every colour is a theme token,
 * so both read in light and dark.
 */

const kd = (n: number) => `$${(Math.round(n / 100) / 10).toLocaleString("en-AU")}K`;
const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;

/** "Nice" top of an axis: 1, 2, 2.5 or 5 times a power of ten, just above the most. */
function niceTop(v: number) {
  if (!(v > 0)) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/**
 * Sold today, added up hour by hour from 7 am, against a usual day: the day's
 * goal, spread with more of it early, the way quotes get signed off.
 * `points` are [hour of day, sold by then], in order.
 */
export function SoldTodayChart({ points, usual, nowHour }: { points: [number, number][]; usual: number | null; nowHour: number }) {
  const W = 760, H = 250, L = 56, R = 18, T = 26, B = 28;
  const h0 = 7, h1 = 18;
  const last = points.length ? points[points.length - 1][1] : 0;
  const hi = niceTop(Math.max(usual ?? 0, last) * 1.12);
  const X = (h: number) => L + ((W - L - R) * (Math.min(h1, Math.max(h0, h)) - h0)) / (h1 - h0);
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  const usualAt = (h: number) => (usual ?? 0) * (1 - Math.pow(1 - (h - h0) / (h1 - h0), 1.6));
  const usualPath = usual ? Array.from({ length: 23 }, (_, i) => h0 + (i * (h1 - h0)) / 22).map((h, i) => `${i ? "L" : "M"}${X(h).toFixed(1)} ${Y(usualAt(h)).toFixed(1)}`).join(" ") : "";
  // A step line: what was sold holds until the next sale.
  const end = Math.min(h1, Math.max(h0, nowHour));
  const steps: [number, number][] = [[h0, 0]];
  for (const [h, v] of points) {
    if (h < h0) { steps[0] = [h0, v]; continue; }
    steps.push([h, steps[steps.length - 1][1]], [h, v]);
  }
  steps.push([end, steps[steps.length - 1][1]]);
  const line = steps.map(([h, v], i) => `${i ? "L" : "M"}${X(h).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const ticks = [0, hi / 2, hi];
  const hours = [7, 9, 11, 13, 15, 17];
  const lab = (h: number) => (h === 12 ? "12" : h > 12 ? String(h - 12) : h === 7 ? "7am" : String(h));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Sold today ${money(last)}${usual ? ` against a usual day of ${money(usual)}` : ""}`} className="pk-chart">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{kd(v)}</text>
        </g>
      ))}
      {hours.map((h) => <text key={h} x={X(h)} y={H - 6} textAnchor="middle" className="ax">{lab(h)}</text>)}
      {usual ? (
        <>
          <path d={usualPath} fill="none" stroke="var(--ink3)" strokeWidth="1.8" strokeDasharray="4 5" />
          <text x={W - R} y={Y(usual) - 8} textAnchor="end" className="ax">usual day {money(usual)}</text>
        </>
      ) : null}
      <path d={`${line} L${X(end)} ${Y(0)} L${X(h0)} ${Y(0)} Z`} fill="var(--ink)" fillOpacity=".07" />
      <path d={line} fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx={X(end)} cy={Y(last)} r="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.6" />
      <text x={X(end) - 10} y={Y(last) - 12} textAnchor="end" className="ax strong">{money(last)}</text>
    </svg>
  );
}

/**
 * Sold each week: a bar a week, green where it beat the weekly goal, with the
 * goal as a dashed line. The last bar is this week, still going, so it's
 * drawn open.
 */
export function WeekBars({ weeks, goal }: { weeks: { label: string; value: number }[]; goal: number | null }) {
  const W = 760, H = 220, L = 56, R = 12, T = 22, B = 28;
  const hi = niceTop(Math.max(goal ?? 0, ...weeks.map((w) => w.value)) * 1.15);
  const n = Math.max(1, weeks.length);
  const slot = (W - L - R) / n, bw = Math.min(46, slot * 0.6);
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Sold each week for the last ${n} weeks${goal ? `, against a weekly goal of ${money(goal)}` : ""}`} className="pk-chart">
      {[0, hi / 2, hi].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{kd(v)}</text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const current = i === weeks.length - 1;
        const beat = goal != null && w.value >= goal;
        return (
          <g key={w.label}>
            <rect x={x} y={Y(Math.max(0, w.value))} width={bw} height={Math.max(0, Y(0) - Y(Math.max(0, w.value)))} rx="4"
              fill={current ? "var(--quiet)" : beat ? "var(--good-f)" : "var(--ink4)"} stroke={current ? "var(--ink3)" : "none"} strokeDasharray={current ? "3 3" : undefined} />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="ax">{w.label}</text>
          </g>
        );
      })}
      {goal ? (
        <>
          <line x1={L} x2={W - R} y1={Y(goal)} y2={Y(goal)} stroke="var(--ink)" strokeDasharray="3 3" />
          <text x={W - R} y={Y(goal) - 6} textAnchor="end" className="ax strong">weekly goal {money(goal)}</text>
        </>
      ) : null}
    </svg>
  );
}

/**
 * Net profit, a bar a month, with each month's goal as a short dashed line
 * across its bar. A loss hangs below the zero line, so a bad month reads by
 * its shape and not only its colour. The last month is still going, so it's
 * drawn open.
 */
export function ProfitBars({ months }: { months: { label: string; value: number; goal: number | null }[] }) {
  const W = 760, H = 240, L = 56, R = 12, T = 18, B = 28;
  const vals = months.flatMap((m) => [m.value, m.goal ?? 0]);
  const hi = niceTop(Math.max(1, ...vals) * 1.12);
  const lo = Math.min(0, ...vals) < 0 ? -niceTop(-Math.min(...vals) * 1.12) : 0;
  const n = Math.max(1, months.length);
  const slot = (W - L - R) / n, bw = Math.min(40, slot * 0.6);
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const ticks = lo < 0 ? [lo, 0, hi] : [0, hi / 2, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Net profit each month for the last ${n} months`} className="pk-chart">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? "var(--ink3)" : "var(--line)"} />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{v < 0 ? `−${kd(-v)}` : kd(v)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const current = i === months.length - 1;
        const top = Math.min(Y(m.value), Y(0)), h = Math.abs(Y(m.value) - Y(0));
        const fill = m.value < 0 ? "var(--bad-f)" : m.goal != null && m.value >= m.goal ? "var(--good-f)" : "var(--ink4)";
        return (
          <g key={`${m.label}-${i}`}>
            <rect x={x} y={top} width={bw} height={Math.max(1, h)} rx="4" fill={current ? "var(--quiet)" : fill}
              stroke={current ? "var(--ink3)" : "none"} strokeDasharray={current ? "3 3" : undefined}>
              <title>{`${m.label}: ${money(m.value)}${m.goal != null ? ` · goal ${money(m.goal)}` : ""}`}</title>
            </rect>
            {m.goal != null && <line x1={x - bw * 0.15} x2={x + bw * 1.15} y1={Y(m.goal)} y2={Y(m.goal)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 3" />}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="ax">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Money in and money out through the bank, month by month: in solid, out
 * dashed. Drawn wider than the others because it runs the full page width,
 * where a 760 box would scale its labels up half as big again.
 */
export function InOutLines({ points }: { points: { label: string; in: number; out: number }[] }) {
  const W = 1080, H = 260, L = 56, R = 18, T = 20, B = 28;
  const n = points.length;
  if (n < 2) return null;
  const hi = niceTop(Math.max(...points.flatMap((p) => [p.in, p.out])) * 1.12);
  const X = (i: number) => L + ((W - L - R) * i) / (n - 1);
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  const d = (k: "in" | "out") => points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p[k]).toFixed(1)}`).join(" ");
  const last = points[n - 1];
  const inAbove = last.in >= last.out;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Money in against money out for the last ${n} months`} className="pk-chart">
      {[0, hi / 2, hi].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{kd(v)}</text>
        </g>
      ))}
      {points.map((p, i) => <text key={p.label} x={X(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="ax">{p.label}</text>)}
      <path d={d("out")} fill="none" stroke="var(--mid-f)" strokeWidth="2.2" strokeDasharray="5 4" />
      <path d={d("in")} fill="none" stroke="var(--mark)" strokeWidth="2.6" strokeLinejoin="round" />
      <text x={X(n - 1) - 10} y={Y(last.in) + (inAbove ? -10 : 18)} textAnchor="end" className="ax strong">in {kd(last.in)}</text>
      <text x={X(n - 1) - 10} y={Y(last.out) + (inAbove ? 18 : -10)} textAnchor="end" className="ax">out {kd(last.out)}</text>
    </svg>
  );
}
