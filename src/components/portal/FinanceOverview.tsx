"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MoneyChart, type MonthPoint } from "@/components/portal/MoneyChart";

type PL = { income: number; expenses: number; netProfit: number } | null;

const TF_OPTS = [{ k: "6m", label: "6M" }, { k: "12m", label: "12M" }, { k: "q", label: "Qtr" }];

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const pct = (n: number) => `${Math.round(n * 100)}%`;

type Signal = { tone: "good" | "watch" | "bad"; text: string; value?: string };

function Icon({ tone }: { tone: Signal["tone"] }) {
  const d = tone === "good" ? "M5 13l4 4L19 7" : tone === "bad" ? "M6 6l12 12M18 6L6 18" : "M12 8v5M12 16v.5";
  return (
    <span className={`pt-sig__ico pt-sig__ico--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}

export function FinanceOverview({ month, lastMonth, year, series, tf }: { month: PL; lastMonth: PL; year: PL; series: MonthPoint[]; tf: string }) {
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => {
    try {
      const s = localStorage.getItem("ag_profit_target");
      if (s) setTarget(Number(s) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProfit = month?.netProfit ?? null;
  const paced = monthProfit !== null ? (monthProfit / dayOfMonth) * daysInMonth : null;
  const yearProfit = year?.netProfit ?? null;
  const margin = year && year.income > 0 ? year.netProfit / year.income : null;

  // progress to target
  const yearElapsed = Math.min(1, (Date.now() - new Date(now.getFullYear(), 0, 1).getTime()) / (365 * 86_400_000));
  const expectedYTD = target ? target * yearElapsed : null;
  const targetProgress = target && target > 0 && yearProfit !== null ? Math.max(0, Math.min(1, yearProfit / target)) : null;
  const onPace = expectedYTD !== null && yearProfit !== null ? yearProfit >= expectedYTD : null;

  // signals
  const signals: Signal[] = [];
  if (monthProfit !== null) {
    signals.push(monthProfit >= 0
      ? { tone: "good", text: "In profit this month", value: money(monthProfit) }
      : { tone: "bad", text: "Running at a loss this month", value: money(monthProfit) });
  }
  if (monthProfit !== null && lastMonth?.netProfit !== undefined && lastMonth) {
    const lm = lastMonth.netProfit;
    if (paced !== null) {
      signals.push(paced >= lm
        ? { tone: "good", text: `Pacing ahead of last month`, value: `${money(paced)} vs ${money(lm)}` }
        : { tone: "watch", text: `Pacing behind last month`, value: `${money(paced)} vs ${money(lm)}` });
    }
  }
  if (yearProfit !== null) {
    signals.push(yearProfit >= 0
      ? { tone: "good", text: "In profit for the year", value: money(yearProfit) }
      : { tone: "bad", text: "Behind for the year", value: money(yearProfit) });
  }
  if (margin !== null) {
    signals.push(margin >= 0.15
      ? { tone: "good", text: "Healthy margin", value: `${pct(margin)} kept` }
      : margin >= 0.05
        ? { tone: "watch", text: "Margin is thin", value: `${pct(margin)} kept` }
        : { tone: "bad", text: "Margin very low", value: `${pct(margin)} kept` });
  }
  if (onPace !== null && target) {
    signals.push(onPace
      ? { tone: "good", text: `On track for your ${money(target)} target` }
      : { tone: "bad", text: `Behind your ${money(target)} target`, value: expectedYTD !== null && yearProfit !== null ? `${money(expectedYTD - yearProfit)} to catch up` : undefined });
  }

  return (
    <div className="pt-ov">
      {/* Where we're at */}
      <section className="pt-ov__now">
        <div className="pt-ov__nowmain">
          <span className="pt-ov__nowlabel">Profit this month, so far</span>
          <div className={`pt-ov__big${monthProfit !== null && monthProfit < 0 ? " is-neg" : ""}`}>{monthProfit !== null ? money(monthProfit) : "—"}</div>
          {paced !== null && lastMonth && (
            <div className="pt-ov__nowsub">On pace for ~{money(paced)} this month · last month {money(lastMonth.netProfit)}</div>
          )}
        </div>
        <div className="pt-ov__nowside">
          <div><span>This year</span><strong>{yearProfit !== null ? money(yearProfit) : "—"}</strong></div>
          <div><span>Margin</span><strong>{margin !== null ? pct(margin) : "—"}</strong></div>
        </div>
      </section>

      {/* Money in vs money out */}
      {series.length >= 2 && (
        <section className="pt-panel">
          <div className="pt-ov__charthead">
            <h2 className="pt-panel__h">Money in vs money out</h2>
            <div className="pt-ov__tf">
              {TF_OPTS.map((o) => (
                <Link key={o.k} href={`/portal/finance?tf=${o.k}`} scroll={false} className={`pt-ov__tfbtn${tf === o.k ? " is-on" : ""}`}>{o.label}</Link>
              ))}
            </div>
          </div>
          <MoneyChart points={series} />
        </section>
      )}

      {/* How we're going */}
      {targetProgress !== null && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">How we&rsquo;re going</h2>
          <div className="pt-fin__bar2"><span style={{ width: `${targetProgress * 100}%` }} /></div>
          <div className="pt-fin__progresstxt">
            <span><strong>{money(yearProfit as number)}</strong> of {money(target as number)} target · {pct(targetProgress)}</span>
            <span className={onPace ? "pt-fin__hit" : ""}>{onPace ? "On or ahead of pace 👍" : "Behind pace — needs a lift"}</span>
          </div>
        </section>
      )}

      {/* Good vs watch */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">What&rsquo;s going well, and what to watch</h2>
        <div className="pt-sig">
          {signals.length === 0 ? (
            <div className="pf-empty">No numbers to read yet.</div>
          ) : (
            signals.map((s, i) => (
              <div key={i} className={`pt-sig__row pt-sig__row--${s.tone}`}>
                <Icon tone={s.tone} />
                <span className="pt-sig__text">{s.text}</span>
                {s.value && <span className="pt-sig__val">{s.value}</span>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
