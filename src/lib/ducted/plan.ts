/**
 * The ducted quote, built from the job's layout rather than a template: the
 * sums only, no I/O, so the builder can run them as you type and
 * `npm run check:ducted` can hold them.
 *
 * Jake, 5 Nov 2026: every ducted install is at least two days. A standard
 * house is 8 outlets and 4 zones, and that's two days; more outlets or zones
 * add time, and so does a harder job. Since 25 Nov the two days are $5,000 on
 * the "Ducted Split - Labour (Two Days)" line under a $0 installation line,
 * and time past them is Our hourly rate (addInstall).
 */

import type { Fitting, Reducer } from "./fittings";
import type { Coil, StandardItem } from "./standard";

export const DUCTED = {
  /** Unit, plenum, return air, controller, commissioning. */
  baseHours: 8,
  perOutlet: 0.75,
  perZone: 0.5,
  /** Two days for two people, whatever the layout. */
  minHours: 16,
  doubleStorey: 4,
  /** Metres of duct in a 6 m length. */
  lengthM: 6,
  /**
   * The Mitsubishi Electric zone controller (PAC-ZC10, 10 zones). Jake, 24 Nov:
   * "we will always go with a mitsubishi electric 10 zoning now and the
   * controller is a equment so it stand out and its own item group".
   */
  maxZones: 10,
  /**
   * Two days' labour for the crew: the "Ducted Split - Labour (Two Days)" line,
   * under a $0 installation line (Jake, 25 Nov, as on job 20867's quote and the
   * ducted templates; servicePricing.ts). Time past the two days is added at
   * Our hourly rate.
   */
  twoDayPrice: 5000,
  /**
   * Temperature controls (ITCs) that come with the Mitsubishi controller. Jake,
   * 25 Nov: "each zone need a itc and the $90 per itc … need to allow that there
   * is 4 sensor that come with the bunble": a zone past the fourth adds one at
   * its pricebook price.
   */
  itcsWithController: 4,
} as const;

export const DUCT_SIZES = [150, 200, 250, 300, 350, 400, 450] as const;
export type DuctSize = (typeof DUCT_SIZES)[number];

/** What the builder needs from the pricebook. Plain data, so it can go to the browser. */
export type Sku = { skuId: number; skuType: "Service" | "Material" | "Equipment"; name: string; price: number };
export type Unit = Sku & { model: string | null; kit: { sku: Sku; quantity: number }[] };
export type DuctedCatalogue = {
  units: Unit[];
  duct: Partial<Record<DuctSize, Sku>>;
  downjet: Partial<Record<DuctSize, Sku>>;
  damper: Partial<Record<DuctSize, Sku>>;
  zoneCable: Sku | null;
  /** The Mitsubishi Electric 10-zone controller, an equipment line in a group of its own. */
  controller: Sku | null;
  /** Mitsubishi Electric individual temperature control (PAR-ZR01S-A): with the installation's materials, not the controller. */
  itc: Sku | null;
  /** The installation: the group's head, at $0 since 25 Nov. */
  install: Sku | null;
  /** "Ducted Split - Labour (Two Days)": the labour, under the installation. */
  labour: Sku | null;
  electrical: Sku | null;
  certificate: Sku | null;
  rate: number | null;
  /** What a Trust Trade design is priced from as well: take-offs, reducers, the transition, return air, collars. */
  fittings: Fitting[];
  reducers: Reducer[];
  transition: Sku | null;
  raGrilles: (Sku & { w: number; h: number })[];
  raBoxes: (Sku & { w: number; h: number })[];
  collar: Partial<Record<DuctSize, Sku>>;
  /** Flex-to-flex joiners by size ("Bradflo Duct Joiner 250mm Unassembled"), for a run longer than a 6 m length. */
  joiner: Partial<Record<DuctSize, Sku>>;
  /** Every active material and equipment item, to pick from for a part nothing else matches (Duct design, picks.ts). */
  pickable?: Sku[];
  /** The standard install materials on a Duct design quote (standard.ts): the office's saved list, else the default. */
  standard?: StandardItem[];
  /** True once the office has saved its own standard list. */
  standardSaved?: boolean;
  /** The pricebook's pair coils by pipe size and length, for the standard list's coil. */
  coils?: Coil[];
};

