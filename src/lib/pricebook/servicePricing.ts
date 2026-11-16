/**
 * Jake's service prices, 16 Nov 2026, all ex GST:
 *
 *   "a standard service on a split is 250+ gst and a deep clean is 350+ and
 *   single story evap is 300+ and a double story is 400+ … if we are doing
 *   more then one split at a home it can be $180 per split and there is a 10%
 *   disscount for multi equment like a heater and evap cooler and a heater
 *   service is 250+"
 *
 * Asked the same day: two or more splits are $180 each, every one of them
 * (two = $360), not $250 for the first; and the 10% is for a heater and an
 * evap serviced together, nothing else.
 *
 * Pure, so scripts/check-quote-templates.ts can hold the sums.
 */

/** The service items as they're named in ServiceTitan's pricebook, and what each should charge. */
export const SERVICE_PRICES = [
  { skuId: 148186510, name: "Split System - Clean & Service", price: 250 },
  { skuId: 209601256, name: "Split System - Deep Clean", price: 350 },
  { skuId: 301220633, name: "Evaporative Cooler – Maintenance (Single Storey)", price: 300 },
  { skuId: 301220979, name: "Evaporative Cooler – Maintenance (Double Storey)", price: 400 },
  { skuId: 148186656, name: "Gas Ducted Heater - General Maintenance", price: 250 },
] as const;

export const priceOf = (skuId: number): number => {
  const s = SERVICE_PRICES.find((x) => x.skuId === skuId);
  if (!s) throw new Error(`No service price for ${skuId}`);
  return s.price;
};

/** Names compared without the dash, case or spacing ServiceTitan's display names drift on. */
export const sameName = (a: string, b: string) => {
  const n = (s: string) => s.toLowerCase().replace(/[–—-]/g, " ").replace(/[^a-z0-9()]+/g, " ").trim();
  return n(a) === n(b);
};

/**
 * Two or more splits at one home, each: its own item rather than a different
 * price on the single one, so a one-split service stays $250 whoever writes
 * the quote. Made from the single-split service (its category, account and
 * wording).
 */
export const MULTI_SPLIT = {
  code: "AC-SPLIT-SVC-MULTI",
  name: "Split System - Clean & Service (2 or More Splits, Each)",
  price: 180,
  from: 148186510,
  lead: "Per split, when two or more split systems are serviced at the same home.",
} as const;

/** 10% off a heater and an evap cooler serviced at the same visit. */
export const MULTI_EQUIPMENT_RATE = 0.1;
export const heaterEvapDiscount = (evapSkuId: number) => Math.round((priceOf(148186656) + priceOf(evapSkuId)) * MULTI_EQUIPMENT_RATE);

/**
 * The discount as a line of its own, negative, as the pricebook already
 * carries the VEU and Solar Victoria rebates. One per storey because a
 * template prices every line from the pricebook: a single item can't be 10%
 * of whatever sits above it.
 */
export const HEATER_EVAP_DISCOUNTS = [
  { code: "DISC-HTR-EVAP-SS", name: "Multi-Equipment Discount (10%) - Heater & Evap Service, Single Storey", evap: 301220633 },
  { code: "DISC-HTR-EVAP-DS", name: "Multi-Equipment Discount (10%) - Heater & Evap Service, Double Storey", evap: 301220979 },
].map((d) => ({
  ...d,
  price: -heaterEvapDiscount(d.evap),
  description: "10% off the heater service and the evaporative cooler service when both are done at the same visit.",
}));
