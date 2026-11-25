import type { TemplateItem } from "./labour";

/**
 * Jake's template fixes of 22 Nov, after the review of every quote template
 * (the "Quote Template Review" page): what each one changes, worked out from
 * a template's lines alone. Pure, so scripts/check-quote-templates.ts can hold
 * them, and idempotent: a rule finds nothing to do on a template it has
 * already fixed, which is also how a write is checked (templateFixes.ts reads
 * the template back and asks again).
 *
 * His words, one rule each:
 *   - "none of the multi head should have the labour as they need to be added,
 *     some may be 2 or 3 even 5 head": the head-count labour lines come off.
 *   - "the multi head should have one size of each coil and we add it if we
 *     need more, and the Mitsubishi should only have 1/4 3/8 and 1/4 1/2".
 *   - "push the electrical to $450": the split and heat pump electrical lines,
 *     the two that were $400. Multi-head, ducted and Dominator electrical
 *     are priced per job type and weren't part of it.
 *   - "the 2.5kW Mitsubishi should have 1/4 3/8": its back-to-back had the
 *     1/4 x 1/2 coil, no drain pipe and two hat sections; it now matches the
 *     3.5kW back-to-back, the same unit family.
 *   - "add the BPC for the Reclaim": Reclaim Split GL 250L V1 had none.
 *   - "the evap cooler should have PVC as we will run a new drain to the gutter".
 *   - "remove the pump and the Blygold to the 5kW": the add-ons on Kaden 5kW
 *     Roof Mounted, the only split that had them. The second coil stays.
 *   - "the ducted hour should be its own line": the two-day labour sat inside
 *     the installation's group; it comes out to stand on its own.
 * The internal heaters, the duplicates and the ducted installation price need
 * ServiceTitan's answers (a new line's id, Dynamic Pricing switched off) and
 * live in templateFixes.ts.
 */

export const SKU = {
  splitElec: 209621215,
  hpElec: 209607618,
  bpc: 209621211,
  pvc: 148186547,
  hat: 209621428,
  coil38: 148186799,
  coil12: 209621440,
  coil58: 209621448,
  evapInstall: 209601267,
  ductedInstall: 209599911,
  ductedLabour: 301164889,
  gasExternal: 209599988,
  gasInternal: 303135745,
  pump: 209621465,
  blygold: 303032307,
} as const;
export const HEAD_LABOUR = new Set([301089962, 301089572, 301090544, 301091980, 301089957]);
export const ELEC_PRICE = 450;
const COILS = new Set<number>([SKU.coil38, SKU.coil12, SKU.coil58, 209621456, 209622205]);

export const T = {
  reclaimGl250V1: 301092812,
  mitsu25Btb: 301037532,
  kaden5Roof: 301089633,
} as const;
/** The four ducted templates, by id. */
export const DUCTED = [301218003, 301257227, 301235354, 301216342];
/** Internal heaters on the external install line (Wombat 15/20, Compact Classic 15/20, StarPro 15). */
export const INTERNAL_ON_EXTERNAL = [301256429, 301255101, 301189371, 301255944, 301479540];
/**
 * Duplicates switched off. The office's own "125L/160L 3kW Smart Electric
 * Storage Hot Water" stay: they're the options on the Smart Electric Storage
 * proposal. These two were made on 15 Nov with the same lines and price.
 */
export const DUPLICATES = [
  { id: 303257987, name: "Thermann Smart Electric Storage 125L 3kW - Replacement", keeps: "125L 3kW Smart Electric Storage Hot Water" },
  { id: 303257995, name: "Thermann Smart Electric Storage 160L 3kW - Replacement", keeps: "160L 3kW Smart Electric Storage Hot Water" },
];

export type Tpl = { id: number; name: string; items: TemplateItem[] };
/** Pricebook prices for lines a rule adds. */
export type Prices = Map<number, number>;
export type Edit = { items: TemplateItem[]; did: string[] };

