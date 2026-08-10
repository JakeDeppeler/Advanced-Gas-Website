"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Gas heater vs reverse-cycle space-heating cost comparator.
 *
 * For a given heat load and usage pattern, compute the annual $ cost
 * of each option. Assumes:
 *   - Gas heater: efficiency from star rating (3★=65%, 4★=75%, 5★=82%, 6★=87%)
 *   - Reverse-cycle: seasonal average COP (Melbourne inverter ≈ 3.5-4.5)
 * Both fed the same delivered heat.
 *
 * Then computes the annual saving of swapping gas → reverse-cycle,
 * plus the payback period if you take the install cost and VEU rebate
 * into account.
 */

const STAR_EFFICIENCY: Record<string, number> = {
  "3": 0.65,
  "4": 0.75,
  "5": 0.82,
  "6": 0.87,
};

const KWH_TO_MJ = 3.6;

type FormState = {
  heatLoadKw: number;
  hoursPerDay: number;
  daysPerYear: number;
  gasStar: "3" | "4" | "5" | "6";
  gasCentsPerMj: number;
  rcCop: number;
  elecCentsPerKwh: number;
  installCost: number;
  veuRebate: number;
};

const DEFAULTS: FormState = {
  heatLoadKw: 8,        // 3-bed Pakenham home
  hoursPerDay: 6,
  daysPerYear: 135,     // Melbourne winter + shoulder
  gasStar: "5",
  gasCentsPerMj: 4.5,
  rcCop: 4.0,
  elecCentsPerKwh: 32,
  installCost: 12000,
  veuRebate: 3400,      // typical gas ducted → RC ducted at current $60-$75 VEEC prices
};

