"use client";

import { useMemo, useState } from "react";
import { FAULT_CODES, FAULT_SYSTEM_LABELS, type FaultSystem } from "@/lib/faultCodes";

// In the design's order.
const SYSTEMS: FaultSystem[] = ["aircon", "heater", "evap", "hot-water"];

/**
 * The fault-code finder, in the home screen's clothes (Jake, 28 Nov: "the
 * fault code finder doesn't match the rest of the page"): a round search and
 * brand box, the systems on home's grey switch, and each code as a row in a
 * home card with the code in its own badge.
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
    <div className="fc">
      <section className="rp-panel rp-card fc-find" aria-label="Find a fault code">
        <label className="fc-q">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
          <input id="fc-q" type="search" placeholder="Type a code, e.g. P5" aria-label="Fault code" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select id="fc-brand" className="fc-brand" aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands ({brands.length})</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="rp-seg fc-sys" role="group" aria-label="System">
          <button type="button" aria-pressed={sys === ""} className={sys === "" ? "on" : undefined} onClick={() => setSys("")}>All <span>{matching.length}</span></button>
          {SYSTEMS.map((s) => (
            <button key={s} type="button" aria-pressed={sys === s} className={sys === s ? "on" : undefined} onClick={() => setSys(s)}>
              {FAULT_SYSTEM_LABELS[s]} <span>{count(s)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rp-panel rp-card fc-list" aria-label="Fault codes">
        {rows.length === 0 ? (
          <p className="rp-empty">Nothing matches. Check the code on the unit, or try just the brand.</p>
        ) : (
          <ul>
            {rows.map((f) => (
              <li key={`${f.brand}-${f.code}`} className="fc-row">
                <span className="fc-code">{f.code}</span>
                <span className="fc-what">
                  <b>{f.meaning}</b>
                  <span>{f.firstCheck}</span>
                </span>
                <span className="fc-brandname"><b>{f.brand}</b><span>{FAULT_SYSTEM_LABELS[f.system]}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
