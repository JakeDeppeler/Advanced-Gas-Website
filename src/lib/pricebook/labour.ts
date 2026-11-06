/**
 * Labour pricing for the ServiceTitan pricebook and the aircon estimate
 * templates: the sums only, no I/O, so `npm run check:labour` can hold them.
 *
 * Jake, 5 Nov 2026: installation is priced for two people (a tech and an
 * apprentice), fixing a problem for one. An install done in part of a day (a
 * split, a heat pump, a cooktop) is at the part-day rate, $350, because the
 * travel to the next job comes out of it; one that takes the whole day or
 * more (multi-head, ducted, Dominator) is at the crew rate, $310. A diagnostic is the standard
 * call-out, $200: it's the customer's first contact with us and how the job is
 * won, so it isn't priced up by the hour. Servicing is left at its own prices
 * for the same reason: it's where the problems are found.
 *
 * The rates are the portal's (Pricing & costs › Rates & pricing,
 * `portal_settings.pricing`), so a rate changed there re-prices the pricebook
 * on the next run instead of being typed into ServiceTitan a second time.
 *
 * Services are picked by their ServiceTitan code, listed below, not by
 * guessing from the name: "Continuous Flow Hot Water – Repair" sits in the
 * Split System – Repair category, and a name match would have priced a
 * plumbing job as aircon. A service not listed here is never touched.
 */

/** `callout` is a flat fee, not an hourly rate: the price is the fee whatever the hours. */
import { ADDON_COPY } from "@/lib/pricebook/wording";

export type Crew = "callout" | "solo" | "partDay" | "pair" | "crew3";
export type Rates = { callout: number | null; solo: number | null; partDay: number | null; pair: number | null; crew3: number | null };

/** What each one comes from in `portal_settings.pricing`. */
export function ratesFromPricing(p: { callout: number | null; solo: number | null; partDay: number | null; hourly: number | null; install: number | null }): Rates {
  return { callout: p.callout, solo: p.solo, partDay: p.partDay, pair: p.hourly, crew3: p.install };
}

const CALLOUT = [
  "AC-SPLIT-DIAG", "AC-MULTI-DIAG", "AC-DUCTED-DIAG", "AC-RAC-DIAG", "AC-ADDON-DIAG",
  "EVAP-DIAG", "HTR-DUCTED-DIAG", "HTR-SPACE-DIAG",
];
const SOLO = [
  // Repairs, priced by the hour.
  "AC-SPLIT-REPAIR", "AC-MULTI-REPAIR", "AC-DUCTED-REPAIR", "EVAP-REPAIR", "HTR-DUCTED-REPAIR",
  // The hourly labour line itself.
  "LAB-HR-1P",
];
const PART_DAY = [
  // Installs done in part of a day: travel to the next job comes out of them.
  "AC-SPLIT-BTB", "AC-SPLIT-RTR", "AC-SPLIT-RTW",
  "AC-RAC-INSTALL", "AC-CONDENSER-REPLACE", "EVAP-INSTALL", "GAS-DUCT-EXT",
  "HW-HP-HARD", "HW-HP-PLUG", "HW-HP-SPLIT", "HW-CF-INS", "HW-GAS-STORAGE-INS", "HW-STORAGE-TO-CF",
  "GAS-COOKTOP-INSTALL",
  // Taking the old unit out, on one of those installs.
  "DECOMMISSION-DISPOSAL",
];
const PAIR = [
  // A day or more on one job.
  "AC-SPLIT-MULTI-2", "AC-SPLIT-MULTI-3", "AC-SPLIT-MULTI-4", "AC-SPLIT-MULTI-5", "AC-SPLIT-MULTI-6",
  "AC-DUCTED-2DAYS", "AC-DUCTED-LAB", "AC-DUCTED-LAB-1DAY", "AC-DOM-LAB",
  "LAB-HR-2P",
];
const CREW3 = ["LAB-HR-3P"];

/** ServiceTitan codes carry stray spaces ("AC-DOM-LAB ", " GAS-DUCT-EXT"). */
export const normCode = (c: unknown) => String(c ?? "").trim().toUpperCase();