const plain = (i: TemplateItem) => !i.isAddOn && i.parentItemId == null;
const isMulti = (t: Tpl) => /Multi Head Split System$/i.test(t.name.trim());
const isEvap = (t: Tpl) => /Evaporative Cooler \(.*\) - Replacement$|Evaporative Cooler - Replacement \(Add Unit\)$/i.test(t.name.trim());

/** The line other lines are grouped under, if there is one: the install header. */
export function headerOf(items: TemplateItem[], prefer?: number): TemplateItem | null {
  const roots = items.filter((i) => i.id != null && items.some((x) => x.itemGroupParentId === i.id));
  return (prefer != null ? items.find((i) => i.skuId === prefer && !i.isAddOn) : null) ?? roots.find((r) => r.skuType === "Service") ?? roots[0] ?? null;
}

/** A new line under the header (or loose where there's no group), placed after the header's last member. */
function addUnder(items: TemplateItem[], header: TemplateItem | null, line: Omit<TemplateItem, "id" | "isAddOn">): TemplateItem[] {
  const add: TemplateItem = { ...line, id: null, isAddOn: false, itemGroupParentId: header?.itemGroupName || items.some((x) => header && x.itemGroupParentId === header.id) ? header!.id : null };
  let at = header ? items.indexOf(header) : items.length - 1;
  items.forEach((x, k) => { if (header && x.itemGroupParentId === header.id) at = Math.max(at, k); });
  return [...items.slice(0, at + 1), add, ...items.slice(at + 1)];
}