export function HeatingComparator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => {
    // Delivered heat energy per year in kWh (what the room actually needs).
    const deliveredKwhYr =
      Math.max(0, form.heatLoadKw) * form.hoursPerDay * form.daysPerYear;

    // Gas path — input MJ = delivered / efficiency; cost = input × c/MJ.
    const gasEfficiency = STAR_EFFICIENCY[form.gasStar] ?? 0.75;
    const gasInputKwh = deliveredKwhYr / gasEfficiency;
    const gasInputMj = gasInputKwh * KWH_TO_MJ;
    const gasCostYr = (gasInputMj * form.gasCentsPerMj) / 100;

    // Reverse-cycle path — input kWh = delivered / COP; cost = input × c/kWh.
    const rcInputKwh = deliveredKwhYr / Math.max(1, form.rcCop);
    const rcCostYr = (rcInputKwh * form.elecCentsPerKwh) / 100;

    const savingYr = gasCostYr - rcCostYr;
    const netInstall = Math.max(0, form.installCost - form.veuRebate);
    const paybackYears = savingYr > 0 ? netInstall / savingYr : Infinity;
    const tenYearSaving = savingYr * 10 - netInstall;

    return {
      deliveredKwhYr,
      gasInputMj,
      gasCostYr,
      rcInputKwh,
      rcCostYr,
      savingYr,
      netInstall,
      paybackYears,
      tenYearSaving,
    };
  }, [form]);

  const $ = (n: number) => n === Infinity ? "n/a" : `$${Math.round(n).toLocaleString("en-AU")}`;

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Home &amp; usage</h2>

        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="hl">Heat load (kW)</label>
            <input
              id="hl"
              type="number"
              min="1"
              max="40"
              step="0.5"
              value={form.heatLoadKw}
              onChange={(e) => update("heatLoadKw", parseFloat(e.target.value) || 0)}
            />
            <small>Small unit 2-3, 3-bed 6-10, big double-storey 12-18 kW.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="hpd">Hours per day</label>
            <input
              id="hpd"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={form.hoursPerDay}
              onChange={(e) => update("hoursPerDay", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="dpy">Winter days per year in use</label>
          <input
            id="dpy"
            type="number"
            min="1"
            max="200"
            step="1"
            value={form.daysPerYear}
            onChange={(e) => update("daysPerYear", parseInt(e.target.value) || 0)}
          />
          <small>Melbourne average ≈ 120-150 (real winter + shoulder days).</small>
        </div>

        <h2 style={{ marginTop: 24 }}>Gas heater</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="star">Star rating</label>
            <select
              id="star"
              value={form.gasStar}
              onChange={(e) => update("gasStar", e.target.value as FormState["gasStar"])}
            >
              <option value="3">3-star (typical pre-2010 unit)</option>
              <option value="4">4-star</option>
              <option value="5">5-star (typical current mid-range)</option>
              <option value="6">6-star (top efficiency)</option>
            </select>
          </div>
          <div className="tool-field">
            <label htmlFor="gp">Gas price (c / MJ)</label>
            <input
              id="gp"
              type="number"
              min="1"
              max="20"
              step="0.1"
              value={form.gasCentsPerMj}
              onChange={(e) => update("gasCentsPerMj", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <h2 style={{ marginTop: 24 }}>Reverse-cycle system</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="cop">COP (heating)</label>
            <input
              id="cop"
              type="number"
              min="1.5"
              max="6"
              step="0.1"
              value={form.rcCop}
              onChange={(e) => update("rcCop", parseFloat(e.target.value) || 1)}
            />
            <small>Modern inverter ≈ 4.0. Mitsubishi Hyper Heating (hills) ≈ 3.8 at -5 °C.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="ep">Electric (c / kWh)</label>
            <input
              id="ep"
              type="number"
              min="1"
              max="200"
              step="0.1"
              value={form.elecCentsPerKwh}
              onChange={(e) => update("elecCentsPerKwh", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <h2 style={{ marginTop: 24 }}>Install &amp; rebate (for payback)</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="ic">Install cost ($)</label>
            <input
              id="ic"
              type="number"
              min="0"
              max="30000"
              step="500"
              value={form.installCost}
              onChange={(e) => update("installCost", parseInt(e.target.value) || 0)}
            />
            <small>Ducted RC retrofit ~$11-14k, multi-head split ~$6-9k.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="veu">VEU rebate ($)</label>
            <input
              id="veu"
              type="number"
              min="0"
              max="6000"
              step="100"
              value={form.veuRebate}
              onChange={(e) => update("veuRebate", parseInt(e.target.value) || 0)}
            />
            <small>Gas ducted → RC ducted typically $2,800-$4,200 at current VEEC prices.</small>
          </div>
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Which is cheaper to run?</h2>
        <div className="tool-result__lead">Save per winter</div>
        <div className="tool-result__big">{$(result.savingYr)}</div>
        <p className="tool-result__sub">
          By switching from a <strong>{form.gasStar}-star gas heater</strong> to a
          <strong> reverse-cycle COP {form.rcCop.toFixed(1)}</strong> system.
          {result.paybackYears !== Infinity && (
            <> Payback in <strong>{result.paybackYears.toFixed(1)} years</strong> at
            {" "}<strong>{$(result.netInstall)}</strong> net install cost.</>
          )}
        </p>

        <div className="tool-result__breakdown">
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Delivered heat / yr</span>
            <span className="tool-result__row-val">{Math.round(result.deliveredKwhYr).toLocaleString()} kWh</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Gas input / yr</span>
            <span className="tool-result__row-val">{Math.round(result.gasInputMj).toLocaleString()} MJ</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Gas cost / yr</span>
            <span className="tool-result__row-val">{$(result.gasCostYr)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">RC input / yr</span>
            <span className="tool-result__row-val">{Math.round(result.rcInputKwh).toLocaleString()} kWh</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Reverse-cycle cost / yr</span>
            <span className="tool-result__row-val">{$(result.rcCostYr)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Annual saving</span>
            <span className="tool-result__row-val" style={{ color: result.savingYr > 0 ? "var(--orange)" : "var(--ink-2)" }}>
              {$(result.savingYr)}
            </span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Payback (net of VEU)</span>
            <span className="tool-result__row-val">
              {result.paybackYears === Infinity ? "n/a" : `${result.paybackYears.toFixed(1)} yrs`}
            </span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">10-year net saving</span>
            <span className="tool-result__row-val" style={{ color: result.tenYearSaving > 0 ? "var(--orange)" : "var(--ink-2)" }}>
              {$(result.tenYearSaving)}
            </span>
          </div>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Quote my heating swap →</Link>
          <Link href="/tools/veu-rebate-estimator" className="ds-btn ds-btn--ghost">Check my rebate first →</Link>
        </div>

        <p className="tool-result__note">
          Estimate only, real running cost varies with outdoor temperature, thermostat setpoint, house
          insulation and how many zones are running. RC systems in Melbourne hills (Emerald, Gembrook)
          should use the Mitsubishi FH Hyper Heating COP (~3.8 at -5 °C), not a standard 4.0 rating.
        </p>
      </div>
    </div>
  );
}