const CREW_OF = new Map<string, Crew>([
  ...CALLOUT.map((c) => [c, "callout"] as const),
  ...SOLO.map((c) => [c, "solo"] as const),
  ...PART_DAY.map((c) => [c, "partDay"] as const),
  ...PAIR.map((c) => [c, "pair"] as const),
  ...CREW3.map((c) => [c, "crew3"] as const),
]);

export function crewFor(code: unknown): Crew | null {
  return CREW_OF.get(normCode(code)) ?? null;
}

export const CREW_LABEL: Record<Crew, string> = { callout: "call-out fee", solo: "one person", partDay: "part-day install rate", pair: "tech & apprentice", crew3: "tech & 2 apprentices" };

/** Whole cents, so a 2.8-hour job at $310 is $868.00 and not 867.9999. */
const cents = (n: number) => Math.round(n * 100) / 100;

export type ServiceRow = { id: number; code: string; name: string; hours: number | null; price: number | null; active?: boolean | null };
export type ServiceChange = { id: number; code: string; name: string; crew: Crew; hours: number; rate: number; before: number; after: number };
export type ServiceSkip = { id: number; code: string; name: string; reason: string };

/** Each listed service at its own hours × its crew's rate, or the call-out fee. */
export function planServices(services: ServiceRow[], rates: Rates): { changes: ServiceChange[]; unchanged: number; skipped: ServiceSkip[] } {
  const changes: ServiceChange[] = [];
  const skipped: ServiceSkip[] = [];
  let unchanged = 0;
  for (const s of services) {
    if (s.active === false) continue;
    const crew = crewFor(s.code);
    if (!crew) continue;
    const rate = rates[crew];
    const hours = Number(s.hours) || 0;
    if (!rate) { skipped.push({ id: s.id, code: normCode(s.code), name: s.name, reason: `no ${CREW_LABEL[crew]} set in the portal` }); continue; }
    if (crew !== "callout" && hours <= 0) { skipped.push({ id: s.id, code: normCode(s.code), name: s.name, reason: "no hours on the service" }); continue; }
    const after = crew === "callout" ? cents(rate) : cents(hours * rate);
    const before = Number(s.price) || 0;
    if (Math.abs(after - before) < 0.005) { unchanged++; continue; }
    changes.push({ id: s.id, code: normCode(s.code), name: s.name.trim(), crew, hours, rate, before, after });
  }
  return { changes, unchanged, skipped };
}

// --- Refrigerant -------------------------------------------------------------------
//
// Jake, 5 Nov 2026: R410A costs $106 a kg and R32 $109, ex GST. Both were
// priced at $0, so every re-gas gave the gas away. The costs and the markup
// live in `portal_settings.refrigerant` ({ markupPct, perKg: { code: cost } }),
// and the sell price is cost + markup to the dollar. 25% is the median markup
// across our priced materials, not a figure picked for refrigerant.

export type RefrigerantSettings = { markupPct: number; perKg: Record<string, number> };
export type MaterialRow = { id: number; code: string; name: string; price: number | null; cost: number | null; active?: boolean | null };
export type MaterialChange = { id: number; code: string; name: string; costBefore: number; cost: number; before: number; after: number };

export function planRefrigerant(materials: MaterialRow[], r: RefrigerantSettings | null): MaterialChange[] {
  if (!r || !r.perKg) return [];
  const want = new Map(Object.entries(r.perKg).map(([code, cost]) => [normCode(code), Number(cost)]));
  const out: MaterialChange[] = [];
  for (const m of materials) {
    if (m.active === false) continue;
    const cost = want.get(normCode(m.code));
    if (cost == null || !(cost > 0)) continue;
    const after = Math.round(cost * (1 + (Number(r.markupPct) || 0) / 100));
    const before = Number(m.price) || 0;
    const costBefore = Number(m.cost) || 0;
    if (Math.abs(after - before) < 0.005 && Math.abs(cost - costBefore) < 0.005) continue;
    out.push({ id: m.id, code: normCode(m.code), name: m.name.trim(), costBefore, cost, before, after });
  }
  return out;
}

