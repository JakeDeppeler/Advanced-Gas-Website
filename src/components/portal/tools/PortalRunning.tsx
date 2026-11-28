"use client";

import { useMemo, useState } from "react";
import { SAVINGS_DEFAULTS, hotWaterRunningCost, type CurrentSystem } from "@/lib/tools/hotWaterSavings";
import { AIRCONS, HEATERS, HEATING_DEFAULTS, heatingCost, type AirconKind, type HeaterKind } from "@/lib/tools/heatingCost";
import { Field, PanelHead, Select } from "./Fields";

const NOW: { k: CurrentSystem; label: string; fuel: string }[] = [
  { k: "gas-storage", label: "Gas storage", fuel: "gas" },
  { k: "gas-continuous", label: "Gas instantaneous", fuel: "gas" },
  { k: "electric-storage", label: "Electric storage", fuel: "electric" },
];

type Mode = "aircon" | "water";
const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const num = (s: string, d: number) => { const n = Number(s.replace(/[^0-9.]/g, "")); return s.trim() && Number.isFinite(n) && n > 0 ? n : d; };

/**
 * Running cost, for the quote: aircon heating against what it replaces, and
 * a year of hot water against a heat pump (Jake, 28 Nov: "we need this for
 * the aircon and then hot water as well"). One switch between the two; the
 * prices off the customer's bill are shared, and left blank they fall back
 * to the Melbourne averages the models quote from, which the boxes say.
 *
 * The aircon side prices heat, not hours, for the reason on heatingCost.
 */
export function PortalRunning() {
  const [mode, setMode] = useState<Mode>("aircon");
  const [gas, setGas] = useState("");
  const [power, setPower] = useState("");
  const gasC = num(gas, SAVINGS_DEFAULTS.gasCentsPerMJ);
  const powerC = num(power, SAVINGS_DEFAULTS.elecCentsPerKwh);
  const theirs = gas.trim() || power.trim() ? "the prices on their bill" : "Melbourne’s average prices";

  // Aircon
  const [aircon, setAircon] = useState<AirconKind>(HEATING_DEFAULTS.aircon);
  const [heater, setHeater] = useState<HeaterKind>(HEATING_DEFAULTS.heater);
  const [bill, setBill] = useState("");
  const h = useMemo(() => heatingCost({ aircon, heater, gasCentsPerMJ: gasC, elecCentsPerKwh: powerC, heatingBill: num(bill, 0) || null }), [aircon, heater, gasC, powerC, bill]);

  // Hot water
  const [people, setPeople] = useState(4);
  const [now, setNow] = useState<CurrentSystem>("gas-storage");
  const w = useMemo(() => hotWaterRunningCost({ ...SAVINGS_DEFAULTS, household: Math.max(1, people), currentSystem: now, gasCentsPerMJ: gasC, elecCentsPerKwh: powerC }), [people, now, gasC, powerC]);
  const fuel = NOW.find((n) => n.k === now)?.fuel ?? "gas";

  const prices = (
    <div className="tt-two">
      <Field label="Gas price (c/MJ)">
        <input type="text" inputMode="decimal" placeholder={`${SAVINGS_DEFAULTS.gasCentsPerMJ}, the average`} value={gas} onChange={(e) => setGas(e.target.value)} />
      </Field>
      <Field label="Power price (c/kWh)">
        <input type="text" inputMode="decimal" placeholder={`${SAVINGS_DEFAULTS.elecCentsPerKwh}, the average`} value={power} onChange={(e) => setPower(e.target.value)} />
      </Field>
    </div>
  );

  return (
    <div className="tt-grid">
      <section className="rp-panel rp-card tt-form" aria-labelledby="tt-run-h">
        <div className="rp-panel-h">
          <span className="rp-hh"><b id="tt-run-h">{mode === "aircon" ? "Heating with an aircon" : "Hot water, heat pump vs now"}</b><span className="rp-note">Prices off their bill, or left blank for the Melbourne average</span></span>
          <span className="rp-seg tt-mode" role="group" aria-label="What it’s for">
            <button type="button" aria-pressed={mode === "aircon"} className={mode === "aircon" ? "on" : undefined} onClick={() => setMode("aircon")}>Aircon</button>
            <button type="button" aria-pressed={mode === "water"} className={mode === "water" ? "on" : undefined} onClick={() => setMode("water")}>Hot water</button>
          </span>
        </div>
        {mode === "aircon" ? (
          <>
            <div className="tt-two">
              <Field label="Going in">
                <Select value={aircon} onChange={(e) => setAircon(e.target.value as AirconKind)}>{AIRCONS.map((a) => <option key={a.k} value={a.k}>{a.label}</option>)}</Select>
              </Field>
              <Field label="What it replaces">
                <Select value={heater} onChange={(e) => setHeater(e.target.value as HeaterKind)}>{HEATERS.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}</Select>
              </Field>
            </div>
            <Field label="What heating costs them a year ($)">
              <input type="text" inputMode="decimal" placeholder="Their winter bills, less hot water and cooking" value={bill} onChange={(e) => setBill(e.target.value)} />
            </Field>
            {prices}
          </>
        ) : (
          <>
            <div className="tt-two">
              <Field label="People in the house">
                <input type="number" min={1} max={12} value={people} onChange={(e) => setPeople(Number(e.target.value) || 1)} />
              </Field>
              <Field label="Current system">
                <Select value={now} onChange={(e) => setNow(e.target.value as CurrentSystem)}>{NOW.map((n) => <option key={n.k} value={n.k}>{n.label}</option>)}</Select>
              </Field>
            </div>
            {prices}
          </>
        )}
      </section>

      {mode === "aircon" ? (
        <aside className="tt-answer" aria-label="The answer">
          {h.bill != null && h.saved != null && h.billAfter != null ? (
            <>
              <span className="tt-k">They save, a year</span>
              <strong className="tt-big">{$(h.saved)}</strong>
              <div className="tt-rows">
                <div><span>{h.heater.label} now</span><b>{$(h.bill)}</b></div>
                <div><span>{h.aircon.label}</span><b>{$(h.billAfter)}</b></div>
              </div>
            </>
          ) : (
            <>
              <span className="tt-k">Every $100 of heating now</span>
              <strong className="tt-big">{$(h.per100)}</strong>
              <span className="tt-k tt-k--soft">on the {h.aircon.label.toLowerCase()}. Put in what heating costs them a year for their own figure.</span>
            </>
          )}
          <div className="tt-rows">
            <div><span>A kWh of heat, {h.heater.label.toLowerCase()}</span><b>{h.heaterPerKwh.toFixed(1)}c</b></div>
            <div><span>The same heat from the aircon</span><b>{h.airconPerKwh.toFixed(1)}c</b></div>
          </div>
          <span className="tt-k tt-k--soft">
            At {theirs}. Takes a COP of about {h.aircon.cop} for the aircon and {Math.round(h.heater.efficiency * 100)}% for the {h.heater.label.toLowerCase()}: typical, not this house’s. The energy label has the unit’s own.
          </span>
        </aside>
      ) : (
        <aside className="tt-answer" aria-label="The answer">
          <span className="tt-k">They save, a year</span>
          <strong className="tt-big">{$(w.savingYr)}</strong>
          <div className="tt-rows">
            <div><span>Now ({fuel})</span><b>{$(w.currentCostYr)}</b></div>
            <div><span>Heat pump</span><b>{$(w.heatPumpCostYr)}</b></div>
          </div>
          <span className="tt-k tt-k--soft">A year of hot water for {people} {people === 1 ? "person" : "people"}, at {theirs}.</span>
        </aside>
      )}
    </div>
  );
}