export type Outlet = { room: string; size: DuctSize; metres: number; zone: number };
export type Zone = { name: string; damper: DuctSize };
export type DuctedInput = {
  unitSkuId: number | null;
  outlets: Outlet[];
  zones: Zone[];
  doubleStorey: boolean;
  extraHours: number;
  extraReason: string;
  /** Temperature controls on top of the 4 with the controller; null is one for each zone past the fourth. */
  itcs: number | null;
  notes: string;
};

/**
 * Each group is one item group on the quote in ServiceTitan: its first line is
 * the group's root, the line the customer sees, and the rest sit under it.
 */
export type Group = "unit" | "controls" | "install" | "extra";
export const GROUPS: Group[] = ["unit", "controls", "install", "extra"];
export type Line = { group: Group; sku: Sku | null; name: string; quantity: number; unitPrice: number; missing?: string; note?: string };
export type DuctedQuote = {
  hours: { base: number; outlets: number; zones: number; layout: number; floor: boolean; doubleStorey: number; extra: number; total: number };
  labour: number;
  lines: Line[];
  total: number;
  missing: string[];
  summary: string;
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Hours for the layout: base + outlets + zones, never under two days, then the extras on top. */
export function ductedHours(outlets: number, zones: number, doubleStorey: boolean, extra: number) {
  const layout = DUCTED.baseHours + outlets * DUCTED.perOutlet + zones * DUCTED.perZone;
  const floor = layout < DUCTED.minHours;
  const ds = doubleStorey ? DUCTED.doubleStorey : 0;
  const ex = Math.max(0, Number(extra) || 0);
  return {
    base: DUCTED.baseHours, outlets: outlets * DUCTED.perOutlet, zones: zones * DUCTED.perZone,
    layout, floor, doubleStorey: ds, extra: ex, total: Math.max(layout, DUCTED.minHours) + ds + ex,
  };
}

/**
 * The quote's lines, built up in order. A SKU added twice to the same group
 * is one line with the quantities summed, so the same reducer under three
 * take-offs reads as three of it, not three lines.
 */
export function lineBook() {
  const lines: Line[] = [];
  const missing: string[] = [];
  const add = (group: Group, sku: Sku | null, name: string, quantity: number, why?: string, note?: string) => {
    if (!(quantity > 0)) return;
    if (!sku) { missing.push(why ?? name); lines.push({ group, sku: null, name, quantity, unitPrice: 0, missing: why ?? name }); return; }
    const have = lines.find((l) => l.group === group && l.sku?.skuId === sku.skuId);
    if (have) { have.quantity += quantity; if (note) have.note = have.note ? `${have.note}; ${note}` : note; return; }
    lines.push({ group, sku, name: sku.name, quantity, unitPrice: sku.price, ...(note ? { note } : {}) });
  };
  return { lines, missing, add };
}
export type LineBook = ReturnType<typeof lineBook>;

/** The zone controller, alone in its own group so it stands out on the quote. */
export function addControls(book: LineBook, cat: DuctedCatalogue, zones: number) {
  book.add("controls", cat.controller, "Mitsubishi Electric zone controller (10 zones)", 1, "The Mitsubishi Electric 10-zone controller isn't in the pricebook");
  if (zones > DUCTED.maxZones) book.missing.push(`The Mitsubishi Electric controller runs up to ${DUCTED.maxZones} zones and this has ${zones}`);
}

/**
 * The temperature controls go with the installation's materials, under its
 * head, not under the controller. Jake, 25 Nov: "the itc should be under the
 * materials". Added after the head is on, so the head stays the installation.
 */
/** The temperature controls a job needs beyond the 4 that come with the controller. */
export const extraItcs = (zones: number) => Math.max(0, Math.round(zones) - DUCTED.itcsWithController);

/** Temperature controls past the 4 with the controller, at their pricebook price ($90), with the materials. */
export function addItcs(book: LineBook, cat: DuctedCatalogue, count: number) {
  book.add("install", cat.itc, "Mitsubishi Electric temperature control (ITC)", Math.max(0, Math.round(count)), "The Mitsubishi Electric temperature control (ITC) isn't in the pricebook",
    `past the ${DUCTED.itcsWithController} that come with the controller`);
}

/** Labour on the installation service line, and the electrician: the head of the installation group. */
/**
 * The installation group's head and its labour, as Jake laid out job 20867 on
 * 25 Nov: the installation line at $0, so it no longer hides what the
 * materials come to, and the two-day labour under it at $5,000, with any time
 * past two days at Our hourly rate. Then the electrician.
 */
export function addInstall(book: LineBook, cat: DuctedCatalogue, h: ReturnType<typeof ductedHours>) {
  const rate = cat.rate ?? 0;
  const over = Math.max(0, h.total - DUCTED.minHours);
  if (over > 0 && !cat.rate) book.missing.push("Our hourly rate isn't set on Our prices, so the time past two days is $0");
  const labour = cents(DUCTED.twoDayPrice + over * rate);
  if (cat.install) book.lines.push({ group: "install", sku: cat.install, name: cat.install.name, quantity: 1, unitPrice: 0, note: "$0: the labour and materials under it carry the price" });
  else book.add("install", null, "Ducted installation service", 1, "The ducted installation service isn't in the pricebook");
  if (cat.labour) book.lines.push({
    group: "install", sku: cat.labour, name: cat.labour.name, quantity: 1, unitPrice: labour,
    note: over > 0 ? `${h.total} h: two days $${DUCTED.twoDayPrice.toLocaleString("en-AU")} + ${over} h × $${rate}` : `${h.total} h: two days`,
  });
  else book.add("install", null, "Ducted Split - Labour (Two Days)", 1, "The ducted two-day labour isn't in the pricebook");
  book.add("install", cat.electrical, "Electrical connection", 1);
  return labour;
}

export const quoteTotal = (lines: Line[]) => cents(lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0));

