"use client";

import { useState } from "react";

// `ok` false means Xero didn't answer for that span — worth saying out loud,
// because a failed read otherwise draws as a real $0 and quietly drags the
// totals down.
export type MonthPoint = { label: string; full: string; income: number; expenses: number; netProfit: number; ok?: boolean };

const W = 800, H = 250;
const padL = 52, padR = 16, padT = 16, padB = 30;
const plotW = W - padL - padR;
const plotH = H - padT - padB;

const full = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const short = (n: number) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);

export function MoneyChart({ points, spanLabel }: { points: MonthPoint[]; spanLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;

  const n = points.length;
  const yMax = Math.max(1, ...points.map((p) => Math.max(p.income, p.expenses))) * 1.12;
  const x = (i: number) => padL + (i / (n - 1)) * plotW;
  const y = (v: number) => padT + (1 - v / yMax) * plotH;

  const line = (key: "income" | "expenses") => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = (key: "income" | "expenses") => `${line(key)} L${x(n - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  const grid = [0, 0.25, 0.5, 0.75, 1];
  const band = plotW / (n - 1);
  const hp = hover !== null ? points[hover] : null;

  // Totals across the whole visible span — more useful than the last point alone.
  const totalIn = points.reduce((a, p) => a + p.income, 0);
  const totalOut = points.reduce((a, p) => a + p.expenses, 0);
  const kept = totalIn - totalOut;

  // Keep the tooltip inside the panel at the first and last points.
  const rawPct = hover !== null ? (x(hover) / W) * 100 : 50;
  const tipPct = Math.min(84, Math.max(16, rawPct));

  const every = Math.max(1, Math.ceil(n / 8));
  const missing = points.filter((p) => p.ok === false).length;

  return (
    <div className="pt-mc">
      <div className="pt-mc__legend">
        <span className="pt-mc__key pt-mc__key--in"><i /> Money in <strong>{full(totalIn)}</strong></span>
        <span className="pt-mc__key pt-mc__key--out"><i /> Money out <strong>{full(totalOut)}</strong></span>
        <span className={`pt-mc__kept${kept < 0 ? " is-neg" : ""}`}>Kept <strong>{full(kept)}</strong></span>
        {spanLabel && <span className="pt-mc__span">{spanLabel}</span>}
      </div>

      {missing > 0 && (
        <div className="pt-mc__warn">
          {missing} of {n} points didn&rsquo;t load from Xero, so the totals are short. Reload in a minute.
        </div>
      )}

      <div className="pt-mc__wrap">
        {hp && (
          <div className="pt-mc__tip" style={{ left: `${tipPct}%` }}>
            <div className="pt-mc__tip-h">{hp.full}</div>
            <div className="pt-mc__tip-r"><span className="pt-mc__dot pt-mc__dot--in" />In<strong>{full(hp.income)}</strong></div>
            <div className="pt-mc__tip-r"><span className="pt-mc__dot pt-mc__dot--out" />Out<strong>{full(hp.expenses)}</strong></div>
            <div className="pt-mc__tip-r pt-mc__tip-r--net">Profit<strong className={hp.netProfit < 0 ? "is-neg" : ""}>{full(hp.netProfit)}</strong></div>
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="pt-mc__svg" role="img" aria-label="Money in versus money out" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="mcIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2aa7e0" stopOpacity="0.28" /><stop offset="1" stopColor="#2aa7e0" stopOpacity="0" /></linearGradient>
            <linearGradient id="mcOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e0912a" stopOpacity="0.24" /><stop offset="1" stopColor="#e0912a" stopOpacity="0" /></linearGradient>
          </defs>

          {grid.map((g) => {
            const yy = padT + g * plotH;
            const val = yMax * (1 - g);
            return (
              <g key={g}>
                <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e4e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={padL - 10} y={yy + 3.5} textAnchor="end" className="pt-mc__ytick">{short(val)}</text>
              </g>
            );
          })}

          <path d={area("expenses")} fill="url(#mcOut)" />
          <path d={area("income")} fill="url(#mcIn)" />
          <path d={line("expenses")} fill="none" stroke="#e0912a" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          <path d={line("income")} fill="none" stroke="#2aa7e0" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            i % every === 0 || i === n - 1
              ? <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="pt-mc__xtick">{p.label}</text>
              : null
          ))}

          {hover !== null && (
            <g>
              <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + plotH} stroke="#8992ab" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <circle cx={x(hover)} cy={y(points[hover].expenses)} r="3.5" fill="#e0912a" stroke="#fff" strokeWidth="1.5" />
              <circle cx={x(hover)} cy={y(points[hover].income)} r="3.5" fill="#2aa7e0" stroke="#fff" strokeWidth="1.5" />
            </g>
          )}

          {points.map((p, i) => (
            <rect key={`h${i}`} x={x(i) - band / 2} y={padT} width={band} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      </div>
    </div>
  );
}
