"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import "@/components/homepage/tools/calc-c.css";
import { SHOW_PRICES } from "@/lib/homepage/data";

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
      "One room only, three bedrooms = three units + three outdoor condensers",
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
    zoneControl: "Yes, Zonemate 4-8 zones",
    lifespan: "15-20 years",
    bestFor: "Whole-home solution for 3+ bed family homes with attic space",
    bestSuburbs: "Officer, Berwick, Clyde, Cranbourne, new-build estates",
    brandsWeInstall: "Mitsubishi PEAD-M, Kaden ducted, Zonemate zoning",
    pros: [
      "Seamless, no visible indoor units",
      "One system handles cooling AND heating for the whole home",
      "Property-value uplift on any home with ceiling space to duct it",
    ],
    cons: [
      "Highest install cost of any option",
      "Requires ceiling / roof cavity, retrofit into a single-storey slab-on-ground is expensive",
      "Zoning tuning is important, a badly-balanced 4-zone system is worse than three splits",
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
      "Fast heat-up, big room reaches temp in ~15 minutes",
      "Same-footprint retrofit into most 90s-onwards homes with an existing ducted heater",
      "Doesn't need refrigerant handling licence to service",
    ],
    cons: [
      "Heating only, need separate cooling for summer",
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
    zoneControl: "No, whole-home only",
    lifespan: "10-15 years",
    bestFor: "Dry-summer suburbs on the outer edge that want cheap-to-run whole-home cooling",
    bestSuburbs: "Cranbourne, Clyde, Officer, dry summer air",
    brandsWeInstall: "Brivis Contour / Advance, Kaden evap",
    pros: [
      "~25% of the running cost of refrigerated ducted",
      "Whole-home cooling from a single roof unit",
      "Simple mechanicals, easy to service",
    ],
    cons: [
      "Cooling only, need a separate heater",
      "Ineffective on humid days (dumps humidity indoors, bad on 32 °C + 70% humidity days)",
      "Requires open windows to work, security concern for some households",
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
  const heats = (s: SystemRow) => (s.heats === "yes" ? "Yes" : s.heats === "hyper" ? "Yes (Hyper)" : "No");

  return (
    <div className="cc">
      {/* Selector chips: the mark turns from + to ✓, so picked isn't shown by colour alone. */}
      <div className="cc-card cc-pick">
        <span className="cc-lbl">Systems to compare</span>
        <div className="cc-chips cc-chips--scroll" role="group" aria-label="Select systems to compare">
          {SYSTEMS.map((s) => {
            const on = selected.has(s.key);
            return (
              <button key={s.key} type="button" className="cc-chip" onClick={() => toggle(s.key)} aria-pressed={on}>
                <i aria-hidden="true">{on ? "✓" : "+"}</i>{s.name}
              </button>
            );
          })}
        </div>
        <p className="cc-hint">
          Pick 2-5 systems to compare. Currently comparing <strong>{rows.length}</strong>.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="cc-empty">Pick at least one system above to see the comparison.</div>
      ) : (
        <>
        {/* Phone: a card per selected system. */}
        <div className="cc-cards">
          {rows.map((s) => (
            <article key={s.key} className="cc-card cc-card--sys">
              <header className="cc-cardhead">
                <span className="cc-sysname">{s.name}</span>
                <span className="cc-syseye">{s.eyebrow}</span>
              </header>
              <dl className="cc-rows">
                <div><dt>Cools?</dt><dd><YesNo v={s.cools ? "Yes" : "No"} /></dd></div>
                <div><dt>Heats?</dt><dd><YesNo v={heats(s)} /></dd></div>
                {/* Install prices follow the site-wide switch, off until Jake's real prices are in. */}
                {SHOW_PRICES && <div><dt>Install</dt><dd>{s.installFrom} → {s.installTo}</dd></div>}
                <div><dt>Running</dt><dd>{s.runningCost}</dd></div>
                <div><dt>Zone control</dt><dd>{s.zoneControl}</dd></div>
                <div><dt>Lifespan</dt><dd>{s.lifespan}</dd></div>
                <div><dt>Best for</dt><dd>{s.bestFor}</dd></div>
                <div><dt>Best in</dt><dd>{s.bestSuburbs}</dd></div>
                <div><dt>Brands</dt><dd>{s.brandsWeInstall}</dd></div>
              </dl>
              <div className="cc-block">
                <span className="cc-lbl">Pros</span>
                <ul className="cc-list cc-list--pro">{s.pros.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
              <div className="cc-block">
                <span className="cc-lbl">Cons</span>
                <ul className="cc-list cc-list--con">{s.cons.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              {s.brandHref && (
                <div className="cc-cardcta">
                  <Link href={s.brandHref} className="abtn abtn--ghost">See our range →</Link>
                </div>
              )}
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
                  {rows.map((s) => (
                    <th key={s.key} scope="col">
                      <span className="cc-sysname">{s.name}</span>
                      <span className="cc-syseye">{s.eyebrow}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Cools?" rows={rows.map((s) => <YesNo key={s.key} v={s.cools ? "Yes" : "No"} />)} />
                <ComparisonRow label="Heats?" rows={rows.map((s) => <YesNo key={s.key} v={heats(s)} />)} />
                {SHOW_PRICES && <ComparisonRow label="Install from" rows={rows.map((s) => s.installFrom)} />}
                {SHOW_PRICES && <ComparisonRow label="Install to" rows={rows.map((s) => s.installTo)} />}
                <ComparisonRow label="Running cost" rows={rows.map((s) => s.runningCost)} />
                <ComparisonRow label="Zone control" rows={rows.map((s) => s.zoneControl)} />
                <ComparisonRow label="Lifespan" rows={rows.map((s) => s.lifespan)} />
                <ComparisonRow label="Best for" rows={rows.map((s) => s.bestFor)} wrap />
                <ComparisonRow label="Best in" rows={rows.map((s) => s.bestSuburbs)} wrap />
                <ComparisonRow label="Brands we install" rows={rows.map((s) => s.brandsWeInstall)} wrap />
                <tr>
                  <th scope="row" className="cc-rowh">Pros</th>
                  {rows.map((s) => (
                    <td key={s.key} className="cc-wrap"><ul className="cc-list cc-list--pro">{s.pros.map((p) => <li key={p}>{p}</li>)}</ul></td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="cc-rowh">Cons</th>
                  {rows.map((s) => (
                    <td key={s.key} className="cc-wrap"><ul className="cc-list cc-list--con">{s.cons.map((c) => <li key={c}>{c}</li>)}</ul></td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="cc-rowh"><span className="sr-only">Range</span></th>
                  {rows.map((s) => (
                    <td key={s.key} className="cc-ctacell">
                      {s.brandHref && <Link href={s.brandHref} className="abtn abtn--ghost">See our range →</Link>}
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
        <span className="cc-lbl">Rule of thumb</span>
        <h2>Rule-of-thumb picks</h2>
        <ul>
          <li><strong>One or two bedrooms:</strong> Wall splits are the cheapest and most flexible.</li>
          <li><strong>3-4 rooms, no ceiling space:</strong> Multi-head split with 4 heads.</li>
          <li><strong>3+ bed family home, has attic:</strong> Ducted reverse-cycle with 4-6 Zonemate zones.</li>
          <li><strong>Hills postcode, mains gas on street:</strong> Gas ducted heater + a couple of splits for summer.</li>
          <li><strong>Cranbourne / Clyde new-build on the flat:</strong> Ducted RC OR evap + gas ducted combo.</li>
          <li><strong>Rental / short-term:</strong> Wall split in the main room, smallest capex.</li>
        </ul>
      </aside>
    </div>
  );
}

/** Yes or No with a ✓ or ✕ beside it, so the answer reads without colour. */
function YesNo({ v }: { v: string }) {
  return <span className={/^yes/i.test(v) ? "cc-yes" : "cc-no"}>{v}</span>;
}

function ComparisonRow({ label, rows, wrap }: { label: string; rows: ReactNode[]; wrap?: boolean }) {
  return (
    <tr>
      <th scope="row" className="cc-rowh">{label}</th>
      {rows.map((v, i) => (
        <td key={i} className={wrap ? "cc-wrap" : undefined}>{v}</td>
      ))}
    </tr>
  );
}
