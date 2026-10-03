"use client";

import { useState } from "react";
import { money } from "@/lib/portal/format";

const WEEKS = 46;

/**
 * Three sliders and what they add up to — the Future planning mock's opening
 * card. It moves nothing saved: techs × billable hours × 46 working weeks ×
 * the charge-out rate, so somebody can feel what a fourth van or a dearer
 * hour does before opening the detailed planners underneath.
 */
export function WhatIf({ techs, rate }: { techs: number; rate: number }) {
  const [n, setN] = useState(Math.max(1, techs));
  const [hrs, setHrs] = useState(30);
  const [r, setR] = useState(rate > 0 ? Math.round(rate / 5) * 5 : 200);
  const hours = n * hrs * WEEKS;

  const row = (id: string, label: string, value: string, input: React.ReactNode) => (
    <div className="pt-whatif__row">
      <label htmlFor={id}><span>{label}</span><b>{value}</b></label>
      {input}
    </div>
  );

  return (
    <div className="pt-whatif">
      <section className="pt-panel pt-whatif__card">
        <h2 className="pt-panel__h">What if…</h2>
        {row("wi-techs", "Techs on the road", `${n} tech${n === 1 ? "" : "s"}`,
          <input id="wi-techs" type="range" min={1} max={12} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />)}
        {row("wi-hrs", "Billable hours each a week", `${hrs} hrs`,
          <input id="wi-hrs" type="range" min={10} max={45} step={1} value={hrs} onChange={(e) => setHrs(Number(e.target.value))} />)}
        {row("wi-rate", "Charge-out rate", `$${r}/hr`,
          <input id="wi-rate" type="range" min={100} max={400} step={5} value={r} onChange={(e) => setR(Number(e.target.value))} />)}
      </section>
      <section className="pt-whatif__out" aria-live="polite">
        <span>Billable hours a year</span>
        <strong>{hours.toLocaleString("en-AU")}</strong>
        <span>Labour that could be billed</span>
        <strong className="pt-whatif__money">{money(hours * r)}</strong>
        <em>Techs × billable hours a week × {WEEKS} working weeks × charge-out rate.</em>
      </section>
    </div>
  );
}
