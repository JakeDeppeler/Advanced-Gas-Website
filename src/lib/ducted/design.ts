/**
 * A ducted quote from a Trust Trade design: the designer's materials list
 * (takeoff.ts) priced from the pricebook, on the same labour rules and in the
 * same groups as the builder by hand (plan.ts). Pure, so it runs in the
 * browser as the file drops and again on the server before anything is
 * written to ServiceTitan, from a freshly read pricebook.
 *
 * What the design supplies, the design prices: duct by size in 6 m lengths,
 * every take-off at its sizes, the transition, a downjet per round outlet, the
 * return air, collars, a damper and cable per zone, the controller and its
 * temperature controls. What the unit's own ducted template supplies (mounting,
 * drainage, fixing, the pair coil, the bracket) still comes from there, less
 * anything the design now covers, so nothing is counted twice.
 */

import { pickFitting } from "./fittings";
import { addControls, addInstall, addItcs, controlsText, DUCT_SIZES, ductedHours, lineBook, quoteTotal, type DuctSize, type DuctedCatalogue, type DuctedQuote, type Unit } from "./plan";
import { outletCount, zoneCount, type DesignTakeoff } from "./takeoff";

export type DesignOptions = {
  unitSkuId: number | null;
  doubleStorey: boolean;
  extraHours: number;
  extraReason: string;
  /** Temperature controls; null takes the design's own count. */
  itcs: number | null;
  notes: string;
};

/** Parts of a unit's ducted template the design brings with it, so the kit leaves them out. */
const FROM_DESIGN = /\b(d?bto|mxy)\b|reducer|collar|transition|plenum|return air|eggcrate|r\/a\b|insulated duct|downjet|zoneboss|damper|zonemate|sensor|\bitc\b|veec|rebate|discount/i;

/**
 * The pricebook unit for the designer's: by Mitsubishi's capacity code first
 * (PEA-M125HAA is the PEAZM125… kit), then the nearest kW of the same brand.
 */
export function matchUnit(t: Pick<DesignTakeoff, "indoor" | "outdoor" | "kw">, units: Unit[]): Unit | null {
  const code = /M\s*-?\s*(\d{3})/i.exec(t.indoor ?? "")?.[1] ?? /ZM(\d{3})/i.exec(t.outdoor ?? "")?.[1];
  if (code) {
    const hit = units.find((u) => new RegExp(`(?:ZM|M)${code}`, "i").test(u.model ?? ""));
    if (hit) return hit;
  }
  if (t.kw == null) return null;
  const brand = /kaden/i.test(`${t.indoor} ${t.outdoor}`) ? /kaden/i : /mitsubishi/i;
  const kwOf = (u: Unit) => Number(/(\d+(?:\.\d+)?)\s*kw/i.exec(u.name)?.[1] ?? NaN);
  const same = units.filter((u) => brand.test(u.name) && Number.isFinite(kwOf(u)));
  return same.sort((a, b) => Math.abs(kwOf(a) - t.kw!) - Math.abs(kwOf(b) - t.kw!))[0] ?? null;
}

const asSize = (n: number): DuctSize | null => ((DUCT_SIZES as readonly number[]).includes(n) ? (n as DuctSize) : null);

export type DesignQuote = DuctedQuote & { outlets: number; zones: number; unit: Unit | null; suggested: Unit | null };

