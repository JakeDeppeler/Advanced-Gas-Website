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
/**
 * Sizes we can actually put on a wall.
 *
 * Every rung must be a real product. There is no 300 L unit — the
 * Reclaim and Thermann all-in-ones are 285 L — so recommending "300 L"
 * sent someone off to buy a 285 and come up short. If the sum lands
 * between rungs, the next REAL size up is the answer.
 */
const TANK_SIZES: {
  litres: number;
  models: string;
  picks: { label: string; href: string }[];
}[] = [
  { litres: 180, models: "iStore 180 L",
    picks: [{ label: "iStore 180 L Heat Pump", href: "/brands/istore/istore-180" }] },
  { litres: 200, models: "Reclaim ECO R290 200 L · Thermann ECO R290 200 L",
    picks: [
      { label: "Reclaim ECO R290 200 L", href: "/brands/reclaim/eco-r290-200" },
      { label: "Thermann ECO R290 200 L", href: "/brands/thermann/thermann-eco-r290-200" },
    ] },
  { litres: 215, models: "Reclaim CO₂ 215 L · 5 kW condenser",
    picks: [{ label: "Reclaim CO₂ Split 215 L", href: "/brands/reclaim/co2-split-215-5kw" }] },
  { litres: 250, models: "Reclaim CO₂ 250 L · Panasonic CO₂ 250 L",
    picks: [
      { label: "Reclaim CO₂ Split 250 L", href: "/brands/reclaim/co2-split-250-glass" },
      { label: "Panasonic CO₂ 6 kW · 250 L", href: "/brands/reclaim/panasonic-co2-glass-6kw-250" },
    ] },
  { litres: 270, models: "Reclaim CO₂ 270 L · iStore 270 L · Thermann Split 270 L",
    picks: [
      { label: "iStore 270 L Heat Pump", href: "/brands/istore/istore-270" },
      { label: "Thermann Split Glass-Lined", href: "/brands/thermann/thermann-split-glass" },
    ] },
  { litres: 285, models: "Reclaim ECO R290 285 L · Thermann ECO R290 285 L",
    picks: [
      { label: "Reclaim ECO R290 285 L", href: "/brands/reclaim/eco-r290-300" },
      { label: "Thermann ECO R290 285 L", href: "/brands/thermann/thermann-eco-r290-300" },
    ] },
  { litres: 315, models: "Reclaim CO₂ 315 L · Panasonic CO₂ 315 L",
    picks: [
      { label: "Reclaim CO₂ Split 315 L stainless", href: "/brands/reclaim/co2-split-315-stainless" },
      { label: "Reclaim CO₂ Split 315 L", href: "/brands/reclaim/co2-split-315-glass" },
      { label: "Panasonic CO₂ 6 kW · 315 L", href: "/brands/reclaim/panasonic-co2-glass-6kw-315" },
    ] },
  { litres: 400, models: "Reclaim CO₂ 400 L · 5 kW compressor",
    picks: [{ label: "Reclaim CO₂ Split 400 L · 5 kW", href: "/brands/reclaim/co2-split-400-glass" }] },
];

/**
 * iStore tops out at 270 L. Past about 310 L it stops being an option at
 * all, so listing it against a bigger recommendation would send someone
 * to a product that can't do the job.
 */
