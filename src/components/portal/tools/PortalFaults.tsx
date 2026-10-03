"use client";

import { useMemo, useState } from "react";
import { FAULT_CODES, FAULT_SYSTEM_LABELS, type FaultSystem } from "@/lib/faultCodes";

// In the design's order.
const SYSTEMS: FaultSystem[] = ["aircon", "heater", "evap", "hot-water"];

/**
 * The fault-code finder, the portal's version — Tools.dc.html's fault tab:
 * the search, the brand and the systems in one panel, over a plain table.
 */
export function PortalFaults() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [sys, setSys] = useState<FaultSystem | "">("");

  const brands = useMemo(() => [...new Set(FAULT_CODES.map((f) => f.brand))].sort(), []);
  const byBrand = brand ? FAULT_CODES.filter((f) => f.brand === brand) : FAULT_CODES;
  const needle = q.trim().toLowerCase();
  const matching = needle
    ? byBrand.filter((f) => `${f.code} ${f.meaning} ${f.firstCheck} ${f.brand}`.toLowerCase().includes(needle))
    : byBrand;
  const rows = sys ? matching.filter((f) => f.system === sys) : matching;
  const count = (s: FaultSystem) => matching.filter((f) => f.system === s).length;

  return (
    <section className="ptl-card ptl-faults">
      <div className="ptl-faults__find">
        <label className="ptl-faults__q">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
          <input type="search" placeholder="Type a code, e.g. P5" aria-label="Fault code" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands ({brands.length})</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="ptl-chips" role="group" aria-label="System">
        <button type="button" aria-pressed={sys === ""} className={sys === "" ? "is-on" : undefined} onClick={() => setSys("")}>All systems <span>{matching.length}</span></button>
        {SYSTEMS.map((s) => (
          <button key={s} type="button" aria-pressed={sys === s} className={sys === s ? "is-on" : undefined} onClick={() => setSys(s)}>
            {FAULT_SYSTEM_LABELS[s]} <span>{count(s)}</span>
          </button>
        ))}
      </div>
      <div className="ptl-faults__table" role="table" aria-label="Fault codes">
        <div className="ptl-faults__head" role="row"><span role="columnheader">Brand</span><span role="columnheader">Code</span><span role="columnheader">Likely meaning</span><span role="columnheader">First check</span></div>
        {rows.length === 0 ? (
          <p className="ptl-faults__none">Nothing matches. Check the code on the unit, or try just the brand.</p>
        ) : rows.map((f) => (
          <div key={`${f.brand}-${f.code}`} className="ptl-faults__row" role="row">
            <span role="cell"><strong>{f.brand}</strong><em>{FAULT_SYSTEM_LABELS[f.system]}</em></span>
            <span role="cell" className="ptl-faults__code">{f.code}</span>
            <span role="cell" className="ptl-faults__meaning">{f.meaning}</span>
            <span role="cell" className="ptl-faults__check">{f.firstCheck}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
