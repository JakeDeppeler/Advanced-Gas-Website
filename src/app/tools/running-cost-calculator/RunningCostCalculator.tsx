"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Num } from "@/app/tools/hot-water-savings/HotWaterSavings";
import "@/components/homepage/tools/calc-b.css";

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
  daysPerYear: 200,     // Rough Melbourne, heat months + cool months
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
    <div className="cb">
      <div className="cb__card">
        <a href="#rc-result" className="cb__peek" aria-hidden="true" tabIndex={-1}>
          <span>Per year</span><b>{$(result.yearlyCost)}</b><em>See the sum ↓</em>
        </a>
        <h2 className="cb__h">Unit &amp; usage</h2>

        <div className="cb__f">
          <span className="cb__lbl" id="rc-mode">Input method</span>
          <div className="cb__opts cb__opts--fill" role="group" aria-labelledby="rc-mode">
            <button type="button" aria-pressed={form.mode === "capacity"} onClick={() => update("mode", "capacity")}>Capacity + COP</button>
            <button type="button" aria-pressed={form.mode === "input"} onClick={() => update("mode", "input")}>Input kW directly</button>
          </div>
          <p className="cb__hint">
            The capacity is the cooling/heating output (usually on the model badge). The
            input is what the unit draws from the wall, divide capacity by COP to get it.
          </p>
        </div>

        {form.mode === "capacity" ? (
          <div className="cb__pair">
            <Num id="cap" label="Capacity" unit="kW" value={form.capacityKw} min={0.5} max={30} step={0.1}
              onChange={(v) => update("capacityKw", v || 0)} hint="e.g. Mitsubishi MSZ-AP50 = 5.0 kW" />
            <Num id="cop" label="COP" value={form.cop} min={1} max={7} step={0.1}
              onChange={(v) => update("cop", v || 1)} hint="Inverter splits ≈ 4.0-5.0" />
          </div>
        ) : (
          <Num id="inp" label="Input power" unit="kW" value={form.inputKw} min={0.1} max={15} step={0.05}
            onChange={(v) => update("inputKw", v || 0)} hint="Directly from the unit’s spec sheet or nameplate." />
        )}

        <div className="cb__group">
          <Num id="hrs" label="Hours per day" unit="hrs" value={form.hoursPerDay} min={0} max={24} step={0.5}
            onChange={(v) => update("hoursPerDay", v || 0)} />
          <div className="cb__f">
            <span className="cb__lbl" id="rc-days">Days per week</span>
            <div className="cb__opts" role="group" aria-labelledby="rc-days">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button key={d} type="button" aria-pressed={form.daysPerWeek === d} onClick={() => update("daysPerWeek", d)}>{d}</button>
              ))}
            </div>
          </div>
          <div className="cb__pair">
            <Num id="dpy" label="Days per year in use" unit="days" value={form.daysPerYear} min={1} max={365} step={1} int
              onChange={(v) => update("daysPerYear", v || 0)} hint="Melbourne average ≈ 180-220 days (summer heat + winter warm-up)." />
            <Num id="rate" label="Electricity rate" unit="c/kWh" value={form.rateCents} min={1} max={200} step={0.1}
              onChange={(v) => update("rateCents", v || 0)} hint="Peak retail rate, check the “usage” line on your last bill." />
          </div>
        </div>
      </div>

      <div className="cb__card cb__res" id="rc-result" aria-live="polite">
        <h2 className="cb__h">Estimated cost</h2>
        <div className="cb__top">
          <span className="cb__lead">Per year</span>
          <b className="cb__big">{$(result.yearlyCost)}</b>
          <p className="cb__sub">
            At <strong>{result.inputKw.toFixed(2)}&nbsp;kW</strong> input × {form.hoursPerDay}&nbsp;hr / day
            × {form.daysPerYear}&nbsp;days / yr × {form.rateCents}&nbsp;c/kWh.
          </p>
        </div>

        <dl className="cb__rows">
          <div><dt>Per day</dt><dd>{$(result.dailyCost)}</dd></div>
          <div><dt>Per week</dt><dd>{$(result.weeklyCost)}</dd></div>
          <div><dt>Per year</dt><dd>{$(result.yearlyCost)}</dd></div>
          <div><dt>Energy used / day</dt><dd>{result.dailyKwh.toFixed(2)} kWh</dd></div>
          <div><dt>Input power</dt><dd>{result.inputKw.toFixed(2)} kW</dd></div>
        </dl>

        <div className="cb__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat cb__btn cb__btn--or">Quote a more-efficient upgrade →</Link>
          <Link href="/rebates" className="abtn abtn--line cb__btn cb__btn--line">See VEU rebate savings →</Link>
        </div>

        <p className="cb__note">
          Estimate only. Real usage varies with outdoor temperature, thermostat setpoint and how
          well-sealed the room is. Old (2005-and-earlier) non-inverter units may draw 30-50% more
          than the spec sheet under high load.
        </p>
      </div>
    </div>
  );
}
