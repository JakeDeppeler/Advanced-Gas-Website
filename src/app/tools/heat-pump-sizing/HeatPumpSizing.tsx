"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Heat pump hot water sizing calculator.
 *
 * Sizes the tank off real draw-off rather than a rule of thumb, then
 * shows the reheat time — which is the number that actually decides
 * whether a household runs out of hot water.
 *
 * THE MODEL
 *
 * 1. A shower head runs at a total flow rate (default 9 L/min). That's a
 *    MIX of stored hot and cold. At a comfortable ~41 °C mixed from
 *    60 °C stored and 15 °C mains, the hot fraction is ~5 L of every
 *    9 L — the rest is cold. So the tank only gives up ~5 L/min, which
 *    is why a 270 L tank serves far more than 270 L ÷ 9 of showering.
 *
 *    We derive the hot fraction properly from the three temperatures
 *    rather than hardcoding 5/9, so changing any of them stays honest:
 *
 *      hotFraction = (mixed − cold) / (hot − cold)
 *
 *    At the defaults that lands on (41−15)/(60−15) = 0.578 → 5.2 L/min
 *    hot out of 9 L/min total, matching the 5 L hot / 4 L cold rule.
 *
 * 2. Usable capacity is less than nameplate. Stratification means you
 *    can't draw the tank to the last drop before the outlet goes cold —
 *    ~80% is the accepted usable figure.
 *
 * 3. Reheat time comes from the energy needed to lift a full tank from
 *    mains to setpoint, divided by the heat pump's heat output:
 *
 *      energy (kWh) = litres × 4.186 kJ/kg·K × ΔT ÷ 3600
 *      hours        = energy ÷ heatOutputKw
 *
 *    Heat output = electrical input × COP. A 1 kW-input CO₂ unit at
 *    COP 4.5 delivers 4.5 kW of heat.
 *
 * Deliberately conservative: no solar-gain assumptions, no diversity
 * factor across household members. If the numbers say it's tight, it's
 * tight.
 */

const SPECIFIC_HEAT = 4.186; // kJ per kg per °C
const USABLE_FRACTION = 0.8; // stratification — you can't use the last 20%

/** Tank sizes we actually install, with the closest matching models. */
const TANK_SIZES = [
  { litres: 170, models: "Thermann 170 L gas storage" },
  { litres: 180, models: "iStore 180 L" },
  { litres: 200, models: "Reclaim ECO R290 200 L · Thermann Integrated 200 L" },
  { litres: 250, models: "Reclaim CO₂ 250 L · Sanden 250 L" },
  { litres: 270, models: "iStore 270 L" },
  { litres: 285, models: "Thermann Integrated 285 L" },
  { litres: 300, models: "Reclaim ECO R290 300 L" },
  { litres: 315, models: "Reclaim CO₂ 315 L · Thermann Split 315 L" },
  { litres: 400, models: "Reclaim CO₂ 400 L" },
];

type Form = {
  people: number;
  showersPerPersonPerDay: number;
  showerMinutes: number;
  showerFlowLpm: number;
  otherLitresPerDay: number;
  tankTempC: number;
  mixedTempC: number;
  mainsTempC: number;
  copRating: number;
  inputKw: number;
  peakWindowHours: number;
};

const DEFAULTS: Form = {
  people: 4,
  showersPerPersonPerDay: 1,
  showerMinutes: 8,
  showerFlowLpm: 9,      // standard 3-star head
  otherLitresPerDay: 40, // kitchen, laundry, basins
  tankTempC: 60,
  mixedTempC: 41,
  mainsTempC: 15,        // Melbourne winter mains ≈ 12-15 °C
  copRating: 4.5,        // Reclaim CO₂ territory
  inputKw: 1.0,
  peakWindowHours: 2,    // morning rush — everyone showers inside this
};

