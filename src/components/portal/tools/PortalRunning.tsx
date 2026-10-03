"use client";

import { useMemo, useState } from "react";
import { SAVINGS_DEFAULTS, hotWaterRunningCost, type CurrentSystem } from "@/lib/tools/hotWaterSavings";

const NOW: { k: CurrentSystem; label: string; fuel: string }[] = [
  { k: "gas-storage", label: "Gas storage", fuel: "gas" },
  { k: "gas-continuous", label: "Gas instantaneous", fuel: "gas" },
  { k: "electric-storage", label: "Electric storage", fuel: "electric" },
];

/**
 * Running cost, the portal's version — Tools.dc.html's running-cost tab: a
 * year of hot water now, against a heat pump, for the quote.
 *
 * The public site's hot water savings model (lib/tools/hotWaterSavings).
 * The prices are off the customer's bill; left blank, they fall back to the
 * Melbourne averages that calculator quotes from, and the boxes say which.
 */
export function PortalRunning() {
  const [people, setPeople] = useState(4);
  const [now, setNow] = useState<CurrentSystem>("gas-storage");
  const [gas, setGas] = useState("");
  const [power, setPower] = useState("");
  const num = (s: string, d: number) => { const n = Number(s.replace(/[^0-9.]/g, "")); return s.trim() && Number.isFinite(n) && n > 0 ? n : d; };
  const r = useMemo(() => hotWaterRunningCost({
    ...SAVINGS_DEFAULTS,
    household: Math.max(1, people),
    currentSystem: now,
    gasCentsPerMJ: num(gas, SAVINGS_DEFAULTS.gasCentsPerMJ),
    elecCentsPerKwh: num(power, SAVINGS_DEFAULTS.elecCentsPerKwh),
  }), [people, now, gas, power]);
  const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
  const fuel = NOW.find((n) => n.k === now)?.fuel ?? "gas";

  return (
    <div className="ptl-grid">
      <section className="ptl-card ptl-card--form">
        <h2>Heat pump vs gas, for the quote</h2>
        <div className="ptl-two">
          <label className="ptl-field">People in the house
            <input type="number" min={1} max={12} value={people} onChange={(e) => setPeople(Number(e.target.value) || 1)} />
          </label>
          <label className="ptl-field">Current system
            <select value={now} onChange={(e) => setNow(e.target.value as CurrentSystem)}>{NOW.map((n) => <option key={n.k} value={n.k}>{n.label}</option>)}</select>
          </label>
          <label className="ptl-field">Gas price (c/MJ)
            <input type="text" inputMode="decimal" placeholder="From their bill" title={`Left blank, ${SAVINGS_DEFAULTS.gasCentsPerMJ} c/MJ — the Melbourne average`} value={gas} onChange={(e) => setGas(e.target.value)} />
          </label>
          <label className="ptl-field">Power price (c/kWh)
            <input type="text" inputMode="decimal" placeholder="From their bill" title={`Left blank, ${SAVINGS_DEFAULTS.elecCentsPerKwh} c/kWh — the Melbourne average`} value={power} onChange={(e) => setPower(e.target.value)} />
          </label>
        </div>
      </section>

      <aside className="ptl-card ptl-year">
        <span className="ptl-year__k">A year of hot water</span>
        <div><span>Now ({fuel})</span><strong>{$(r.currentCostYr)}</strong></div>
        <div><span>Heat pump</span><strong>{$(r.heatPumpCostYr)}</strong></div>
        <div className="ptl-year__save"><span>They save</span><strong>{$(r.savingYr)}</strong></div>
      </aside>
    </div>
  );
}