export function buildDucted(input: DuctedInput, cat: DuctedCatalogue): DuctedQuote {
  const book = lineBook();
  const { add } = book;

  const outlets = input.outlets.filter((o) => o.metres >= 0);
  const zonesUsed = input.zones.filter((_, i) => outlets.some((o) => o.zone === i + 1));
  const h = ductedHours(outlets.length, zonesUsed.length, input.doubleStorey, input.extraHours);

  // The unit, then the zone controller as its own group.
  const unit = cat.units.find((u) => u.skuId === input.unitSkuId) ?? null;
  if (!unit) book.missing.push("Choose the unit");
  else book.lines.push({ group: "unit", sku: unit, name: unit.name, quantity: 1, unitPrice: unit.price });
  addControls(book, cat, zonesUsed.length);

  // The installation: labour, the electrician, and every material.
  const labour = addInstall(book, cat, h);

  const metres = new Map<DuctSize, number>();
  const jets = new Map<DuctSize, number>();
  for (const o of outlets) {
    metres.set(o.size, (metres.get(o.size) ?? 0) + o.metres);
    jets.set(o.size, (jets.get(o.size) ?? 0) + 1);
  }
  for (const size of DUCT_SIZES) {
    const m = metres.get(size) ?? 0;
    if (m > 0) add("install", cat.duct[size] ?? null, `${size} mm insulated duct`, Math.ceil(m / DUCTED.lengthM), `${size} mm duct isn't in the pricebook`);
    const j = jets.get(size) ?? 0;
    if (j > 0) add("install", cat.downjet[size] ?? null, `${size} mm downjet`, j, `A ${size} mm downjet isn't in the pricebook`);
  }
  const dampers = new Map<DuctSize, number>();
  for (const z of zonesUsed) dampers.set(z.damper, (dampers.get(z.damper) ?? 0) + 1);
  for (const size of DUCT_SIZES) {
    const n = dampers.get(size) ?? 0;
    if (n > 0) add("install", cat.damper[size] ?? null, `${size} mm zone damper`, n, `A ${size} mm zone damper isn't in the pricebook`);
  }
  add("install", cat.zoneCable, "Zone damper cable", zonesUsed.length);
  const itcs = Math.max(0, Math.round(input.itcs ?? extraItcs(zonesUsed.length)));
  addItcs(book, cat, itcs);
  for (const k of unit?.kit ?? []) add("install", k.sku, k.sku.name, k.quantity);

  add("extra", cat.certificate, "BPC Compliance Certificate", 1);

  return { hours: h, labour, lines: book.lines, total: quoteTotal(book.lines), missing: book.missing, summary: ductedSummary(input, unit, outlets, zonesUsed, itcs + DUCTED.itcsWithController) };
}

