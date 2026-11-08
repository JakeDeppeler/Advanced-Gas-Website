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
export const ZONES: Opt<number>[] = [{ v: 4, l: "4 zones" }, { v: 6, l: "6 zones" }, { v: 8, l: "8 zones" }];

/** PLACEHOLDER: single storey, 4 zones, installed. */
export const DUCTED_BASE: Record<BrandId, Record<string, number>> = {
  kaden: { "10": 9800, "12.5": 10900, "14": 11900, "16": 13200, "18": 14400, "20": 15900 },
  mitsubishi: { "10": 12500, "12.5": 13800, "14": 15000, "16": 16600, "18": 18200, "20": 19900 },
};
/** PLACEHOLDER add-ons. */
export const DUCTED_ADD = { double: 1800, perTwoZones: 900, wifi: 450, removal: 600 };

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
export const range = (total: number) => ({ lo: r50(total * (1 - RANGE)), hi: r50(total * (1 + RANGE)) });

export function ductedPrice(a: { brand: BrandId; size: string; storeys: string; zones: number; wifi: boolean; removal: boolean }): Line[] {
  const size = DUCTED_SIZES.find((s) => s.v === a.size);
  const lines: Line[] = [{ l: `${a.brand === "kaden" ? "Kaden KDI" : "Mitsubishi Electric PEAD-M"} ${size?.s ?? ""}, 4 zones, installed`, v: DUCTED_BASE[a.brand][a.size] }];
  if (a.zones > 4) lines.push({ l: `${a.zones - 4} more zones`, v: ((a.zones - 4) / 2) * DUCTED_ADD.perTwoZones });
  if (a.storeys === "double") lines.push({ l: "Double storey", v: DUCTED_ADD.double });
  if (a.wifi) lines.push({ l: "Phone control", v: DUCTED_ADD.wifi });
  if (a.removal) lines.push({ l: "Old system taken out", v: DUCTED_ADD.removal });
  return lines;
}

export function multiPrice(a: { brand: BrandId; rooms: number; consoles: number; run: string; storeys: string; wifi: boolean }): Line[] {
  const lines: Line[] = [{ l: `${a.brand === "kaden" ? "Kaden" : "Mitsubishi Electric MXZ"} outdoor unit + ${a.rooms} wall units, installed`, v: MULTI_BASE[a.brand][a.rooms] }];
  if (a.consoles > 0) lines.push({ l: `${a.consoles} floor console${a.consoles > 1 ? "s" : ""} instead of wall units`, v: a.consoles * MULTI_ADD.console });
  if (a.run === "medium") lines.push({ l: "Pipe run across the house", v: MULTI_ADD.medium });
  if (a.run === "long") lines.push({ l: "Long pipe run", v: MULTI_ADD.long });
  if (a.storeys === "double") lines.push({ l: "Double storey", v: MULTI_ADD.double });
  if (a.wifi) lines.push({ l: `Phone control in ${a.rooms} rooms`, v: a.rooms * MULTI_ADD.wifi });
  return lines;
}
