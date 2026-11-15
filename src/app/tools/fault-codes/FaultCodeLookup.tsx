"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FAULT_CODES,
  FAULT_BRANDS,
  FAULT_SYSTEM_LABELS,
  faultSlug,
  type FaultCode,
  type FaultSystem,
} from "@/lib/faultCodes";
import "@/components/homepage/tools/calc-c.css";
import "./fault-codes.css";

/**
 * Searchable + brand-filterable + system-type-filterable fault-code
 * table. Client-only so search runs live without a page reload.
 *
 * System filter (chip row) narrows to aircon / heater / hot-water
 * before the brand dropdown, so a homeowner who knows "my heater
 * is showing 22" doesn't have to scroll past 30 aircon codes.
 *
 * The results are grouped by what's showing the code, then by brand, with a
 * jump list at the top (Nov 2026). They used to be one column of 149 rows,
 * about 19,000px tall at desktop width, which only worked for someone who
 * searched; the person who scrolls is usually looking for their own brand,
 * and now gets to it in one tap. Brivis alone has 56 codes, so a brand that
 * long is split again into runs of ten ("h01 40–49"): the codes are numbered
 * that way on the controller, and it is the only grouping the data supports
 * without inventing categories the manuals don't give.
 */

const SYSTEM_ORDER: (FaultSystem | "all")[] = ["all", "aircon", "heater", "evap", "hot-water"];

/** Group headings, plural, for the sections and the jump list. */
const SYSTEM_PLURAL: Record<FaultSystem, string> = {
  aircon: "Air conditioners",
  heater: "Gas heaters",
  evap: "Evap coolers",
  "hot-water": "Hot water",
};

/** Brands are listed in the order they first appear in the table, which is the order the data was curated in. */
const BRAND_ORDER = Array.from(new Set(FAULT_CODES.map((f) => f.brand)));

/** A brand with more codes than this is split into runs of ten. */
const SPLIT_OVER = 20;

const brandId = (brand: string) => `fc-${faultSlug(brand)}`;

type Run = { key: string; label: string; codes: FaultCode[] };
type BrandGroup = { brand: string; codes: FaultCode[]; runs: Run[] | null };
type SystemGroup = { system: FaultSystem; brands: BrandGroup[]; count: number };

/** "h01 43" sits in the run "h01 40–49". Codes that don't end in two digits go in a run of their own. */
function runsOf(codes: FaultCode[]): Run[] {
  const runs = new Map<string, Run>();
  for (const f of codes) {
    const m = f.code.match(/^(.*\d)\d$/);
    const key = m ? m[1] : "other";
    const label = m ? `${m[1]}0–${m[1].slice(-1)}9` : "Other codes";
    const run = runs.get(key) ?? { key, label, codes: [] };
    run.codes.push(f);
    runs.set(key, run);
  }
  return Array.from(runs.values());
}

function group(codes: FaultCode[]): SystemGroup[] {
  return (SYSTEM_ORDER.filter((s) => s !== "all") as FaultSystem[])
    .map((system) => {
      const inSystem = codes.filter((f) => f.system === system);
      const brands = BRAND_ORDER
        .map((brand) => ({ brand, codes: inSystem.filter((f) => f.brand === brand) }))
        .filter((b) => b.codes.length > 0)
        .map((b) => ({ ...b, runs: b.codes.length > SPLIT_OVER ? runsOf(b.codes) : null }));
      return { system, brands, count: inSystem.length };
    })
    .filter((g) => g.count > 0);
}

function FaultRow({ f }: { f: FaultCode }) {
  const href = `/tools/fault-codes/${faultSlug(f.brand)}/${faultSlug(f.code)}`;
  return (
    <li className="cc-card cc-fault fcg__row">
      {/* Codes with a written-up page link to it. The rest are
          plain text, because a link to a page that doesn't
          exist helps nobody. */}
      {f.detail ? (
        <Link href={href} className="cc-code" aria-label={`${f.brand} ${f.code}: read more`}>{f.code}</Link>
      ) : (
        <span className="cc-code cc-code--plain">{f.code}</span>
      )}
      <div className="cc-fmain">
        <strong>{f.meaning}</strong>
        {f.detail && <Link href={href} className="cc-fmore">What it means and what to check →</Link>}
      </div>
      <div className="cc-fcheck">
        <span className="cc-lbl">First check</span>
        {f.firstCheck}
      </div>
    </li>
  );
}

