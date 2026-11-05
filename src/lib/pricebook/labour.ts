/**
 * Labour pricing for the ServiceTitan pricebook and the aircon estimate
 * templates: the sums only, no I/O, so `npm run check:labour` can hold them.
 *
 * Jake, 5 Nov 2026: installation and servicing are priced for two people (a
 * tech and an apprentice), finding and fixing a problem for one. The rates are
 * the portal's (Pricing & costs › Rates & pricing, `portal_settings.pricing`),
 * so a rate changed there re-prices the pricebook on the next run instead of
 * being typed into ServiceTitan a second time.
 *
 * Services are picked by their ServiceTitan code, listed below, not by
 * guessing from the name: "Continuous Flow Hot Water – Repair" sits in the
 * Split System – Repair category, and a name match would have priced a
 * plumbing job as aircon. A service not listed here is never touched.
 */

export type Crew = "solo" | "pair" | "crew3";
export type Rates = { solo: number | null; pair: number | null; crew3: number | null };

/** What each crew's hour comes from in `portal_settings.pricing`. */
export function ratesFromPricing(p: { solo: number | null; hourly: number | null; install: number | null }): Rates {
  return { solo: p.solo, pair: p.hourly, crew3: p.install };
}

const SOLO = [
  // Diagnostics: one tech finds the problem.
  "AC-SPLIT-DIAG", "AC-MULTI-DIAG", "AC-DUCTED-DIAG", "AC-RAC-DIAG", "AC-ADDON-DIAG",
  "EVAP-DIAG", "HTR-DUCTED-DIAG", "HTR-SPACE-DIAG",
  // Repairs, priced by the hour.
  "AC-SPLIT-REPAIR", "AC-MULTI-REPAIR", "AC-DUCTED-REPAIR", "EVAP-REPAIR", "HTR-DUCTED-REPAIR",
  // The hourly labour line itself.
  "LAB-HR-1P",
];
const PAIR = [
  // Servicing.
  "SVC-AS-SPLIT", "AC-SPLIT-DEEPCLEAN", "AC-RAC-SERVICE", "EVAP-MAINT-SS", "EVAP-MAINT-DS",
  "HTG-DUCT-SVC", "SVC-AS-GAS", "HTG-WALLFURN-SVC",
  // Installation.
  "AC-SPLIT-BTB", "AC-SPLIT-RTR", "AC-SPLIT-RTW",
  "AC-SPLIT-MULTI-2", "AC-SPLIT-MULTI-3", "AC-SPLIT-MULTI-4", "AC-SPLIT-MULTI-5", "AC-SPLIT-MULTI-6",
  "AC-DUCTED-2DAYS", "AC-DUCTED-LAB", "AC-DUCTED-LAB-1DAY", "AC-DOM-LAB",
  "AC-RAC-INSTALL", "AC-CONDENSER-REPLACE", "EVAP-INSTALL", "GAS-DUCT-EXT",
  "LAB-HR-2P",
];
const CREW3 = ["LAB-HR-3P"];

/** ServiceTitan codes carry stray spaces ("AC-DOM-LAB ", " GAS-DUCT-EXT"). */
export const normCode = (c: unknown) => String(c ?? "").trim().toUpperCase();

const CREW_OF = new Map<string, Crew>([
  ...SOLO.map((c) => [c, "solo"] as const),
  ...PAIR.map((c) => [c, "pair"] as const),
  ...CREW3.map((c) => [c, "crew3"] as const),
]);

export function crewFor(code: unknown): Crew | null {
  return CREW_OF.get(normCode(code)) ?? null;
}

export const CREW_LABEL: Record<Crew, string> = { solo: "one person", pair: "tech & apprentice", crew3: "tech & 2 apprentices" };

/** Whole cents, so a 2.8-hour job at $310 is $868.00 and not 867.9999. */
const cents = (n: number) => Math.round(n * 100) / 100;

