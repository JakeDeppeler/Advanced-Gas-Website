/**
 * Heating with a reverse-cycle aircon against what it replaces — the model
 * behind the running-cost tool's Aircon side (Jake, 28 Nov: "the running cost
 * we need this for the aircon and then hot water as well").
 *
 * It compares the price of a unit of heat, not a year of running. A year's
 * cost turns on how many hours the house is heated, how big it is, how well
 * it holds heat and how hard the unit works once the rooms are warm: none of
 * it known at a quote, and a figure built on guesses at all four would be a
 * confident wrong number. The cost of heat from each is known from the prices
 * and the efficiencies alone, and the same house needs the same heat either
 * way, so the ratio carries straight onto whatever the customer pays now for
 * heating. That's the figure on the bill they can check.
 *
 * The efficiencies are typical, and the page says so:
 * - A split heats at a COP of about 4 (4 kWh of heat per kWh of power), a
 *   ducted system nearer 3.5, both at Melbourne winter temperatures; the
 *   unit's energy label has its own.
 * - An older gas ducted heater turns about 70% of its gas into heat in the
 *   rooms, a newer one about 85%, a gas wall heater about 75%. An electric
 *   heater is 100%: every kWh is a kWh of heat, at the power price.
 */

import { DEFAULT_ELEC_C_PER_KWH, DEFAULT_GAS_C_PER_MJ } from "./hotWaterSavings";

export const KWH_TO_MJ = 3.6;

export const AIRCONS = [
  { k: "split", label: "Split system", cop: 4.0 },
  { k: "ducted", label: "Ducted reverse cycle", cop: 3.5 },
] as const;

export const HEATERS = [
  { k: "gas-ducted-old", label: "Older gas ducted", fuel: "gas", efficiency: 0.7 },
  { k: "gas-ducted-new", label: "Newer gas ducted", fuel: "gas", efficiency: 0.85 },
  { k: "gas-wall", label: "Gas wall heater", fuel: "gas", efficiency: 0.75 },
  { k: "electric", label: "Electric heaters", fuel: "electric", efficiency: 1 },
] as const;

export type AirconKind = (typeof AIRCONS)[number]["k"];
export type HeaterKind = (typeof HEATERS)[number]["k"];

export type HeatingForm = {
  aircon: AirconKind;
  heater: HeaterKind;
  gasCentsPerMJ: number;
  elecCentsPerKwh: number;
  /** What heating costs them a year now, in dollars, or null when they don't know it. */
  heatingBill: number | null;
};

export const HEATING_DEFAULTS: HeatingForm = {
  aircon: "split",
  heater: "gas-ducted-old",
  gasCentsPerMJ: DEFAULT_GAS_C_PER_MJ,
  elecCentsPerKwh: DEFAULT_ELEC_C_PER_KWH,
  heatingBill: null,
};

export function heatingCost(form: HeatingForm) {
  const aircon = AIRCONS.find((a) => a.k === form.aircon) ?? AIRCONS[0];
  const heater = HEATERS.find((h) => h.k === form.heater) ?? HEATERS[0];
  // Cents for one kWh of heat in the rooms.
  const airconPerKwh = form.elecCentsPerKwh / aircon.cop;
  const heaterPerKwh = heater.fuel === "gas"
    ? (form.gasCentsPerMJ * KWH_TO_MJ) / heater.efficiency
    : form.elecCentsPerKwh / heater.efficiency;
  const ratio = airconPerKwh / Math.max(0.01, heaterPerKwh);
  const bill = form.heatingBill && form.heatingBill > 0 ? form.heatingBill : null;
  return {
    aircon, heater, airconPerKwh, heaterPerKwh, ratio,
    /** What every $100 of heating now costs on the aircon. */
    per100: 100 * ratio,
    bill,
    billAfter: bill != null ? bill * ratio : null,
    saved: bill != null ? bill * (1 - ratio) : null,
  };
}
