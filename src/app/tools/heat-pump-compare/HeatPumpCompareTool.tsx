"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Cross-brand heat-pump-hot-water comparison. Same UX as the
 * SystemComparison tool: toggle 2-5 items in a chip row, then a
 * scrollable side-by-side spec table renders below.
 *
 * Rows here are curated model families we actually install, so each
 * row has a link into our brand hub for the "read more" click.
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
    installTo: "—",
    madeIn: "Designed & assembled in Sydney",
    bestFor: "Hills postcodes, long-term owners, homes wanting the top-tier residential heat pump",
    pros: [
      "Only mainstream CO₂ heat pump in AU",
      "15-year stainless tank warranty",
      "Quiet 37 dBA — safe next to bedroom walls",
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
    bestFor: "Straight swap-in for old gas or electric storage — like-for-like footprint",
    pros: [
      "All-in-one — single unit, easy retrofit",
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
    installTo: "—",
    madeIn: "Designed & assembled in Sydney",
    bestFor: "Entry into the Reclaim CO₂ range — same compressor as stainless, cheaper tank",
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
    eyebrow: "All-in-one · R290 · 180/270 L",
    refrigerant: "R290 (propane) · natural",
    cop: "~3.5",
    capacity: "180 / 270 L",
    form: "All-in-one",
    tank: "Enamel-lined steel",
    warranty: "6-yr cylinder + 3-yr compressor",
    installFrom: "$2,144",
    installTo: "$2,144",
    madeIn: "Australian company · manufactured in China (AS/NZS)",
    bestFor: "Cheapest heat pump on the market post-rebate — Hampton Park / Cranbourne stock swap-outs",
    pros: [
      "Cheapest heat pump post-rebate — often <$900 out of pocket",
      "180 L option for couples / apartments",
      "Widely serviced — parts pipeline healthy",
    ],
    cons: [
      "Standard warranty band — not the 15-yr stainless option",
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
    bestFor: "Same platform as the Reclaim ECO R290 AIO — pick on brand preference / Reece supply",
    pros: [
      "Australian-made by Dux",
      "Same tank + heat pump platform as the Reclaim ECO R290 AIO",
      "Reece distribution — same-day parts state-wide",
    ],
    cons: [
      "COP slightly lower than Reclaim CO₂",
      "R290 refrigerant — capacity drops in cold Melbourne mornings vs CO₂",
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
    installTo: "—",
    madeIn: "Made in Australia by Dux",
    bestFor: "Split-form R290 alternative to Reclaim CO₂ glass at a lower entry price",
    pros: [
      "Australian-made by Dux",
      "Split configuration for outdoor placement flexibility",
      "10-yr tank warranty on glass-lined",
    ],
    cons: [
      "R290 — capacity drops in cold Melbourne mornings",
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
    installTo: "—",
    madeIn: "Panasonic heat pump (Japan) · Reclaim tank (Sydney)",
    bestFor: "Buyers who want the Panasonic Aquarea compressor with the Reclaim tank platform",
    pros: [
      "One of the highest COPs on the market at 7 °C ambient",
      "Panasonic Aquarea compressor · well-known parts network",
      "Same Reclaim tank platform — 10-yr tank warranty carries over",
    ],
    cons: [
      "R32 refrigerant (not the natural CO₂ / R290 alternatives)",
      "No 400 L tank option — cap at 315 L",
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
    installTo: "—",
    madeIn: "Panasonic heat pump (Japan) · Reclaim tank (Sydney)",
    bestFor: "Larger households — 6 kW modulates further down, so it runs MORE efficiently than the 4 kW at typical part-load",
    pros: [
      "MORE efficient than the 4 kW at part-load (bigger heat exchanger, less compressor cycling)",
      "Panasonic Aquarea compressor · well-known parts network",
      "Same Reclaim tank platform — 10-yr tank warranty carries over",
    ],
    cons: [
      "R32 refrigerant (not the natural CO₂ / R290 alternatives)",
      "No 400 L tank option — cap at 315 L",
    ],
  },
  {
    key: "sanden-eco",
    brand: "Sanden",
    model: "Sanden Eco Plus",
    eyebrow: "Split · CO₂ (R744) · 250 L",
    refrigerant: "CO₂ (R744) · natural",
    cop: "~4.5",
    capacity: "250 / 315 L",
    form: "Split (CO₂)",
    tank: "Stainless steel",
    warranty: "15-yr tank · 6-yr heat pump",
    installFrom: "Message for quote",
    installTo: "—",
    madeIn: "Japan (Sanden Corp) · distributed by Sanden Australia",
    bestFor: "Reclaim alternative for buyers who want the Sanden badge or a slightly cheaper CO₂ split",
    pros: [
      "CO₂ refrigerant — same cold-morning benefits as Reclaim",
      "15-yr stainless tank warranty",
      "Long-standing brand — well-known in the trade",
    ],
    cons: [
      "Imported — parts can be slower than Australian-made brands",
      "Smaller local dealer network than Reclaim / iStore",
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
    installTo: "—",
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

  return (
    <>
      <div className="sysc-chips" role="group" aria-label="Select heat pumps to compare">
        {HEAT_PUMPS.map((h) => (
          <button
            key={h.key}
            type="button"
            className={`sysc-chip${selected.has(h.key) ? " is-active" : ""}`}
            onClick={() => toggle(h.key)}
            aria-pressed={selected.has(h.key)}
          >
            {h.brand} · {h.model}
          </button>
        ))}
      </div>
      <p className="sysc-selectionhint">
        Pick 2-5 heat pumps. Currently comparing <strong>{rows.length}</strong>.
      </p>

      {rows.length === 0 ? (
        <div className="faults-empty">Pick at least one heat pump above to see the comparison.</div>
      ) : (
        <div className="sysc-scroll">
          <table className="sysc-table">
            <thead>
              <tr>
                <th className="sysc-th--rowhead" />
                {rows.map((h) => (
                  <th key={h.key} className="sysc-th--sys">
                    <div className="sysc-sys">
                      <div className="sysc-sys__name">{h.brand} · {h.model}</div>
                      <div className="sysc-sys__eyebrow">{h.eyebrow}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Form"          rows={rows.map((h) => h.form)} />
              <Row label="Refrigerant"   rows={rows.map((h) => h.refrigerant)} />
              <Row label="COP"           rows={rows.map((h) => h.cop)} />
              <Row label="Capacity"      rows={rows.map((h) => h.capacity)} />
              <Row label="Tank"          rows={rows.map((h) => h.tank)} />
              <Row label="Warranty"      rows={rows.map((h) => h.warranty)} wrap />
              <Row label="Install from"  rows={rows.map((h) => h.installFrom)} />
              <Row label="Install to"    rows={rows.map((h) => h.installTo)} />
              <Row label="Made in"       rows={rows.map((h) => h.madeIn)} wrap />
              <Row label="Best for"      rows={rows.map((h) => h.bestFor)} wrap />

              <tr>
                <th scope="row" className="sysc-th--rowhead">Pros</th>
                {rows.map((h) => (
                  <td key={h.key} className="sysc-td">
                    <ul className="sysc-list sysc-list--pros">
                      {h.pros.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="sysc-th--rowhead">Cons</th>
                {rows.map((h) => (
                  <td key={h.key} className="sysc-td">
                    <ul className="sysc-list sysc-list--cons">
                      {h.cons.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="sysc-th--rowhead">&nbsp;</th>
                {rows.map((h) => (
                  <td key={h.key} className="sysc-td sysc-td--cta">
                    {h.brandHref ? (
                      <Link href={h.brandHref} className="ds-btn ds-btn--ghost ds-btn--sm">
                        See our range →
                      </Link>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Not currently stocked</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: 40,
        padding: "24px 26px",
        background: "var(--paper)",
        border: "1px solid var(--line)",
        borderLeft: "4px solid var(--orange)",
        borderRadius: 12,
      }}>
        <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 800, letterSpacing: -0.01, color: "var(--navy)", margin: "0 0 8px" }}>
          Our default recommendations
        </h2>
        <ul style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)", margin: 0, paddingLeft: 20 }}>
          <li><strong>Best value under $1,000 out of pocket:</strong> iStore 270L.</li>
          <li><strong>Best long-term:</strong> Reclaim CO₂ Split Stainless 315L (15-year tank).</li>
          <li><strong>Hills / cold-climate suburbs:</strong> Reclaim CO₂ (holds capacity to -10 °C).</li>
          <li><strong>Straight swap for old storage tank:</strong> Reclaim ECO R290 All-in-One.</li>
          <li><strong>Australian-made mid-range:</strong> Thermann Integrated (by Dux).</li>
        </ul>
      </div>
    </>
  );
}

function Row({ label, rows, wrap }: { label: string; rows: string[]; wrap?: boolean }) {
  return (
    <tr>
      <th scope="row" className="sysc-th--rowhead">{label}</th>
      {rows.map((v, i) => (
        <td key={i} className={wrap ? "sysc-td sysc-td--wrap" : "sysc-td"}>{v}</td>
      ))}
    </tr>
  );
}
