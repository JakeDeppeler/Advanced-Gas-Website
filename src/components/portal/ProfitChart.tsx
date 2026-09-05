"use client";

import { useState } from "react";

export type ProfitPoint = { label: string; full: string; netProfit: number; ok?: boolean };

const W = 800, H = 230;
const padL = 52, padR = 16, padT = 18, padB = 30;
const plotW = W - padL - padR;
const plotH = H - padT - padB;

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const short = (n: number) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);

/**
 * Profit per period as bars either side of zero. Money in versus money out
 * shows the two flows; this shows what was left, which is the number the month
 * is actually judged on.
 */
export function ProfitChart({ points, spanLabel }: { points: ProfitPoint[]; spanLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;

  const n = points.length;
  const vals = points.map((p) => p.netProfit);
  // Zero always sits inside the range, so a run of losing months still reads as
  // below the line rather than being rescaled to look like growth.
  const hi = Math.max(0, ...vals);
  const lo = Math.min(0, ...vals);
  const pad = (hi - lo || 1) * 0.12;
  const top = hi + pad, bottom = lo - pad;

  const y = (v: number) => padT + (1 - (v - bottom) / (top - bottom)) * plotH;
  const zeroY = y(0);
  const slot = plotW / n;
  const barW = Math.min(46, slot * 0.62);
  const cx = (i: number) => padL + (i + 0.5) * slot;

  const total = vals.reduce((a, v) => a + v, 0);
  const best = points.reduce((a, p) => (p.netProfit > a.netProfit ? p : a));
  const worst = points.reduce((a, p) => (p.netProfit < a.netProfit ? p : a));
  const down = points.filter((p) => p.netProfit < 0).length;

  const every = Math.max(1, Math.ceil(n / 8));
  const hp = hover !== null ? points[hover] : null;
  const tipPct = hover !== null ? Math.min(84, Math.max(16, (cx(hover) / W) * 100)) : 50;

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="pt-mc">
      <div className="pt-mc__legend">
        <span className={`pt-mc__kept${total < 0 ? " is-neg" : ""}`}>Kept over the span <strong>{money(total)}</strong></span>
        <span className="pt-pc__note">Best <strong>{best.full}</strong> {money(best.netProfit)}</span>
        {down > 0 && <span className="pt-pc__note pt-pc__note--bad">{down} {down === 1 ? "period" : "periods"} in the red, worst <strong>{worst.full}</strong></span>}
        {spanLabel && <span className="pt-mc__span">{spanLabel}</span>}
      </div>

      <div className="pt-mc__wrap">
        {hp && (
          <div className="pt-mc__tip" style={{ left: `${tipPct}%` }}>
            <div className="pt-mc__tip-h">{hp.full}</div>
            <div className="pt-mc__tip-r pt-mc__tip-r--net">Profit<strong className={hp.netProfit < 0 ? "is-neg" : ""}>{money(hp.netProfit)}</strong></div>
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="pt-mc__svg" role="img" aria-label="Profit by period" onMouseLeave={() => setHover(null)}>
          {ticks.map((g) => {
            const yy = padT + g * plotH;
            return (
              <g key={g}>
                <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e4e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={padL - 10} y={yy + 3.5} textAnchor="end" className="pt-mc__ytick">{short(top - g * (top - bottom))}</text>
              </g>
            );
          })}

          {points.map((p, i) => {
            const yv = y(p.netProfit);
            const h = Math.max(1.5, Math.abs(yv - zeroY));
            return (
              <rect
                key={i}
                x={cx(i) - barW / 2}
                y={Math.min(yv, zeroY)}
                width={barW}
                height={h}
                rx="3"
                className={`pt-pc__bar${p.netProfit < 0 ? " is-neg" : ""}${hover === i ? " is-on" : ""}`}
              />
            );
          })}

          <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#8992ab" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />

          {points.map((p, i) => (
            i % every === 0 || i === n - 1
              ? <text key={`x${i}`} x={cx(i)} y={H - 10} textAnchor="middle" className="pt-mc__xtick">{p.label}</text>
              : null
          ))}

          {points.map((p, i) => (
            <rect key={`h${i}`} x={cx(i) - slot / 2} y={padT} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      </div>
    </div>
  );
}
