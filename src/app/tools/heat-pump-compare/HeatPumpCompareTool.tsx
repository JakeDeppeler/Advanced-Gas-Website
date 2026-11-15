"use client";

import Link from "next/link";
import { useState } from "react";
import "@/components/homepage/tools/calc-c.css";
import { SHOW_PRICES } from "@/lib/homepage/data";

/**
 * Cross-brand heat-pump-hot-water comparison. Same UX as the
 * SystemComparison tool: toggle 2-5 items in a chip row, then a
 * scrollable side-by-side spec table renders below.
 *
 * Rows here are curated model families we actually install, so each
 * row has a link into our brand hub for the "read more" click.
 *
 * Install prices show only while SHOW_PRICES is on, as in SystemComparison.
 */

type Row = {
  key: string;
  brand: string;
  model: string;
  eyebrow: string;
  refrigerant: string;
  cop: string;
  capacity: string;
  form: "Split" | "All-in-one" | "Split (CO₂)";
  tank: string;
  warranty: string;
  installFrom: string;
  installTo: string;
  madeIn: string;
  bestFor: string;
  pros: string[];
  cons: string[];
  brandHref?: string;
};

const HEAT_PUMPS: Row[] = [
  {
    key: "reclaim-co2-split-ss",
    brand: "Reclaim",
    model: "CO₂ Split · Stainless",
    eyebrow: "Split · CO₂ (R744) · 315 L",
    refrigerant: "CO₂ (R744) · natural",
    cop: "~4.5 (holds down to -10 °C)",
    capacity: "250 / 315 / 400 L",
    form: "Split (CO₂)",
    tank: "Stainless steel · no anode",
    warranty: "15-yr tank · 10-yr heat pump · 5-yr labour",
    installFrom: "Message for quote",
    installTo: ", ",
    madeIn: "Designed & assembled in Sydney",
    bestFor: "Hills postcodes, and anyone staying in the house long enough to care what the tank is made of",
    pros: [
      "Only mainstream CO₂ heat pump in AU",
      "15-year stainless tank warranty",
      "Quiet 37 dBA, safe next to bedroom walls",
      "PV-diverter compatible for solar-scheduled hot water",
    ],
    cons: [
      "Highest capex before rebate",
      "Split install (outdoor unit + tank) needs plumbing between them",
    ],
    brandHref: "/brands/reclaim",
  },
  {
    key: "reclaim-eco-r290-aio",
    brand: "Reclaim",
    model: "ECO R290 All-in-One",
    eyebrow: "All-in-one · R290 · 200/300 L",
    refrigerant: "R290 (propane) · natural",
    cop: "~3.8 average",
    capacity: "200 / 300 L",
    form: "All-in-one",
    tank: "Enamel-lined steel",
    warranty: "6-yr tank · 3-yr compressor + 6-yr workmanship",
    installFrom: "$2,624",
    installTo: "$2,624",
    madeIn: "Australia",
    bestFor: "Straight swap-in for old gas or electric storage, like-for-like footprint",
    pros: [
      "All-in-one, single unit, easy retrofit",
      "Same tank + heat pump platform as the Thermann Integrated (identical guts)",
      "Reclaim brand quality at entry price",
    ],
    cons: [
      "R290 capacity drops faster below 0 °C than CO₂",
      "Shorter tank warranty than stainless CO₂",
    ],
    brandHref: "/brands/reclaim",
  },
  {
    key: "reclaim-co2-split-glass",
    brand: "Reclaim",
    model: "CO₂ Split · Glass-Lined",
    eyebrow: "Split · CO₂ (R744) · 250/315/400 L",
    refrigerant: "CO₂ (R744) · natural",
    cop: "~4.5 (holds down to -10 °C)",
    capacity: "250 / 315 / 400 L",
    form: "Split (CO₂)",
    tank: "Glass-lined steel · sacrificial anode (~7-10 yr)",
    warranty: "10-yr tank · 10-yr heat pump · 5-yr labour",
    installFrom: "Message for quote",
    installTo: ", ",
    madeIn: "Designed & assembled in Sydney",
    bestFor: "Entry into the Reclaim CO₂ range, same compressor as stainless, cheaper tank",
    pros: [
      "Cheaper entry to Reclaim CO₂ than the stainless variant",
      "Same 10-yr heat-pump warranty as stainless",
      "PV-diverter compatible",
    ],
    cons: [
      "Anode needs replacing every 7-10 years (stainless has none)",
      "10-yr tank warranty vs 15-yr on stainless",
    ],
    brandHref: "/brands/reclaim",
  },
  {
    key: "istore-270",
    brand: "iStore",
    model: "iS-HP-270",
    eyebrow: "All-in-one · R290 · 180/275 L",
    refrigerant: "R290 (propane) · natural",
    cop: "~3.5",
    capacity: "180 / 275 L",
    form: "All-in-one",
    tank: "Enamel-lined steel",
    warranty: "5 years on the whole unit",
    installFrom: "$2,144",
    installTo: "$2,144",
    madeIn: "Australian company · manufactured in China (AS/NZS)",
    bestFor: "Cheapest heat pump on the market post-rebate, Hampton Park / Cranbourne stock swap-outs",
    pros: [
      "Cheapest heat pump once the VEU rebate is applied",
      "180 L option for couples / apartments",
      "Widely serviced, parts pipeline healthy",
    ],
    cons: [
      "Standard warranty band, not the 15-yr stainless option",
      "Louder than Reclaim CO₂ (~48 dBA)",
    ],
    brandHref: "/brands/istore",
  },
  {
    key: "thermann-integrated",
    brand: "Thermann",
    model: "Integrated HP",
    eyebrow: "All-in-one · R290 · 200/285 L",
    refrigerant: "R290 (propane) · natural",
    cop: "~3.8",
    capacity: "200 / 285 L",
    form: "All-in-one",
    tank: "Enamel-lined steel (glass-lined available)",
    warranty: "7-yr tank · 3-yr compressor",
    installFrom: "$2,624",
    installTo: "$2,624",
    madeIn: "Made in Australia by Dux (Moss Vale, NSW)",
    bestFor: "Same platform as the Reclaim ECO R290 AIO, pick on brand preference / Reece supply",
    pros: [
      "Australian-made by Dux",
      "Same tank + heat pump platform as the Reclaim ECO R290 AIO",
      "Reece distribution, same-day parts state-wide",
    ],
    cons: [
      "COP slightly lower than Reclaim CO₂",
      "R290 refrigerant, capacity drops in cold Melbourne mornings vs CO₂",
    ],
    brandHref: "/brands/thermann",
  },
  {
    key: "thermann-split-glass",
    brand: "Thermann",
    model: "Split · Glass-lined",
    eyebrow: "Split · R290 · 270/315 L",
    refrigerant: "R290 (propane) · natural",
    cop: "~3.9",
    capacity: "270 / 315 L",
    form: "Split",
    tank: "Glass-lined steel · anode replaced ~10 yr",
    warranty: "10-yr tank · 3-yr compressor",
    installFrom: "Message for quote",
    installTo: ", ",
    madeIn: "Made in Australia by Dux",
    bestFor: "Split-form R290 alternative to Reclaim CO₂ glass at a lower entry price",
    pros: [
      "Australian-made by Dux",
      "Split configuration for outdoor placement flexibility",
      "10-yr tank warranty on glass-lined",
    ],
    cons: [
      "R290, capacity drops in cold Melbourne mornings",
      "No stainless option like Reclaim",
    ],
    brandHref: "/brands/thermann",
  },
  {
    key: "panasonic-aquarea-4",
    brand: "Panasonic",
    model: "Aquarea 4 kW · Reclaim tank",
    eyebrow: "Split · R32 · 4 kW output",
    refrigerant: "R32 · low-GWP synthetic",
    cop: "~4.6 (A7/W35)",
    capacity: "250 / 315 L (same Reclaim tank platform)",
    form: "Split",
    tank: "Reclaim-branded tank (same platform / same warranty as Reclaim CO₂)",
    warranty: "10-yr tank (Reclaim) · 5-yr Panasonic compressor",
    installFrom: "Message for quote",
    installTo: ", ",
    madeIn: "Panasonic heat pump (Japan) · Reclaim tank (Sydney)",
    bestFor: "Buyers who want the Panasonic Aquarea compressor with the Reclaim tank platform",
    pros: [
      "One of the highest COPs on the market at 7 °C ambient",
      "Panasonic Aquarea compressor · well-known parts network",
      "Same Reclaim tank platform, 10-yr tank warranty carries over",
    ],
    cons: [
      "R32 refrigerant (not the natural CO₂ / R290 alternatives)",
      "No 400 L tank option, cap at 315 L",
    ],
  },
  {
    key: "panasonic-aquarea-6",
    brand: "Panasonic",
    model: "Aquarea 6 kW · Reclaim tank",
    eyebrow: "Split · R32 · 6 kW output (more efficient)",
    refrigerant: "R32 · low-GWP synthetic",
    cop: "~5.0 (A7/W35)",
    capacity: "250 / 315 L (same Reclaim tank platform)",
    form: "Split",
    tank: "Reclaim-branded tank (same platform / same warranty as Reclaim CO₂)",
    warranty: "10-yr tank (Reclaim) · 5-yr Panasonic compressor",
    installFrom: "Message for quote",
    installTo: ", ",
    madeIn: "Panasonic heat pump (Japan) · Reclaim tank (Sydney)",
    bestFor: "Larger households, 6 kW modulates further down, so it runs MORE efficiently than the 4 kW at typical part-load",
    pros: [
      "MORE efficient than the 4 kW at part-load (bigger heat exchanger, less compressor cycling)",
      "Panasonic Aquarea compressor · well-known parts network",
      "Same Reclaim tank platform, 10-yr tank warranty carries over",
    ],
    cons: [
      "R32 refrigerant (not the natural CO₂ / R290 alternatives)",
      "No 400 L tank option, cap at 315 L",
    ],
  },
  {
    key: "rheem-ambiheat",
    brand: "Rheem",
    model: "AmbiHeat HDi-310",
    eyebrow: "All-in-one · R134a · 310 L",
    refrigerant: "R134a · synthetic",
    cop: "~3.2",
    capacity: "310 L",
    form: "All-in-one",
    tank: "Vitreous enamel · sacrificial anode",
    warranty: "5-yr tank · 3-yr compressor",
    installFrom: "Message for quote",
    installTo: ", ",
    madeIn: "Australia (Rheem Rydalmere) · compressor imported",
    bestFor: "Rheem-loyal customers who want the brand they've had before, at the entry price",
    pros: [
      "Cheapest of the majors",
      "Rheem brand recognition + parts everywhere",
      "Australian assembly",
    ],
    cons: [
      "R134a is a high-GWP refrigerant vs the natural refrigerants (CO₂, R290)",
      "Lower COP than the R290 / CO₂ competition",
      "Shorter tank warranty",
    ],
  },
];

