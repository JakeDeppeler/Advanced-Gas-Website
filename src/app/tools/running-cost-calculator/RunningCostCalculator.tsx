"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Aircon running-cost calculator. Client-only, live-updating.
 *
 * Two input modes:
 *   1. Enter the unit's kW *input* (what it draws from the wall) directly.
 *   2. Enter the unit's kW *capacity* + COP — we convert internally.
 *
 * Cost = input_kW × hours_per_day × ($/kWh electricity rate).
 * Weekly = daily × days_per_week (defaults to 7 with a fudge factor).
 * Yearly = daily × days_per_year.
 */

type FormState = {
  mode: "input" | "capacity";
  inputKw: number;      // used when mode === 'input'
  capacityKw: number;   // used when mode === 'capacity'
  cop: number;
  hoursPerDay: number;
  daysPerWeek: number;
  daysPerYear: number;
  rateCents: number;    // electricity rate in cents per kWh
};

const DEFAULTS: FormState = {
  mode: "capacity",
  inputKw: 1.5,
  capacityKw: 5.0,      // 5.0 kW living-zone split
  cop: 4.0,             // Modern inverter split ≈ 4.0
  hoursPerDay: 6,
  daysPerWeek: 6,
  daysPerYear: 200,     // Rough Melbourne — heat months + cool months
  rateCents: 32,        // ~AGL / EnergyAustralia peak c/kWh (mid-2026)
};

export function RunningCostCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => {
    const cop = Math.max(1, form.cop);
    const inputKw =
      form.mode === "input"
        ? Math.max(0, form.inputKw)
        : Math.max(0, form.capacityKw) / cop;

    const rateDollars = form.rateCents / 100;
    const dailyKwh = inputKw * form.hoursPerDay;
    const dailyCost = dailyKwh * rateDollars;
    const weeklyCost = dailyCost * form.daysPerWeek;
    const yearlyCost = dailyCost * form.daysPerYear;

    return {
      inputKw,
      dailyKwh,
      dailyCost,
      weeklyCost,
      yearlyCost,
    };
  }, [form]);

  const $ = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Unit &amp; usage</h2>

        <div className="tool-field">
          <label>Input method</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => update("mode", "capacity")}
              className="ds-btn"
              style={{
                flex: 1,
                background: form.mode === "capacity" ? "var(--navy)" : "transparent",
                color: form.mode === "capacity" ? "#fff" : "var(--navy)",
                border: `1px solid ${form.mode === "capacity" ? "var(--navy)" : "var(--line)"}`,
                fontSize: 13.5,
                padding: "10px 12px",
              }}
            >
              Capacity + COP
            </button>
            <button
              type="button"
              onClick={() => update("mode", "input")}
              className="ds-btn"
              style={{
                flex: 1,
                background: form.mode === "input" ? "var(--navy)" : "transparent",
                color: form.mode === "input" ? "#fff" : "var(--navy)",
                border: `1px solid ${form.mode === "input" ? "var(--navy)" : "var(--line)"}`,
                fontSize: 13.5,
                padding: "10px 12px",
              }}
            >
              Input kW directly
            </button>
          </div>
          <small>
            The capacity is the cooling/heating output (usually on the model badge). The
            input is what the unit draws from the wall, divide capacity by COP to get it.
          </small>
        </div>

        {form.mode === "capacity" ? (
          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="cap">Capacity (kW)</label>
              <input
                id="cap"
                type="number"
                min="0.5"
                max="30"
                step="0.1"
                value={form.capacityKw}
                onChange={(e) => update("capacityKw", parseFloat(e.target.value) || 0)}
              />
              <small>e.g. Mitsubishi MSZ-AP50 = 5.0 kW</small>
            </div>
            <div className="tool-field">
              <label htmlFor="cop">COP</label>
              <input
                id="cop"
                type="number"
                min="1"
                max="7"
                step="0.1"
                value={form.cop}
                onChange={(e) => update("cop", parseFloat(e.target.value) || 1)}
              />
              <small>Inverter splits ≈ 4.0-5.0</small>
            </div>
          </div>
        ) : (
          <div className="tool-field">
            <label htmlFor="inp">Input power (kW)</label>
            <input
              id="inp"
              type="number"
              min="0.1"
              max="15"
              step="0.05"
              value={form.inputKw}
              onChange={(e) => update("inputKw", parseFloat(e.target.value) || 0)}
            />
            <small>Directly from the unit&rsquo;s spec sheet or nameplate.</small>
          </div>
        )}

        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="hrs">Hours per day</label>
            <input
              id="hrs"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={form.hoursPerDay}
              onChange={(e) => update("hoursPerDay", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="days">Days per week</label>
            <input
              id="days"
              type="number"
              min="1"
              max="7"
              step="1"
              value={form.daysPerWeek}
              onChange={(e) => update("daysPerWeek", parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="dpy">Days per year in use</label>
          <input
            id="dpy"
            type="number"
            min="1"
            max="365"
            step="1"
            value={form.daysPerYear}
            onChange={(e) => update("daysPerYear", parseInt(e.target.value) || 0)}
          />
          <small>Melbourne average ≈ 180-220 days (summer heat + winter warm-up).</small>
        </div>

        <div className="tool-field">
          <label htmlFor="rate">Electricity rate (c / kWh)</label>
          <input
            id="rate"
            type="number"
            min="1"
            max="200"
            step="0.1"
            value={form.rateCents}
            onChange={(e) => update("rateCents", parseFloat(e.target.value) || 0)}
          />
          <small>Peak retail rate, check the &ldquo;usage&rdquo; line on your last bill.</small>
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Estimated cost</h2>
        <div className="tool-result__lead">Per year</div>
        <div className="tool-result__big">
          {$(result.yearlyCost)}
        </div>
        <p className="tool-result__sub">
          At <strong>{result.inputKw.toFixed(2)}&nbsp;kW</strong> input × {form.hoursPerDay}&nbsp;hr / day
          × {form.daysPerYear}&nbsp;days / yr × {form.rateCents}&nbsp;c/kWh.
        </p>

        <div className="tool-result__breakdown">
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Per day</span>
            <span className="tool-result__row-val">{$(result.dailyCost)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Per week</span>
            <span className="tool-result__row-val">{$(result.weeklyCost)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Per year</span>
            <span className="tool-result__row-val">{$(result.yearlyCost)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Energy used / day</span>
            <span className="tool-result__row-val">{result.dailyKwh.toFixed(2)} kWh</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Input power</span>
            <span className="tool-result__row-val">{result.inputKw.toFixed(2)} kW</span>
          </div>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Quote a more-efficient upgrade →</Link>
          <Link href="/rebates" className="ds-btn ds-btn--ghost">See VEU rebate savings →</Link>
        </div>

        <p className="tool-result__note">
          Estimate only. Real usage varies with outdoor temperature, thermostat setpoint and how
          well-sealed the room is. Old (2005-and-earlier) non-inverter units may draw 30-50% more
          than the spec sheet under high load.
        </p>
      </div>
    </div>
  );
}