// --- Templates -------------------------------------------------------------------
//
// The aircon templates were laid out as: the unit, an install line priced to
// cover labour *and* materials, the electrician as a separate priced line, and
// every material loose underneath at $0. The heat pump templates already do it
// the other way, with the materials sitting under the install service.
//
// Rebuilt, each one has a single installation header (a ServiceTitan item
// group) holding the labour, the electrical where the job has it, and every
// material at its pricebook price. The header is the install service the
// template already used, so its customer-facing description is kept.
//
// Split systems: the labour is the install service's hours × the part-day
// rate, on the header. Each also offers, as add-ons the office ticks on the
// day: a condensate pump, Blygold on the condenser and a second coil of the
// template's own size for runs over 20 m. Taking the old unit out isn't one:
// a new install includes it (Jake, 6 Nov).
//
// Multi-heads (Jake, 5 Nov): one condenser can go out with two heads or five,
// so the labour can't be fixed on the template. The header holds the
// electrical and materials; "Multi Head Labour (2 head)" to "(6 head)" go on
// as add-ons at hours × the two-person rate, and the office ticks the one the
// job needs, as they do the rebates. On the Rinnai 14kW all three head counts
// were being charged at once.
//
// Hot water and cooktops are laid out the same way, labour on the header at
// the part-day rate. Their install lines were $0 on the Continuous Flow and
// Thermann 135L templates; this is what fixes that.
//
// Ducted and the Dominator aren't rebuilt: what they cost turns on the outlets,
// duct runs and zones of the house, so a template's figure is a guess either
// way. Those get priced from the job's design instead.

/** Install services that head a template, and how their labour is set. */
const HEADERS: Record<string, "split" | "day" | "multi" | "ducted"> = {
  "AC-SPLIT-BTB": "split", "AC-SPLIT-RTR": "split", "AC-SPLIT-RTW": "split",
  "HW-HP-HARD": "day", "HW-HP-PLUG": "day", "HW-HP-SPLIT": "day", "HW-CF-INS": "day",
  "HW-GAS-STORAGE-INS": "day", "HW-STORAGE-TO-CF": "day", "GAS-COOKTOP-INSTALL": "day",
  "AC-SPLIT-MULTI": "multi",
  "AC-DUCTED-2DAYS": "ducted", "AC-DOM-INSTALL": "ducted",
};
const MULTI_LABOUR = /^AC-SPLIT-MULTI-(\d)$/;
/** The electrician's line on each kind of job. Kept at its own price. */
const ELECTRICAL = new Set(["AC-SPLIT-ELEC", "AC-MULTI-ELEC", "AC-DUCTED-ELE", "DOM-ELEC", "ELEC-HP"]);
const BPC = "BPC COMPLIANCE CERTIFICATE";
/** Rebates and discounts are materials with a negative price; they stay where they are. */
const isRebate = (name: string, price: number) => price < 0 || /rebate|veec|\bstc\b|discount/i.test(name);

export type TemplateItem = {
  /** Null for an item being added. */
  id: number | null;
  skuId: number;
  skuType: "Service" | "Material" | "Equipment" | "PriceModifier";
  skuName?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost?: number | null;
  isAddOn: boolean;
  chargeable?: boolean | null;
  allowDiscounts?: boolean | null;
  memo?: string | null;
  parentItemId?: number | null;
  itemGroupParentId?: number | null;
  itemGroupName?: string | null;
};
export type Template = { id: number; name: string; active?: boolean; totalPrice?: number; items: TemplateItem[] };

/** What the rebuild needs from the pricebook, by sku id. */
export type Catalogue = {
  service: Map<number, { code: string; hours: number; name?: string }>;
  materialPrice: Map<number, number>;
  /** "Multi Head Labour (n head)" by n: its sku and hours. */
  multiHead: Map<number, { skuId: number; hours: number; name: string }>;
  /**
   * Optional extras offered on every split template, priced as the pricebook
   * prices them (old unit removal at its hours × the two-person rate).
   */
  splitAddOns: { skuId: number; skuType: TemplateItem["skuType"]; name: string; price: number }[];
};

/** Marks where the install line sat while the rest of the template is sorted. */
const HEADER_SLOT = { id: -1 } as TemplateItem;

export type TemplatePlan = {
  id: number;
  name: string;
  kind: "split" | "day" | "multi";
  header: { itemId: number; name: string; hours: number; rate: number; labour: number; heads?: number };
  electrical: number;
  materials: number;
  materialLines: number;
  /** Labour the office picks per job (multi-heads). */
  addOns: { name: string; hours: number; price: number; skuId: number }[];
  removed: string[];
  before: number;
  after: number;
  items: TemplateItem[];
};
export type TemplateSkip = { id: number; name: string; reason: string };

