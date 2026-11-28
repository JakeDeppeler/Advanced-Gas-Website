"use client";

import { useMemo, useState } from "react";
import { SAVINGS_DEFAULTS, hotWaterRunningCost, type CurrentSystem } from "@/lib/tools/hotWaterSavings";
import { Field, PanelHead, Select } from "./Fields";

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
    <div className="tt-grid">
      <section className="rp-panel rp-card tt-form" aria-labelledby="tt-run-h">
        <PanelHead id="tt-run-h" title="Heat pump vs gas, for the quote" note="Prices off their bill, or left blank for the Melbourne average" />
        <div className="tt-two">
          <Field label="People in the house">
            <input type="number" min={1} max={12} value={people} onChange={(e) => setPeople(Number(e.target.value) || 1)} />
          </Field>
          <Field label="Current system">
            <Select value={now} onChange={(e) => setNow(e.target.value as CurrentSystem)}>{NOW.map((n) => <option key={n.k} value={n.k}>{n.label}</option>)}</Select>
          </Field>
          <Field label="Gas price (c/MJ)">
            <input type="text" inputMode="decimal" placeholder={`${SAVINGS_DEFAULTS.gasCentsPerMJ}, the average`} value={gas} onChange={(e) => setGas(e.target.value)} />
          </Field>
          <Field label="Power price (c/kWh)">
            <input type="text" inputMode="decimal" placeholder={`${SAVINGS_DEFAULTS.elecCentsPerKwh}, the average`} value={power} onChange={(e) => setPower(e.target.value)} />
          </Field>
        </div>
      </section>

      <aside className="tt-answer" aria-label="The answer">
        <span className="tt-k">They save, a year</span>
        <strong className="tt-big">{$(r.savingYr)}</strong>
        <div className="tt-rows">
          <div><span>Now ({fuel})</span><b>{$(r.currentCostYr)}</b></div>
          <div><span>Heat pump</span><b>{$(r.heatPumpCostYr)}</b></div>
        </div>
        <span className="tt-k tt-k--soft">A year of hot water for {people} {people === 1 ? "person" : "people"}{gas || power ? ", at the prices on their bill" : ", at Melbourne’s average prices"}.</span>
      </aside>
    </div>
  );
}