/** The quote's summary, written from the layout and the notes, in the templates' own voice. */
export function ductedSummary(input: DuctedInput, unit: Sku | null, outlets: Outlet[], zones: Zone[], itcs: number): string {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const zoneText = zones.map((z) => {
    const i = input.zones.indexOf(z) + 1;
    const rooms = outlets.filter((o) => o.zone === i).map((o) => o.room.trim() || "an outlet");
    return `${z.name.trim() || `Zone ${i}`} (${rooms.join(", ")})`;
  });
  const parts = [
    `Supply and installation of a new ${unit ? unit.name : "ducted reverse-cycle system"}, with ${plural(outlets.length, "outlet")} across ${plural(zones.length, "zone")}${zoneText.length ? `: ${zoneText.join("; ")}` : ""}.`,
    `Covers the indoor fan coil and outdoor unit, insulated ductwork run through the roof space to a ceiling outlet in each room, the return air, and a motorised damper on each zone run from the Mitsubishi Electric zone controller${controlsText(itcs, zones.length)}, so each zone can be run on its own.`,
    "Includes the electrical connection by a licensed electrician with a Certificate of Electrical Safety, commissioning, airflow balancing to every outlet, full operational testing and a compliance certificate on completion.",
    input.doubleStorey ? "Allows for the extra work of a double-storey home." : "",
    input.extraHours > 0 && input.extraReason.trim() ? `Allows for ${input.extraReason.trim().replace(/\.$/, "")}.` : "",
    input.notes.trim(),
  ];
  return parts.filter(Boolean).join(" ");
}

/** ", with a temperature control in each zone", or in some of them, as the quote has it. */
export function controlsText(itcs: number, zones: number): string {
  if (itcs <= 0) return "";
  return itcs >= zones ? ", with a temperature control in each zone" : `, with a temperature control in ${itcs} of the ${zones} zones`;
}

/** A standard house to start from: 8 outlets over 4 zones, the layout two days is priced on. */
export function standardLayout(): Pick<DuctedInput, "outlets" | "zones"> {
  const zones: Zone[] = [
    { name: "Living", damper: 300 }, { name: "Bedrooms", damper: 300 }, { name: "Master", damper: 250 }, { name: "Study", damper: 200 },
  ];
  const outlets: Outlet[] = [
    { room: "Living", size: 250, metres: 8, zone: 1 }, { room: "Kitchen / meals", size: 250, metres: 8, zone: 1 },
    { room: "Bedroom 2", size: 200, metres: 8, zone: 2 }, { room: "Bedroom 3", size: 200, metres: 8, zone: 2 }, { room: "Bedroom 4", size: 200, metres: 10, zone: 2 },
    { room: "Master", size: 250, metres: 8, zone: 3 }, { room: "Ensuite / WIR", size: 150, metres: 6, zone: 3 },
    { room: "Study", size: 200, metres: 6, zone: 4 },
  ];
  return { outlets, zones };
}
