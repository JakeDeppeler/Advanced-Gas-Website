/**
 * What we charge: the one hourly rate in the ServiceTitan pricebook, the
 * call-out fee and the after-hours multiple. Kept in portal_settings key
 * `pricing`, edited on Pricing & costs › Rates & pricing. The profit we want on
 * top of cost is capacity.margin, which the hourly rate page already uses.
 *
 * Null is "not set": a page measuring against it says so rather than
 * assuming a rate.
 */
/**
 * `hourly` is the crew rate — a tradesman and an apprentice. `solo` is one
 * person in a van, who still has the whole van to pay for. `install` is a
 * tradesman and two apprentices in one van. `partDay` is the same two people
 * on an install done in part of a day (a split, a heat pump, a cooktop): the
 * travel to the next job eats time a day-long job doesn't lose (Jake, 5 Nov).
 */
export type Pricing = { hourly: number | null; solo: number | null; install: number | null; partDay: number | null; callout: number | null; afterHours: number | null };

export const DEFAULT_PRICING: Pricing = { hourly: null, solo: null, install: null, partDay: null, callout: null, afterHours: null };

export function normalisePricing(raw: unknown): Pricing {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  return { hourly: n(r.hourly), solo: n(r.solo), install: n(r.install), partDay: n(r.partDay), callout: n(r.callout), afterHours: n(r.afterHours) };
}
