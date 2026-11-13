"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SAVINGS_DEFAULTS as DEFAULTS, hotWaterRunningCost, type CurrentSystem, type SavingsForm as FormState } from "@/lib/tools/hotWaterSavings";
import { SHOW_PRICES } from "@/lib/homepage/data";
import "@/components/homepage/tools/calc-b.css";

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
 * Then applies the VEU rebate to the install price to get the net install
 * cost and payback period. With SHOW_PRICES off (Jake, Nov 2026) the install
 * price starts blank for the visitor to fill in from their own quote, rather
 * than our ballpark, and payback only shows once there is one. The portal's
 * running-cost tab shares SAVINGS_DEFAULTS, so the blank lives here.
 */

const SYSTEMS: { v: CurrentSystem; t: string; s?: string }[] = [
  { v: "gas-storage", t: "Gas storage", s: "Tank" },
  { v: "gas-continuous", t: "Gas continuous-flow", s: "Instant" },
  { v: "electric-storage", t: "Electric storage", s: "Peak rate" },
  { v: "electric-off-peak", t: "Electric storage", s: "Off-peak" },
  { v: "solar-electric-boost", t: "Solar HW", s: "Electric boost" },
];
/** The COP figures the old hint gave, as one-tap presets. */
const COPS: { v: number; t: string }[] = [
  { v: 3.5, t: "iStore ≈ 3.5" },
  { v: 3.8, t: "Thermann ≈ 3.8" },
  { v: 4.5, t: "Reclaim CO₂ ≈ 4.5+" },
];