export type ServiceRow = { id: number; code: string; name: string; hours: number | null; price: number | null; active?: boolean | null };
export type ServiceChange = { id: number; code: string; name: string; crew: Crew; hours: number; rate: number; before: number; after: number };
export type ServiceSkip = { id: number; code: string; name: string; reason: string };

/** Each listed service at its own hours × its crew's rate. */
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
    if (!rate) { skipped.push({ id: s.id, code: normCode(s.code), name: s.name, reason: `no ${CREW_LABEL[crew]} rate set in the portal` }); continue; }
    if (hours <= 0) { skipped.push({ id: s.id, code: normCode(s.code), name: s.name, reason: "no hours on the service" }); continue; }
    const after = cents(hours * rate);
    const before = Number(s.price) || 0;
    if (Math.abs(after - before) < 0.005) { unchanged++; continue; }
    changes.push({ id: s.id, code: normCode(s.code), name: s.name.trim(), crew, hours, rate, before, after });
  }
  return { changes, unchanged, skipped };
}

// --- Templates -------------------------------------------------------------------
//
// The aircon templates were laid out as: the unit, an install line priced to
// cover labour *and* materials, the electrician as a separate priced line, and
// every material loose underneath at $0. The heat pump templates already do it
// the other way, with the materials sitting under the install service.
//
// Rebuilt, each one has a single installation header (a ServiceTitan item
// group) holding the labour at hours × the two-person rate, the electrical
// where the job has it, and every material at its pricebook price. The header
// is the install service the template already used, so its customer-facing
// description is kept. The internal labour lines that sat beside it ("Ducted
// Split – Labour (Two Days)", "Dominator – Labour (One Day)", "Multi Head
// Labour (n head)") come off: their hours go into the header, and on the
// Rinnai 14kW all three head counts were being charged at once.

/** Install services that head a template, and where their hours come from. */
const HEADERS: Record<string, "own" | "heads" | "dominator"> = {
  "AC-SPLIT-BTB": "own", "AC-SPLIT-RTR": "own", "AC-SPLIT-RTW": "own",
  "AC-DUCTED-2DAYS": "own",
  "AC-SPLIT-MULTI": "heads",
  "AC-DOM-INSTALL": "dominator",
};
/** Labour lines folded into the header. */
const FOLDED = new Set(["AC-DUCTED-LAB", "AC-DOM-LAB", "AC-SPLIT-MULTI-2", "AC-SPLIT-MULTI-3", "AC-SPLIT-MULTI-4", "AC-SPLIT-MULTI-5", "AC-SPLIT-MULTI-6"]);
/** The electrician's line on each kind of job. Kept at its own price. */
const ELECTRICAL = new Set(["AC-SPLIT-ELEC", "AC-MULTI-ELEC", "AC-DUCTED-ELE", "DOM-ELEC"]);
const BPC = "BPC COMPLIANCE CERTIFICATE";
/** Rebates and discounts are materials with a negative price; they stay where they are. */
const isRebate = (name: string, price: number) => price < 0 || /rebate|veec|\bstc\b|discount/i.test(name);

export type TemplateItem = {
  id: number;
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
  service: Map<number, { code: string; hours: number }>;
  materialPrice: Map<number, number>;
  /** Hours on "Multi Head Labour (n head)", by n. */
  multiHeadHours: Map<number, number>;
  /** Hours on "Dominator – Labour (One Day)". */
  dominatorHours: number | null;
};

/** Marks where the install line sat while the rest of the template is sorted. */
const HEADER_SLOT = { id: -1 } as TemplateItem;

export type TemplatePlan = {
  id: number;
  name: string;
  header: { itemId: number; name: string; hours: number; rate: number; labour: number; heads?: number };
  electrical: number;
  materials: number;
  materialLines: number;
  removed: string[];
  before: number;
  after: number;
  items: TemplateItem[];
};
export type TemplateSkip = { id: number; name: string; reason: string };