const DEFAULT_SELECTED = new Set([
  "reclaim-co2-split-ss",
  "istore-270",
  "thermann-integrated",
  "sanden-eco",
]);

export function HeatPumpCompareTool() {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 5) next.add(key);
      return next;
    });
  };

  const rows = HEAT_PUMPS.filter((h) => selected.has(h.key));
  const install = (h: Row) => (h.installFrom === h.installTo ? h.installFrom : `${h.installFrom} → ${h.installTo}`);

  return (
    <div className="cc">
      {/* Selector chips: the mark turns from + to ✓, so picked isn't shown by colour alone. */}
      <div className="cc-card cc-pick">
        <span className="cc-lbl">Heat pumps to compare</span>
        <div className="cc-chips cc-chips--scroll" role="group" aria-label="Select heat pumps to compare">
          {HEAT_PUMPS.map((h) => {
            const on = selected.has(h.key);
            return (
              <button key={h.key} type="button" className="cc-chip" onClick={() => toggle(h.key)} aria-pressed={on}>
                <i aria-hidden="true">{on ? "✓" : "+"}</i>{h.brand} · {h.model}
              </button>
            );
          })}
        </div>
        <p className="cc-hint">
          Pick 2-5 heat pumps. Currently comparing <strong>{rows.length}</strong>.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="cc-empty">Pick at least one heat pump above to see the comparison.</div>
      ) : (
        <>
        {/* Phone: a card per selected heat pump. */}
        <div className="cc-cards">
          {rows.map((h) => (
            <article key={h.key} className="cc-card cc-card--sys">
              <header className="cc-cardhead">
                <span className="cc-sysname">{h.brand} · {h.model}</span>
                <span className="cc-syseye">{h.eyebrow}</span>
              </header>
              <dl className="cc-rows">
                <div><dt>Form</dt><dd>{h.form}</dd></div>
                <div><dt>Refrigerant</dt><dd>{h.refrigerant}</dd></div>
                <div><dt>COP</dt><dd>{h.cop}</dd></div>
                <div><dt>Capacity</dt><dd>{h.capacity}</dd></div>
                <div><dt>Tank</dt><dd>{h.tank}</dd></div>
                <div><dt>Warranty</dt><dd>{h.warranty}</dd></div>
                {SHOW_PRICES && <div><dt>Install</dt><dd>{install(h)}</dd></div>}
                <div><dt>Made in</dt><dd>{h.madeIn}</dd></div>
                <div><dt>Best for</dt><dd>{h.bestFor}</dd></div>
              </dl>
              <div className="cc-block">
                <span className="cc-lbl">Pros</span>
                <ul className="cc-list cc-list--pro">{h.pros.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
              <div className="cc-block">
                <span className="cc-lbl">Cons</span>
                <ul className="cc-list cc-list--con">{h.cons.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              <div className="cc-cardcta">
                {h.brandHref ? (
                  <Link href={h.brandHref} className="abtn abtn--ghost">See our range →</Link>
                ) : (
                  <span className="cc-muted">Not currently stocked</span>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Wider screens: side by side. */}
        <div className="cc-card cc-tablewrap">
          <div className="cc-scroll">
            <table className="cc-table">
              <thead>
                <tr>
                  <th className="cc-rowh"><span className="sr-only">Compare</span></th>
                  {rows.map((h) => (
                    <th key={h.key} scope="col">
                      <span className="cc-sysname">{h.brand} · {h.model}</span>
                      <span className="cc-syseye">{h.eyebrow}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SpecRow label="Form" rows={rows.map((h) => h.form)} />
                <SpecRow label="Refrigerant" rows={rows.map((h) => h.refrigerant)} />
                <SpecRow label="COP" rows={rows.map((h) => h.cop)} />
                <SpecRow label="Capacity" rows={rows.map((h) => h.capacity)} />
                <SpecRow label="Tank" rows={rows.map((h) => h.tank)} />
                <SpecRow label="Warranty" rows={rows.map((h) => h.warranty)} wrap />
                {SHOW_PRICES && <SpecRow label="Install from" rows={rows.map((h) => h.installFrom)} />}
                {SHOW_PRICES && <SpecRow label="Install to" rows={rows.map((h) => h.installTo)} />}
                <SpecRow label="Made in" rows={rows.map((h) => h.madeIn)} wrap />
                <SpecRow label="Best for" rows={rows.map((h) => h.bestFor)} wrap />
                <tr>
                  <th scope="row" className="cc-rowh">Pros</th>
                  {rows.map((h) => (
                    <td key={h.key} className="cc-wrap"><ul className="cc-list cc-list--pro">{h.pros.map((p) => <li key={p}>{p}</li>)}</ul></td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="cc-rowh">Cons</th>
                  {rows.map((h) => (
                    <td key={h.key} className="cc-wrap"><ul className="cc-list cc-list--con">{h.cons.map((c) => <li key={c}>{c}</li>)}</ul></td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="cc-rowh"><span className="sr-only">Range</span></th>
                  {rows.map((h) => (
                    <td key={h.key} className="cc-ctacell">
                      {h.brandHref ? (
                        <Link href={h.brandHref} className="abtn abtn--ghost">See our range →</Link>
                      ) : (
                        <span className="cc-muted">Not currently stocked</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <aside className="cc-tips">
        <span className="cc-lbl">What we&apos;d pick</span>
        <h2>Our default recommendations</h2>
        <ul>
          <li><strong>When the rebate is what decides it:</strong> iStore 275 L, it takes the VEU further than anything else we fit.</li>
          <li><strong>Best long-term:</strong> Reclaim CO₂ Split Stainless 315L (15-year tank).</li>
          <li><strong>Hills / cold-climate suburbs:</strong> Reclaim CO₂ (holds capacity to -10 °C).</li>
          <li><strong>Straight swap for old storage tank:</strong> Reclaim ECO R290 All-in-One.</li>
          <li><strong>When you want parts in every Reece store:</strong> Thermann Integrated, Australian made by Dux.</li>
        </ul>
      </aside>
    </div>
  );
}

function SpecRow({ label, rows, wrap }: { label: string; rows: string[]; wrap?: boolean }) {
  return (
    <tr>
      <th scope="row" className="cc-rowh">{label}</th>
      {rows.map((v, i) => (
        <td key={i} className={wrap ? "cc-wrap" : undefined}>{v}</td>
      ))}
    </tr>
  );
}
