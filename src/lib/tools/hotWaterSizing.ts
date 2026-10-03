/**
 * Heat pump hot water sizing — the model.
 *
 * Moved out of the public calculator (src/app/tools/heat-pump-sizing) so the
 * portal's own sizing tab can run the same sums. Nothing in here changed in
 * the move; the reasoning for every figure is in the comments below and in
 * the calculator's header.
 */

export const SPECIFIC_HEAT = 4.186; // kJ per kg per °C
export const USABLE_FRACTION = 0.8; // stratification, you can't use the last 20%

/** Tank sizes we actually install, with the closest matching models. */
/**
 * Sizes we can actually put on a wall.
 *
 * Every rung must be a real product. There is no 300 L unit — the
 * Reclaim and Thermann all-in-ones are 285 L — so recommending "300 L"
 * sent someone off to buy a 285 and come up short. If the sum lands
 * between rungs, the next REAL size up is the answer.
 */
export const TANK_SIZES: {
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
export const ISTORE_MAX_LITRES = 310;

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
export type SystemPreset = {
  id: string;
  name: string;
  heatKw: number;
  tankLitres: number;
  cop: number;
  verified: boolean;
  note: string;
};

export const SYSTEMS: SystemPreset[] = [
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
export const FIXED = {
  tankTempC: 60,          // 60 °C minimum by law. Legionella control
  mixedTempC: 41,         // comfortable shower
  mainsTempC: 15,         // Melbourne winter mains
  showerFlowLpm: 9,       // 3-star head
  otherLitresPerDay: 40,  // basins, kitchen, laundry
  runHours: 2,            // one shower run, morning or evening
  gapHours: 9,            // ~8am finish to a ~5pm start
};

export type SizingForm = {
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

export const SIZING_DEFAULTS: SizingForm = {
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
export function recoveryLitresPerHour(heatKw: number, deltaT: number) {
  return (heatKw * 3600) / (SPECIFIC_HEAT * Math.max(1, deltaT));
}


/** Everything the calculator shows, from the household and the overrides. */
export function sizeHousehold(form: SizingForm) {
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
}

export type SizingResult = ReturnType<typeof sizeHousehold>;