/** Top-level price: add-ons and anything under an add-on aren't in the total. */
export function templateTotal(items: TemplateItem[]): number {
  const addOns = new Set(items.filter((i) => i.isAddOn).map((i) => i.id));
  return cents(items.filter((i) => !i.isAddOn && !(i.parentItemId != null && addOns.has(i.parentItemId)))
    .reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
}

/** Indoor heads on a multi-head template: every indoor unit line, by quantity. */
export function headCount(items: TemplateItem[]): number {
  return items.filter((i) => i.skuType === "Equipment" && /indoor|head/i.test(i.skuName ?? "") && !/condenser/i.test(i.skuName ?? ""))
    .reduce((a, i) => a + (Number(i.quantity) || 0), 0);
}

export function planTemplate(t: Template, cat: Catalogue, pairRate: number): TemplatePlan | TemplateSkip {
  const code = (i: TemplateItem) => (i.skuType === "Service" ? cat.service.get(i.skuId)?.code ?? "" : "");
  const headerItem = t.items.find((i) => !i.isAddOn && HEADERS[code(i)]);
  if (!headerItem) return { id: t.id, name: t.name, reason: "not an aircon install template" };
  if (t.items.some((i) => i.itemGroupParentId === headerItem.id)) {
    // Already rebuilt: re-pricing it again would be fine, but a template the
    // office regrouped by hand shouldn't be reshuffled under them.
    return { id: t.id, name: t.name, reason: "already has an installation group" };
  }

  const kind = HEADERS[code(headerItem)];
  let hours = 0;
  let heads: number | undefined;
  if (kind === "own") hours = cat.service.get(headerItem.skuId)?.hours ?? 0;
  if (kind === "dominator") hours = cat.dominatorHours ?? 0;
  if (kind === "heads") {
    heads = headCount(t.items);
    hours = cat.multiHeadHours.get(Math.max(2, heads)) ?? 0;
    if (heads > 6) return { id: t.id, name: t.name, reason: `${heads} indoor heads, and the pricebook's multi-head labour stops at 6` };
  }
  if (hours <= 0) return { id: t.id, name: t.name, reason: `no hours for ${headerItem.skuName ?? "the install service"} in the pricebook` };
  const labour = cents(hours * pairRate);

  const removed: string[] = [];
  const members: TemplateItem[] = [];
  const out: TemplateItem[] = [];
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
    if (i.isAddOn || underAddOn) { out.push(i); continue; }
    if (FOLDED.has(c)) { removed.push(`${name} $${i.unitPrice}`); continue; }
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

  const groupName = (headerItem.itemGroupName ?? headerItem.skuName ?? "Installation").trim();
  const header: TemplateItem = { ...headerItem, quantity: 1, unitPrice: labour, parentItemId: null, itemGroupParentId: null, itemGroupName: groupName };
  const grouped = members.map((m) => ({ ...m, itemGroupParentId: headerItem.id }));

  // The header goes where the install line was, with its group straight after.
  const items = out.flatMap((i) => (i === HEADER_SLOT ? [header, ...grouped] : [i]));

  return {
    id: t.id, name: t.name.trim(),
    header: { itemId: headerItem.id, name: groupName, hours, rate: pairRate, labour, heads },
    electrical, materials, materialLines, removed,
    before: templateTotal(t.items), after: templateTotal(items),
    items,
  };
}

/** The body ServiceTitan's template PATCH takes: every item, by id, in order. */
export function templatePatchItems(items: TemplateItem[]) {
  return items.map((i) => ({
    id: i.id, skuId: i.skuId, skuType: i.skuType, description: i.description ?? null,
    quantity: i.quantity, unitPrice: i.unitPrice, unitCost: i.unitCost ?? null, isAddOn: i.isAddOn,
    chargeable: i.chargeable ?? null, allowDiscounts: i.allowDiscounts ?? null, memo: i.memo ?? null,
    parentItemId: i.parentItemId ?? null, itemGroupParentId: i.itemGroupParentId ?? null, itemGroupName: i.itemGroupName ?? null,
  }));
}
