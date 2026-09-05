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

  // Servicing — the one that catches people out. A Ford at 30,000km and $500
  // and an LDV at 10,000km and $700+ look similar on the lot and are three
  // times apart on the invoice.
  const [intA, setIntA] = useState(30000);
  const [svcA, setSvcA] = useState(500);
  const [intB, setIntB] = useState(10000);
  const [svcB, setSvcB] = useState(850);

  const servicesA = intA > 0 ? kmYear / intA : 0;
  const servicesB = intB > 0 ? kmYear / intB : 0;
  const servA = servicesA * svcA;
  const servB = servicesB * svcB;
  const servSaving = servB - servA;

  // The two together, which is what a van actually costs you to run each year.
  const runA = fuelA + servA;
  const runB = fuelB + servB;

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
    
      <section className="pt-panel">
        <h2 className="pt-panel__h">Van servicing — how often, and what it costs</h2>
        <p className="pt-panel__sub">
          The interval matters as much as the price. A Ford serviced every 30,000km at $500 and an LDV every 10,000km at $700–$1,000
          look alike on the lot; over a year of the same driving they are nowhere near each other. Uses the km a year set above.
        </p>
        <Field label="Van A — service every" value={intA} onChange={setIntA} post="km" />
        <Field label="Van A — a service costs" value={svcA} onChange={setSvcA} pre="$" />
        <Field label="Van B — service every" value={intB} onChange={setIntB} post="km" />
        <Field label="Van B — a service costs" value={svcB} onChange={setSvcB} pre="$" />
        <div className="pt-scn__out">
          <div className="pt-scn__line"><span>Van A — {servicesA.toFixed(1)} services / yr</span><strong>{money(servA)}</strong></div>
          <div className="pt-scn__line"><span>Van B — {servicesB.toFixed(1)} services / yr</span><strong>{money(servB)}</strong></div>
          <div className="pt-scn__line pt-scn__line--total"><span>Van A is cheaper to service by</span><strong>{money(servSaving)}</strong></div>
        </div>
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Fuel and servicing together</h2>
        <p className="pt-panel__sub">What each van actually costs to keep on the road for a year, before depreciation and insurance.</p>
        <div className="pt-scn__out">
          <div className="pt-scn__line"><span>Van A — fuel {money(fuelA)} + servicing {money(servA)}</span><strong>{money(runA)}</strong></div>
          <div className="pt-scn__line"><span>Van B — fuel {money(fuelB)} + servicing {money(servB)}</span><strong>{money(runB)}</strong></div>
          <div className="pt-scn__line pt-scn__line--total">
            <span>{runA <= runB ? "Van A" : "Van B"} costs less to run by</span>
            <strong>{money(Math.abs(runA - runB))}</strong>
          </div>
        </div>
      </section>
</div>
  );
}