const ISTORE_MAX_LITRES = 310;

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
  { id: "reclaim-co2-250", name: "Reclaim CO₂ 250 L", heatKw: 2.5, tankLitres: 250, cop: 4.5, verified: true,
    note: "The standard Reclaim. A 2.5 kW compressor leans on stored volume rather than recovery speed, so the tank does the work." },
  { id: "reclaim-co2-315", name: "Reclaim CO₂ 315 L", heatKw: 2.5, tankLitres: 315, cop: 4.5, verified: true,
    note: "Same 2.5 kW compressor, more buffer. The size to reach for when the whole house showers in one go." },
  { id: "reclaim-5kw-215", name: "Reclaim CO₂ 215 L · 5 kW", heatKw: 5.0, tankLitres: 215, cop: 4.5, verified: true,
    note: "Twice the recovery of the standard unit on a smaller tank. Suits a tight morning rush and a tight footprint." },
  { id: "reclaim-5kw-315", name: "Reclaim CO₂ 315 L · 5 kW", heatKw: 5.0, tankLitres: 315, cop: 4.5, verified: true,
    note: "Volume and recovery together. Handles a full morning run and is back before anyone gets home." },
  { id: "reclaim-400", name: "Reclaim CO₂ 400 L · 5 kW", heatKw: 5.0, tankLitres: 400, cop: 4.5, verified: true,
    note: "The big-family answer. Most volume we fit, on the 5 kW rather than the 2.5, so it refills as fast as it empties." },
  { id: "pana-6-250", name: "Reclaim Panasonic CO₂ 6 kW · 250 L", heatKw: 6.0, tankLitres: 250, cop: 4.5, verified: true,
    note: "Fastest recovery we fit. Worth it when the gap between runs is short, not when it's the whole working day." },
  { id: "pana-4-250", name: "Reclaim Panasonic CO₂ 4 kW · 250 L", heatKw: 4.0, tankLitres: 250, cop: 4.5, verified: true,
    note: "4 kW Panasonic. Quieter and cheaper than the 6 kW, and plenty with a long morning-to-evening gap." },
  { id: "thermann-285", name: "Thermann ECO R290 285 L", heatKw: 2.5, tankLitres: 285, cop: 4.0, verified: true,
    note: "Australian-made, 2.5 kW compressor, and the Aus-made VEU bonus on top. Big tank doing the work." },
  { id: "istore-270", name: "iStore 270 L", heatKw: 4.0, tankLitres: 270, cop: 3.5, verified: true,
    note: "The 4 kW is what makes this one punch above its size. Boost mode forces a full reheat ahead of a big day." },
  { id: "istore-180", name: "iStore 180 L", heatKw: 2.5, tankLitres: 180, cop: 3.5, verified: true,
    note: "Smaller tank and the 2.5 kW compressor, not the 4 kW in the 270. Where that shows is the third shower." },
];

/**
 * Two questions. That's it.
 *
 * Everything else the maths needs — tank setpoint, mains temperature,
 * shower temperature, flow rate, COP, compressor draw, basin and laundry
 * volume — is a real input that a homeowner has no way of knowing. Those
 * are fixed at the figures we'd quote on, and only the two numbers that
 * actually move the answer are on screen.
 */
const FIXED = {
  tankTempC: 60,          // 60 °C minimum by law — Legionella control
  mixedTempC: 41,         // comfortable shower
  mainsTempC: 15,         // Melbourne winter mains
  showerFlowLpm: 9,       // 3-star head
  otherLitresPerDay: 40,  // basins, kitchen, laundry
  runHours: 2,            // one shower run, morning or evening
  gapHours: 9,            // ~8am finish to a ~5pm start
};

type Form = {
  morningPeople: number;
  eveningPeople: number;
  showerMinutes: number;
  /** Heat OUTPUT of the compressor, kW. Sizes the tank as much as the
   *  household does — a bigger compressor buys back tank volume. */
  heatKw: number;
  systemA: string;
  systemB: string;
  /** Advanced overrides — hidden behind a disclosure. */
  tankTempC: number;
  mixedTempC: number;
  mainsTempC: number;
  showerFlowLpm: number;
  otherLitresPerDay: number;
  gapHours: number;
};

const DEFAULTS: Form = {
  morningPeople: 2,
  eveningPeople: 2,
  showerMinutes: 10,
  heatKw: 2.5,
  systemA: "reclaim-co2-250",
  systemB: "istore-270",
  tankTempC: FIXED.tankTempC,
  mixedTempC: FIXED.mixedTempC,
  mainsTempC: FIXED.mainsTempC,
  showerFlowLpm: FIXED.showerFlowLpm,
  otherLitresPerDay: FIXED.otherLitresPerDay,
  gapHours: FIXED.gapHours,
};

/** Litres of hot water a given HEAT OUTPUT can make per hour. */
function recoveryLitresPerHour(heatKw: number, deltaT: number) {
  return (heatKw * 3600) / (SPECIFIC_HEAT * Math.max(1, deltaT));
}

