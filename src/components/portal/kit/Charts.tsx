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
 *
 * Hover a week (or tab to it) and its figure shows. The tips are drawn after
 * every bar, so a tip is never under the next week's bar; each week's strip
 * lights its own tip through a sibling rule written for that chart.
 */
export function WeekBars({ weeks, goal }: { weeks: { label: string; value: number }[]; goal: number | null }) {
  const W = 760, H = 220, L = 56, R = 12, T = 22, B = 28;
  const hi = niceTop(Math.max(goal ?? 0, ...weeks.map((w) => w.value)) * 1.15);
  const n = Math.max(1, weeks.length);
  const slot = (W - L - R) / n, bw = Math.min(46, slot * 0.6);
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  const TW = 172;
  const tipH = goal ? 58 : 42;
  const tips = weeks.map((w, i) => {
    const current = i === weeks.length - 1;
    const mid = L + slot * i + slot / 2;
    const x = Math.min(W - R - TW, Math.max(L, mid - TW / 2));
    const y = Math.max(2, Y(Math.max(0, w.value)) - tipH - 8);
    const vs = goal ? w.value - goal : null;
    return { i, x, y, head: `Week of ${w.label}${current ? " · so far" : ""}`, value: money(w.value), vs: vs == null ? null : vs >= 0 ? `${money(vs)} over the goal` : `${money(-vs)} under the goal` };
  });
  const css = weeks.map((_, i) => `.pk-wk .h${i}:hover~.t${i},.pk-wk .h${i}:focus~.t${i}{opacity:1}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Sold each week for the last ${n} weeks${goal ? `, against a weekly goal of ${money(goal)}` : ""}`} className="pk-chart pk-wk">
      <style>{css}</style>
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
          {/* A halo in the card's colour, so a bar crossing the label doesn't run through the words. */}
          <text x={W - R} y={Y(goal) - 6} textAnchor="end" className="ax strong pk-halo">weekly goal {money(goal)}</text>
        </>
      ) : null}
      {weeks.map((w, i) => (
        <rect key={`h${w.label}`} className={`pk-hit h${i}`} x={L + slot * i} y={T} width={slot} height={H - T - B} tabIndex={0}
          aria-label={`${tips[i].head}: ${tips[i].value}${tips[i].vs ? `, ${tips[i].vs}` : ""}`} />
      ))}
      {tips.map((t) => (
        <g key={`t${t.i}`} className={`pk-hovtip t${t.i}`} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`} aria-hidden="true">
          <rect width={TW} height={tipH} rx="9" fill="var(--surface)" stroke="var(--line)" />
          <text x="11" y="17" className="ax">{t.head}</text>
          <text x="11" y="35" className="ax strong pk-tipv">{t.value}</text>
          {t.vs && <text x="11" y="51" className="ax">{t.vs}</text>}
        </g>
      ))}
    </svg>
  );
}
