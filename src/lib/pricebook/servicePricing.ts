/**
 * Prices Jake has set himself, ex GST, rather than worked out from hours × a
 * rate by the labour run (labour.ts). His service prices, 16 Nov 2026:
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
  // Later the same day: "a evap install should be $900 for labour to install them".
  // Taken out of the labour run (labour.ts), which priced it at 2.8 h × $350.
  { skuId: 209601267, name: "Evaporative Cooler - Installation", price: 900 },
  // Jake, 22 Nov, after seeing the timesheets against the hours each install
  // is priced on: "the dominator pricing can go to $3300 as the jobs take 8
  // hours with 1 main and 2 apprentices and the ducted split can $5000 … update
  // all of the multi head pricing". Asked which lines: the Dominator's internal
  // labour line (its $980 install line stays), and the ducted installation line
  // the ducted templates are built on (the internal two-day labour line stays).
  // The multi-heads are 1 tech and 1 apprentice at $250 + $100 an hour for 6,
  // 8, 10, 12 and 14 hours (the 4-head was on 8, against 7 for 3 heads and 12
  // for 5). All taken out of the labour run, which would price them from the
  // hours again and, for the ducted line, put back its $5,230 floor.
  { skuId: 301165543, name: "Dominator - Labour (One Day)", price: 3300 },
  // Jake, 25 Nov, on job 20867's quote: "the labour should be under the
  // installation not by it self and be a service". The $5,000 moves from the
  // installation line to the two-day labour under it, and the installation
  // line goes to $0, so its price no longer hides what the materials come to.
  // The two-day labour leaves the labour run (labour.ts PAIR) for the same
  // reason the installation did: it would price it from the hours again.
  // The installation itself left this list on the evening of 25 Nov: Jake put
  // it back on Dynamic Pricing to carry its materials at the markup, so its
  // price is ServiceTitan's, and its hours go to 0 (templateFixes.ts step 8).
  { skuId: 301164889, name: "Ducted Split - Labour (Two Days)", price: 5000 },
  { skuId: 301089962, name: "Multi Head Labour (2 head)", price: 2100 },
  { skuId: 301089572, name: "Multi Head Labour (3 head)", price: 2800 },
  { skuId: 301090544, name: "Multi Head Labour (4 Head)", price: 3500 },
  { skuId: 301091980, name: "Multi Head Labour (5 Head)", price: 4200 },
  { skuId: 301089957, name: "Multi Head Labour (6 Head)", price: 4900 },
  // Jake, 22 Nov: "push the electrical to $450". Geoff Thomson bills $350 to
  // $400 for a single split, so at $400 the line made $0 to $50 a job. The
  // template lines go to $450 as well (templateFixPlan.ts).
  { skuId: 209621215, name: "Split System - Electrical Connection", price: 450 },
  { skuId: 209607618, name: "Heat Pump - Electrical", price: 450 },
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

/**
 * Whether a service was set to this price: `priced` records "$before → $after",
 * so a price Jake changes later (the ducted installation, $5,000 → $0 on 25 Nov)
 * is set again rather than counted as done.
 */
export const pricedAt = (was: string | undefined, price: number) => !!was && Number(/→ \$(-?[\d.]+)\s*$/.exec(was)?.[1]) === price;
