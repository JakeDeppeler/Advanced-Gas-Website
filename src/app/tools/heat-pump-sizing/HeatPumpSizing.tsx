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
const TANK_SIZES: {
  litres: number;
  models: string;
  picks: { label: string; href: string }[];
}[] = [
  { litres: 170, models: "Thermann 170 L gas storage",
    picks: [{ label: "Thermann Gas Storage 170 L", href: "/brands/thermann/gas-storage-170" }] },
  { litres: 180, models: "iStore 180 L",
    picks: [{ label: "iStore 180 L Heat Pump", href: "/brands/istore/istore-180" }] },
  { litres: 200, models: "Reclaim ECO R290 200 L · Thermann ECO R290 200 L",
    picks: [
      { label: "Reclaim ECO R290 200 L", href: "/brands/reclaim/eco-r290-200" },
      { label: "Thermann ECO R290 200 L", href: "/brands/thermann/thermann-eco-r290-200" },
    ] },
  { litres: 250, models: "Reclaim CO₂ 250 L · Panasonic CO₂ 250 L",
    picks: [
      { label: "Reclaim CO₂ Split 250 L", href: "/brands/reclaim/co2-split-250-glass" },
      { label: "Panasonic CO₂ 6 kW · 250 L", href: "/brands/reclaim/panasonic-co2-glass-6kw-250" },
    ] },
  { litres: 270, models: "iStore 270 L · Thermann Split 270 L",
    picks: [
      { label: "iStore 270 L Heat Pump", href: "/brands/istore/istore-270" },
      { label: "Thermann Split Glass-Lined", href: "/brands/thermann/thermann-split-glass" },
    ] },
  { litres: 285, models: "Thermann Split 270 L (next size up)",
    picks: [{ label: "Thermann Split Glass-Lined", href: "/brands/thermann/thermann-split-glass" }] },
  { litres: 300, models: "Reclaim ECO R290 300 L · Thermann ECO R290 300 L",
    picks: [
      { label: "Reclaim ECO R290 300 L", href: "/brands/reclaim/eco-r290-300" },
      { label: "Thermann ECO R290 300 L", href: "/brands/thermann/thermann-eco-r290-300" },
    ] },
  { litres: 315, models: "Reclaim CO₂ 315 L · Panasonic CO₂ 315 L",
    picks: [
      { label: "Reclaim CO₂ Split 315 L", href: "/brands/reclaim/co2-split-315-glass" },
      { label: "Panasonic CO₂ 6 kW · 315 L", href: "/brands/reclaim/panasonic-co2-glass-6kw-315" },
    ] },
  { litres: 400, models: "Reclaim CO₂ 400 L",
    picks: [{ label: "Reclaim CO₂ Split 400 L", href: "/brands/reclaim/co2-split-400-glass" }] },
];

/**
 * Systems for the head-to-head.
 *
 * `heatKw` is HEAT OUTPUT, not electrical input — it's what sets reheat
 * time. Compressor ratings come from our own catalogue (brands.ts).
 *
 * ⚠️ `verified: false` means the figure is a working estimate, not a
 * number off a datasheet. Those render with a "confirm" marker and stay
 * editable in the UI. Correct them here once and both the picker and the
 * defaults follow.
 */
type SystemPreset = {
  id: string;
  name: string;
  heatKw: number;
  tankLitres: number;
  cop: number;
  verified: boolean;
  note: string;
};

