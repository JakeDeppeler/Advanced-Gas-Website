"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Hot water vs heat pump savings calculator.
 *
 * Estimates the annual running cost of the customer's current system
 * (gas storage / gas continuous / electric storage / off-peak electric)
 * and compares it against a modern heat pump running on the same load.
 *
 * Assumes standard Australian hot water demand: ~50 L per person per day
 * at ~50 °C, which requires roughly 2.4 kWh of delivered heat per person.
 * Adjusted by system efficiency (gas ~80%, electric 100%, heat pump COP 4).
 *
 * Then applies the VEU rebate to a $3,500 install ballpark to get the
 * net install cost and payback period.
 */

const DELIVERED_KWH_PER_PERSON_PER_DAY = 2.4; // ~50 L @ 50 °C
const DAYS_PER_YEAR = 365;

// Efficiencies / COPs used to convert delivered heat → input energy.
const EFFICIENCY: Record<string, number> = {
  "gas-storage":          0.75, // 75% — 5-star storage
  "gas-continuous":       0.85, // 85% — modern continuous flow
  "electric-storage":     1.00, // element is 100% efficient
  "electric-off-peak":    1.00, // same, but cheaper rate
  "solar-electric-boost": 1.00, // when boosting only
};

// Sensible install-cost + rebate defaults (mid-2026 VIC).
const HEAT_PUMP_INSTALL_COST = 3500;
const VEU_REBATE_TYPICAL = 2400; // Typical VIC heat-pump rebate at $60-$75 VEEC prices (max ~$2,700).

// Energy prices (mid-2026 Melbourne retail averages).
const DEFAULT_GAS_C_PER_MJ = 4.5;       // c / MJ for natural gas usage
const DEFAULT_ELEC_C_PER_KWH = 32;      // c / kWh peak
const DEFAULT_OFFPEAK_C_PER_KWH = 18;   // c / kWh off-peak
const KWH_TO_MJ = 3.6;                   // 1 kWh = 3.6 MJ

type CurrentSystem = keyof typeof EFFICIENCY;

type FormState = {
  currentSystem: CurrentSystem;
  household: number;
  gasCentsPerMJ: number;
  elecCentsPerKwh: number;
  offpeakCentsPerKwh: number;
  heatPumpCop: number;
  installCost: number;
  veuRebate: number;
};

const DEFAULTS: FormState = {
  currentSystem: "gas-storage",
  household: 4,
  gasCentsPerMJ: DEFAULT_GAS_C_PER_MJ,
  elecCentsPerKwh: DEFAULT_ELEC_C_PER_KWH,
  offpeakCentsPerKwh: DEFAULT_OFFPEAK_C_PER_KWH,
  heatPumpCop: 4.0,
  installCost: HEAT_PUMP_INSTALL_COST,
  veuRebate: VEU_REBATE_TYPICAL,
};

