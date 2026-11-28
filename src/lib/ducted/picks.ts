/**
 * What the office picked for a part the pricebook has nothing to match
 * (Jake, 28 Nov 2026: stop, list them, pick one for each, and remember it).
 *
 * A pick is kept by the line's name as the quote gives it ("3-way take-off
 * Ø450 → Ø300 · Ø300 · Ø300", "Return air box 1200 × 400"), so the same need
 * is priced the same way on the next job. It can be more than one item (a 450
 * to 400 reducer and a 400 take-off), each so many for one of the need. Only
 * the item is remembered, never its price: that's read from the pricebook as
 * it is each time. Pure, so the page and the server apply it the same way.
 */

import { quoteTotal, type DuctedQuote, type Line, type Sku } from "./plan";

export type PickItem = { skuId: number; skuType: Sku["skuType"]; name: string; per: number };
export type Picks = Record<string, PickItem[]>;

const key = (s: { skuType: string; skuId: number }) => `${s.skuType}:${s.skuId}`;

/** The quote with each picked need priced as its picked items, from the pricebook as it is now. */
export function applyPicks<Q extends DuctedQuote>(q: Q, picks: Picks, pickable: Sku[]): Q {
  const live = new Map(pickable.map((s) => [key(s), s]));
  const lines: Line[] = [];
  const missing = [...q.missing];
  for (const l of q.lines) {
    const want = !l.sku ? picks[l.name.trim()] : undefined;
    const items = want?.map((p) => ({ p, sku: live.get(key(p)) ?? null })) ?? [];
    if (!want?.length || items.some((i) => !i.sku)) { lines.push(l); continue; }
    const i = missing.indexOf(l.missing ?? l.name);
    if (i >= 0) missing.splice(i, 1);
    for (const { p, sku } of items) {
      const quantity = Math.round(l.quantity * Math.max(0, p.per) * 100) / 100;
      if (!(quantity > 0)) continue;
      lines.push({ group: l.group, sku: sku!, name: sku!.name, quantity, unitPrice: sku!.price, note: `for ${l.name.trim()} (picked)` });
    }
  }
  // The same item twice in a group is one line, as the quote has it everywhere else (lineBook).
  const merged: Line[] = [];
  for (const l of lines) {
    const have = l.sku ? merged.find((x) => x.group === l.group && x.sku && key(x.sku) === key(l.sku!)) : undefined;
    if (!have) { merged.push({ ...l }); continue; }
    have.quantity = Math.round((have.quantity + l.quantity) * 100) / 100;
    if (l.note && l.note !== have.note) have.note = have.note ? `${have.note}; ${l.note}` : l.note;
  }
  return { ...q, lines: merged, missing, total: quoteTotal(merged) };
}

/** The lines still without a pricebook item: the quote can't go on until each has one. */
export const unpriced = (q: DuctedQuote) => q.lines.filter((l) => !l.sku);

/** A pick as it's kept: items that exist, each a positive number for one of the need. */
export function cleanPick(items: unknown): PickItem[] | null {
  if (!Array.isArray(items) || !items.length || items.length > 6) return null;
  const out: PickItem[] = [];
  for (const x of items) {
    const skuId = Number(x?.skuId), per = Number(x?.per);
    const skuType = x?.skuType === "Material" || x?.skuType === "Equipment" || x?.skuType === "Service" ? x.skuType : null;
    if (!Number.isInteger(skuId) || skuId <= 0 || !skuType || !(per > 0 && per <= 50)) return null;
    out.push({ skuId, skuType, name: String(x?.name ?? "").slice(0, 200), per });
  }
  return out;
}
