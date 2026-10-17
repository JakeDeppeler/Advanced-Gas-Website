import type { FlowMonth } from "@/lib/portal/run/flow";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const kAxis = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);

function niceMax(v: number): number {
  if (v <= 0) return 100_000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/**
 * A smooth line through the points, with the bends held inside the chart: a
 * plain Catmull-Rom curve dips below the axis between a high month and an
 * empty one, which would draw money going negative that never did.
 */
function smooth(pts: Array<[number, number]>, top: number, base: number): string {
  if (pts.length < 2) return "";
  const cl = (y: number) => Math.max(top, Math.min(base, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, cl(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, cl(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Collected against invoiced, month by month, as Rapport draws its cash flow:
 * collected a solid line over a soft fill, invoiced dashed. Hovering a month
 * shows both figures. This month is a month so far, and says so.
 */
export function FlowChart({ months }: { months: FlowMonth[] }) {
  const W = 760, H = 270, L = 52, R = 14, T = 14, B = 34;
  const hasPaid = months.some((m) => m.collected != null);
  const max = niceMax(Math.max(...months.map((m) => Math.max(m.invoiced, m.collected ?? 0))));
  const x = (i: number) => L + (months.length > 1 ? (i * (W - L - R)) / (months.length - 1) : 0);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const base = y(0);
  const inv = smooth(months.map((m, i) => [x(i), y(m.invoiced)]), T, base);
  const col = hasPaid ? smooth(months.map((m, i) => [x(i), y(m.collected ?? 0)]), T, base) : "";
  const ticks = [0, max / 2, max];
  const colW = (W - L - R) / Math.max(1, months.length - 1);
  return (
    <svg className="rp-chart mf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Collected and invoiced, month by month, for ${months.length} months`}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="rp-gridline" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text className="rp-axis" x={L - 10} y={y(t) + 4} textAnchor="end">{kAxis(t)}</text>
        </g>
      ))}
      {hasPaid && <path className="mf-area" d={`${col} L${x(months.length - 1)},${base} L${x(0)},${base} Z`} />}
      <path className="mf-inv" d={inv} pathLength={1} />
      {hasPaid && <path className="mf-col" d={col} pathLength={1} />}
      {months.map((m, i) => {
        const tx = Math.min(W - R - 150, Math.max(L, x(i) - 75));
        return (
          <g key={m.key} className="rp-col">
            <rect x={x(i) - colW / 2} y={T} width={colW} height={H - T - B} fill="transparent" />
            <text className="rp-axis" x={x(i)} y={H - 10} textAnchor="middle">{m.label}{m.current ? " so far" : ""}</text>
            {m.collected != null && <circle className="rp-pt mf-pt" cx={x(i)} cy={y(m.collected)} r={5} />}
            <g className="rp-tip">
              <rect x={tx} y={T} width={150} height={46} rx={10} />
              <text x={tx + 12} y={T + 19}>{m.collected != null ? `${m0(m.collected)} collected` : "Payments not synced"}</text>
              <text className="sub" x={tx + 12} y={T + 36}>{m0(m.invoiced)} invoiced</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
