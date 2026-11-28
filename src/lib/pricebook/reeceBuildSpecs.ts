/**
 * What the pricebook takes from Reece's catalogue, Jake 28 Nov, as data.
 *
 *   - "remove all bdo and then add the reece max multi snap bdo size with the
 *     photo and product code and there cost price ex gst and then the price
 *     to the customer is cmp with the gst inc": the Multisnap branch
 *     take-offs (single and double) in every size Reece sells, each with its
 *     Reece code, photo and our cost ex GST. ServiceTitan's prices are ex GST
 *     and GST goes on at the invoice, so the pricebook price is the CMP ex GST
 *     and the customer pays the CMP with GST. Named as the pricebook already
 *     names them ("Multisnap BTO F/Insul 300.250.200"), which is also how the
 *     duct plan quote reads a fitting's sizes (ducted/fittings.ts).
 *   - "all 20kw 26kw and 30kw need the 4 5 and 6 star option": the heaters
 *     Reece stocks in those ratings near those sizes. Brivis StarPro makes 4, 5
 *     and 6 star at 21 or 23kW and 30kW, internal and external; nobody makes a
 *     26kW StarPro, and the nearest at Reece are Braemar's TQR428 (4 star) and
 *     TQR528 (5 star), 28kW, one model for internal or external. No 6 star sits
 *     between 23 and 30kW. Priced on the equipment markup rules (Brivis 30%,
 *     Braemar 25%, up to the next $100), as every other unit is.
 * Pure, for scripts/check-quote-templates.ts.
 */

export const REECE_VENDOR_ID = 148068312; // "Reece Metalflex", as the Multisnap and StarPro items already have it
export const TAKEOFF_CATEGORIES = [209621515, 301100022, 301207260];
export const HEATER_CATEGORIES = [301546432];

export type ReeceHit = { code: string; title: string; cost: number | null; cmpEx: number | null; cmpInc: number | null; image: string | null };

const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const parse = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return null; }
};

/** A search hit as reeceSearch keeps it (its raw fields as strings) → what the pricebook needs. */
export function readHit(item: { code: string; description: string | null; cost?: number | null; list_price?: number | null; raw?: Record<string, unknown> }): ReeceHit {
  const raw = item.raw ?? {};
  const uom = ((parse(raw.unitOfMeasures) as Record<string, unknown>[] | null) ?? [])[0] ?? {};
  const images = ((parse(raw.productImages) as { width?: number; url?: string }[] | null) ?? []).filter((i) => i?.url);
  const widest = images.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
  return {
    code: String(item.code),
    title: String(item.description ?? raw.productTitle ?? "").replace(/\s+/g, " ").trim(),
    cost: num(uom.unitPriceExcludingGST) ?? num(item.cost),
    cmpEx: num(uom.unitMarketPriceExcludingGST) ?? num(item.list_price),
    cmpInc: num(uom.unitMarketPriceIncludingGST),
    image: widest,
  };
}

/** "Multisnap Branch Take Off Foam Insulated 250mm x 200mm x 150mm" or "… 250.200.150" → "Multisnap BTO F/Insul 250.200.150". */
export function takeoffName(title: string): string | null {
  const m = /^Multisnap (Double )?Branch Take Off Foam Insulated (.+)$/i.exec(title.replace(/\s+/g, " ").trim());
  if (!m) return null;
  const sizes = m[2].replace(/mm/gi, "").split(/\s*[x.]\s*/).map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n >= 100 && n <= 600);
  const double = !!m[1];
  if (sizes.length !== (double ? 4 : 3)) return null;
  return `Multisnap ${double ? "DBTO" : "BTO"} F/Insul ${sizes.join(".")}`;
}

/** The customer's price ex GST: the CMP, so with GST they pay the CMP. */
export const customerPrice = (h: ReeceHit): number | null => {
  const v = h.cmpEx ?? (h.cmpInc != null ? h.cmpInc / 1.1 : null);
  return v == null ? null : Math.round(v * 100) / 100;
};

/**
 * One fitting per size. Reece lists some sizes twice (an older code and a
 * newer one, at different costs): the one the pricebook already carries wins,
 * else the one we buy cheaper. A hit with no cost or CMP is no use to price.
 */
