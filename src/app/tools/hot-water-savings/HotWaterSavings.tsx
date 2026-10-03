"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SAVINGS_DEFAULTS as DEFAULTS, hotWaterRunningCost, type CurrentSystem, type SavingsForm as FormState } from "@/lib/tools/hotWaterSavings";

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

export function HotWaterSavings() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => hotWaterRunningCost(form), [form]);

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
              ? "n/a, no saving in this scenario"
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
            <span className="tool-result__row-val" style={{ color: result.tenYearNetSaving > 0 ? "var(--orange-ink)" : "var(--ink-2)" }}>
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
          Melbourne mornings, worth ~10-15% more delivered heat over a year.
        </p>
      </div>
    </div>
  );
}