export function buildFromDesign(t: DesignTakeoff, o: DesignOptions, cat: DuctedCatalogue): DesignQuote {
  const book = lineBook();
  const { add } = book;
  const outlets = outletCount(t);
  const zones = zoneCount(t);
  const h = ductedHours(outlets, zones, o.doubleStorey, o.extraHours);

  const suggested = matchUnit(t, cat.units);
  const unit = cat.units.find((u) => u.skuId === o.unitSkuId) ?? suggested;
  if (!unit) book.missing.push(`Choose the unit: nothing in the pricebook matches the design's ${t.indoor ?? "indoor unit"}${t.kw ? ` (${t.kw} kW)` : ""}`);
  else book.lines.push({ group: "unit", sku: unit, name: unit.name, quantity: 1, unitPrice: unit.price, ...(t.indoor ? { note: `design: ${t.indoor}` } : {}) });
  const itcs = Math.max(0, Math.round(o.itcs ?? (t.itc || zones)));
  addControls(book, cat, zones);

  const labour = addInstall(book, cat, h);
  add("install", cat.transition, "Ducted transition / plenum", t.transitions, "The ducted transition isn't in the pricebook");

  for (const [k, n] of Object.entries(t.duct)) {
    const size = asSize(Number(k));
    add("install", size ? cat.duct[size] ?? null : null, `${k} mm insulated duct`, n, `${k} mm duct isn't in the pricebook`);
  }

  // The take-offs, each matched to the pricebook at its own sizes.
  for (const f of t.takeoffs) {
    const pick = pickFitting(f, cat.fittings, cat.reducers);
    const legs = `Ø${f.in} → ${f.outs.map((x) => `Ø${x}`).join(" · ")}`;
    if (!pick) { add("install", null, `${f.ways}-way take-off ${legs}`, f.qty, `No ${f.ways}-way take-off for ${legs} in the pricebook`); continue; }
    add("install", pick.fitting, pick.fitting.name, f.qty, undefined, pick.exact ? undefined : `for ${legs}`);
    for (const r of pick.reducers) add("install", r, r.name, f.qty, undefined, `on the ${legs} take-off`);
  }

  for (const [k, n] of Object.entries(t.diffusers)) {
    const size = asSize(Number(k));
    add("install", size ? cat.downjet[size] ?? null : null, `${k} mm outlet`, n, `A ${k} mm downjet isn't in the pricebook`);
  }
  if (t.otherOutlets > 0) book.missing.push(`${t.otherOutlets} linear or bar ${t.otherOutlets === 1 ? "grille isn't" : "grilles aren't"} priced: add by hand`);

  // Return air: the filter grille the design sized, or the nearest the pricebook has, said out loud.
  for (const g of t.returnGrilles) {
    const near = [...cat.raGrilles].sort((a, b) => Math.abs(a.w - g.w) + Math.abs(a.h - g.h) - (Math.abs(b.w - g.w) + Math.abs(b.h - g.h)))[0] ?? null;
    const exact = near && near.w === g.w && near.h === g.h;
    add("install", near, `Return air filter grille ${g.w} × ${g.h}`, g.qty, "No return air filter grille in the pricebook", near && !exact ? `the design has ${g.w} × ${g.h}` : undefined);
    if (near && !exact) book.missing.push(`Return air: the design sized a ${g.w} × ${g.h} grille and the pricebook's nearest is ${near.w} × ${near.h}. Check it carries the air`);
  }
  if (t.returnBoxes > 0) {
    const g = t.returnGrilles[0];
    const box = g ? cat.raBoxes.find((b) => (b.w === g.w && b.h === g.h) || (b.w === g.h && b.h === g.w)) ?? null : null;
    if (box) add("install", box, box.name, t.returnBoxes);
    else book.missing.push(`Return air box${g ? ` for ${g.w} × ${g.h}` : ""} isn't in the pricebook: add by hand if the grille needs one`);
  }
  for (const [k, n] of Object.entries(t.collars)) {
    const size = asSize(Number(k));
    add("install", size ? cat.collar[size] ?? null : null, `${k} mm starting collar`, n, `A ${k} mm starting collar isn't in the pricebook`);
  }
  for (const [k, n] of Object.entries(t.joiners)) book.missing.push(`${n} × ${k} mm flex duct joiner isn't priced: add by hand`);

  for (const [k, n] of Object.entries(t.dampers)) {
    const size = asSize(Number(k));
    add("install", size ? cat.damper[size] ?? null : null, `${k} mm zone damper`, n, `A ${k} mm zone damper isn't in the pricebook`);
  }
  add("install", cat.zoneCable, "Zone damper cable", t.cables || Object.values(t.dampers).reduce((a, n) => a + n, 0));
  addItcs(book, cat, itcs);

  for (const k of unit?.kit ?? []) if (!FROM_DESIGN.test(k.sku.name)) add("install", k.sku, k.sku.name, k.quantity);
  add("extra", cat.certificate, "BPC Compliance Certificate", 1);

  for (const r of t.unread) if (!/^(Linear|Floor|Side-blow|Supply grille)/i.test(r.item)) book.missing.push(`Not on the quote: ${r.qty} × ${r.item}${r.detail ? ` (${r.detail})` : ""}`);
  for (const c of t.checks ?? []) book.missing.push(c);

  return {
    hours: h, labour, lines: book.lines, total: quoteTotal(book.lines), missing: book.missing, outlets, zones, unit, suggested,
    summary: designSummary(t, o, unit, outlets, zones, itcs),
  };
}

/** The quote's summary: the install, in the templates' voice (Quote wording v2: the equipment's own text sells it). */
export function designSummary(t: DesignTakeoff, o: DesignOptions, unit: Unit | null, outlets: number, zones: number, itcs: number): string {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return [
    `Supply and installation of a new ${unit ? unit.name.trim() : "ducted reverse-cycle system"}, designed room by room: ${plural(outlets, "outlet")} across ${plural(zones, "zone")}, with every duct sized for the air its room needs.`,
    `Covers the indoor fan coil and outdoor unit, new insulated ductwork through the roof space to each outlet, the return air and filter, and a motorised damper on each zone run from the Mitsubishi Electric zone controller${controlsText(itcs, zones)}, so you only heat or cool the rooms you're using. Includes the refrigeration pipework, condensate drainage, and the electrical connection by a licensed electrician.`,
    "Includes commissioning, airflow balancing to every outlet, full operational testing and a walk-through of how to run the system. A Certificate of Electrical Safety and a compliance certificate are issued on completion.",
    o.doubleStorey ? "Allows for the extra work of a double-storey home." : "",
    o.extraHours > 0 && o.extraReason.trim() ? `Allows for ${o.extraReason.trim().replace(/\.$/, "")}.` : "",
    o.notes.trim(),
  ].filter(Boolean).join("\n\n");
}