const SYSTEMS: SystemPreset[] = [
  { id: "pana-6-250", name: "Reclaim Panasonic CO₂ 6 kW · 250 L", heatKw: 6.0, tankLitres: 250, cop: 4.5, verified: true,
    note: "6 kW Panasonic Aquarea compressor. Roughly half the reheat time of the 4 kW — worth it when the tank gets emptied hard and needs to be back fast." },
  { id: "pana-6-315", name: "Reclaim Panasonic CO₂ 6 kW · 315 L", heatKw: 6.0, tankLitres: 315, cop: 4.5, verified: true,
    note: "Same 6 kW compressor, bigger buffer for back-to-back showers." },
  { id: "reclaim-400", name: "Reclaim CO₂ 400 L", heatKw: 4.7, tankLitres: 400, cop: 4.5, verified: false,
    note: "The big-family answer. 320 L usable covers four 15-minute showers back to back with room left over." },
  { id: "pana-4-250", name: "Reclaim Panasonic CO₂ 4 kW · 250 L", heatKw: 4.0, tankLitres: 250, cop: 4.5, verified: true,
    note: "4 kW compressor — quieter and cheaper. Fine on a long gap between runs; the 6 kW is the answer when the gap is short." },
  { id: "pana-4-315", name: "Reclaim Panasonic CO₂ 4 kW · 315 L", heatKw: 4.0, tankLitres: 315, cop: 4.5, verified: true,
    note: "4 kW compressor with the larger tank doing the heavy lifting." },
  { id: "istore-270", name: "iStore 270 L", heatKw: 3.6, tankLitres: 270, cop: 3.5, verified: false,
    note: "All-in-one R290. Leans on stored volume rather than fast recovery, and has a boost mode to force a full reheat ahead of a big day." },
  { id: "istore-180", name: "iStore 180 L", heatKw: 3.6, tankLitres: 180, cop: 3.5, verified: false,
    note: "Same compressor as the 270, 90 L less buffer. Where that bites is the fourth shower, not the first." },
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
  /** Share of the day's showers taken in the morning, 0-100. */
  morningSharePct: number;
  /** Gap between the morning and evening runs — the tank's reheat window. */
  hoursBetweenSessions: number;
  /** Bathroom turnaround per person — sets how many fit in a rush. */
  bathroomMinutes: number;
  /** Head-to-head selections. */
  systemA: string;
  systemB: string;
};

const DEFAULTS: Form = {
  people: 4,
  showersPerPersonPerDay: 1,
  showerMinutes: 15,
  showerFlowLpm: 9,      // standard 3-star head
  otherLitresPerDay: 40, // kitchen, laundry, basins
  tankTempC: 60,
  mixedTempC: 41,
  mainsTempC: 15,        // Melbourne winter mains ≈ 12-15 °C
  copRating: 4.5,        // Reclaim CO₂ territory
  inputKw: 1.0,
  peakWindowHours: 2,    // four people, back to back, before work
  bathroomMinutes: 15,   // turnaround per person, not water-running time
  morningSharePct: 50,
  hoursBetweenSessions: 9,  // ~8am finish to a 5pm evening run
  systemA: "pana-6-250",
  systemB: "istore-270",
};

/** Litres of hot water a given heat output can make per hour. */
function recoveryLitresPerHour(heatKw: number, deltaT: number) {
  return (heatKw * 3600) / (SPECIFIC_HEAT * Math.max(1, deltaT));
}