/** Every 22 Nov change one template needs, or null when it needs none. */
export function planFixes(t: Tpl, prices: Prices): Edit | null {
  let items = t.items.map((i) => ({ ...i }));
  const did: string[] = [];
  const price = (sku: number, fallback: number) => prices.get(sku) ?? fallback;

  if (isMulti(t)) {
    const heads = items.filter((i) => plain(i) && HEAD_LABOUR.has(i.skuId));
    if (heads.length) { items = items.filter((i) => !heads.includes(i)); did.push(`head labour removed (${heads.map((h) => (h.skuName ?? "").trim()).join(", ")})`); }
    for (const i of items) if (plain(i) && COILS.has(i.skuId) && Number(i.quantity) > 1) { did.push(`${(i.skuName ?? "coil").trim()} ${i.quantity} → 1`); i.quantity = 1; }
    if (/^Mitsubishi/i.test(t.name)) {
      const other = items.filter((i) => plain(i) && COILS.has(i.skuId) && i.skuId !== SKU.coil38 && i.skuId !== SKU.coil12);
      if (other.length) { items = items.filter((i) => !other.includes(i)); did.push(`coils other than 1/4 x 3/8 and 1/4 x 1/2 removed`); }
    }
  }

  for (const i of items) {
    if (plain(i) && (i.skuId === SKU.splitElec || i.skuId === SKU.hpElec) && Math.abs(Number(i.unitPrice) - ELEC_PRICE) >= 0.005) {
      did.push(`${(i.skuName ?? "electrical").trim()} $${Number(i.unitPrice)} → $${ELEC_PRICE}`);
      i.unitPrice = ELEC_PRICE;
    }
  }

  if (t.id === T.reclaimGl250V1 && !items.some((i) => i.skuId === SKU.bpc)) {
    items = [...items, { id: null, skuId: SKU.bpc, skuType: "Service", skuName: "BPC Compliance Certificate", quantity: 1, unitPrice: price(SKU.bpc, 65), isAddOn: false, itemGroupName: "BPC Compliance Certificate" }];
    did.push("BPC compliance certificate added");
  }

  if (t.id === T.mitsu25Btb) {
    const coil = items.find((i) => plain(i) && i.skuId === SKU.coil12);
    if (coil) {
      const k = items.indexOf(coil);
      items[k] = { id: null, skuId: SKU.coil38, skuType: "Material", skuName: "Ardent Copper Pair Coil 1/4\" x 3/8\" R410A 20mtr", quantity: coil.quantity, unitPrice: Number(coil.unitPrice) || 0, isAddOn: false, itemGroupParentId: coil.itemGroupParentId ?? null };
      did.push("coil 1/4 x 1/2 → 1/4 x 3/8");
    }
    const hat = items.find((i) => plain(i) && i.skuId === SKU.hat && Number(i.quantity) > 1);
    if (hat) { hat.quantity = 1; did.push("hat sections 2 → 1"); }
    if (!items.some((i) => i.skuId === SKU.pvc)) {
      items = addUnder(items, headerOf(items), { skuId: SKU.pvc, skuType: "Material", skuName: "Pressure Pipe PVC Class 12 20mm x 6mtr", quantity: 1, unitPrice: 0 });
      did.push("drain pipe added");
    }
  }

  if (isEvap(t) && !items.some((i) => i.skuId === SKU.pvc)) {
    // Sent at its price: under a dynamically priced install ServiceTitan folds
    // it into that line (and shows it at $0); under a fixed one it's charged as
    // its own line inside the group. Either way the estimate charges it.
    items = addUnder(items, headerOf(items, SKU.evapInstall), { skuId: SKU.pvc, skuType: "Material", skuName: "Pressure Pipe PVC Class 12 20mm x 6mtr", quantity: 1, unitPrice: price(SKU.pvc, 20) });
    did.push("PVC drain pipe added");
  }

  if (t.id === T.kaden5Roof) {
    const drop = items.filter((i) => i.isAddOn && (i.skuId === SKU.pump || i.skuId === SKU.blygold));
    if (drop.length) { items = items.filter((i) => !drop.includes(i)); did.push(`add-ons removed: ${drop.map((d) => (d.skuName ?? "").trim()).join(", ")}`); }
  }

  if (DUCTED.includes(t.id)) {
    const lab = items.find((i) => plain(i) && i.skuId === SKU.ductedLabour && i.itemGroupParentId != null);
    if (lab) {
      // Out of the installation's group, to sit after it as its own line. As a
      // new line: ServiceTitan kept the existing one in the group when only its
      // group fields changed (22 Nov, all four ducted templates, twice each).
      const rest = items.filter((i) => i !== lab);
      const head = rest.find((i) => i.id === lab.itemGroupParentId) ?? null;
      let at = head ? rest.indexOf(head) : rest.length - 1;
      rest.forEach((x, k) => { if (head && x.itemGroupParentId === head.id) at = Math.max(at, k); });
      items = [...rest.slice(0, at + 1), { ...lab, id: null, itemGroupParentId: null, itemGroupName: (lab.skuName ?? "Ducted Split - Labour (Two Days)").trim() }, ...rest.slice(at + 1)];
      did.push("two-day labour moved to its own line");
    }
  }

  return did.length ? { items, did } : null;
}

/**
 * The ducted installation at a fixed price (once Dynamic Pricing is off on the
 * service in ServiceTitan): the header at the service's price and the
 * materials in its group at their pricebook prices, since a fixed-price header
 * no longer carries them. Add-ons and their parts are left alone.
 */
export function planDuctedFixed(t: Tpl, servicePrice: number, prices: Prices): Edit | null {
  const items = t.items.map((i) => ({ ...i }));
  const head = items.find((i) => plain(i) && i.skuId === SKU.ductedInstall);
  if (!head) return null;
  const did: string[] = [];
  if (Math.abs(Number(head.unitPrice) - servicePrice) >= 0.005) { did.push(`installation $${Number(head.unitPrice)} → $${servicePrice}`); head.unitPrice = servicePrice; }
  let n = 0;
  for (const i of items) {
    if (i.skuType !== "Material" || !plain(i) || i.itemGroupParentId !== head.id) continue;
    const p = prices.get(i.skuId);
    if (p != null && p > 0 && Math.abs(Number(i.unitPrice) - p) >= 0.005) { i.unitPrice = p; n++; }
  }
  if (n) did.push(`${n} materials at their pricebook price`);
  return did.length ? { items, did } : null;
}

/* ------------------------------------------------------------- 24 Nov */

