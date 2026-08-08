"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * System-type comparison tool. Data table + toggleable columns
 * (select 2-5 system types, see them side-by-side).
 *
 * Purpose: a Pakenham customer already knows they want climate
 * control but doesn't know whether they need a split, multi-head,
 * ducted, gas ducted or evap — this page helps them narrow it
 * down without needing us to explain it on the phone. That's a
 * warm lead landing at /quote.
 */

type SystemRow = {
  key: string;
  name: string;
  eyebrow: string;
  cools: boolean;
  heats: "yes" | "no" | "hyper";
  installFrom: string;
  installTo: string;
  runningCost: string;
  zoneControl: string;
  lifespan: string;
  bestFor: string;
  bestSuburbs: string;
  brandsWeInstall: string;
  pros: string[];
  cons: string[];
  brandHref?: string;
};

const SYSTEMS: SystemRow[] = [
  {
    key: "split",
    name: "Wall Split System",
    eyebrow: "One indoor, one outdoor",
    cools: true,
    heats: "yes",
    installFrom: "$1,800",
    installTo: "$3,500",
    runningCost: "$180-$600 / yr per room",
    zoneControl: "Per-unit (that room only)",
    lifespan: "12-15 years",
    bestFor: "Bedroom, granny flat, living zone up to ~40 m²",
    bestSuburbs: "Every suburb we install in",
    brandsWeInstall: "Mitsubishi Electric, Kaden",
    pros: [
      "Cheapest install of any reverse-cycle system",
      "Simple, reliable, easy to service",
      "Doesn't need roof access",
    ],
    cons: [
      "One room only — three bedrooms = three units + three outdoor condensers",
      "Aesthetically visible indoors",
    ],
    brandHref: "/brands/mitsubishi-electric",
  },
  {
    key: "multi-head",
    name: "Multi-head Split",
    eyebrow: "Multiple indoor, one outdoor",
    cools: true,
    heats: "yes",
    installFrom: "$4,500",
    installTo: "$8,500",
    runningCost: "$400-$1,200 / yr for 3-4 heads",
    zoneControl: "Per-head (each room independently)",
    lifespan: "12-15 years",
    bestFor: "2-4 rooms where you want independent control but only one outdoor unit",
    bestSuburbs: "Townhouses, apartments, streets with limited outdoor space",
    brandsWeInstall: "Mitsubishi Electric MXZ, Kaden",
    pros: [
      "Only one outdoor unit (no visual clutter or noise on the neighbours)",
      "Independent per-room temp / on-off",
      "Cheaper than ducted for 3-4 rooms",
    ],
    cons: [
      "If the outdoor unit fails, every room loses cooling",
      "Slightly less efficient than a single-split per room",
    ],
    brandHref: "/brands/mitsubishi-electric",
  },
  {
    key: "ducted",
    name: "Ducted Reverse-Cycle",
    eyebrow: "Whole-home ducted cooling + heating",
    cools: true,
    heats: "yes",
    installFrom: "$9,500",
    installTo: "$18,000",
    runningCost: "$800-$2,500 / yr",
    zoneControl: "Yes — Zonemate 4-8 zones",
    lifespan: "15-20 years",
    bestFor: "Whole-home solution for 3+ bed family homes with attic space",
    bestSuburbs: "Officer, Berwick, Clyde, Cranbourne — new-build estates",
    brandsWeInstall: "Mitsubishi PEAD-M, Kaden ducted, Zonemate zoning",
    pros: [
      "Seamless — no visible indoor units",
      "One system handles cooling AND heating for the whole home",
      "Property-value uplift on any home with ceiling space to duct it",
    ],
    cons: [
      "Highest install cost of any option",
      "Requires ceiling / roof cavity — retrofit into a single-storey slab-on-ground is expensive",
      "Zoning tuning is important — a badly-balanced 4-zone system is worse than three splits",
    ],
    brandHref: "/brands/mitsubishi-electric",
  },
  {
    key: "gas-ducted",
    name: "Gas Ducted Heater",
    eyebrow: "Winter-only whole-home heating",
    cools: false,
    heats: "yes",
    installFrom: "$4,500",
    installTo: "$8,500",
    runningCost: "$800-$2,000 per winter",
    zoneControl: "Basic (open/close dampers)",
    lifespan: "15-20 years",
    bestFor: "Cold hills postcodes on mains gas that don't want reverse-cycle",
    bestSuburbs: "Emerald, Gembrook, Cockatoo, Beaconsfield Upper",
    brandsWeInstall: "Brivis Wombat + Buffalo, Kaden gas ducted",
    pros: [
      "Fast heat-up — big room reaches temp in ~15 minutes",
      "Same-footprint retrofit into most 90s-onwards homes with an existing Brivis / Braemar",
      "Doesn't need refrigerant handling licence to service",
    ],
    cons: [
      "Heating only — need separate cooling for summer",
      "Running cost rising as gas tariffs rise",
      "Not eligible for VEU rebate (the scheme incentivises moving OFF gas)",
    ],
    brandHref: "/brands/brivis",
  },
  {
    key: "evap",
    name: "Evaporative Cooling",
    eyebrow: "Cheap summer whole-home cooling",
    cools: true,
    heats: "no",
    installFrom: "$3,500",
    installTo: "$6,000",
    runningCost: "$200-$500 per summer",
    zoneControl: "No — whole-home only",
    lifespan: "10-15 years",
    bestFor: "Dry-summer suburbs on the outer edge that want cheap-to-run whole-home cooling",
    bestSuburbs: "Cranbourne, Clyde, Officer — dry summer air",
    brandsWeInstall: "Brivis Contour / Advance, Kaden evap",
    pros: [
      "~25% of the running cost of refrigerated ducted",
      "Whole-home cooling from a single roof unit",
      "Simple mechanicals, easy to service",
    ],
    cons: [
      "Cooling only — need a separate heater",
      "Ineffective on humid days (dumps humidity indoors — bad on 32 °C + 70% humidity days)",
      "Requires open windows to work — security concern for some households",
    ],
    brandHref: "/brands/brivis",
  },
];

