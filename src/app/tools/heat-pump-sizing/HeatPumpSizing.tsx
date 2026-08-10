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
  { litres: 285, models: "Reclaim ECO R290 285 L · Thermann ECO R290 285 L",
    picks: [
      { label: "Reclaim ECO R290 285 L", href: "/brands/reclaim/eco-r290-300" },
      { label: "Thermann ECO R290 285 L", href: "/brands/thermann/thermann-eco-r290-300" },
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
  systemA: string;
  systemB: string;
};

const DEFAULTS: Form = {
  morningPeople: 2,
  eveningPeople: 2,
  showerMinutes: 10,
  systemA: "pana-6-250",
  systemB: "istore-270",
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
    const { tankTempC, mixedTempC, mainsTempC, showerFlowLpm, otherLitresPerDay, runHours, gapHours } = FIXED;

    // Hot fraction of the mixed flow: (41-15)/(60-15) = 0.578, so a
    // 9 L/min shower pulls 5.2 L/min off the tank and 3.8 L/min of cold.
    const span = Math.max(1, tankTempC - mainsTempC);
    const hotFraction = Math.min(1, Math.max(0.05, (mixedTempC - mainsTempC) / span));

    const hotLpm = showerFlowLpm * hotFraction;
    const coldLpm = showerFlowLpm - hotLpm;
    const hotPerShower = hotLpm * form.showerMinutes;

    const morningHot = form.morningPeople * hotPerShower + otherLitresPerDay * 0.4;
    const eveningHot = form.eveningPeople * hotPerShower + otherLitresPerDay * 0.6;
    const peakSessionHot = Math.max(morningHot, eveningHot);
    const totalHotPerDay = morningHot + eveningHot;

    const deltaT = Math.max(1, tankTempC - mainsTempC);

    // The tank carries the whole run on its own. A shower pulls ~310 L/hr
    // of stored water against a recovery under 100 L/hr, so the compressor
    // never keeps pace mid-rush — it catches up in the gap.
    const requiredLitres = peakSessionHot / USABLE_FRACTION;
    const largest = TANK_SIZES[TANK_SIZES.length - 1];
    // Past the biggest tank we sell, the honest answer is "not one tank",
    // not the biggest one on the list pretending to cope.
    const exceedsRange = requiredLitres > largest.litres;
    const recommended = TANK_SIZES.find((t) => t.litres >= requiredLitres) ?? largest;

    const usableCapacity = recommended.litres * USABLE_FRACTION;
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
      recommended, usableCapacity, deliveredMixed, coldBlendedIn, showersFromTank,
      requiredLitres, exceedsRange,
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
            runs long ones — it changes the tank size fast.
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

        <p className="tool-result__note" style={{ marginTop: 18 }}>
          Assumes a 9 L/min head, a 60 °C tank, a 41 °C shower and Melbourne
          winter mains at 15 °C. We check the rest on site.
        </p>
      </div>

      <div className="page-tool__result">
        <h2>Tank size you need</h2>
        <div className="tool-result__lead">Recommended tank</div>
        <div className="tool-result__big">{r.recommended.litres} L</div>
        <p className="tool-result__sub">
          Your busiest run pulls <strong>{n(r.peakSessionHot)} L</strong> of stored
          hot water. A tank gives up about 80% of its nameplate before the
          outlet starts running cool, so that needs {r.recommended.litres} L on the wall.
        </p>

        {r.exceedsRange && (
          <div className="hps-verdict is-tight" style={{ marginTop: 14 }}>
            <strong>Bigger than one tank</strong>
            <span>
              That run needs about {n(r.requiredLitres)} L of storage — more than the
              largest single tank we install. The usual answer is two tanks plumbed
              in series, or staggering the showers so the run splits in two. Worth a
              call rather than a calculator.
            </span>
          </div>
        )}

        <div className="hps-picks">
          <div className="hps-picks__lbl">Systems we install at this size</div>
          <div className="hps-picks__row">
            {r.recommended.picks.map((pk) => (
              <Link key={pk.href} href={pk.href} className="hps-pick">{pk.label} →</Link>
            ))}
          </div>
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
            — {n(r.hotLpm, 1)} L a minute hot, {n(r.coldLpm, 1)} L cold.
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
                    Heat output is a working estimate — confirm against the datasheet
                    before quoting off it.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="hps-vs__foot">
            Compressor size is a recovery-speed decision, not a capacity one. A 6 kW
            Panasonic reheats in roughly half the time of the 4 kW, which only matters
            when the gap between runs is short — with a long morning-to-evening gap the
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
