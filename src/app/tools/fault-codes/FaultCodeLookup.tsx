"use client";

import { useMemo, useState } from "react";
import {
  FAULT_CODES,
  FAULT_BRANDS,
  FAULT_SYSTEM_LABELS,
  type FaultSystem,
} from "@/lib/faultCodes";

/**
 * Searchable + brand-filterable + system-type-filterable fault-code
 * table. Client-only so search runs live without a page reload.
 *
 * System filter (chip row) narrows to aircon / heater / hot-water
 * before the brand dropdown, so a homeowner who knows "my heater
 * is showing 22" doesn't have to scroll past 30 aircon codes.
 */

const SYSTEM_ORDER: (FaultSystem | "all")[] = ["all", "aircon", "heater", "hot-water"];

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
    <>
      {/* System-type chip row */}
      <div className="faults-systems" role="tablist" aria-label="Filter by system type">
        {SYSTEM_ORDER.map((sys) => {
          const label = sys === "all" ? "All systems" : FAULT_SYSTEM_LABELS[sys];
          const active = system === sys;
          return (
            <button
              key={sys}
              type="button"
              role="tab"
              aria-selected={active}
              className={`faults-systemchip${active ? " is-active" : ""}`}
              onClick={() => {
                setSystem(sys);
                setBrand("all");
              }}
            >
              {label}
              <span className="faults-systemchip__count">{counts[sys] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="faults-controls">
        <input
          type="search"
          placeholder="Search by code (e.g. E6, P8, U0) or keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search fault codes"
        />
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
          <option value="all">All brands ({availableBrands.length})</option>
          {availableBrands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="faults-empty">
          No fault codes matched. Try a shorter search term or clear the filters.
        </div>
      ) : (
        <table className="faults-table" aria-label="Aircon fault codes">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Brand</th>
              <th style={{ width: 100 }}>System</th>
              <th style={{ width: 90 }}>Code</th>
              <th>Likely meaning</th>
              <th className="faults-th--check">First check</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={`${f.brand}-${f.code}`}>
                <td><span className="fault-brand">{f.brand}</span></td>
                <td><span className={`fault-system fault-system--${f.system}`}>{FAULT_SYSTEM_LABELS[f.system]}</span></td>
                <td><span className="fault-code">{f.code}</span></td>
                <td>
                  <strong style={{ color: "var(--navy)" }}>{f.meaning}</strong>
                </td>
                <td className="faults-td--check">{f.firstCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="faults-count">
        Showing {filtered.length} of {FAULT_CODES.length} codes
        {system !== "all" && ` · ${FAULT_SYSTEM_LABELS[system]} only`}
        {brand !== "all" && ` · ${brand}`}
        {query && ` · matching "${query}"`}
      </div>
    </>
  );
}
