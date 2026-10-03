"use client";

import { useMemo, useState } from "react";
import { FAULT_CODES, FAULT_SYSTEM_LABELS, type FaultSystem } from "@/lib/faultCodes";

const SYSTEMS: FaultSystem[] = ["aircon", "heater", "evap", "hot-water"];

/**
 * The fault-code finder, sized for a thumb: type the code or the brand, narrow
 * by system, read the first check. The same table the public site and the
 * office portal read.
 */
export function TradeFaults({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const [sys, setSys] = useState<FaultSystem | "">("");
  const needle = q.trim().toLowerCase();
  const rows = useMemo(() => FAULT_CODES.filter((f) =>
    (!sys || f.system === sys) && (!needle || `${f.code} ${f.brand} ${f.meaning}`.toLowerCase().includes(needle))), [sys, needle]);

  return (
    <>
      <input className="tr-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code or brand, e.g. P4 or Mitsubishi" aria-label="Code or brand" style={{ minHeight: 58, borderRadius: 16 }} />
      <div className="tr-pills">
        <button type="button" aria-pressed={sys === ""} className={`tr-pill${sys === "" ? " is-on" : ""}`} onClick={() => setSys("")}>All systems</button>
        {SYSTEMS.map((s) => (
          <button key={s} type="button" aria-pressed={sys === s} className={`tr-pill${sys === s ? " is-on" : ""}`} onClick={() => setSys(s)}>{FAULT_SYSTEM_LABELS[s]}</button>
        ))}
      </div>
      <section className="tr-card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {rows.slice(0, 120).map((f) => (
          <div key={`${f.brand}-${f.code}`} className="tr-fault">
            <span className="tr-code">{f.code}</span>
            <span style={{ minWidth: 0 }}>
              <strong>{f.meaning}</strong>
              <p>{f.firstCheck}</p>
              <em>{f.brand} · {FAULT_SYSTEM_LABELS[f.system]}{f.severity === "critical" ? " · stop and isolate" : ""}</em>
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="tr-empty" style={{ padding: "16px 4px" }}>Nothing matches. Check the code on the unit, or try just the brand.</p>}
        {rows.length > 120 && <p className="tr-small" style={{ padding: "12px 4px" }}>Showing 120 of {rows.length}. Type a code or brand to narrow it.</p>}
      </section>
    </>
  );
}