export function HeatPumpSizing() {
  const [form, setForm] = useState<Form>(DEFAULTS);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const r = useMemo(() => {
    const { tankTempC, mixedTempC, mainsTempC } = form;

    // Hot fraction of the mixed flow. Guard against a setpoint at or
    // below mains (division by zero / nonsense input).
    const span = Math.max(1, tankTempC - mainsTempC);
    const hotFraction = Math.min(1, Math.max(0, (mixedTempC - mainsTempC) / span));

    const hotLpm = form.showerFlowLpm * hotFraction;
    const coldLpm = form.showerFlowLpm - hotLpm;

    const showersPerDay = form.people * form.showersPerPersonPerDay;
    const hotPerShower = hotLpm * form.showerMinutes;
    const showerHotPerDay = hotPerShower * showersPerDay;
    const totalHotPerDay = showerHotPerDay + form.otherLitresPerDay;

    // Peak demand: how much hot water leaves the tank in the busy window.
    // Assume showers are spread evenly through that window.
    const peakHot = hotPerShower * showersPerDay;

    // Tank must cover the peak draw within its usable fraction.
    const minTankForPeak = peakHot / USABLE_FRACTION;
    const minTankForDay = totalHotPerDay / USABLE_FRACTION;
    const requiredLitres = Math.max(minTankForPeak, minTankForDay * 0.6);

    const recommended =
      TANK_SIZES.find((t) => t.litres >= requiredLitres) ??
      TANK_SIZES[TANK_SIZES.length - 1];

    // Reheat: energy to lift a full recommended tank from mains to setpoint.
    const deltaT = Math.max(1, tankTempC - mainsTempC);
    const energyKwh =
      (recommended.litres * SPECIFIC_HEAT * deltaT) / 3600;
    const heatOutputKw = Math.max(0.1, form.inputKw * form.copRating);
    const reheatHours = energyKwh / heatOutputKw;

    // Recovery rate — litres of usable hot water produced per hour.
    const litresPerHour = (heatOutputKw * 3600) / (SPECIFIC_HEAT * deltaT);

    // Does the unit keep up during the peak window?
    const producedInWindow = litresPerHour * form.peakWindowHours;
    const usableCapacity = recommended.litres * USABLE_FRACTION;
    const coversPeak = usableCapacity + producedInWindow >= peakHot;

    const runningCostPerDay = (totalHotPerDay / Math.max(1, litresPerHour)) * form.inputKw;

    return {
      hotFraction,
      hotLpm,
      coldLpm,
      showersPerDay,
      hotPerShower,
      totalHotPerDay,
      peakHot,
      requiredLitres,
      recommended,
      usableCapacity,
      energyKwh,
      heatOutputKw,
      reheatHours,
      litresPerHour,
      coversPeak,
      runningCostPerDay,
    };
  }, [form]);

  const n = (v: number, d = 0) =>
    v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Your household</h2>

        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="ppl">People in the home</label>
            <input id="ppl" type="number" min="1" max="12" step="1"
              value={form.people}
              onChange={(e) => set("people", parseInt(e.target.value) || 1)} />
          </div>
          <div className="tool-field">
            <label htmlFor="spp">Showers per person / day</label>
            <input id="spp" type="number" min="0.5" max="3" step="0.5"
              value={form.showersPerPersonPerDay}
              onChange={(e) => set("showersPerPersonPerDay", parseFloat(e.target.value) || 1)} />
          </div>
        </div>

        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="mins">Shower length (min)</label>
            <input id="mins" type="number" min="1" max="30" step="1"
              value={form.showerMinutes}
              onChange={(e) => set("showerMinutes", parseFloat(e.target.value) || 1)} />
            <small>Australian average is about 8 minutes.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="flow">Shower flow (L/min)</label>
            <input id="flow" type="number" min="4" max="20" step="0.5"
              value={form.showerFlowLpm}
              onChange={(e) => set("showerFlowLpm", parseFloat(e.target.value) || 9)} />
            <small>3-star head ≈ 9 L/min. Old unrestricted heads hit 15-20.</small>
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="other">Other hot water per day (L)</label>
          <input id="other" type="number" min="0" max="200" step="5"
            value={form.otherLitresPerDay}
            onChange={(e) => set("otherLitresPerDay", parseFloat(e.target.value) || 0)} />
          <small>Kitchen sink, basins, laundry. ~10 L per person per day is typical.</small>
        </div>

        <h2 style={{ marginTop: 24 }}>Temperatures</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="tank">Tank setpoint (°C)</label>
            <input id="tank" type="number" min="50" max="70" step="1"
              value={form.tankTempC}
              onChange={(e) => set("tankTempC", parseFloat(e.target.value) || 60)} />
            <small>60 °C minimum by law — Legionella control.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="mixed">Shower temp (°C)</label>
            <input id="mixed" type="number" min="35" max="50" step="0.5"
              value={form.mixedTempC}
              onChange={(e) => set("mixedTempC", parseFloat(e.target.value) || 41)} />
            <small>Comfortable is 40-42 °C. Tempering valve caps outlets at 50 °C.</small>
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="mains">Cold mains temp (°C)</label>
          <input id="mains" type="number" min="5" max="25" step="1"
            value={form.mainsTempC}
            onChange={(e) => set("mainsTempC", parseFloat(e.target.value) || 15)} />
          <small>Melbourne winter mains sits around 12-15 °C. Summer 18-22.</small>
        </div>

        <h2 style={{ marginTop: 24 }}>The heat pump</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="cop">COP</label>
            <input id="cop" type="number" min="1.5" max="6" step="0.1"
              value={form.copRating}
              onChange={(e) => set("copRating", parseFloat(e.target.value) || 4.5)} />
            <small>Reclaim CO₂ ≈ 4.5 · Thermann ≈ 3.8 · iStore ≈ 3.5</small>
          </div>
          <div className="tool-field">
            <label htmlFor="kw">Compressor input (kW)</label>
            <input id="kw" type="number" min="0.3" max="3" step="0.1"
              value={form.inputKw}
              onChange={(e) => set("inputKw", parseFloat(e.target.value) || 1)} />
            <small>Most residential units draw 0.9-1.2 kW.</small>
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="peak">Morning rush window (hrs)</label>
          <input id="peak" type="number" min="0.5" max="6" step="0.5"
            value={form.peakWindowHours}
            onChange={(e) => set("peakWindowHours", parseFloat(e.target.value) || 2)} />
          <small>How long between the first and last shower on a weekday.</small>
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Tank size you need</h2>
        <div className="tool-result__lead">Recommended tank</div>
        <div className="tool-result__big">{r.recommended.litres} L</div>
        <p className="tool-result__sub">
          {r.recommended.models}. Your household draws about{" "}
          <strong>{n(r.peakHot)} L</strong> of stored hot water in the morning
          rush, and a tank only gives up about 80% of its nameplate before the
          outlet runs cold.
        </p>

        {/* The insight most people miss — a 9 L/min shower isn't 9 L/min
            off the tank. */}
        <div className="hps-split">
          <div className="hps-split__lbl">
            Where a {n(form.showerFlowLpm, 1)} L/min shower actually comes from
          </div>
          <div className="hps-split__bar" role="img"
            aria-label={`${n(r.hotLpm, 1)} litres per minute hot, ${n(r.coldLpm, 1)} litres per minute cold`}>
            <span className="hps-split__hot" style={{ width: `${r.hotFraction * 100}%` }}>
              {n(r.hotLpm, 1)} L hot
            </span>
            <span className="hps-split__cold" style={{ width: `${(1 - r.hotFraction) * 100}%` }}>
              {n(r.coldLpm, 1)} L cold
            </span>
          </div>
          <p className="hps-split__note">
            Mixing {form.tankTempC} °C stored water with {form.mainsTempC} °C mains to
            reach {form.mixedTempC} °C means only{" "}
            <strong>{Math.round(r.hotFraction * 100)}%</strong> of the flow leaves
            the tank. That&rsquo;s why a {r.recommended.litres} L tank goes much
            further than it first looks.
          </p>
        </div>

        <div className={`hps-verdict${r.coversPeak ? " is-ok" : " is-tight"}`}>
          <strong>{r.coversPeak ? "Comfortably covered" : "Tight — size up"}</strong>
          <span>
            {r.coversPeak
              ? `${n(r.usableCapacity)} L usable plus ${n(r.litresPerHour * form.peakWindowHours)} L reheated during the ${form.peakWindowHours} hr window covers the ${n(r.peakHot)} L peak draw.`
              : `Peak draw of ${n(r.peakHot)} L exceeds ${n(r.usableCapacity)} L usable plus ${n(r.litresPerHour * form.peakWindowHours)} L reheated in the window. Go up a tank size or stagger showers.`}
          </span>
        </div>

        <div className="tool-result__breakdown">
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Hot water per shower</span>
            <span className="tool-result__row-val">{n(r.hotPerShower)} L</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Showers per day</span>
            <span className="tool-result__row-val">{n(r.showersPerDay, 1)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Total hot water / day</span>
            <span className="tool-result__row-val">{n(r.totalHotPerDay)} L</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Usable capacity (80%)</span>
            <span className="tool-result__row-val">{n(r.usableCapacity)} L</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Heat output</span>
            <span className="tool-result__row-val">{n(r.heatOutputKw, 1)} kW</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Recovery rate</span>
            <span className="tool-result__row-val">{n(r.litresPerHour)} L/hr</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Full reheat (empty → {form.tankTempC} °C)</span>
            <span className="tool-result__row-val" style={{ color: "var(--orange)" }}>
              {r.reheatHours < 1
                ? `${n(r.reheatHours * 60)} min`
                : `${n(r.reheatHours, 1)} hrs`}
            </span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Energy for a full reheat</span>
            <span className="tool-result__row-val">{n(r.energyKwh, 1)} kWh</span>
          </div>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Quote me this size →</Link>
          <Link href="/tools/hot-water-savings" className="ds-btn ds-btn--ghost">
            Now work out the savings →
          </Link>
        </div>

        <p className="tool-result__note">
          Estimate only. Real-world sizing also depends on pipe runs, whether
          you have a bath, simultaneous draw-off (two showers at once halves
          your effective capacity), and how cold the mains actually runs at
          your address in July. We check all of it on the site visit — this
          gets you in the right ballpark before anyone quotes you.
        </p>
      </div>
    </div>
  );
}
