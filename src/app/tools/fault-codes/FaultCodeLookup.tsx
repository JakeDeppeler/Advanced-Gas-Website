"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FAULT_CODES,
  FAULT_BRANDS,
  FAULT_SYSTEM_LABELS,
  faultSlug,
  type FaultSystem,
} from "@/lib/faultCodes";
import "@/components/homepage/tools/calc-c.css";

/**
 * Searchable + brand-filterable + system-type-filterable fault-code
 * table. Client-only so search runs live without a page reload.
 *
 * System filter (chip row) narrows to aircon / heater / hot-water
 * before the brand dropdown, so a homeowner who knows "my heater
 * is showing 22" doesn't have to scroll past 30 aircon codes.
 */

const SYSTEM_ORDER: (FaultSystem | "all")[] = ["all", "aircon", "heater", "evap", "hot-water"];

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

  return (
    <div className="cc">
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
        <ul className="cc-faults" aria-label="Aircon fault codes">
          {filtered.map((f) => {
            const href = `/tools/fault-codes/${faultSlug(f.brand)}/${faultSlug(f.code)}`;
            return (
              <li key={`${f.brand}-${f.code}`} className="cc-card cc-fault">
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
                  <span className="cc-ftags">
                    <span className="cc-tag">{f.brand}</span>
                    <span className="cc-tag">{FAULT_SYSTEM_LABELS[f.system]}</span>
                  </span>
                  {f.detail && <Link href={href} className="cc-fmore">What it means and what to check →</Link>}
                </div>
                <div className="cc-fcheck">
                  <span className="cc-lbl">First check</span>
                  {f.firstCheck}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