export function HotWaterSavings() {
  const [form, setForm] = useState<FormState>(SHOW_PRICES ? DEFAULTS : { ...DEFAULTS, installCost: 0 });
  const hasInstall = form.installCost > 0;
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => hotWaterRunningCost(form), [form]);

  const $ = (n: number) => n === Infinity ? "n/a" : `$${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const gas = form.currentSystem === "gas-storage" || form.currentSystem === "gas-continuous";
  const top = Math.max(result.currentCostYr, result.heatPumpCostYr, 1);
  const saves = result.savingYr > 0;

  return (
    <div className="cb">
      <div className="cb__card">
        <a href="#hws-result" className="cb__peek" aria-hidden="true" tabIndex={-1}>
          <span>Save per year</span><b>{$(result.savingYr)}</b><em>See the sum ↓</em>
        </a>
        <h2 className="cb__h">Your current setup</h2>

        <div className="cb__f">
          <span className="cb__lbl" id="hws-cur">Current hot water system</span>
          <div className="cb__opts" role="group" aria-labelledby="hws-cur">
            {SYSTEMS.map((o) => (
              <button key={o.v} type="button" aria-pressed={form.currentSystem === o.v} onClick={() => update("currentSystem", o.v)}>
                {o.t}{o.s && <small>{o.s}</small>}
              </button>
            ))}
          </div>
        </div>

        <div className="cb__pair">
          <Num id="ppl" label="Household size" unit="people" value={form.household} min={1} max={10} step={1} int
            onChange={(v) => update("household", v || 1)} hint="Australian standard: ~50 L / person / day at 50 °C." />
          <Num id="cop" label="Heat pump COP" value={form.heatPumpCop} min={1.5} max={6} step={0.1}
            onChange={(v) => update("heatPumpCop", v || 1)} />
        </div>
        <div className="cb__opts" role="group" aria-label="Heat pump COP presets">
          {COPS.map((c) => (
            <button key={c.v} type="button" aria-pressed={form.heatPumpCop === c.v} onClick={() => update("heatPumpCop", c.v)}>{c.t}</button>
          ))}
        </div>

        <div className="cb__group">
          <h3 className="cb__h">Energy prices</h3>
          {gas && (
            <Num id="gas" label="Gas usage price" unit="c/MJ" value={form.gasCentsPerMJ} min={1} max={20} step={0.1}
              onChange={(v) => update("gasCentsPerMJ", v || 0)} hint="Look for the “Usage” c/MJ line on your gas bill." />
          )}
          <div className="cb__pair">
            <Num id="peak" label="Peak electric" unit="c/kWh" value={form.elecCentsPerKwh} min={1} max={200} step={0.1}
              onChange={(v) => update("elecCentsPerKwh", v || 0)} />
            <Num id="op" label="Off-peak" unit="c/kWh" value={form.offpeakCentsPerKwh} min={1} max={100} step={0.1}
              onChange={(v) => update("offpeakCentsPerKwh", v || 0)} />
          </div>
        </div>

        <div className="cb__group">
          <h3 className="cb__h">Install cost</h3>
          <div className="cb__pair">
            <Num id="cost" label="Heat pump install" unit="$" value={form.installCost} min={0} max={15000} step={100} int blank="From your quote"
              onChange={(v) => update("installCost", v || 0)}
              hint={SHOW_PRICES ? "Ballpark install price before rebate." : "The price before rebate, from your written quote."} />
            <Num id="veu" label="VEU rebate" unit="$" value={form.veuRebate} min={0} max={3000} step={100} int
              onChange={(v) => update("veuRebate", v || 0)} hint="Typical VIC heat pump $2,100-$2,700 at current VEEC prices." />
          </div>
        </div>
      </div>

      <div className="cb__card cb__res" id="hws-result" aria-live="polite">
        <h2 className="cb__h">Your projected savings</h2>
        <div className="cb__top">
          <span className="cb__lead">Save per year</span>
          <b className="cb__big">{$(result.savingYr)}</b>
          {hasInstall ? (
            <p className="cb__sub">
              Payback in{" "}
              <strong>
                {result.paybackYears === Infinity
                  ? "n/a, no saving in this scenario"
                  : `${result.paybackYears.toFixed(1)} years`}
              </strong>{" "}
              on a net install of <strong>{$(result.netInstall)}</strong> after the VEU rebate.
            </p>
          ) : (
            <p className="cb__sub">
              Add the install price from your quote to see the payback. No quote yet? We&rsquo;ll give
              you a fixed one after a free site check.
            </p>
          )}
        </div>

        <ul className="cb__bars" aria-label="Annual running cost">
          <li>
            <span>Current annual cost <b>{$(result.currentCostYr)}</b></span>
            <i><em style={{ width: `${(result.currentCostYr / top) * 100}%` }} /></i>
          </li>
          <li className="cb__bar--new">
            <span>Heat pump annual cost <b>{$(result.heatPumpCostYr)}</b></span>
            <i><em style={{ width: `${(result.heatPumpCostYr / top) * 100}%` }} /></i>
          </li>
        </ul>

        <div className={`cb__fit${saves ? "" : " cb__fit--short"}`}>
          <i aria-hidden="true">{saves ? "✓" : "!"}</i>
          <p>{saves ? <><b>The heat pump costs less to run.</b> {$(result.savingYr)} a year less than now.</> : <b>No saving in this scenario.</b>}</p>
        </div>

        <dl className="cb__rows">
          <div><dt>Current annual cost</dt><dd>{$(result.currentCostYr)}</dd></div>
          <div><dt>Current energy use</dt><dd>{result.currentEnergyLabel}</dd></div>
          <div><dt>Heat pump annual cost</dt><dd>{$(result.heatPumpCostYr)}</dd></div>
          <div><dt>Heat pump input</dt><dd>{Math.round(result.heatPumpInputKwh)} kWh/yr</dd></div>
          <div><dt>Annual saving</dt><dd>{$(result.savingYr)}</dd></div>
          {hasInstall && (
            <>
              <div><dt>Net install (after VEU)</dt><dd>{$(result.netInstall)}</dd></div>
              <div className={result.tenYearNetSaving > 0 ? "cb__good" : undefined}><dt>10-year net saving</dt><dd>{$(result.tenYearNetSaving)}</dd></div>
            </>
          )}
        </dl>

        <div className="cb__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat cb__btn cb__btn--or">Quote my heat pump swap →</Link>
          <Link href="/rebates" className="abtn abtn--line cb__btn cb__btn--line">See the full VEU breakdown →</Link>
        </div>

        <p className="cb__note">
          Estimate only. Real savings depend on your actual usage pattern, exact tariff, and the
          specific heat pump model. Reclaim CO₂ units perform better than R290 units in cold
          Melbourne mornings, worth ~10-15% more delivered heat over a year.
        </p>
      </div>
    </div>
  );
}

/**
 * A number with − and + either side, shared by the three calculators in
 * this style. Typing still works; the buttons step within min–max, rounded
 * so 0.1 steps don't drift to 0.30000000004. `blank` shows an empty field
 * with that placeholder while the value is 0 (the install price before
 * anyone has a quote).
 */
export function Num({ id, label, value, onChange, min, max, step, unit, hint, int = false, blank }: {
  id: string; label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit?: string; hint?: string; int?: boolean; blank?: string;
}) {
  const dp = (String(step).split(".")[1] ?? "").length;
  const nudge = (dir: 1 | -1) => onChange(Number(Math.min(max, Math.max(min, (value || 0) + dir * step)).toFixed(dp)));
  const empty = blank != null && !value;
  return (
    <div className="cb__f">
      <label className="cb__lbl" htmlFor={id}>{label}</label>
      <div className="cb__step">
        <button type="button" aria-label={`Less: ${label}`} onClick={() => nudge(-1)}>−</button>
        {/* Dollars read before the figure, every other unit after it. */}
        {unit === "$" && <span className="cb__unit cb__unit--pre">$</span>}
        <input id={id} type="number" inputMode={int ? "numeric" : "decimal"} min={min} max={max} step={step}
          value={empty ? "" : value} placeholder={empty ? blank : undefined}
          onChange={(e) => onChange(int ? parseInt(e.target.value) : parseFloat(e.target.value))} />
        {unit && unit !== "$" && <span className="cb__unit">{unit}</span>}
        <button type="button" aria-label={`More: ${label}`} onClick={() => nudge(1)}>+</button>
      </div>
      {hint && <p className="cb__hint">{hint}</p>}
    </div>
  );
}