const DEFAULT_SELECTED = new Set(["split", "ducted", "gas-ducted"]);

export function SystemComparison() {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 5) next.add(key);
      return next;
    });
  };

  const rows = SYSTEMS.filter((s) => selected.has(s.key));

  return (
    <>
      {/* Selector chip row */}
      <div className="sysc-chips" role="group" aria-label="Select systems to compare">
        {SYSTEMS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`sysc-chip${selected.has(s.key) ? " is-active" : ""}`}
            onClick={() => toggle(s.key)}
            aria-pressed={selected.has(s.key)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="sysc-selectionhint">
        Pick 2-5 systems to compare. Currently comparing <strong>{rows.length}</strong>.
      </p>

      {rows.length === 0 ? (
        <div className="faults-empty">Pick at least one system above to see the comparison.</div>
      ) : (
        <div className="sysc-scroll">
          <table className="sysc-table">
            <thead>
              <tr>
                <th className="sysc-th--rowhead" />
                {rows.map((s) => (
                  <th key={s.key} className="sysc-th--sys">
                    <div className="sysc-sys">
                      <div className="sysc-sys__name">{s.name}</div>
                      <div className="sysc-sys__eyebrow">{s.eyebrow}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label="Cools?"        rows={rows.map((s) => yn(s.cools))} />
              <ComparisonRow label="Heats?"        rows={rows.map((s) => s.heats === "yes" ? "Yes" : s.heats === "hyper" ? "Yes (Hyper)" : "No")} />
              <ComparisonRow label="Install from"  rows={rows.map((s) => s.installFrom)} />
              <ComparisonRow label="Install to"    rows={rows.map((s) => s.installTo)} />
              <ComparisonRow label="Running cost"  rows={rows.map((s) => s.runningCost)} />
              <ComparisonRow label="Zone control"  rows={rows.map((s) => s.zoneControl)} />
              <ComparisonRow label="Lifespan"      rows={rows.map((s) => s.lifespan)} />
              <ComparisonRow label="Best for"      rows={rows.map((s) => s.bestFor)} wrap />
              <ComparisonRow label="Best in"       rows={rows.map((s) => s.bestSuburbs)} wrap />
              <ComparisonRow label="Brands we install" rows={rows.map((s) => s.brandsWeInstall)} wrap />

              <tr>
                <th scope="row" className="sysc-th--rowhead">Pros</th>
                {rows.map((s) => (
                  <td key={s.key} className="sysc-td">
                    <ul className="sysc-list sysc-list--pros">
                      {s.pros.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="sysc-th--rowhead">Cons</th>
                {rows.map((s) => (
                  <td key={s.key} className="sysc-td">
                    <ul className="sysc-list sysc-list--cons">
                      {s.cons.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="sysc-th--rowhead">&nbsp;</th>
                {rows.map((s) => (
                  <td key={s.key} className="sysc-td sysc-td--cta">
                    {s.brandHref && (
                      <Link href={s.brandHref} className="ds-btn ds-btn--ghost ds-btn--sm">See our range →</Link>
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
          Rule-of-thumb picks
        </h2>
        <ul style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)", margin: 0, paddingLeft: 20 }}>
          <li><strong>One or two bedrooms:</strong> Wall splits are the cheapest and most flexible.</li>
          <li><strong>3-4 rooms, no ceiling space:</strong> Multi-head split with 4 heads.</li>
          <li><strong>3+ bed family home, has attic:</strong> Ducted reverse-cycle with 4-6 Zonemate zones.</li>
          <li><strong>Hills postcode, mains gas on street:</strong> Gas ducted heater + a couple of splits for summer.</li>
          <li><strong>Cranbourne / Clyde new-build on the flat:</strong> Ducted RC OR evap + gas ducted combo.</li>
          <li><strong>Rental / short-term:</strong> Wall split in the main room — smallest capex.</li>
        </ul>
      </div>
    </>
  );
}

function yn(v: boolean) {
  return v ? "Yes" : "No";
}

function ComparisonRow({ label, rows, wrap }: { label: string; rows: string[]; wrap?: boolean }) {
  return (
    <tr>
      <th scope="row" className="sysc-th--rowhead">{label}</th>
      {rows.map((v, i) => (
        <td key={i} className={wrap ? "sysc-td sysc-td--wrap" : "sysc-td"}>{v}</td>
      ))}
    </tr>
  );
}
