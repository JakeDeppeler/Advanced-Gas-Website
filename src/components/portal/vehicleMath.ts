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
};

export type VehicleFinance = {
  ageYears: number | null;
  lifeLeft: number | null;
  worthNow: number | null;
  equityNow: number | null;
  annualDep: number | null;
  owingPerYearLeft: number | null;
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

  return {
    ageYears, lifeLeft, worthNow, equityNow, annualDep, owingPerYearLeft,
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