/** Top-level price: add-ons and anything under an add-on aren't in the total. */
export function templateTotal(items: TemplateItem[]): number {
  const addOns = new Set(items.filter((i) => i.isAddOn && i.id != null).map((i) => i.id));
  return cents(items.filter((i) => !i.isAddOn && !(i.parentItemId != null && addOns.has(i.parentItemId)))
    .reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
}

/** Indoor heads on a multi-head template: every indoor unit line, by quantity. */
export function headCount(items: TemplateItem[]): number {
  return items.filter((i) => i.skuType === "Equipment" && /indoor|head/i.test(i.skuName ?? "") && !/condenser/i.test(i.skuName ?? ""))
    .reduce((a, i) => a + (Number(i.quantity) || 0), 0);
}

/** The two-person rates a template is built from: `partDay` for a split, hot water or cooktop, `pair` for a multi-head. */
export type TemplateRates = { partDay: number; pair: number };

export function planTemplate(t: Template, cat: Catalogue, rates: TemplateRates): TemplatePlan | TemplateSkip {
  const pairRate = rates.pair;
  const code = (i: TemplateItem) => (i.skuType === "Service" ? cat.service.get(i.skuId)?.code ?? "" : "");
  const headerItem = t.items.find((i) => !i.isAddOn && HEADERS[code(i)]);
  if (!headerItem || headerItem.id == null) return { id: t.id, name: t.name, reason: "not an aircon install template" };
  const headerId = headerItem.id;
  const kind = HEADERS[code(headerItem)];
  if (kind === "ducted") return { id: t.id, name: t.name, reason: "ducted: priced from the job's design, not rebuilt" };
  if (t.items.some((i) => i.itemGroupParentId === headerId)) {
    // A template the office already grouped by hand isn't reshuffled under them.
    return { id: t.id, name: t.name, reason: "already has an installation group" };
  }

  let hours = 0;
  if (kind === "split" || kind === "day") {
    hours = cat.service.get(headerItem.skuId)?.hours ?? 0;
    if (hours <= 0) return { id: t.id, name: t.name, reason: `no hours on ${headerItem.skuName ?? "the install service"} in the pricebook` };
  }
  if (kind === "multi" && cat.multiHead.size === 0) return { id: t.id, name: t.name, reason: "no Multi Head Labour services in the pricebook" };
  const rate = kind === "multi" ? pairRate : rates.partDay;
  const labour = cents(hours * rate);

  const removed: string[] = [];
  const members: TemplateItem[] = [];
  const out: TemplateItem[] = [];
  /** Multi-head labour lines already on the template, by head count, to become add-ons. */
  const labourLines = new Map<number, TemplateItem>();
  let sawBpc = false;
  let electrical = 0;
  let materials = 0;
  let materialLines = 0;

  for (const i of t.items) {
    const c = code(i);
    const name = (i.skuName ?? "").trim();
    if (i === headerItem) { out.push(HEADER_SLOT); continue; }
    // Children of add-ons (the ducted zone kits) belong to their add-on.
    const underAddOn = i.parentItemId != null && t.items.some((p) => p.id === i.parentItemId && p.isAddOn);
    const m = MULTI_LABOUR.exec(c);
    if (kind === "multi" && m) {
      // Kept (by id) and made an add-on below; a second line for the same head count goes.
      if (labourLines.has(Number(m[1]))) removed.push(`second ${name} $${i.unitPrice}`);
      else labourLines.set(Number(m[1]), i);
      continue;
    }
    if (i.isAddOn || underAddOn) { out.push(i); continue; }
    if (i.skuType === "Service" && HEADERS[c]) { removed.push(`second ${name} $${i.unitPrice}`); continue; }
    if (i.skuType === "Service" && name.toUpperCase() === BPC) {
      if (sawBpc) { removed.push(`second ${name} $${i.unitPrice}`); continue; }
      sawBpc = true;
    }
    if (i.skuType === "Service" && ELECTRICAL.has(c)) {
      electrical = cents(electrical + i.quantity * i.unitPrice);
      members.push({ ...i, parentItemId: null, itemGroupName: null });
      continue;
    }
    if (i.skuType === "Material") {
      const listed = cat.materialPrice.get(i.skuId);
      if (!isRebate(name, listed ?? i.unitPrice)) {
        const unitPrice = listed ?? i.unitPrice;
        materials = cents(materials + i.quantity * unitPrice);
        materialLines++;
        members.push({ ...i, unitPrice, parentItemId: null, itemGroupName: null });
        continue;
      }
    }
    out.push(i);
  }

  // Add-ons: a split's optional extras, or every multi-head labour line.
  const addOnItems: TemplateItem[] = [];
  const addOns: TemplatePlan["addOns"] = [];
  if (kind === "split") {
    const has = (skuId: number) => t.items.some((i) => i.isAddOn && i.skuId === skuId);
    // A long run takes a second coil: the same coil the template already uses.
    const coil = members.find((x) => x.skuType === "Material" && /pair coil/i.test(x.skuName ?? ""));
    const extras = [
      ...cat.splitAddOns,
      ...(coil ? [{ skuId: coil.skuId, skuType: coil.skuType, name: `${(coil.skuName ?? "Pair coil").trim()} (second coil, runs over 20 m)`, price: coil.unitPrice }] : []),
    ];
    for (const x of extras) {
      if (has(x.skuId) || !(x.price > 0)) continue;
      const description = x.skuId === coil?.skuId ? ADDON_COPY.coil : /pump/i.test(x.name) ? ADDON_COPY.pump : null;
      addOnItems.push({ id: null, skuId: x.skuId, skuType: x.skuType, skuName: x.name, description, quantity: 1, unitPrice: x.price, isAddOn: true });
      addOns.push({ name: x.name, hours: 0, price: x.price, skuId: x.skuId });
    }
  }
  if (kind === "multi") {
    for (const n of Array.from(cat.multiHead.keys()).sort((a, b) => a - b)) {
      const svc = cat.multiHead.get(n)!;
      if (svc.hours <= 0) continue;
      const price = cents(svc.hours * pairRate);
      const had = labourLines.get(n);
      addOnItems.push(had
        ? { ...had, quantity: 1, unitPrice: price, isAddOn: true, parentItemId: null, itemGroupParentId: null, itemGroupName: null }
        : { id: null, skuId: svc.skuId, skuType: "Service", skuName: svc.name, quantity: 1, unitPrice: price, isAddOn: true });
      addOns.push({ name: svc.name, hours: svc.hours, price, skuId: svc.skuId });
    }
  }

  const groupName = (headerItem.itemGroupName ?? headerItem.skuName ?? "Installation").trim();
  const header: TemplateItem = { ...headerItem, quantity: 1, unitPrice: labour, parentItemId: null, itemGroupParentId: null, itemGroupName: groupName };
  const grouped = members.map((x) => ({ ...x, itemGroupParentId: headerId }));

  // The header goes where the install line was, its group straight after,
  // then the add-ons the office picks from.
  const items = out.flatMap((i) => (i === HEADER_SLOT ? [header, ...grouped, ...addOnItems] : [i]));

  return {
    id: t.id, name: t.name.trim(), kind,
    header: { itemId: headerId, name: groupName, hours, rate, labour, heads: kind === "multi" ? headCount(t.items) : undefined },
    electrical, materials, materialLines, addOns, removed,
    before: templateTotal(t.items), after: templateTotal(items),
    items,
  };
}

/** The body ServiceTitan's template PATCH takes: every item, in order; new ones without an id. */
export function templatePatchItems(items: TemplateItem[]) {
  return items.map((i) => ({
    id: i.id ?? null, skuId: i.skuId, skuType: i.skuType, description: i.description ?? null,
    quantity: i.quantity, unitPrice: i.unitPrice, unitCost: i.unitCost ?? null, isAddOn: i.isAddOn,
    chargeable: i.chargeable ?? null, allowDiscounts: i.allowDiscounts ?? null, memo: i.memo ?? null,
    parentItemId: i.parentItemId ?? null, itemGroupParentId: i.itemGroupParentId ?? null, itemGroupName: i.itemGroupName ?? null,
  }));
}
