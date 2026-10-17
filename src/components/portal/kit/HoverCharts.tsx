"use client";

import { useState } from "react";

/**
 * The two money charts you can point at: hover (or tap, or tab to) a month
 * and it says the figures in words, with the gap in green when it went our
 * way and red when it didn't — and a sign on it, so colour is never all it
 * says. Drawn as SVG to one scale, like the server charts in Charts.tsx.
 */

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const kd = (n: number) => `$${(Math.round(n / 100) / 10).toLocaleString("en-AU")}K`;
function niceTop(v: number) {
  if (!(v > 0)) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: React.ReactNode }) {
  // Kept inside the plot: flips to the left of the point past the middle.
  const left = x > w / 2;
  return (
    <div className="pk-tip" style={{ left: `${(x / w) * 100}%`, top: y, transform: `translate(${left ? "calc(-100% - 12px)" : "12px"}, -50%)` }} role="status">
      {children}
    </div>
  );
}

export type InOutPoint = { label: string; full: string; in: number; out: number };

/** Money in (solid) against money out (dashed), the gap between them shaded green or red month by month. */
export function InOutChart({ points, inLabel = "Money in", outLabel = "Money out", gap: gapWords = ["Kept", "Short"] }: {
  points: InOutPoint[]; inLabel?: string; outLabel?: string;
  /** What the gap is called each way: the bank keeps or falls short, the P&L makes a profit or a loss. */
  gap?: [string, string];
}) {
  const [on, setOn] = useState<number | null>(null);
  const W = 1080, H = 280, L = 60, R = 20, T = 20, B = 30;
  const n = points.length;
  if (n < 2) return null;
  const hi = niceTop(Math.max(...points.flatMap((p) => [p.in, p.out])) * 1.12);
  const X = (i: number) => L + ((W - L - R) * i) / (n - 1);
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  const path = (k: "in" | "out") => points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p[k]).toFixed(1)}`).join(" ");
  const p = on != null ? points[on] : null;
  const gap = p ? p.in - p.out : 0;
  return (
    <div className="pk-hchart" onMouseLeave={() => setOn(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="pk-chart" role="img" aria-label={`${inLabel} against ${outLabel.toLowerCase()} for the last ${n} months`}>
        {[0, hi / 2, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{kd(v)}</text>
          </g>
        ))}
        {/* The gap, a band per month: green where more came in than went out. */}
        {points.slice(0, -1).map((a, i) => {
          const b = points[i + 1];
          const good = a.in + b.in >= a.out + b.out;
          return <path key={a.label} d={`M${X(i)} ${Y(a.in)} L${X(i + 1)} ${Y(b.in)} L${X(i + 1)} ${Y(b.out)} L${X(i)} ${Y(a.out)} Z`} fill={good ? "var(--good-f)" : "var(--bad-f)"} fillOpacity=".16" />;
        })}
        <path d={path("out")} fill="none" stroke="var(--ink3)" strokeWidth="2.2" strokeDasharray="6 5" />
        <path d={path("in")} fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
        {points.map((pt, i) => <text key={pt.label} x={X(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className={`ax${on === i ? " strong" : ""}`}>{pt.label}</text>)}
        {on != null && p && (
          <g>
            <line x1={X(on)} x2={X(on)} y1={T} y2={H - B} stroke="var(--ink3)" strokeDasharray="3 3" />
            <circle cx={X(on)} cy={Y(p.in)} r="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.4" />
            <circle cx={X(on)} cy={Y(p.out)} r="5" fill="var(--surface)" stroke="var(--ink3)" strokeWidth="2.4" />
          </g>
        )}
        {/* One target per month, the full height, so a hover anywhere in its column finds it. */}
        {points.map((pt, i) => {
          const half = (W - L - R) / (n - 1) / 2;
          return (
            <rect key={`h-${pt.label}`} x={Math.max(L, X(i) - half)} y={T} width={Math.min(W - R, X(i) + half) - Math.max(L, X(i) - half)} height={H - T - B}
              fill="transparent" tabIndex={0} aria-label={`${pt.full}: ${inLabel.toLowerCase()} ${money(pt.in)}, ${outLabel.toLowerCase()} ${money(pt.out)}, ${(pt.in >= pt.out ? gapWords[0] : gapWords[1]).toLowerCase()} ${money(Math.abs(pt.in - pt.out))}`}
              onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)} onClick={() => setOn(i)} style={{ cursor: "pointer", outline: "none" }} />
          );
        })}
      </svg>
      {p && on != null && (
        <Tip x={X(on)} y={Y(Math.max(p.in, p.out))} w={W}>
          <b>{p.full}</b>
          <span>{inLabel} <em>{money(p.in)}</em></span>
          <span>{outLabel} <em>{money(p.out)}</em></span>
          <span className={gap >= 0 ? "g" : "b"}>{gap >= 0 ? `▲ ${gapWords[0]}` : `▼ ${gapWords[1]}`} <em>{money(Math.abs(gap))}</em></span>
        </Tip>
      )}
    </div>
  );
}

export type GoalBar = { label: string; full: string; value: number | null; goal: number | null; state: "done" | "now" | "future" };

/** A bar a month against that month's goal: green when it made it, red when it didn't. */
export function GoalBars({ months, what = "Invoiced" }: { months: GoalBar[]; what?: string }) {
  const [on, setOn] = useState<number | null>(null);
  const W = 1080, H = 260, L = 60, R = 16, T = 18, B = 30;
  const n = Math.max(1, months.length);
  const hi = niceTop(Math.max(1, ...months.flatMap((m) => [m.value ?? 0, m.goal ?? 0])) * 1.12);
  const slot = (W - L - R) / n, bw = Math.min(56, slot * 0.6);
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  const m = on != null ? months[on] : null;
  const d = m && m.value != null && m.goal != null ? m.value - m.goal : null;
  return (
    <div className="pk-hchart" onMouseLeave={() => setOn(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="pk-chart" role="img" aria-label={`${what} each month against its goal`}>
        {[0, hi / 2, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{kd(v)}</text>
          </g>
        ))}
        {months.map((mo, i) => {
          const x = L + slot * i + (slot - bw) / 2;
          const made = mo.value != null && mo.goal != null && mo.value >= mo.goal;
          const fill = mo.state === "future" || mo.value == null ? "none" : mo.state === "now" ? "var(--quiet)" : mo.goal == null ? "var(--ink4)" : made ? "var(--good-f)" : "var(--bad-f)";
          const v = mo.state === "future" ? mo.goal ?? 0 : mo.value ?? 0;
          // Nothing to draw for a month Xero didn't answer, or one still to come with no goal.
          const draw = !(mo.state === "future" && mo.goal == null) && !(mo.value == null && mo.state !== "future");
          return (
            <g key={mo.label} opacity={on != null && on !== i ? 0.55 : 1}>
              {draw && <rect x={x} y={Y(v)} width={bw} height={Math.max(1, Y(0) - Y(v))} rx="5" fill={fill}
                stroke={mo.state === "done" && mo.value != null ? "none" : "var(--ink3)"} strokeDasharray={mo.state === "done" ? undefined : "4 3"} />}
              {mo.goal != null && mo.state !== "future" && <line x1={x - bw * 0.15} x2={x + bw * 1.15} y1={Y(mo.goal)} y2={Y(mo.goal)} stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="4 3" />}
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className={`ax${on === i ? " strong" : ""}`}>{mo.label}</text>
              <rect x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent" tabIndex={0}
                aria-label={`${mo.full}: ${mo.value == null ? "no figure" : money(mo.value)}${mo.goal != null ? `, goal ${money(mo.goal)}` : ""}`}
                onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)} onClick={() => setOn(i)} style={{ cursor: "pointer", outline: "none" }} />
            </g>
          );
        })}
      </svg>
      {m && on != null && (
        <Tip x={L + slot * on + slot / 2} y={Y(Math.max(m.value ?? 0, m.goal ?? 0))} w={W}>
          <b>{m.full}{m.state === "now" ? " · so far" : m.state === "future" ? " · to come" : ""}</b>
          {m.state !== "future" && <span>{what} <em>{m.value == null ? "" : money(m.value)}</em></span>}
          {m.goal != null && <span>Goal <em>{money(m.goal)}</em></span>}
          {d != null && m.state === "done" && <span className={d >= 0 ? "g" : "b"}>{d >= 0 ? "▲ Over by" : "▼ Short by"} <em>{money(Math.abs(d))}</em></span>}
          {d != null && m.state === "now" && <span>{money(Math.max(0, -d))} still to go</span>}
        </Tip>
      )}
    </div>
  );
}

export type LoanPoint = { label: string; full: string; balance: number; payment: number; interest: number; principal: number; paid: boolean };

/**
 * What's owing on a loan after each repayment: solid up to today, dashed for
 * what's still to come. Point at a month for that repayment split into
 * interest and what it took off the balance.
 */
export function LoanChart({ points, financed }: { points: LoanPoint[]; financed: number }) {
  const [on, setOn] = useState<number | null>(null);
  const W = 1080, H = 260, L = 64, R = 16, T = 16, B = 30;
  const n = points.length;
  if (n < 2) return null;
  const hi = niceTop(financed * 1.05);
  const X = (i: number) => L + ((W - L - R) * i) / n;
  const Y = (v: number) => T + (H - T - B) * (1 - v / hi);
  // Point 0 is the day the money was lent; point i is after repayment i.
  const at = (i: number) => (i === 0 ? financed : points[i - 1].balance);
  const lastPaid = points.reduce((k, p, i) => (p.paid ? i + 1 : k), 0);
  const line = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, j) => a + j).map((i, j) => `${j ? "L" : "M"}${X(i).toFixed(1)} ${Y(at(i)).toFixed(1)}`).join(" ");
  const area = `${line(0, lastPaid)} L${X(lastPaid)} ${Y(0)} L${X(0)} ${Y(0)} Z`;
  const step = Math.max(1, Math.ceil(n / 8));
  const p = on != null ? points[on] : null;
  return (
    <div className="pk-hchart" onMouseLeave={() => setOn(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="pk-chart" role="img" aria-label={`What's owing after each of ${n} repayments`}>
        {[0, hi / 2, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{kd(v)}</text>
          </g>
        ))}
        {lastPaid > 0 && <path d={area} fill="var(--good-f)" fillOpacity=".14" />}
        {lastPaid > 0 && <path d={line(0, lastPaid)} fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />}
        {lastPaid < n && <path d={line(lastPaid, n)} fill="none" stroke="var(--ink3)" strokeWidth="2.2" strokeDasharray="6 5" />}
        {lastPaid > 0 && lastPaid < n && (
          <g>
            <line x1={X(lastPaid)} x2={X(lastPaid)} y1={T} y2={H - B} stroke="var(--ink3)" strokeDasharray="3 3" />
            <circle cx={X(lastPaid)} cy={Y(at(lastPaid))} r="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.4" />
            <text x={X(lastPaid) + 8} y={T + 12} className="ax strong">today</text>
          </g>
        )}
        {points.map((pt, i) => ((i % step === 0 && n - 1 - i >= step / 2) || i === n - 1) && (
          <text key={pt.full} x={X(i + 1)} y={H - 8} textAnchor={i === n - 1 ? "end" : "middle"} className={`ax${on === i ? " strong" : ""}`}>{pt.label}</text>
        ))}
        {on != null && <circle cx={X(on + 1)} cy={Y(at(on + 1))} r="4.5" fill="var(--ink)" />}
        {points.map((pt, i) => (
          <rect key={`h-${pt.full}`} x={X(i + 0.5)} y={T} width={(W - L - R) / n} height={H - T - B} fill="transparent" tabIndex={0}
            aria-label={`${pt.full}: repayment ${money(pt.payment)}, ${money(pt.interest)} interest, owing ${money(pt.balance)} after`}
            onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)} onClick={() => setOn(i)} style={{ cursor: "pointer", outline: "none" }} />
        ))}
      </svg>
      {p && on != null && (
        <Tip x={X(on + 1)} y={Y(at(on + 1))} w={W}>
          <b>{p.full}{p.paid ? " · paid" : " · to come"}</b>
          <span>Repayment <em>{money(p.payment)}</em></span>
          <span>Interest <em>{money(p.interest)}</em></span>
          <span className="g">▼ Off the loan <em>{money(p.principal)}</em></span>
          <span>Owing after <em>{money(p.balance)}</em></span>
        </Tip>
      )}
    </div>
  );
}
