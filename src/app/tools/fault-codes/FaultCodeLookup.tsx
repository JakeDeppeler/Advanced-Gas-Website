"use client";

import { useMemo, useState } from "react";
import { FAULT_CODES, FAULT_BRANDS } from "@/lib/faultCodes";

/**
 * Searchable + brand-filterable fault-code table. Client-only so
 * search runs live without a page reload. Table is fully rendered
 * server-side too (see the SEO fallback list on the page) so Google
 * indexes every code + meaning as static text.
 */

export function FaultCodeLookup() {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAULT_CODES.filter((f) => {
      if (brand !== "all" && f.brand !== brand) return false;
      if (!q) return true;
      return (
        f.code.toLowerCase().includes(q) ||
        f.meaning.toLowerCase().includes(q) ||
        f.brand.toLowerCase().includes(q) ||
        f.firstCheck.toLowerCase().includes(q)
      );
    });
  }, [query, brand]);

  return (
    <>
      <div className="faults-controls">
        <input
          type="search"
          placeholder="Search by code (e.g. E6, P8, U0) or keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search fault codes"
        />
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
          <option value="all">All brands ({FAULT_CODES.length})</option>
          {FAULT_BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="faults-empty">
          No fault codes matched. Try a shorter search term or clear the brand filter.
        </div>
      ) : (
        <table className="faults-table" aria-label="Aircon fault codes">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Brand</th>
              <th style={{ width: 90 }}>Code</th>
              <th>Likely meaning</th>
              <th className="faults-th--check">First check</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={`${f.brand}-${f.code}`}>
                <td><span className="fault-brand">{f.brand}</span></td>
                <td><span className="fault-code">{f.code}</span></td>
                <td>
                  <strong style={{ color: "var(--navy)" }}>{f.meaning}</strong>
                  <div className="faults-td--check-inline" style={{ display: "none", marginTop: 4, fontSize: 13, color: "var(--ink-3)" }}>
                    <em>First check:</em> {f.firstCheck}
                  </div>
                </td>
                <td className="faults-td--check">{f.firstCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="faults-count">
        Showing {filtered.length} of {FAULT_CODES.length} codes
        {brand !== "all" && ` · ${brand} only`}
        {query && ` · matching "${query}"`}
      </div>
    </>
  );
}