/**
 * Jake's answers on 24 Nov to the second review:
 *   - "the 5kW yes it needs a 1/4 1/2": the Mitsubishi 5kW back-to-back had
 *     the 1/4 x 3/8 coil, where its roof and wall versions and the Kaden 5kW
 *     back-to-back carry 1/4 x 1/2.
 *   - "these need a wall bracket and all roof to wall bracket need 2 lengths of
 *     hat section": the Mitsubishi 7.1kW roof-to-wall had a roof bracket, and
 *     the Mitsubishi 2.5, 3.5 and 7.1kW one length where the rest carry two.
 *     A 7.1kW takes the 550mm wall bracket, as the Kaden 7.1kW and Mitsubishi
 *     5 and 6kW roof-to-wall do; 2.5 and 3.5kW the 420mm.
 */
export const SKU24 = { wall420: 148186787, wall550: 209621677, roof520: 209621685 } as const;
export const T24 = { mitsu5Btb: 301070912 } as const;
const isRoofToWall = (t: Tpl) => /Split System - Roof To Wall Bracket$/i.test(t.name.trim());
const kw = (t: Tpl) => Number(/(\d+(?:\.\d+)?)\s*kW/i.exec(t.name)?.[1] ?? 0);

export function planFixes24(t: Tpl): Edit | null {
  let items = t.items.map((i) => ({ ...i }));
  const did: string[] = [];
  if (t.id === T24.mitsu5Btb) {
    const coil = items.find((i) => plain(i) && i.skuId === SKU.coil38);
    if (coil) {
      items[items.indexOf(coil)] = { id: null, skuId: SKU.coil12, skuType: "Material", skuName: "Ardent Copper Pair Coil 1/4\" x 1/2\" R410A 20mtr", quantity: coil.quantity, unitPrice: Number(coil.unitPrice) || 0, isAddOn: false, itemGroupParentId: coil.itemGroupParentId ?? null };
      did.push("coil 1/4 x 3/8 → 1/4 x 1/2");
    }
  }
  if (isRoofToWall(t)) {
    const roof = items.find((i) => plain(i) && i.skuId === SKU24.roof520);
    if (roof) {
      const big = kw(t) >= 5;
      items[items.indexOf(roof)] = { id: null, skuId: big ? SKU24.wall550 : SKU24.wall420, skuType: "Material", skuName: `Rodigas Air Conditioner Wall Bracket 140Kg ${big ? 550 : 420}mm`, quantity: 1, unitPrice: Number(roof.unitPrice) || 0, isAddOn: false, itemGroupParentId: roof.itemGroupParentId ?? null };
      did.push(`roof bracket → ${big ? 550 : 420}mm wall bracket`);
    }
    const hat = items.find((i) => plain(i) && i.skuId === SKU.hat);
    if (hat && Number(hat.quantity) < 2) { did.push(`hat sections ${hat.quantity} → 2`); hat.quantity = 2; }
    if (!hat) {
      items = addUnder(items, headerOf(items), { skuId: SKU.hat, skuType: "Material", skuName: "Colorbond Hat Section - 2.4m", quantity: 2, unitPrice: 0 });
      did.push("2 hat sections added");
    }
  }
  return did.length ? { items, did } : null;
}

/**
 * "Can [check] against the Brivis price list" (24 Nov): the two "Advanced Dump"
 * Charcoal coolers are the price list's standard F46DSCHAR and F86DSCHAR at its
 * cost, and every Advance includes Auto Refresh (the dump valve), so there's no
 * separate dump model. Named as their Beige and Terra Red pairs are.
 */
export const RENAME_24 = [
  { id: 301179968, from: "Brivis Advanced Dump F46DS Evaporative Cooler (Charcoal)", to: "Brivis Advance F46DS Evap Cooler (Charcoal)" },
  { id: 301513673, from: "Brivis Advanced Dump F86DS Evaporative Cooler Char", to: "Brivis Advance F86DS Evap Cooler (Charcoal)" },
];
