"use client";

import { useState } from "react";

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

function Field({ label, value, onChange, pre, post }: { label: string; value: number; onChange: (n: number) => void; pre?: string; post?: string }) {
  return (
    <div className="pt-calc__row">
      <span>{label}</span>
      <span className="pt-calc__field">
        {pre && <span className="pt-calc__pre">{pre}</span>}
        <input type="number" min="0" value={value} onChange={(e) => onChange(parse(e.target.value))} />
        {post && <span className="pt-calc__post">{post}</span>}
      </span>
    </div>
  );
}

export function ScenarioPlanner({ defaultCharge, defaultCost }: { defaultCharge: number; defaultCost: number }) {
  // Add a person
  const [charge, setCharge] = useState(defaultCharge || 120);
  const [cost, setCost] = useState(defaultCost || 85);
  const [hrsWeek, setHrsWeek] = useState(30);
  const [weeks, setWeeks] = useState(46);

  const revenue = charge * hrsWeek * weeks;
  const runCost = cost * hrsWeek * weeks;
  const contribution = revenue - runCost;

  // Vehicle fuel comparison
  const [litA, setLitA] = useState(10);
  const [litB, setLitB] = useState(3);
  const [kmYear, setKmYear] = useState(30000);
  const [price, setPrice] = useState(2);

  const fuelA = (kmYear / 100) * litA * price;
  const fuelB = (kmYear / 100) * litB * price;
  const saving = fuelA - fuelB;

  return (
    <div className="pt-scn">
      <section className="pt-panel">
        <h2 className="pt-panel__h">Add a tech / van — what does it add?</h2>
        <p className="pt-panel__sub">Charge and cost default to your blended rates from Billable capacity. What one more billable person puts on the bottom line.</p>
        <Field label="Charge-out rate" value={charge} onChange={setCharge} pre="$" post="/hr" />
        <Field label="Their all-in cost" value={cost} onChange={setCost} pre="$" post="/hr" />
        <Field label="Billable hours / week" value={hrsWeek} onChange={setHrsWeek} post="hrs" />
        <Field label="Weeks / year" value={weeks} onChange={setWeeks} />
        <div className="pt-scn__out">
          <div className="pt-scn__line"><span>Revenue / yr</span><strong>{money(revenue)}</strong></div>
          <div className="pt-scn__line"><span>Their cost / yr</span><strong>{money(runCost)}</strong></div>
          <div className={`pt-scn__big${contribution < 0 ? " is-neg" : ""}`}>{money(contribution)}<span> profit / yr</span></div>
        </div>
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Van fuel — thirsty vs economical</h2>
        <p className="pt-panel__sub">What the fuel economy of a new van is worth over a year — e.g. a 3 L/100 km ute vs one doing 10.</p>
        <Field label="Van A — fuel use" value={litA} onChange={setLitA} post="L/100km" />
        <Field label="Van B — fuel use" value={litB} onChange={setLitB} post="L/100km" />
        <Field label="Kilometres / year" value={kmYear} onChange={setKmYear} post="km" />
        <Field label="Fuel price" value={price} onChange={setPrice} pre="$" post="/L" />
        <div className="pt-scn__out">
          <div className="pt-scn__line"><span>Van A fuel / yr</span><strong>{money(fuelA)}</strong></div>
          <div className="pt-scn__line"><span>Van B fuel / yr</span><strong>{money(fuelB)}</strong></div>
          <div className={`pt-scn__big${saving < 0 ? " is-neg" : ""}`}>{money(Math.abs(saving))}<span> {saving >= 0 ? "saved / yr" : "more / yr"}</span></div>
        </div>
      </section>
    </div>
  );
}
