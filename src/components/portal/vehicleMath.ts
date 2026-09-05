/**
 * What a vehicle is worth today and how that sits against what's still owed on
 * it. Resale value is the figure at the end of its life, so comparing it with
 * today's finance balance answers the wrong question — this straight-lines the
 * value down from what was paid to what it'll be worth, and reads the debt
 * against the point it has actually reached.
 */

export type VehicleMoney = {
  purchasePrice: number | null;
  resaleValue: number | null;
  lifespanYears: number | null;
  amountOwing: number | null;
  purchasedOn: string | null;
  serviceIntervalKm?: number | null;
  serviceCost?: number | null;
  kmYear?: number | null;
  fuelPer100?: number | null;
};

export type VehicleFinance = {
  ageYears: number | null;
  lifeLeft: number | null;
  worthNow: number | null;
  equityNow: number | null;
  annualDep: number | null;
  owingPerYearLeft: number | null;
  /** Servicing a year: how many services the km calls for, times what one costs. */
  servicePerYear: number | null;
  servicesPerYear: number | null;
  /** The month its costed life runs out — when it should be sold on. */
  sellBy: string | null;
  underwater: boolean;
  pastLife: boolean;
};

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export function vehicleFinance(v: VehicleMoney): VehicleFinance {
  const { purchasePrice, lifespanYears, amountOwing } = v;
  const resale = v.resaleValue ?? 0;

  const ageYears = v.purchasedOn
    ? Math.max(0, (Date.now() - new Date(`${v.purchasedOn}T00:00:00Z`).getTime()) / YEAR_MS)
    : null;
  const lifeLeft = ageYears !== null && lifespanYears ? lifespanYears - ageYears : null;

  const annualDep = purchasePrice !== null && lifespanYears ? (purchasePrice - resale) / lifespanYears : null;

  // Value never falls below what it'll fetch at the end, however old it gets.
  const worthNow = purchasePrice !== null && lifespanYears && ageYears !== null
    ? Math.max(resale, purchasePrice - (purchasePrice - resale) * Math.min(1, ageYears / lifespanYears))
    : null;

  const equityNow = worthNow !== null && amountOwing !== null ? worthNow - amountOwing : null;
  const owingPerYearLeft = amountOwing !== null && lifeLeft !== null && lifeLeft > 0 ? amountOwing / lifeLeft : null;

  // Lifespan runs from the day it was bought, so the sell-by date is simply
  // that date plus the years it was costed over.
  let sellBy: string | null = null;
  if (v.purchasedOn && lifespanYears) {
    const bought = new Date(`${v.purchasedOn}T00:00:00Z`);
    const end = new Date(bought.getTime() + lifespanYears * YEAR_MS);
    sellBy = end.toLocaleDateString("en-AU", { timeZone: "UTC", month: "long", year: "numeric" });
  }

  // A 30,000km service interval and a 10,000km one are worlds apart once the
  // km a year and the price of a service are in front of you.
  const servicesPerYear = v.kmYear && v.serviceIntervalKm ? v.kmYear / v.serviceIntervalKm : null;
  const servicePerYear = servicesPerYear !== null && v.serviceCost != null ? servicesPerYear * v.serviceCost : null;

  return {
    ageYears, lifeLeft, worthNow, equityNow, annualDep, owingPerYearLeft, servicePerYear, servicesPerYear, sellBy,
    underwater: equityNow !== null && equityNow < 0,
    pastLife: lifeLeft !== null && lifeLeft <= 0,
  };
}

/** "2 years 6 months", or "7 months" — never a bare decimal. */
export function years(n: number): string {
  const whole = Math.floor(Math.abs(n));
  const months = Math.round((Math.abs(n) - whole) * 12);
  const y = months === 12 ? whole + 1 : whole;
  const m = months === 12 ? 0 : months;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? "year" : "years"}`);
  if (m) parts.push(`${m} ${m === 1 ? "month" : "months"}`);
  return parts.length ? parts.join(" ") : "less than a month";
}


/** Fuel a year at a given pump price. */
export function fuelPerYear(v: VehicleMoney, pricePerLitre: number): number | null {
  if (!v.kmYear || v.fuelPer100 == null) return null;
  return (v.kmYear / 100) * v.fuelPer100 * pricePerLitre;
}
