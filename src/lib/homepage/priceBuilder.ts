/**
 * "Build your price" for ducted and multi-head: the questions, and what each
 * answer adds.
 *
 * ⚠️ EVERY DOLLAR FIGURE IN THIS FILE IS A PLACEHOLDER. Jake asked for a
 * mock-up to see how the tool works before he sends the real price list.
 * The tool only renders on preview deployments (see `PRICE_BUILDER_LIVE`),
 * and says "placeholder prices" on its face, so none of these numbers can
 * reach a customer. When the real figures arrive: replace them here, check
 * them against a few real quotes, then flip `PRICE_BUILDER_LIVE`.
 */

import { UPGRADES } from "@/lib/tools/veuEstimate";

/** Off until the figures below are Jake's own. */
export const PRICE_BUILDER_LIVE = false;

/** The range either side of the total, so nobody is held to an exact figure before the site check. */
export const RANGE = 0.08;

export type BrandId = "kaden" | "mitsubishi";
export type Opt<V extends string | number = string> = { v: V; l: string; s?: string };

export const BRANDS: Opt<BrandId>[] = [
  { v: "kaden", l: "Kaden", s: "The sensible spend" },
  { v: "mitsubishi", l: "Mitsubishi Electric", s: "The long stay" },
];

export const STOREYS: Opt<"single" | "double">[] = [
  { v: "single", l: "Single storey" },
  { v: "double", l: "Double storey" },
];

/* ---------------- Ducted ---------------- */

export const DUCTED_SIZES: Opt<string>[] = [
  { v: "10", l: "2–3 bedrooms", s: "10 kW" },
  { v: "12.5", l: "3 bedrooms", s: "12.5 kW" },
  { v: "14", l: "3–4 bedrooms", s: "14 kW" },
  { v: "16", l: "4 bedrooms", s: "16 kW" },
  { v: "18", l: "4–5 bedrooms", s: "18 kW" },
  { v: "20", l: "5+ bedrooms", s: "20 kW · 3-phase" },
];
export const ZONES: Opt<number>[] = [4, 6, 8, 10, 12].map((n) => ({ v: n, l: `${n} zones` }));
/** Outlets in the ceiling. Every zone needs at least one, so the tool only offers counts at or above the zones picked. */
export const POINTS: Opt<number>[] = [6, 8, 10, 12, 14, 16].map((n) => ({ v: n, l: `${n} points` }));

/**
 * PLACEHOLDER: single storey, 4 zones, 8 points, installed.
 *
 * Jake's ceiling (Nov 2026): the biggest job the tool can build, 20 kW
 * Mitsubishi with 12 zones, 16 points and every extra, must not read above
 * $17,000 at the top of its range. That job sums to $15,710, and the range's
 * top (+8%, to the nearest $50) is $16,950. Keep it under the line if these
 * figures change.
 */
export const DUCTED_BASE: Record<BrandId, Record<string, number>> = {
  kaden: { "10": 7600, "12.5": 8200, "14": 8800, "16": 9500, "18": 10200, "20": 10900 },
  mitsubishi: { "10": 8800, "12.5": 9500, "14": 10200, "16": 10900, "18": 11500, "20": 12000 },
};
/** PLACEHOLDER add-ons. */
export const DUCTED_ADD = { perTwoZones: 400, perPoint: 120, double: 600, wifi: 300, removal: 250 };
/** The most a quote can show: the top of any range is held to this. */
export const DUCTED_CEILING = 17000;

/**
 * The VEU rebate for swapping gas ducted heating to reverse-cycle ducted:
 * the low end of the range the VEU calculator already shows for that
 * upgrade, so the two tools can't disagree and neither overpromises.
 */
const veu = (key: string) => UPGRADES.find((u) => u.key === key)?.minRebate ?? 0;
export const REBATE = { ducted: veu("gas-ducted::rc-ducted"), multi: veu("gas-ducted::rc-split") };

