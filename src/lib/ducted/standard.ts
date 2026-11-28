/**
 * The standard install materials on every Duct design quote (Jake, 28 Nov
 * 2026: "a standard list we always have cover like the chip board, trap,
 * springs, coil, pvc, duct tape, hanging strap"). He chose: sized from the
 * design, and the list replaces the unit's own ServiceTitan template kit on
 * these quotes, so nothing is counted twice.
 *
 * Each item is a pricebook item and a rule for how many: so many a job, so
 * many a fan coil, one for every so many metres of condensate drain, or so
 * many for each elbow or roll of tape the designer counted. The pair coil is
 * its own rule: the coil at the design's pipe sizes, enough of them for the
 * run. The office edits the list in the portal (kept in portal_settings as
 * "ducted_standard"); until it's saved, defaultStandard() builds it from the
 * pricebook. Only the item is kept, never its price. Pure.
 */

import type { LineBook, Sku } from "./plan";
import type { Fit } from "./takeoff";

export type Basis = "job" | "fanCoil" | "drainMetres" | "elbows" | "hangingRolls" | "tapeRolls";
export type StandardItem = { skuId: number; skuType: Sku["skuType"]; name: string; basis: Basis; n: number };
export type Coil = Sku & { sizes: string; metres: number };

/** How each rule reads in the portal, after its number: "4 per fan coil", "6 m of drain each". */
export const BASES: { basis: Basis; label: string }[] = [
  { basis: "job", label: "per job" },
  { basis: "fanCoil", label: "per fan coil" },
  { basis: "drainMetres", label: "m of drain each" },
  { basis: "elbows", label: "for each drain elbow in the design" },
  { basis: "hangingRolls", label: "for each roll of hanging tape in the design" },
  { basis: "tapeRolls", label: "for each roll of duct tape in the design" },
];
const isBasis = (b: unknown): b is Basis => BASES.some((x) => x.basis === b);

const key = (s: { skuType: string; skuId: number }) => `${s.skuType}:${s.skuId}`;
const whole = (n: number) => (n > 0 ? Math.ceil(n - 1e-9) : 0);

/** How many of an item this design takes. */
export function standardQty(it: StandardItem, f: Fit): number {
  switch (it.basis) {
    case "job": return whole(it.n);
    case "fanCoil": return whole(it.n * f.fanCoils);
    case "drainMetres": return f.drainMetres > 0 && it.n > 0 ? whole(f.drainMetres / it.n) : 0;
    case "elbows": return whole(it.n * f.elbows);
    case "hangingRolls": return whole(it.n * f.hangingRolls);
    case "tapeRolls": return whole(it.n * f.tapeRolls);
  }
}

/** A pair coil's pipe sizes as one key: 3/8" × 5/8" and 3/8" x 5/8" are both "3/8x5/8". */
export function pairSize(s: string): string | null {
  const parts = [...s.matchAll(/(\d+\/\d+|\d+(?:\.\d+)?)\s*(?:"|”|″|'')/g)].map((m) => m[1]);
  return parts.length >= 2 ? parts.slice(0, 2).join("x") : null;
}
const prettySize = (k: string) => k.split("x").map((p) => `${p}"`).join(" × ");

/** The pricebook's pair coils ("Ardent Copper Pair Coil 3/8" x 5/8" R410A 20mtr"), by size and length. */
export function asCoil(s: Sku): Coil | null {
  if (!/pair coil/i.test(s.name)) return null;
  const sizes = pairSize(s.name);
  const metres = Number(/(\d+(?:\.\d+)?)\s*(?:mtrs?|metres?|m)\b/i.exec(s.name.replace(/^.*?R\d+A?\b/i, ""))?.[1] ?? NaN);
  return sizes && metres > 0 ? { ...s, sizes, metres } : null;
}

/** The standard list onto the installation's materials, and the pair coil at the design's sizes. */
export function addStandard(book: LineBook, f: Fit, list: StandardItem[], pickable: Sku[], coils: Coil[]) {
  const live = new Map(pickable.map((s) => [key(s), s]));
  for (const it of list) {
    const qty = standardQty(it, f);
    if (!(qty > 0)) continue;
    const sku = live.get(key(it)) ?? null;
    const note = it.basis === "drainMetres" ? `${f.drainMetres} m of drain` : it.basis === "fanCoil" && f.fanCoils > 1 ? `${it.n} per fan coil` : undefined;
    book.add("install", sku, sku ? sku.name : it.name.trim(), qty, `${it.name.trim()} is on the standard list but isn't in the pricebook now`, note);
  }
  for (const c of f.coils) {
    const fits = c.sizes ? coils.filter((k) => k.sizes === c.sizes).sort((a, b) => a.metres - b.metres) : [];
    const coil = fits.find((k) => k.metres >= c.runMetres) ?? fits[fits.length - 1] ?? null;
    const name = c.sizes ? `Pair coil ${prettySize(c.sizes)}` : "Pair coil";
    const why = c.sizes ? `No ${prettySize(c.sizes)} pair coil in the pricebook` : "The design didn't give the pair coil's pipe sizes";
    const qty = coil && c.runMetres > 0 ? whole(c.runMetres / coil.metres) : c.qty;
    book.add("install", coil, coil ? coil.name : name, qty, why, c.runMetres > 0 ? `${c.runMetres} m run` : undefined);
  }
}

/**
 * The list before the office has saved its own: Jake's items as the
 * pricebook names them (28 Nov), at the quantities he agreed.
 */
const DEFAULTS: [RegExp, Basis, number][] = [
  [/^chipboard 1800mm x 600mm/i, "fanCoil", 4],
  [/^vibration isolation spring/i, "fanCoil", 4],
  [/^condensate trap\b/i, "fanCoil", 1],
  [/^timber support 2400/i, "fanCoil", 2],
  [/^pressure pipe pvc class 12 20mm x 6/i, "drainMetres", 6],
  [/^pvc pressure elbow 90deg 20mm/i, "elbows", 1],
  [/^pvc pressure tee 20mm/i, "fanCoil", 1],
  [/^pvc saddle 20mm/i, "drainMetres", 1.5],
  [/^grey hanging strap/i, "hangingRolls", 1],
  [/nitto duct tape/i, "tapeRolls", 1],
  [/^silver tape 50mm/i, "job", 1],
  [/^atomik clear cure silicone/i, "job", 1],
];
export function defaultStandard(materials: Sku[]): StandardItem[] {
  return DEFAULTS.flatMap(([re, basis, n]) => {
    const s = materials.find((m) => re.test(m.name.replace(/\s+/g, " ").trim()));
    return s ? [{ skuId: s.skuId, skuType: s.skuType, name: s.name.trim(), basis, n }] : [];
  });
}

/** The list as it's kept: items that exist, each with a rule and a positive number. */
export function cleanStandard(x: unknown): StandardItem[] | null {
  if (!Array.isArray(x) || x.length > 40) return null;
  const out: StandardItem[] = [];
  for (const i of x) {
    const skuId = Number(i?.skuId), n = Number(i?.n);
    const skuType = i?.skuType === "Material" || i?.skuType === "Equipment" || i?.skuType === "Service" ? i.skuType : null;
    if (!Number.isInteger(skuId) || skuId <= 0 || !skuType || !isBasis(i?.basis) || !(n > 0 && n <= 100)) return null;
    if (out.some((o) => o.skuId === skuId && o.skuType === skuType)) continue;
    out.push({ skuId, skuType, name: String(i?.name ?? "").trim().slice(0, 200), basis: i.basis, n: Math.round(n * 100) / 100 });
  }
  return out;
}
