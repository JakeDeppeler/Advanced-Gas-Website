/**
 * Hot water delivery maths — one source of truth for the sizing
 * calculator and the shower-delivery panel on product pages.
 *
 * The whole thing turns on one idea most people miss: a tank of stored
 * hot water is not the amount of shower you get. Stored water leaves at
 * 60 °C and gets blended down with cold on the way to the rose, so a
 * 400 L tank puts out roughly 690 L of shower-temperature water. The
 * sums below make that visible rather than leaving buyers to guess.
 */

export const SPECIFIC_HEAT = 4.186; // kJ per kg per °C

/**
 * Stratification. You never get the last slice of a tank at full
 * temperature — the bottom is already mixing with incoming mains before
 * the top runs out.
 */
export const USABLE_FRACTION = 0.8;

/** House defaults. Melbourne mains, a 3-star head, a normal shower. */
export const HW_DEFAULTS = {
  tankTempC: 60,   // 60 °C minimum by law — Legionella control
  mixedTempC: 41,  // comfortable shower
  mainsTempC: 15,  // Melbourne winter mains sits 12-15 °C
  showerFlowLpm: 9,
  /**
   * 15 minutes, not the 8-minute "Australian average".
   *
   * Jake's field arithmetic: a 15 minute shower pulls 5 L/min of hot
   * water, so 75 L a head — four of them is 300 L before breakfast. Size
   * on the average and you undersize every household with a teenager in
   * it. The physics here lands on 78 L, within 4% of his number.
   */
  showerMinutes: 15,
  /**
   * Bathroom turnaround, not water-running time. Someone showering for
   * 8 minutes still occupies the bathroom for about 15 once you count
   * getting in and out — which is what actually sets how many people can
   * pass through a morning rush.
   */
  bathroomMinutesPerPerson: 15,
};

/**
 * Fraction of the mixed flow that comes out of the tank.
 * (41 − 15) ÷ (60 − 15) = 0.578, so a 9 L/min shower draws 5.2 L/min of
 * stored hot water and 3.8 L/min of cold.
 */
export function hotFraction(
  tankTempC = HW_DEFAULTS.tankTempC,
  mixedTempC = HW_DEFAULTS.mixedTempC,
  mainsTempC = HW_DEFAULTS.mainsTempC,
): number {
  const span = Math.max(1, tankTempC - mainsTempC);
  return Math.min(1, Math.max(0.05, (mixedTempC - mainsTempC) / span));
}

export type Delivery = {
  /** Nameplate litres. */
  tankLitres: number;
  /** Litres available before the outlet starts running cool. */
  usableLitres: number;
  /** Litres of shower-temperature water that produces. */
  mixedLitres: number;
  /** Cold water blended in to get there. */
  coldLitres: number;
  /** Back-to-back showers from a full tank, no reheat counted. */
  showers: number;
  /** Total shower minutes from a full tank. */
  showerMinutes: number;
  /** Hot water one shower takes out of the tank. */
  hotPerShower: number;
};

export function deliveryFor(
  tankLitres: number,
  opts: Partial<typeof HW_DEFAULTS> = {},
): Delivery {
  const o = { ...HW_DEFAULTS, ...opts };
  const hf = hotFraction(o.tankTempC, o.mixedTempC, o.mainsTempC);

  const usableLitres = tankLitres * USABLE_FRACTION;
  const mixedLitres = usableLitres / hf;
  const hotPerShower = o.showerFlowLpm * hf * o.showerMinutes;

  return {
    tankLitres,
    usableLitres,
    mixedLitres,
    coldLitres: mixedLitres - usableLitres,
    showers: usableLitres / hotPerShower,
    showerMinutes: mixedLitres / o.showerFlowLpm,
    hotPerShower,
  };
}

/**
 * Household this tank comfortably suits, assuming showers spread across
 * morning and evening rather than all at once — which is how households
 * actually run, and the difference between a sensible recommendation and
 * an oversized one.
 *
 * Sized off the busier run (60% of the day's showers) plus a share of
 * basin and kitchen draw.
 */
export function suitsPeople(
  tankLitres: number,
  opts: Partial<typeof HW_DEFAULTS> = {},
): { min: number; max: number; label: string } {
  const d = deliveryFor(tankLitres, opts);
  const otherPerPerson = 10; // basins, kitchen, laundry
  const morningShare = 0.5;

  // The old fudge factor is gone. It existed to drag an 8-minute-shower
  // model back toward reality; a 15 minute shower is the reality, so the
  // arithmetic now lands on Jake's figures on its own — 180 L reads 1-3
  // without anyone leaning on the scale.
  let max = 0;
  for (let people = 1; people <= 12; people++) {
    const runHot = people * morningShare * d.hotPerShower + people * otherPerPerson * 0.4;
    if (runHot <= d.usableLitres) max = people;
  }

  const min = Math.max(1, Math.floor(max / 2));
  // Past about eight the arithmetic keeps going but the claim stops
  // being useful — nobody sizes a tank for eleven.
  const label =
    max === 0 ? "Single occupant, light use"
    : max >= 9 ? `${min}+ people`
    : min === max ? `${max} ${max === 1 ? "person" : "people"}`
    : `${min}–${max} people`;

  return { min, max, label };
}

/** Litres of hot water a given HEAT OUTPUT can make per hour. */
export function recoveryLitresPerHour(heatKw: number, deltaT: number): number {
  return (heatKw * 3600) / (SPECIFIC_HEAT * Math.max(1, deltaT));
}

/**
 * How many people can get through a rush of a given length.
 * Bathroom turnaround, not water-running time — see the note on
 * bathroomMinutesPerPerson.
 */
export function peopleThroughRush(
  windowHours: number,
  minutesEach = HW_DEFAULTS.bathroomMinutesPerPerson,
): number {
  return (windowHours * 60) / Math.max(1, minutesEach);
}

/** Hours a rush takes for a given number of people, one bathroom. */
export function rushHoursFor(
  people: number,
  minutesEach = HW_DEFAULTS.bathroomMinutesPerPerson,
): number {
  return (people * minutesEach) / 60;
}