/* ---------------- Multi-head ---------------- */

export const ROOMS: Opt<number>[] = [2, 3, 4, 5, 6].map((n) => ({ v: n, l: `${n} rooms` }));
export const RUNS: Opt<"short" | "medium" | "long">[] = [
  { v: "short", l: "Close by", s: "Same side of the house" },
  { v: "medium", l: "Across the house", s: "Some pipe through the roof" },
  { v: "long", l: "Far side, or upstairs", s: "A long run" },
];

/** PLACEHOLDER: outdoor unit plus that many wall heads, installed. */
export const MULTI_BASE: Record<BrandId, Record<number, number>> = {
  kaden: { 2: 5200, 3: 6900, 4: 8700, 5: 10400, 6: 12100 },
  mitsubishi: { 2: 6500, 3: 8600, 4: 10800, 5: 13000, 6: 15200 },
};
/** PLACEHOLDER add-ons. */
export const MULTI_ADD = { console: 600, medium: 400, long: 900, double: 700, wifi: 150 };

export type Line = { l: string; v: number };

/** Rounded to the nearest $50, the way a quote reads. */
const r50 = (n: number) => Math.round(n / 50) * 50;
export const range = (total: number, ceiling = Infinity) => {
  const hi = Math.min(r50(total * (1 + RANGE)), ceiling);
  return { lo: Math.min(r50(total * (1 - RANGE)), hi), hi };
};

export function ductedPrice(a: { brand: BrandId; size: string; storeys: string; zones: number; points: number; wifi: boolean; removal: boolean; gas: boolean }): Line[] {
  const size = DUCTED_SIZES.find((s) => s.v === a.size);
  const lines: Line[] = [{ l: `${a.brand === "kaden" ? "Kaden KDI" : "Mitsubishi Electric PEAD-M"} ${size?.s ?? ""}, 4 zones, 8 points, installed`, v: DUCTED_BASE[a.brand][a.size] }];
  if (a.zones > 4) lines.push({ l: `${a.zones - 4} more zones`, v: ((a.zones - 4) / 2) * DUCTED_ADD.perTwoZones });
  if (a.points > 8) lines.push({ l: `${a.points - 8} more points`, v: (a.points - 8) * DUCTED_ADD.perPoint });
  if (a.storeys === "double") lines.push({ l: "Double storey", v: DUCTED_ADD.double });
  if (a.wifi) lines.push({ l: "Phone control", v: DUCTED_ADD.wifi });
  if (a.removal) lines.push({ l: "Old system taken out", v: DUCTED_ADD.removal });
  if (a.gas) lines.push({ l: "VEU rebate, gas heating replaced", v: -REBATE.ducted });
  return lines;
}

export function multiPrice(a: { brand: BrandId; rooms: number; consoles: number; run: string; storeys: string; wifi: boolean; gas: boolean }): Line[] {
  const lines: Line[] = [{ l: `${a.brand === "kaden" ? "Kaden" : "Mitsubishi Electric MXZ"} outdoor unit + ${a.rooms} wall units, installed`, v: MULTI_BASE[a.brand][a.rooms] }];
  if (a.consoles > 0) lines.push({ l: `${a.consoles} floor console${a.consoles > 1 ? "s" : ""} instead of wall units`, v: a.consoles * MULTI_ADD.console });
  if (a.run === "medium") lines.push({ l: "Pipe run across the house", v: MULTI_ADD.medium });
  if (a.run === "long") lines.push({ l: "Long pipe run", v: MULTI_ADD.long });
  if (a.storeys === "double") lines.push({ l: "Double storey", v: MULTI_ADD.double });
  if (a.wifi) lines.push({ l: `Phone control in ${a.rooms} rooms`, v: a.rooms * MULTI_ADD.wifi });
  if (a.gas) lines.push({ l: "VEU rebate, gas heating replaced", v: -REBATE.multi });
  return lines;
}