export function HeatPumpSizing() {
  const [form, setForm] = useState<Form>(DEFAULTS);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const r = useMemo(() => {
    const { tankTempC, mixedTempC, mainsTempC } = form;

    // Hot fraction of the mixed flow. Guard against a setpoint at or
    // below mains (division by zero / nonsense input).
    const span = Math.max(1, tankTempC - mainsTempC);
    const hotFraction = Math.min(1, Math.max(0.05, (mixedTempC - mainsTempC) / span));

    const hotLpm = form.showerFlowLpm * hotFraction;
    const coldLpm = form.showerFlowLpm - hotLpm;

    const showersPerDay = form.people * form.showersPerPersonPerDay;
    const hotPerShower = hotLpm * form.showerMinutes;
    const showerHotPerDay = hotPerShower * showersPerDay;
    const totalHotPerDay = showerHotPerDay + form.otherLitresPerDay;

    // Showers don't all happen at once. A four-person house is typically
    // a couple before work and a couple after dinner, with the whole day
    // in between for the tank to recover — so the number that sizes the
    // tank is the BIGGER SESSION, not the daily total.
    const morningShare = Math.min(1, Math.max(0, form.morningSharePct / 100));
    const morningShowers = showersPerDay * morningShare;
    const eveningShowers = showersPerDay - morningShowers;

    // Sinks and laundry lean to the evening.
    const morningOther = form.otherLitresPerDay * 0.4;
    const eveningOther = form.otherLitresPerDay * 0.6;

    const morningHot = morningShowers * hotPerShower + morningOther;
    const eveningHot = eveningShowers * hotPerShower + eveningOther;
    const peakSessionHot = Math.max(morningHot, eveningHot);

    const deltaT = Math.max(1, tankTempC - mainsTempC);
    const heatOutputKw = Math.max(0.1, form.inputKw * form.copRating);
    const litresPerHour = recoveryLitresPerHour(heatOutputKw, deltaT);

    // The tank has to hold the whole busy run on its own.
    //
    // A shower pulls roughly 310 L/hr of stored water against a recovery
    // of well under 100 L/hr, and people follow each other straight out
    // of the bathroom. Counting reheat during the rush assumes the unit
    // keeps pace with the tap, which it never does — that's how you end
    // up recommending a 170 L tank to a family of six. Recovery earns its
    // keep between the morning and evening runs, not inside one.
    const peakSessionShowers = Math.max(morningShowers, eveningShowers);

    // A rush is limited by the bathroom, not just the tank. Eight minutes
    // under the water is about fifteen in the room once you count getting
    // in and out — so a 2 hr window fits eight people through one
    // bathroom, and a household bigger than that is really two rushes.
    const fitThroughRush = (form.peakWindowHours * 60) / Math.max(1, form.bathroomMinutes);
    const rushIsCrowded = peakSessionShowers > fitThroughRush;
    const rushHoursNeeded = (peakSessionShowers * form.bathroomMinutes) / 60;
    const showerHoursInSession = (peakSessionShowers * form.showerMinutes) / 60;
    const idleHoursInSession = Math.max(0, form.peakWindowHours - showerHoursInSession);
    const reheatedDuringSession = litresPerHour * idleHoursInSession;

    const mustBeStored = peakSessionHot;
    const minTankForSession = mustBeStored / USABLE_FRACTION;

    // Worst realistic burst — used for the "back to back" verdict.
    const burstShowers = Math.max(2, Math.ceil(peakSessionShowers));
    const burstHot = burstShowers * hotPerShower;

    // Sanity floor: a unit that can't make the day's total in ~16 hours
    // of running is undersized regardless of how the draw is spread.
    const dailyCapableLitres = litresPerHour * 16;
    const dayPressure = totalHotPerDay / Math.max(1, dailyCapableLitres);

    const requiredLitres = minTankForSession;
    const recommended =
      TANK_SIZES.find((t) => t.litres >= requiredLitres) ??
      TANK_SIZES[TANK_SIZES.length - 1];

    const usableCapacity = recommended.litres * USABLE_FRACTION;

    // What the household actually feels: litres at shower temperature,
    // because stored hot water gets blended with cold on the way out.
    const coldBlendedIn = usableCapacity / hotFraction - usableCapacity;
    const deliveredMixed = usableCapacity / hotFraction;
    const deliveredMixedFullTank = recommended.litres / hotFraction;
    const showersFromFullTank = deliveredMixed / (form.showerFlowLpm * form.showerMinutes);

    // Reheat: energy to lift a full recommended tank from mains to setpoint.
    const energyKwh = (recommended.litres * SPECIFIC_HEAT * deltaT) / 3600;
    const reheatHours = energyKwh / heatOutputKw;

    const coversPeak = usableCapacity >= peakSessionHot;
    const coversBurst = usableCapacity >= burstHot;

    // Is the tank back up before the evening run?
    const leftAfterMorning = Math.max(0, usableCapacity - morningHot);
    const recoveredBetween = litresPerHour * form.hoursBetweenSessions;
    const availableForEvening = Math.min(usableCapacity, leftAfterMorning + recoveredBetween);
    const readyForEvening = availableForEvening >= eveningHot;
    const hoursToRefillAfterMorning = Math.min(morningHot, usableCapacity) / Math.max(1, litresPerHour);

    const runningCostPerDay = (totalHotPerDay / Math.max(1, litresPerHour)) * form.inputKw;

    // ---- Head-to-head -------------------------------------------------
    const compare = [form.systemA, form.systemB].map((id) => {
      const sys = SYSTEMS.find((x) => x.id === id) ?? SYSTEMS[0];
      const lph = recoveryLitresPerHour(sys.heatKw, deltaT);
      const usable = sys.tankLitres * USABLE_FRACTION;
      const mixed = usable / hotFraction;
      const fullReheatHrs = (sys.tankLitres * SPECIFIC_HEAT * deltaT) / 3600 / sys.heatKw;

      const handlesPeak = usable >= peakSessionHot;

      const leftAfterAm = Math.max(0, usable - morningHot);
      const forPm = Math.min(usable, leftAfterAm + lph * form.hoursBetweenSessions);
      const readyPm = forPm >= eveningHot;

      // Time to put back exactly what the morning took.
      const recoverHrs = Math.min(morningHot, usable) / Math.max(1, lph);

      return {
        ...sys,
        litresPerHour: lph,
        usable,
        mixed,
        fullReheatHrs,
        handlesPeak,
        readyPm,
        recoverHrs,
        keepsUp: handlesPeak && readyPm,
      };
    });

    return {
      hotFraction,
      hotLpm,
      coldLpm,
      showersPerDay,
      hotPerShower,
      totalHotPerDay,
      morningShowers,
      eveningShowers,
      morningHot,
      eveningHot,
      peakSessionHot,
      peakSessionShowers,
      fitThroughRush,
      rushIsCrowded,
      rushHoursNeeded,
      burstShowers,
      burstHot,
      coversBurst,
      requiredLitres,
      recommended,
      usableCapacity,
      coldBlendedIn,
      deliveredMixed,
      deliveredMixedFullTank,
      showersFromFullTank,
      energyKwh,
      heatOutputKw,
      reheatHours,
      litresPerHour,
      coversPeak,
      readyForEvening,
      availableForEvening,
      hoursToRefillAfterMorning,
      dayPressure,
      runningCostPerDay,
      compare,
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
            <small>Average is quoted as 8. Real showers run 15, which is what actually sizes the tank.</small>
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

        <h2 style={{ marginTop: 24 }}>When the showers happen</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="peak">One shower run (hrs)</label>
            <input id="peak" type="number" min="0.5" max="6" step="0.5"
              value={form.peakWindowHours}
              onChange={(e) => set("peakWindowHours", parseFloat(e.target.value) || 2)} />
            <small>First to last shower in a single run — not the whole day.</small>
          </div>
          <div className="tool-field">
            <label htmlFor="bath">Bathroom time each (min)</label>
            <input id="bath" type="number" min="5" max="40" step="1"
              value={form.bathroomMinutes}
              onChange={(e) => set("bathroomMinutes", parseFloat(e.target.value) || 15)} />
            <small>
              In and out, not just water running. An 8 min shower is about
              15 min in the room.
            </small>
          </div>
          <div className="tool-field">
            <label htmlFor="gap">Hours between runs</label>
            <input id="gap" type="number" min="2" max="16" step="1"
              value={form.hoursBetweenSessions}
              onChange={(e) => set("hoursBetweenSessions", parseFloat(e.target.value) || 10)} />
            <small>Morning to evening. This is the tank&rsquo;s reheat window.</small>
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="amshare">
            Showers taken in the morning: {form.morningSharePct}%
          </label>
          <input id="amshare" type="range" min="0" max="100" step="10"
            value={form.morningSharePct}
            onChange={(e) => set("morningSharePct", parseFloat(e.target.value))} />
          <small>
            All morning is the worst case. Split across morning and night
            and the tank gets a full day to recover in between — which is
            how most households actually run.
          </small>
        </div>

        <h2 style={{ marginTop: 24 }}>Compare two systems</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="sysA">System A</label>
            <select id="sysA" value={form.systemA} onChange={(e) => set("systemA", e.target.value)}>
              {SYSTEMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="tool-field">
            <label htmlFor="sysB">System B</label>
            <select id="sysB" value={form.systemB} onChange={(e) => set("systemB", e.target.value)}>
              {SYSTEMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Tank size you need</h2>
        <div className="tool-result__lead">Recommended tank</div>
        <div className="tool-result__big">{r.recommended.litres} L</div>
        <p className="tool-result__sub">
          {r.recommended.models}. Your busiest run of the day pulls about{" "}
          <strong>{n(r.peakSessionHot)} L</strong> of stored hot water, and a
          tank only gives up about 80% of its nameplate before the outlet
          starts running cold.
        </p>

        {/* The number people actually care about: not tank litres, but
            litres of shower-temperature water it puts out. */}
        <div className="hps-delivery">
          <div className="hps-delivery__lbl">What that tank actually delivers</div>
          <div className="hps-delivery__big">
            ≈ {n(r.deliveredMixed)} L <span>of water at {form.mixedTempC} °C</span>
          </div>
          <p className="hps-delivery__note">
            {n(r.usableCapacity)} L of usable {form.tankTempC} °C water blended with
            about <strong>{n(r.coldBlendedIn)} L</strong> of {form.mainsTempC} °C mains.
            That&rsquo;s roughly <strong>{n(r.showersFromFullTank, 1)} showers</strong> at{" "}
            {n(form.showerFlowLpm, 1)} L/min for {form.showerMinutes} minutes — before
            the heat pump puts anything back.
          </p>
        </div>

        <div className="hps-picks">
          <div className="hps-picks__lbl">Systems we install at this size</div>
          <div className="hps-picks__row">
            {r.recommended.picks.map((pk) => (
              <Link key={pk.href} href={pk.href} className="hps-pick">
                {pk.label} →
              </Link>
            ))}
          </div>
        </div>

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

        <div className="hps-sessions">
          <div className="hps-sessions__lbl">How the day splits</div>
          <div className="hps-sessions__grid">
            <div className="hps-session">
              <span className="hps-session__when">Morning</span>
              <strong>{n(r.morningHot)} L</strong>
              <span className="hps-session__sub">{n(r.morningShowers, 1)} showers + basins</span>
            </div>
            <div className="hps-session hps-session--gap">
              <span className="hps-session__when">{form.hoursBetweenSessions} hr gap</span>
              <strong>+{n(r.litresPerHour * form.hoursBetweenSessions)} L</strong>
              <span className="hps-session__sub">reheated in between</span>
            </div>
            <div className="hps-session">
              <span className="hps-session__when">Evening</span>
              <strong>{n(r.eveningHot)} L</strong>
              <span className="hps-session__sub">{n(r.eveningShowers, 1)} showers + kitchen</span>
            </div>
          </div>
          <p className={`hps-rushfit${r.rushIsCrowded ? " is-tight" : ""}`}>
            {r.rushIsCrowded
              ? `A ${form.peakWindowHours} hr rush only fits about ${n(r.fitThroughRush, 1)} people through one bathroom at ${form.bathroomMinutes} min each — but ${n(r.peakSessionShowers, 1)} need to shower. Realistically that run stretches to ${n(r.rushHoursNeeded, 1)} hrs, which gives the tank more time to recover than the numbers below assume.`
              : `That ${form.peakWindowHours} hr window fits about ${n(r.fitThroughRush, 1)} people through one bathroom at ${form.bathroomMinutes} min each — enough for the ${n(r.peakSessionShowers, 1)} showering in it.`}
          </p>
          <p className="hps-sessions__note">
            The gap is what does the work. Four 15-minute showers before
            work is {n(r.peakSessionHot)} L out of the tank — but if the next
            shower isn&rsquo;t until 5pm, the unit has {form.hoursBetweenSessions} hours
            to put it all back, and it only needs{" "}
            {r.hoursToRefillAfterMorning < 1
              ? `${n(r.hoursToRefillAfterMorning * 60)} min`
              : `${n(r.hoursToRefillAfterMorning, 1)} hrs`}{" "}
            of that. The tank is full again long before anyone gets home.
          </p>
          <p className="hps-sessions__note">
            Sizing runs off the bigger of the two runs ({n(r.peakSessionHot)} L), not
            the {n(r.totalHotPerDay)} L daily total. Treating every shower as one
            simultaneous draw is what pushes people into a tank far bigger than
            they need.
          </p>
        </div>

        <div className={`hps-verdict${r.coversPeak ? " is-ok" : " is-tight"}`}>
          <strong>{r.coversPeak ? "Covers the busiest run" : "Tight — size up"}</strong>
          <span>
            {r.coversPeak
              ? `${n(r.usableCapacity)} L usable covers the ${n(r.peakSessionHot)} L run on stored water alone — no waiting on the compressor mid-rush.`
              : `The ${n(r.peakSessionHot)} L run exceeds ${n(r.usableCapacity)} L usable. Go up a tank size or stagger the showers — the compressor won't backfill fast enough during the rush.`}
          </span>
        </div>

        <div className={`hps-verdict${r.readyForEvening ? " is-ok" : " is-tight"}`}>
          <strong>{r.readyForEvening ? "Ready again by evening" : "Won't recover in time"}</strong>
          <span>
            {r.readyForEvening
              ? `Back to ${n(r.availableForEvening)} L available after the ${form.hoursBetweenSessions} hr gap — the evening run needs ${n(r.eveningHot)} L. Full recovery from the morning takes about ${r.hoursToRefillAfterMorning < 1 ? `${n(r.hoursToRefillAfterMorning * 60)} min` : `${n(r.hoursToRefillAfterMorning, 1)} hrs`}.`
              : `Only ${n(r.availableForEvening)} L back by evening against a ${n(r.eveningHot)} L run. Needs a bigger tank, a faster compressor, or a longer gap between runs.`}
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
            <span className="tool-result__row-lbl">Busiest single run</span>
            <span className="tool-result__row-val">{n(r.peakSessionHot)} L</span>
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

        {/* Head-to-head — same household, two systems. */}
        <div className="hps-vs">
          <div className="hps-vs__lbl">Head to head, on your numbers</div>
          <div className="hps-vs__grid">
            {r.compare.map((c, i) => (
              <div key={`${c.id}-${i}`} className={`hps-vs__card${c.keepsUp ? " is-ok" : " is-tight"}`}>
                <h3>{c.name}</h3>
                <div className={`hps-vs__badge${c.keepsUp ? " is-ok" : " is-tight"}`}>
                  {c.keepsUp ? "Keeps up" : "Struggles"}
                </div>
                <dl className="hps-vs__rows">
                  <div><dt>Delivers at {form.mixedTempC} °C</dt><dd>{n(c.mixed)} L</dd></div>
                  <div><dt>Recovery</dt><dd>{n(c.litresPerHour)} L/hr</dd></div>
                  <div><dt>Full reheat</dt><dd>{c.fullReheatHrs < 1 ? `${n(c.fullReheatHrs * 60)} min` : `${n(c.fullReheatHrs, 1)} hrs`}</dd></div>
                  <div><dt>Back after the morning</dt><dd>{c.recoverHrs < 1 ? `${n(c.recoverHrs * 60)} min` : `${n(c.recoverHrs, 1)} hrs`}</dd></div>
                  <div><dt>Busiest run</dt><dd>{c.handlesPeak ? "covered" : "short"}</dd></div>
                  <div><dt>Ready by evening</dt><dd>{c.readyPm ? "yes" : "no"}</dd></div>
                </dl>
                <p className="hps-vs__note">{c.note}</p>
                {!c.verified && (
                  <p className="hps-vs__unverified">
                    Heat output is a working estimate — confirm against the datasheet
                    before quoting off it.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="hps-vs__foot">
            Compressor size is a recovery-speed decision, not a capacity one.
            A 6 kW Panasonic reheats in roughly half the time of the 4 kW, which
            only matters when the gap between runs is short — with a long
            morning-to-evening gap the 4 kW gets there just as comfortably and
            costs less. All-in-one units add a boost mode that forces a full
            reheat on demand, which covers the houseful-of-guests weekend
            without paying for a bigger compressor year-round.
          </p>
          <p className="hps-vs__foot">
            Both columns run the same household, the same {form.mainsTempC} °C mains and
            the same {form.tankTempC} °C setpoint. The difference is compressor output
            against tank volume — a big tank with a small compressor and a small tank
            with a big compressor can land in the same place, right up until someone
            takes a fourth shower.
          </p>
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
