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

/** One input in a van column — the label lives in the row, not on the box. */
function Cell({ value, onChange, pre, post }: { value: number; onChange: (n: number) => void; pre?: string; post?: string }) {
  return (
    <span className="pt-scn__cell">
      {pre && <span>{pre}</span>}
      <input type="number" min="0" value={value} onChange={(e) => onChange(parse(e.target.value))} />
      {post && <span>{post}</span>}
    </span>
  );
}

export function ScenarioPlanner({ defaultCharge, defaultCost }: { defaultCharge: number; defaultCost: number }) {
  const [charge, setCharge] = useState(defaultCharge || 120);
  const [cost, setCost] = useState(defaultCost || 85);
  const [hrsWeek, setHrsWeek] = useState(30);
  const [weeks, setWeeks] = useState(46);

  const revenue = charge * hrsWeek * weeks;
  const runCost = cost * hrsWeek * weeks;
  const contribution = revenue - runCost;

  // Shared by both vans, so they sit above the comparison rather than inside
  // one column while the other quietly uses them.
  const [kmYear, setKmYear] = useState(26000);
  const [price, setPrice] = useState(2.4);

  const [a, setA] = useState({ name: "Ford", lit: 7, interval: 30000, service: 500 });
  const [b, setB] = useState({ name: "LDV", lit: 10, interval: 10000, service: 850 });

  const run = (v: typeof a) => {
    const fuel = (kmYear / 100) * v.lit * price;
    const services = v.interval > 0 ? kmYear / v.interval : 0;
    const servicing = services * v.service;
    return { fuel, services, servicing, total: fuel + servicing };
  };
  const ra = run(a), rb = run(b);
  const cheaper = ra.total <= rb.total ? a : b;
  const gap = Math.abs(ra.total - rb.total);

  return (
    <div className="pt-scn">
      <section className="pt-panel">
        <h2 className="pt-panel__h">One more person on the tools</h2>
        <p className="pt-panel__sub">
          Charge and cost start from your own blended rates in Costs &amp; capacity. What one more billable person puts on the
          bottom line once they&rsquo;re paid for.
        </p>
        <div className="pt-scn__cols">
          <div>
            <Field label="Charge-out rate" value={charge} onChange={setCharge} pre="$" post="/hr" />
            <Field label="Their all-in cost" value={cost} onChange={setCost} pre="$" post="/hr" />
            <Field label="Billable hours a week" value={hrsWeek} onChange={setHrsWeek} post="hrs" />
            <Field label="Weeks a year" value={weeks} onChange={setWeeks} />
          </div>
          <div className="pt-scn__out">
            <div className="pt-scn__line"><span>They bring in</span><strong>{money(revenue)}</strong></div>
            <div className="pt-scn__line"><span>They cost</span><strong>{money(runCost)}</strong></div>
            <div className={`pt-scn__big${contribution < 0 ? " is-neg" : ""}`}>{money(contribution)}<span> a year</span></div>
          </div>
        </div>
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Van against van</h2>
        <p className="pt-panel__sub">
          The service interval catches people out more than the price does. A van serviced every 30,000km at $500 and one every
          10,000km at $850 look alike on the lot; over a year of the same driving they aren&rsquo;t close.
        </p>

        <div className="pt-scn__shared">
          <Field label="Kilometres a year" value={kmYear} onChange={setKmYear} post="km" />
          <Field label="Fuel price" value={price} onChange={setPrice} pre="$" post="/L" />
        </div>

        <div className="pt-scn__vans">
          <div className="pt-scn__vanhead">
            <span />
            <input className="pt-scn__name" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} aria-label="First van" />
            <input className="pt-scn__name" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} aria-label="Second van" />
          </div>

          <div className="pt-scn__vanrow">
            <span>Fuel use</span>
            <Cell value={a.lit} onChange={(v) => setA({ ...a, lit: v })} post="L" />
            <Cell value={b.lit} onChange={(v) => setB({ ...b, lit: v })} post="L" />
          </div>
          <div className="pt-scn__vanrow">
            <span>Service every</span>
            <Cell value={a.interval} onChange={(v) => setA({ ...a, interval: v })} post="km" />
            <Cell value={b.interval} onChange={(v) => setB({ ...b, interval: v })} post="km" />
          </div>
          <div className="pt-scn__vanrow">
            <span>A service costs</span>
            <Cell value={a.service} onChange={(v) => setA({ ...a, service: v })} pre="$" />
            <Cell value={b.service} onChange={(v) => setB({ ...b, service: v })} pre="$" />
          </div>

          <div className="pt-scn__vanrow is-out">
            <span>Fuel a year</span>
            <strong>{money(ra.fuel)}</strong>
            <strong>{money(rb.fuel)}</strong>
          </div>
          <div className="pt-scn__vanrow is-out">
            <span>Servicing a year</span>
            <strong>{money(ra.servicing)}<em>{ra.services.toFixed(1)} services</em></strong>
            <strong>{money(rb.servicing)}<em>{rb.services.toFixed(1)} services</em></strong>
          </div>
          <div className="pt-scn__vanrow is-total">
            <span>To keep on the road</span>
            <strong>{money(ra.total)}</strong>
            <strong>{money(rb.total)}</strong>
          </div>
        </div>

        <div className={`pt-scn__verdict${gap === 0 ? " is-flat" : ""}`}>
          {gap === 0
            ? <>Nothing in it — both cost {money(ra.total)} a year.</>
            : <><strong>{cheaper.name || "The first van"}</strong> costs <strong>{money(gap)}</strong> a year less to run, before depreciation and insurance.</>}
        </div>
      </section>
    </div>
  );
}