export function FaultCodeLookup() {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string>("all");
  const [system, setSystem] = useState<FaultSystem | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAULT_CODES.filter((f) => {
      if (system !== "all" && f.system !== system) return false;
      if (brand !== "all" && f.brand !== brand) return false;
      if (!q) return true;
      return (
        f.code.toLowerCase().includes(q) ||
        f.meaning.toLowerCase().includes(q) ||
        f.brand.toLowerCase().includes(q) ||
        f.firstCheck.toLowerCase().includes(q)
      );
    });
  }, [query, brand, system]);

  const groups = useMemo(() => group(filtered), [filtered]);

  // Brand dropdown only shows brands that exist in the current system
  // filter — no point offering "Reclaim" when the user's on "aircon".
  const availableBrands = useMemo(() => {
    if (system === "all") return FAULT_BRANDS;
    return Array.from(
      new Set(FAULT_CODES.filter((f) => f.system === system).map((f) => f.brand)),
    ).sort();
  }, [system]);

  // Counts per system for the chip labels.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: FAULT_CODES.length };
    for (const f of FAULT_CODES) c[f.system] = (c[f.system] ?? 0) + 1;
    return c;
  }, []);

  // A jump list is only worth showing when there is more than one brand to jump between.
  const brandCount = groups.reduce((n, g) => n + g.brands.length, 0);

  return (
    <div className="cc fcg">
      <div className="cc-card cc-pick">
        {/* System-type chip row */}
        <span className="cc-lbl">What&apos;s showing the code?</span>
        <div className="cc-chips cc-chips--scroll" role="tablist" aria-label="Filter by system type">
          {SYSTEM_ORDER.map((sys) => {
            const label = sys === "all" ? "All systems" : FAULT_SYSTEM_LABELS[sys];
            const active = system === sys;
            return (
              <button
                key={sys}
                type="button"
                role="tab"
                aria-selected={active}
                className="cc-chip"
                onClick={() => {
                  setSystem(sys);
                  setBrand("all");
                }}
              >
                {label}
                <b>{counts[sys] ?? 0}</b>
              </button>
            );
          })}
        </div>

        <div className="cc-find">
          <div className="cc-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="search"
              placeholder="Search by code (e.g. E6, P8, U0) or keyword…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search fault codes"
            />
            {query && (
              <button type="button" className="cc-clear" onClick={() => setQuery("")} aria-label="Clear the search">✕</button>
            )}
          </div>
          <div className="cc-select">
            <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
              <option value="all">All brands ({availableBrands.length})</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="cc-count" aria-live="polite">
        Showing <b>{filtered.length}</b> of {FAULT_CODES.length} codes
        {system !== "all" && ` · ${FAULT_SYSTEM_LABELS[system]} only`}
        {brand !== "all" && ` · ${brand}`}
        {query && ` · matching "${query}"`}
      </p>

      {filtered.length === 0 ? (
        <div className="cc-empty">
          No fault codes matched. Try a shorter search term or clear the filters.
        </div>
      ) : (
        <>
          {brandCount > 1 && (
            <nav className="fcg__jump" aria-label="Jump to a brand">
              <span className="fcg__jumpl">Jump to your brand</span>
              <div className="fcg__jcols">
                {groups.map((g) => (
                  <div key={g.system} className="fcg__jcol">
                    <small>{SYSTEM_PLURAL[g.system]}</small>
                    <ul>
                      {g.brands.map((b) => (
                        <li key={b.brand}>
                          <a href={`#${brandId(b.brand)}`}>
                            <span>{b.brand}</span>
                            <b>{b.codes.length}<span className="fcg__sr"> codes</span></b>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          )}

          {groups.map((g) => (
            <section key={g.system} className="fcg__sys" aria-labelledby={`fc-sys-${g.system}`}>
              <h2 className="fcg__sysh" id={`fc-sys-${g.system}`}>
                {SYSTEM_PLURAL[g.system]} <small>{g.count} code{g.count === 1 ? "" : "s"}</small>
              </h2>
              {g.brands.map((b) => (
                <div key={b.brand} className="fcg__brand" id={brandId(b.brand)}>
                  <div className="fcg__bhead">
                    <h3>{b.brand}</h3>
                    <span>{b.codes.length} code{b.codes.length === 1 ? "" : "s"}</span>
                    {b.runs && b.runs.length > 1 && (
                      <nav className="fcg__runs" aria-label={`${b.brand} codes by number`}>
                        {b.runs.map((r) => <a key={r.key} href={`#${brandId(b.brand)}-${faultSlug(r.key)}`}>{r.label}</a>)}
                      </nav>
                    )}
                  </div>
                  {b.runs ? (
                    b.runs.map((r) => (
                      <div key={r.key} className="fcg__run" id={`${brandId(b.brand)}-${faultSlug(r.key)}`}>
                        <h4>{b.brand} {r.label}</h4>
                        <ul className="cc-faults fcg__list" aria-label={`${b.brand} fault codes ${r.label}`}>
                          {r.codes.map((f) => <FaultRow key={`${f.brand}-${f.code}`} f={f} />)}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <ul className="cc-faults fcg__list" aria-label={`${b.brand} fault codes`}>
                      {b.codes.map((f) => <FaultRow key={`${f.brand}-${f.code}`} f={f} />)}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
