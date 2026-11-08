/**
 * Equipment markups by brand and kind of system, set on Our prices. Prices
 * are worked from the pricebook's cost ex GST (ServiceTitan's prices are ex
 * GST too; GST goes on at the invoice), so a markup here is a true markup.
 *
 * The most specific rule wins: brand and kind, then brand, then kind, then
 * the default. A rule with no markup keeps that equipment at its current
 * price (the Reclaim splits, priced against what's offered online).
 */

export type MarkupRule = { brand: string | null; category: string | null; markup: number | null };
export type RoundMode = "nearest" | "up";
export type MarkupRules = {
  rules: MarkupRule[];
  /** For anything no rule covers. */
  fallback: number;
  /** Prices land on a whole multiple of this many dollars. */
  roundTo: number;
  roundMode: RoundMode;
  /** Costs ex GST that correct the pricebook's, by item id (one was entered inc GST). */
  costFix: Record<string, number>;
};

export const MARKUP_KEY = "equipment_markup_rules";

export const CATEGORIES = [
  "Wall split", "Multi-head", "Ducted reverse cycle", "Evaporative cooler", "Gas ducted heater",
  "Heat pump (split)", "Heat pump (plug-in)", "Hot water (gas/electric)", "Kitchen appliance", "Controls & other",
] as const;

const BRANDS: [RegExp, string][] = [
  [/reclaim/i, "Reclaim"], [/istore/i, "iStore"], [/mitsubishi/i, "Mitsubishi Electric"], [/kaden/i, "Kaden"],
  [/brivis/i, "Brivis"], [/rinnai/i, "Rinnai"], [/thermann/i, "Thermann"], [/braemar/i, "Braemar"],
  [/daikin/i, "Daikin"], [/fujitsu/i, "Fujitsu"], [/panasonic/i, "Panasonic"], [/bosch/i, "Bosch"],
  [/westinghouse/i, "Westinghouse"], [/beko/i, "Beko"], [/\bchef\b/i, "Chef"], [/zonemate/i, "Zonemate"],
];

/** The brand as people say it, from the item's name first (the pricebook's manufacturer is often the wholesaler). */
export function brandOf(name: string, manufacturer?: string | null): string {
  for (const [re, b] of BRANDS) if (re.test(name)) return b;
  const m = (manufacturer ?? "").trim();
  return m || "Other";
}

export function categoryOf(name: string): string {
  const n = name.toLowerCase();
  // "Reclaim x Panasonic" is a split system too, though its name never says so.
  if (/heat pump|reclaim|istore/.test(n)) return /split|x panasonic/.test(n) ? "Heat pump (split)" : "Heat pump (plug-in)";
  if (/gas storage|cont ?flo|continuous|electric storage|hd28|heavy duty/.test(n)) return "Hot water (gas/electric)";
  if (/evap|contour|promina|advance|f86ds|kc32/.test(n)) return "Evaporative cooler";
  if (/ducted heater|buffalo|wombat|compact classic|starpro|kun320|kex315|braemar|tqm|\bice\b/.test(n)) return "Gas ducted heater";
  if (/ducted/.test(n)) return "Ducted reverse cycle";
  if (/multi|indoor|\bidu\b/.test(n)) return "Multi-head";
  if (/split|hiwall|window|console/.test(n)) return "Wall split";
  if (/cooktop|rangehood|freestander|oven/.test(n)) return "Kitchen appliance";
  return "Controls & other";
}

/** What Jake set on 8 Nov: Brivis up towards Rinnai, the online-checked brands at 20, hot water lighter, Reclaim splits left alone. */
export const DEFAULT_RULES: MarkupRules = {
  rules: [
    { brand: "Brivis", category: null, markup: 25 },
    { brand: "Mitsubishi Electric", category: null, markup: 20 },
    { brand: "Kaden", category: null, markup: 20 },
    { brand: "Thermann", category: null, markup: 15 },
    { brand: "iStore", category: null, markup: 15 },
    { brand: "Reclaim", category: "Heat pump (split)", markup: null },
  ],
  fallback: 20,
  roundTo: 100,
  roundMode: "nearest",
  costFix: { "301589111": 2044.95, "301575207": 2006.08, "301513673": 2166.93 },
};

export function normaliseRules(raw: unknown): MarkupRules {
  const r = (raw ?? {}) as Partial<MarkupRules>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    rules: Array.isArray(r.rules) ? r.rules.filter((x) => x && (x.brand || x.category)).map((x) => ({
      brand: x.brand || null, category: x.category || null,
      markup: x.markup == null || x.markup === ("" as unknown) ? null : num(Number(x.markup), 0),
    })) : DEFAULT_RULES.rules,
    fallback: num(r.fallback, DEFAULT_RULES.fallback),
    roundTo: [1, 10, 50, 100].includes(Number(r.roundTo)) ? Number(r.roundTo) : DEFAULT_RULES.roundTo,
    roundMode: r.roundMode === "up" ? "up" : "nearest",
    costFix: r.costFix && typeof r.costFix === "object" ? r.costFix : DEFAULT_RULES.costFix,
  };
}

/** The rule for this brand and kind, most specific first; undefined markup means none matched and the default applies. */
export function ruleFor(rules: MarkupRules, brand: string, category: string): { markup: number | null; from: string } {
  const eq = (a: string | null, b: string) => !!a && a.toLowerCase() === b.toLowerCase();
  const both = rules.rules.find((r) => eq(r.brand, brand) && eq(r.category, category));
  if (both) return { markup: both.markup, from: `${brand} · ${category}` };
  const b = rules.rules.find((r) => eq(r.brand, brand) && !r.category);
  if (b) return { markup: b.markup, from: brand };
  const c = rules.rules.find((r) => !r.brand && eq(r.category, category));
  if (c) return { markup: c.markup, from: category };
  return { markup: rules.fallback, from: "Everything else" };
}

/** Below this, prices round to $10 whatever the setting: $100 steps on an indoor head or a controller are a 20–70% swing. */
export const SMALL_ITEM = 500;

export function roundPrice(v: number, to: number, mode: RoundMode): number {
  const step = v < SMALL_ITEM ? Math.min(to, 10) : to;
  return (mode === "up" ? Math.ceil(v / step) : Math.round(v / step)) * step;
}