export function pickTakeoffs(hits: ReeceHit[], have: Set<string>): { name: string; hit: ReeceHit }[] {
  const by = new Map<string, ReeceHit[]>();
  for (const h of hits) {
    const name = takeoffName(h.title);
    if (!name || h.cost == null || customerPrice(h) == null) continue;
    by.set(name, [...(by.get(name) ?? []), h]);
  }
  return [...by.entries()].map(([name, list]) => ({
    name,
    hit: list.find((h) => have.has(h.code)) ?? [...list].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0],
  })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export type Heater = { code: string; name: string; brand: "Brivis" | "Braemar"; manufacturer: string; model: string; stars: 4 | 5 | 6; kw: number; place: "Internal" | "External" | "Internal / External" };
export const HEATERS: Heater[] = [
  { code: "33085", name: "Brivis StarPro 4 Star 21kW Internal (SP421IN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP421IN V4", stars: 4, kw: 21, place: "Internal" },
  { code: "33084", name: "Brivis StarPro 4 Star 21kW External (SP421EN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP421EN V4", stars: 4, kw: 21, place: "External" },
  { code: "33087", name: "Brivis StarPro 4 Star 30kW Internal (SP430IN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP430IN V4", stars: 4, kw: 30, place: "Internal" },
  { code: "33086", name: "Brivis StarPro 4 Star 30kW External (SP430EN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP430EN V4", stars: 4, kw: 30, place: "External" },
  { code: "3110610", name: "Brivis StarPro 5 Star 21kW Internal (SP521IN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP521IN V4", stars: 5, kw: 21, place: "Internal" },
  { code: "3110600", name: "Brivis StarPro 5 Star 21kW External (SP521EN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP521EN V4", stars: 5, kw: 21, place: "External" },
  { code: "3110612", name: "Brivis StarPro 5 Star 30kW Internal (SP530IN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP530IN V4", stars: 5, kw: 30, place: "Internal" },
  { code: "3110602", name: "Brivis StarPro 5 Star 30kW External (SP530EN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP530EN V4", stars: 5, kw: 30, place: "External" },
  { code: "3110616", name: "Brivis StarPro 6 Star 23kW Internal (SP623IN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP623IN V4", stars: 6, kw: 23, place: "Internal" },
  { code: "3110604", name: "Brivis StarPro 6 Star 23kW External (SP623EN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP623EN V4", stars: 6, kw: 23, place: "External" },
  { code: "3110618", name: "Brivis StarPro 6 Star 30kW Internal (SP630IN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP630IN V4", stars: 6, kw: 30, place: "Internal" },
  { code: "3110607", name: "Brivis StarPro 6 Star 30kW External (SP630EN)", brand: "Brivis", manufacturer: "Rinnai", model: "SP630EN V4", stars: 6, kw: 30, place: "External" },
  { code: "40858", name: "Braemar TQR428 4 Star 28kW Internal / External", brand: "Braemar", manufacturer: "Braemar", model: "TQR428", stars: 4, kw: 28, place: "Internal / External" },
  { code: "40860", name: "Braemar TQR528 5 Star 28kW Internal / External", brand: "Braemar", manufacturer: "Braemar", model: "TQR528", stars: 5, kw: 28, place: "Internal / External" },
];

/** The unit's price on the equipment markup rules: cost plus the brand's markup, up to the step. */
export function heaterPrice(cost: number, markupPct: number, roundTo: number): number {
  return Math.ceil(Math.round(((cost * (1 + markupPct / 100)) / roundTo) * 100) / 100) * roundTo;
}

/**
 * A template for each internal StarPro and for the Braemar 28kWs, made from the
 * nearest one the office already quotes: the StarPro 6 Star 15kW internal (its
 * installation, flue and duct) and the Braemar Ecostar 6 Star 18kW (its
 * installation and Braemar flue kit), with the unit swapped. The external
 * StarPros are in the pricebook but wait on which flashing and base each takes.
 */
export const STARPRO_15_INTERNAL = { template: 301479540, unit: 301477906 } as const;
export const ECOSTAR_18 = { template: 301399805, unit: 301399782 } as const;
export const HEATER_TEMPLATES = HEATERS.filter((h) => h.place !== "External").map((h) => ({
  heater: h,
  /** The range as the summary names it before the size: "Brivis StarPro 4 Star", "Braemar TQR428 4 Star". */
  brandLine: h.brand === "Brivis" ? `Brivis StarPro ${h.stars} Star` : `Braemar ${h.model} ${h.stars} Star`,
  from: h.brand === "Brivis" ? STARPRO_15_INTERNAL : ECOSTAR_18,
  name: h.brand === "Brivis" ? `Brivis StarPro ${h.stars} Star ${h.kw}kW Ducted Gas Heater` : `Braemar TQR${h.stars}28 ${h.stars} Star ${h.kw}kW Ducted Gas Heater`,
  code: `GAS-HTR-${h.brand.toUpperCase()}-${h.model.replace(/\s.*$/, "")}`,
}));
