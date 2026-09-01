"use client";

import { useEffect, useState } from "react";

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function daysLeftInYear(): number {
  const now = new Date();
  const end = new Date(now.getFullYear(), 11, 31);
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export function FinancePlanner({ yearProfit }: { yearProfit: number | null }) {
  const [target, setTarget] = useState(250000);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("ag_profit_target");
      if (s) setTarget(Number(s) || 0);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function update(v: number) {
    setTarget(v);
    try {
      localStorage.setItem("ag_profit_target", String(v));
    } catch {
      /* ignore */
    }
  }

  const perDay = target / 365;
  const perWeek = target / 52;
  const perMonth = target / 12;
  const progress = yearProfit !== null && target > 0 ? Math.max(0, Math.min(1, yearProfit / target)) : null;
  const remaining = yearProfit !== null ? Math.max(0, target - yearProfit) : null;
  const daysLeft = daysLeftInYear();
  const perRemDay = remaining !== null ? remaining / daysLeft : null;

  return (
    <section className="pt-panel pt-fin__plan">
      <h2 className="pt-panel__h">Future planning</h2>
      <p className="pt-panel__sub">Set a profit target for the year and see what it takes — and how you&rsquo;re tracking.</p>

      <label className="pt-field" style={{ maxWidth: 280 }}>
        <span>Annual profit target</span>
        <div className="pt-calc__field" style={{ width: "fit-content" }}>
          <span className="pt-calc__pre">$</span>
          <input inputMode="numeric" value={ready ? target : ""} onChange={(e) => update(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0)} />
        </div>
      </label>

      <div className="pt-fin__needs">
        <div><span>Per day</span><strong>{money(perDay)}</strong></div>
        <div><span>Per week</span><strong>{money(perWeek)}</strong></div>
        <div><span>Per month</span><strong>{money(perMonth)}</strong></div>
      </div>

      {progress !== null ? (
        <div className="pt-fin__progress">
          <div className="pt-fin__bar2"><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="pt-fin__progresstxt">
            <span><strong>{money(yearProfit as number)}</strong> of {money(target)} this year · {Math.round(progress * 100)}%</span>
            {remaining !== null && remaining > 0 ? (
              <span>{money(remaining)} to go — {money(perRemDay as number)}/day across the {daysLeft} days left</span>
            ) : (
              <span className="pt-fin__hit">Target hit 🎉</span>
            )}
          </div>
        </div>
      ) : (
        <p className="pt-panel__sub" style={{ marginBottom: 0 }}>Connect Xero to track progress against this target.</p>
      )}
    </section>
  );
}