export function HotWaterSavings() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => {
    const eff = EFFICIENCY[form.currentSystem] ?? 1;
    const deliveredKwhPerYear = form.household * DELIVERED_KWH_PER_PERSON_PER_DAY * DAYS_PER_YEAR;

    let currentCostYr: number;
    let currentEnergyLabel: string;

    switch (form.currentSystem) {
      case "gas-storage":
      case "gas-continuous": {
        const inputKwh = deliveredKwhPerYear / eff;
        const inputMj = inputKwh * KWH_TO_MJ;
        currentCostYr = (inputMj * form.gasCentsPerMJ) / 100;
        currentEnergyLabel = `${Math.round(inputMj)} MJ/yr gas`;
        break;
      }
      case "electric-off-peak": {
        const inputKwh = deliveredKwhPerYear / eff;
        currentCostYr = (inputKwh * form.offpeakCentsPerKwh) / 100;
        currentEnergyLabel = `${Math.round(inputKwh)} kWh/yr off-peak`;
        break;
      }
      case "solar-electric-boost": {
        // Assume solar handles 65% of the load; the rest is off-peak boost.
        const inputKwh = (deliveredKwhPerYear / eff) * 0.35;
        currentCostYr = (inputKwh * form.offpeakCentsPerKwh) / 100;
        currentEnergyLabel = `${Math.round(inputKwh)} kWh/yr boost only`;
        break;
      }
      case "electric-storage":
      default: {
        const inputKwh = deliveredKwhPerYear / eff;
        currentCostYr = (inputKwh * form.elecCentsPerKwh) / 100;
        currentEnergyLabel = `${Math.round(inputKwh)} kWh/yr peak`;
        break;
      }
    }

    const heatPumpInputKwh = deliveredKwhPerYear / Math.max(1, form.heatPumpCop);
    // Heat pumps typically run overnight / midday on smart tariffs — blend
    // off-peak + peak rates 60/40 as a reasonable Melbourne average.
    const hpBlendedRate = (form.offpeakCentsPerKwh * 0.6 + form.elecCentsPerKwh * 0.4);
    const heatPumpCostYr = (heatPumpInputKwh * hpBlendedRate) / 100;

    const savingYr = Math.max(0, currentCostYr - heatPumpCostYr);
    const netInstall = Math.max(0, form.installCost - form.veuRebate);
    const paybackYears = savingYr > 0 ? netInstall / savingYr : Infinity;
    const tenYearNetSaving = savingYr * 10 - netInstall;

    return {
      currentCostYr,
      currentEnergyLabel,
      heatPumpCostYr,
      heatPumpInputKwh,
      savingYr,
      netInstall,
      paybackYears,
      tenYearNetSaving,
    };
  }, [form]);

  const $ = (n: number) => n === Infinity ? "n/a" : `$${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Your current setup</h2>

        <div className="tool-field">
          <label htmlFor="cur">Current hot water system</label>
          <select
            id="cur"
            value={form.currentSystem}
            onChange={(e) => update("currentSystem", e.target.value as CurrentSystem)}
          >
            <option value="gas-storage">Gas storage (tank)</option>
            <option value="gas-continuous">Gas continuous-flow / instant</option>
            <option value="electric-storage">Electric storage (peak rate)</option>
            <option value="electric-off-peak">Electric storage (off-peak)</option>
            <option value="solar-electric-boost">Solar HW with electric boost</option>
          </select>
        </div>

        <div className="tool-field">
          <label htmlFor="ppl">Household size</label>
          <input
            id="ppl"
            type="number"
            min="1"
            max="10"
            step="1"
            value={form.household}
            onChange={(e) => update("household", parseInt(e.target.value) || 1)}
          />
          <small>Australian standard: ~50 L / person / day at 50 °C.</small>
        </div>

        <div className="tool-field">
          <label htmlFor="cop">Heat pump COP</label>
          <input
            id="cop"
            type="number"
            min="1.5"
            max="6"
            step="0.1"
            value={form.heatPumpCop}
            onChange={(e) => update("heatPumpCop", parseFloat(e.target.value) || 1)}
          />
          <small>iStore ≈ 3.5 · Thermann ≈ 3.8 · Reclaim CO₂ ≈ 4.5+</small>
        </div>

        <h2 style={{ marginTop: 24 }}>Energy prices</h2>
        {(form.currentSystem === "gas-storage" || form.currentSystem === "gas-continuous") && (
          <div className="tool-field">
            <label htmlFor="gas">Gas usage price (c / MJ)</label>
            <input
              id="gas"
              type="number"
              min="1"
              max="20"
              step="0.1"
              value={form.gasCentsPerMJ}
              onChange={(e) => update("gasCentsPerMJ", parseFloat(e.target.value) || 0)}
            />
            <small>Look for the &ldquo;Usage&rdquo; c/MJ line on your gas bill.</small>
          </div>
        )}
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="peak">Peak electric (c / kWh)</label>
            <input
              id="peak"
              type="number"
              min="1"
              max="200"
              step="0.1"
              value={form.elecCentsPerKwh}
              onChange={(e) => update("elecCentsPerKwh", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="op">Off-peak (c / kWh)</label>
            <input
              id="op"
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={form.offpeakCentsPerKwh}
              onChange={(e) => update("offpeakCentsPerKwh", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <h2 style={{ marginTop: 24 }}>Install cost</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="cost">Heat pump install ($)</label>
            <input
              id="cost"
              type="number"
              min="0"
              max="15000"
              step="100"
              value={form.installCost}
              onChange={(e) => update("installCost", parseInt(e.target.value) || 0)}
            />
            <small>Ballpark install price before rebate.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="veu">VEU rebate ($)</label>
            <input
              id="veu"
              type="number"
              min="0"
              max="3000"
              step="100"
              value={form.veuRebate}
              onChange={(e) => update("veuRebate", parseInt(e.target.value) || 0)}
            />
            <small>Typical VIC heat pump $2,100-$2,700 at current VEEC prices.</small>
          </div>
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Your projected savings</h2>
        <div className="tool-result__lead">Save per year</div>
        <div className="tool-result__big">{$(result.savingYr)}</div>
        <p className="tool-result__sub">
          Payback in{" "}
          <strong>
            {result.paybackYears === Infinity
              ? "n/a — no saving in this scenario"
              : `${result.paybackYears.toFixed(1)} years`}
          </strong>{" "}
          on a net install of <strong>{$(result.netInstall)}</strong> after the VEU rebate.
        </p>

        <div className="tool-result__breakdown">
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Current annual cost</span>
            <span className="tool-result__row-val">{$(result.currentCostYr)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Current energy use</span>
            <span className="tool-result__row-val">{result.currentEnergyLabel}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Heat pump annual cost</span>
            <span className="tool-result__row-val">{$(result.heatPumpCostYr)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Heat pump input</span>
            <span className="tool-result__row-val">{Math.round(result.heatPumpInputKwh)} kWh/yr</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Annual saving</span>
            <span className="tool-result__row-val">{$(result.savingYr)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Net install (after VEU)</span>
            <span className="tool-result__row-val">{$(result.netInstall)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">10-year net saving</span>
            <span className="tool-result__row-val" style={{ color: result.tenYearNetSaving > 0 ? "var(--orange)" : "var(--ink-2)" }}>
              {$(result.tenYearNetSaving)}
            </span>
          </div>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Quote my heat pump swap →</Link>
          <Link href="/rebates" className="ds-btn ds-btn--ghost">See the full VEU breakdown →</Link>
        </div>

        <p className="tool-result__note">
          Estimate only. Real savings depend on your actual usage pattern, exact tariff, and the
          specific heat pump model. Reclaim CO₂ units perform better than R290 units in cold
          Melbourne mornings — worth ~10-15% more delivered heat over a year.
        </p>
      </div>
    </div>
  );
}