export function HeatPumpSizing() {
  const [form, setForm] = useState<Form>(DEFAULTS);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const r = useMemo(() => {
    const { runHours } = FIXED;
    const { tankTempC, mixedTempC, mainsTempC, showerFlowLpm, otherLitresPerDay, gapHours } = form;

    // Hot fraction of the mixed flow: (41-15)/(60-15) = 0.578, so a
    // 9 L/min shower pulls 5.2 L/min off the tank and 3.8 L/min of cold.
    const span = Math.max(1, tankTempC - mainsTempC);
    const hotFraction = Math.min(1, Math.max(0.05, (mixedTempC - mainsTempC) / span));

    const hotLpm = showerFlowLpm * hotFraction;
    const coldLpm = showerFlowLpm - hotLpm;
    const hotPerShower = hotLpm * form.showerMinutes;

    const peakSessionShowers = Math.max(form.morningPeople, form.eveningPeople);
    const morningHot = form.morningPeople * hotPerShower + otherLitresPerDay * 0.4;
    const eveningHot = form.eveningPeople * hotPerShower + otherLitresPerDay * 0.6;
    const peakSessionHot = Math.max(morningHot, eveningHot);
    const totalHotPerDay = morningHot + eveningHot;

    const deltaT = Math.max(1, tankTempC - mainsTempC);

    // The tank carries the whole run on its own. A shower pulls ~310 L/hr
    // of stored water against a recovery under 100 L/hr, so the compressor
    // never keeps pace mid-rush — it catches up in the gap.
    // The compressor is running while people shower, so the tank only has
    // to bridge what the unit can't make during the run.
    //
    // Sizing on the tank alone ignored heating capacity entirely, which is
    // how a 270 L paired with a 4 kW — a combination that comfortably does
    // four people — got told it wasn't enough. Worst case is everyone
    // back to back, so the run is as short as the showers make it.
    const drawHours = (peakSessionShowers * form.showerMinutes) / 60;
    const litresPerHour = recoveryLitresPerHour(form.heatKw, deltaT);
    const madeDuringRun = litresPerHour * drawHours;
    const mustBeStored = Math.max(0, peakSessionHot - madeDuringRun);

    /**
     * Headroom an installer would actually carry.
     *
     * Bare physics puts four people on a 4 kW at 250 L — true on paper,
     * with about half a shower spare. Jake fits 270 L on that job, and
     * he's right to: a guest, a bath, or mains at 10 °C in July eats that
     * margin, and running out of hot water is the failure a customer
     * remembers. 20% is what moves the arithmetic onto his call.
     */
    const HEADROOM = 1.2;
    const requiredLitres = (mustBeStored * HEADROOM) / USABLE_FRACTION;
    const largest = TANK_SIZES[TANK_SIZES.length - 1];
    // Past the biggest tank we sell, the honest answer is "not one tank",
    // not the biggest one on the list pretending to cope.
    const exceedsRange = requiredLitres > largest.litres;
    const recommended = TANK_SIZES.find((t) => t.litres >= requiredLitres) ?? largest;

    const usableCapacity = recommended.litres * USABLE_FRACTION;

    // Drop iStore from the picks once we're past its largest tank.
    const picks = recommended.litres > ISTORE_MAX_LITRES
      ? recommended.picks.filter((p) => !p.href.includes("/istore/"))
      : recommended.picks;

    // 285 and 270 are a rung apart and both real. A Reclaim 270 covers a
    // 285 recommendation comfortably, so offer it rather than making
    // someone buy up a size for 15 L.
    const alsoFine = recommended.litres === 285
      ? { label: "Reclaim CO₂ Split 270 L", href: "/brands/reclaim/co2-split-250-glass" }
      : null;

    // The trade-off, spelled out: a bigger compressor buys back tank
    // volume, and a bigger tank lets a smaller compressor cope.
    const pairings = [2.5, 4, 6].map((kw) => {
      const need = (Math.max(0, peakSessionHot - recoveryLitresPerHour(kw, deltaT) * drawHours)
        * 1.2) / USABLE_FRACTION;
      const tank = TANK_SIZES.find((t) => t.litres >= need);
      return { kw, need, tank: tank?.litres ?? null };
    });
    const deliveredMixed = usableCapacity / hotFraction;
    const coldBlendedIn = deliveredMixed - usableCapacity;
    const showersFromTank = usableCapacity / hotPerShower;

    const compare = [form.systemA, form.systemB].map((id) => {
      const sys = SYSTEMS.find((x) => x.id === id) ?? SYSTEMS[0];
      const lph = recoveryLitresPerHour(sys.heatKw, deltaT);
      const usable = sys.tankLitres * USABLE_FRACTION;
      const fullReheatHrs = (sys.tankLitres * SPECIFIC_HEAT * deltaT) / 3600 / sys.heatKw;
      const handlesPeak = usable >= peakSessionHot;
      // Time to put back exactly what the morning run took.
      const recoverHrs = Math.min(morningHot, usable) / Math.max(1, lph);
      const readyPm = recoverHrs <= gapHours && usable >= eveningHot;
      return {
        ...sys,
        litresPerHour: lph,
        usable,
        mixed: usable / hotFraction,
        showers: usable / hotPerShower,
        fullReheatHrs,
        handlesPeak,
        recoverHrs,
        readyPm,
        keepsUp: handlesPeak && readyPm,
      };
    });

    return {
      hotFraction, hotLpm, coldLpm, hotPerShower,
      morningHot, eveningHot, peakSessionHot, totalHotPerDay,
      recommended, picks, alsoFine, usableCapacity, deliveredMixed, coldBlendedIn, showersFromTank,
      requiredLitres, exceedsRange, mustBeStored, madeDuringRun,
      litresPerHour, drawHours, pairings,
      compare, runHours, gapHours,
    };
  }, [form]);

  const n = (v: number, d = 0) =>
    v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const hrs = (v: number) => (v < 1 ? `${n(v * 60)} min` : `${n(v, 1)} hrs`);

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Your household</h2>

        <div className="tool-field">
          <label htmlFor="am">
            Showering in the morning: <strong>{form.morningPeople}</strong>
          </label>
          <input id="am" type="range" min="0" max="8" step="1"
            value={form.morningPeople}
            onChange={(e) => set("morningPeople", parseInt(e.target.value))} />
          <small>People showering inside a {r.runHours} hour window before work.</small>
        </div>

        <div className="tool-field">
          <label htmlFor="pm">
            Showering in the evening: <strong>{form.eveningPeople}</strong>
          </label>
          <input id="pm" type="range" min="0" max="8" step="1"
            value={form.eveningPeople}
            onChange={(e) => set("eveningPeople", parseInt(e.target.value))} />
          <small>People showering inside a {r.runHours} hour window after work.</small>
        </div>

        <div className="tool-field">
          <label htmlFor="mins">Shower length (min)</label>
          <input id="mins" type="number" min="5" max="30" step="1"
            value={form.showerMinutes}
            onChange={(e) => set("showerMinutes", parseFloat(e.target.value) || 15)} />
          <small>
            10 minutes is the working number. Set it higher if your household
            runs long ones, it changes the tank size fast.
          </small>
        </div>

        <div className="tool-field">
          <label htmlFor="kw">Heating capacity (kW)</label>
          <select id="kw" value={form.heatKw} onChange={(e) => set("heatKw", parseFloat(e.target.value))}>
            <option value={2.5}>2.5 kW · standard Reclaim, Thermann, iStore 180</option>
            <option value={4}>4 kW · iStore 270, Panasonic 4 kW</option>
            <option value={5}>5 kW · Reclaim 215 / 315</option>
            <option value={6}>6 kW · Panasonic, fastest recovery</option>
          </select>
          <small>
            This changes the tank size as much as your household does. The
            compressor is running while people shower, so a stronger one
            needs less stored water behind it.
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

        <details className="tool-adv">
          <summary>Advanced settings</summary>
          <p className="tool-adv__note">
            Defaults are what we&rsquo;d quote on. Change them if you know your
            own numbers, mains runs colder in the hills, and COP moves with
            the unit.
          </p>

          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="mains">Cold mains inlet (°C)</label>
              <input id="mains" type="number" min="5" max="25" step="1"
                value={form.mainsTempC}
                onChange={(e) => set("mainsTempC", parseFloat(e.target.value) || 15)} />
              <small>Melbourne winter sits 12-15. Summer 18-22.</small>
            </div>
            <div className="tool-field">
              <label htmlFor="tank">Tank setpoint (°C)</label>
              <input id="tank" type="number" min="50" max="70" step="1"
                value={form.tankTempC}
                onChange={(e) => set("tankTempC", parseFloat(e.target.value) || 60)} />
              <small>60 minimum by law, Legionella control.</small>
            </div>
          </div>

          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="mixed">Shower temp (°C)</label>
              <input id="mixed" type="number" min="35" max="50" step="0.5"
                value={form.mixedTempC}
                onChange={(e) => set("mixedTempC", parseFloat(e.target.value) || 41)} />
              <small>Comfortable is 40-42.</small>
            </div>
            <div className="tool-field">
              <label htmlFor="flow">Shower flow (L/min)</label>
              <input id="flow" type="number" min="4" max="20" step="0.5"
                value={form.showerFlowLpm}
                onChange={(e) => set("showerFlowLpm", parseFloat(e.target.value) || 9)} />
              <small>3-star head ≈ 9. Old unrestricted heads hit 15-20.</small>
            </div>
          </div>

          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="other">Other hot water / day (L)</label>
              <input id="other" type="number" min="0" max="200" step="5"
                value={form.otherLitresPerDay}
                onChange={(e) => set("otherLitresPerDay", parseFloat(e.target.value) || 0)} />
              <small>Basins, kitchen, laundry.</small>
            </div>
            <div className="tool-field">
              <label htmlFor="gap">Hours between runs</label>
              <input id="gap" type="number" min="2" max="16" step="1"
                value={form.gapHours}
                onChange={(e) => set("gapHours", parseFloat(e.target.value) || 9)} />
              <small>Morning to evening, the tank&rsquo;s reheat window.</small>
            </div>
          </div>

          <p className="tool-adv__note">
            COP is set per system in the comparison below rather than here, so
            each unit is judged on its own figure instead of one shared guess.
          </p>
        </details>
      </div>

      <div className="page-tool__result">
        <h2>Tank size you need</h2>
        <div className="tool-rec">
          <div className="tool-rec__lead">Recommended heat pump</div>
          <div className="tool-rec__big">
            {r.recommended.litres} L <span className="tool-rec__kw">+ {form.heatKw} kW</span>
          </div>
          <div className="tool-rec__models">{r.recommended.models}</div>
        </div>
        <p className="tool-result__sub">
          Your busiest run pulls <strong>{n(r.peakSessionHot)} L</strong> over about{" "}
          {n(r.drawHours * 60)} minutes. The {form.heatKw} kW compressor makes{" "}
          <strong>{n(r.madeDuringRun)} L</strong> of that while people are still
          showering, so the tank only has to hold <strong>{n(r.mustBeStored)} L</strong>.
          Allowing for the 80% a tank gives up before the outlet runs cool, plus
          a fifth again for a guest, a bath or a cold July, that&rsquo;s{" "}
          {r.recommended.litres} L on the wall.
        </p>

        <div className="tool-pair">
          <div className="tool-pair__lbl">Tank and compressor trade off</div>
          <div className="tool-pair__row">
            {r.pairings.map((p) => (
              <div key={p.kw} className={`tool-pair__cell${p.kw === form.heatKw ? " is-active" : ""}`}>
                <strong>{p.kw} kW</strong>
                <span>{p.tank ? `${p.tank} L` : "over 400 L"}</span>
              </div>
            ))}
          </div>
          <p className="tool-pair__note">
            Same household either way. A bigger compressor puts water back
            faster, so it needs less stored behind it; a bigger tank lets a
            smaller compressor keep up. Which one is better value depends on
            the price difference on the day.
          </p>
        </div>

        {r.exceedsRange && (
          <div className="hps-verdict is-tight" style={{ marginTop: 14 }}>
            <strong>Bigger than one tank</strong>
            <span>
              That run needs about {n(r.requiredLitres)} L of storage, more than the
              largest single tank we install. The usual answer is two tanks plumbed
              in series, or staggering the showers so the run splits in two. Worth a
              call rather than a calculator.
            </span>
          </div>
        )}

        <div className="hps-picks">
          <div className="hps-picks__lbl">Systems we install at this size</div>
          <div className="hps-picks__row">
            {r.picks.map((pk) => (
              <Link key={pk.href} href={pk.href} className="hps-pick">{pk.label} →</Link>
            ))}
          </div>
          {r.alsoFine && (
            <p className="hps-picks__also">
              A <Link href={r.alsoFine.href}>{r.alsoFine.label}</Link> also covers this
              comfortably. 285 and 270 are one rung apart, and 15 litres isn&rsquo;t worth
              buying up a size for.
            </p>
          )}
        </div>

        <div className="hps-delivery">
          <div className="hps-delivery__lbl">What that actually delivers</div>
          <div className="hps-delivery__big">
            {n(r.showersFromTank, 1)} showers <span>back to back, before any reheat</span>
          </div>
          <p className="hps-delivery__note">
            {n(r.usableCapacity)} L of usable 60 °C water blends with about{" "}
            <strong>{n(r.coldBlendedIn)} L</strong> of cold to make{" "}
            <strong>{n(r.deliveredMixed)} L</strong> at shower temperature. Each{" "}
            {form.showerMinutes} minute shower takes {n(r.hotPerShower)} L out of the tank
, {n(r.hotLpm, 1)} L a minute hot, {n(r.coldLpm, 1)} L cold.
          </p>
        </div>

        <div className="hps-sessions">
          <div className="hps-sessions__grid">
            <div className="hps-session">
              <span className="hps-session__when">Morning</span>
              <strong>{n(r.morningHot)} L</strong>
              <span className="hps-session__sub">{form.morningPeople} showers</span>
            </div>
            <div className="hps-session hps-session--gap">
              <span className="hps-session__when">{r.gapHours} hr gap</span>
              <strong>reheat</strong>
              <span className="hps-session__sub">tank refills</span>
            </div>
            <div className="hps-session">
              <span className="hps-session__when">Evening</span>
              <strong>{n(r.eveningHot)} L</strong>
              <span className="hps-session__sub">{form.eveningPeople} showers</span>
            </div>
          </div>
          <p className="hps-sessions__note">
            Sizing runs off the bigger run, not the {n(r.totalHotPerDay)} L daily total.
            The gap between them is long enough for the tank to come all the way
            back, which is why a house of four doesn&rsquo;t need a tank that holds
            the whole day at once.
          </p>
        </div>

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
                  <div><dt>Showers on tap</dt><dd>{n(c.showers, 1)}</dd></div>
                  <div><dt>Recovery</dt><dd>{n(c.litresPerHour)} L/hr</dd></div>
                  <div><dt>Full reheat</dt><dd>{hrs(c.fullReheatHrs)}</dd></div>
                  <div><dt>Back after the morning</dt><dd>{hrs(c.recoverHrs)}</dd></div>
                  <div><dt>Busiest run</dt><dd>{c.handlesPeak ? "covered" : "short"}</dd></div>
                  <div><dt>Ready by evening</dt><dd>{c.readyPm ? "yes" : "no"}</dd></div>
                </dl>
                <p className="hps-vs__note">{c.note}</p>
                {!c.verified && (
                  <p className="hps-vs__unverified">
                    Heat output is a working estimate, confirm against the datasheet
                    before quoting off it.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="hps-vs__foot">
            Compressor size is a recovery-speed decision, not a capacity one. A 6 kW
            Panasonic reheats in roughly half the time of the 4 kW, which only matters
            when the gap between runs is short, with a long morning-to-evening gap the
            4 kW gets there just as comfortably and costs less. All-in-one units add a
            boost mode that forces a full reheat on demand, covering the houseful-of-guests
            weekend without paying for a bigger compressor all year.
          </p>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Quote me this size →</Link>
          <Link href="/tools/hot-water-savings" className="ds-btn ds-btn--ghost">
            Now work out the savings →
          </Link>
        </div>

        <p className="tool-result__note">
          Estimate only. Real sizing also depends on whether you have a bath, two
          showers running at once, pipe runs, and how cold the mains actually runs
          at your address in July. We check all of it on the site visit.
        </p>
      </div>
    </div>
  );
}
