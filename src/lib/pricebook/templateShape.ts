import type { TemplateItem } from "./labour";

/**
 * How a quote is laid out (Jake, 16 Nov): "equipment in an item group, a main
 * header that covers the labour, electric (if needed) and the materials under
 * one price, then BPC". The labour run already builds the split templates
 * that way (labour.ts planTemplate); this is the same shape for any template,
 * so the ones made from the hand-built quotes match them.
 *
 * Prices, as the office's own templates have them (Buffalo, Compact Classic,
 * IStore, read 16 Nov): on an install, the materials sit inside the group at
 * $0, carried by the install price; the electrician's line keeps its price.
 * On a repair or service (no equipment) the part is what the job is, so it
 * keeps its price inside the group and the one price is labour plus parts.
 * ServiceTitan shows a Dynamic template's materials at today's pricebook
 * price whatever was saved, and its stored total leaves them out, so setting
 * an install's materials to $0 moves no total; it makes the lines agree with
 * it. Rebates (negative lines) are never touched.
 */

const isBpc = (i: TemplateItem) => i.skuType === "Service" && /bpc compliance/i.test(i.skuName ?? "");
/** The electrician's line rides in the group; an electric hot water install ("Electric HWS") is the header, not this. */
const isElectrical = (i: TemplateItem) => i.skuType === "Service" && /electrical/i.test(i.skuName ?? "");
const label = (i: TemplateItem) => (i.skuName ?? "").replace(/\s+/g, " ").trim() || null;

export function groupedItems(items: TemplateItem[]): TemplateItem[] | null {
  const live = items.filter((i) => !i.isAddOn);
  const header = live.find((i) => i.skuType === "Service" && !isBpc(i) && !isElectrical(i));
  if (!header || header.id == null) return null;
  const root = (i: TemplateItem): TemplateItem => ({ ...i, itemGroupName: label(i), itemGroupParentId: null, parentItemId: null });
  const equipment = live.filter((i) => i.skuType === "Equipment").map(root);
  const install = equipment.length > 0;
  const members = live
    .filter((i) => i !== header && !isBpc(i) && (i.skuType === "Material" || i.skuType === "Service"))
    .map((i) => ({
      ...i, itemGroupName: null, itemGroupParentId: header.id, parentItemId: null,
      ...(install && i.skuType === "Material" && Number(i.unitPrice) > 0 ? { unitPrice: 0 } : {}),
    }));
  const bpc = live.filter(isBpc).map(root);
  // Add-ons and anything that isn't equipment, a service or a material stay as they are, after.
  const rest = items.filter((i) => i.isAddOn || !["Equipment", "Material", "Service"].includes(i.skuType));
  const out = [...equipment, root(header), ...members, ...bpc, ...rest];
  const shape = (xs: TemplateItem[]) => JSON.stringify(xs.map((i) => [i.id, i.itemGroupParentId ?? null, i.itemGroupName ? 1 : 0, Number(i.unitPrice)]));
  return shape(out) === shape(items) ? null : out;
}

/** Whether a read-back has the shape: every member under the header, the header and equipment as groups. */
export function isGrouped(items: TemplateItem[]): boolean {
  const live = items.filter((i) => !i.isAddOn);
  const header = live.find((i) => i.skuType === "Service" && !isBpc(i) && !isElectrical(i));
  if (!header) return false;
  return live.every((i) => (i === header || i.skuType === "Equipment" || isBpc(i)
    ? !i.itemGroupParentId
    : i.itemGroupParentId === header.id));
}

/**
 * The names the review found off the pattern ("Brand size product - install
 * method", kW with a capital W, a full stop for the decimal point, no stray
 * spaces), put right. Each fix is one the review named; nothing else in a
 * name is touched.
 */
export function tidyName(name: string): string {
  let n = name.replace(/[\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim();
  n = n.replace(/(\d),(\d)/g, "$1.$2").replace(/(\d)\s?kw\b/gi, "$1kW");
  // The unit on it is the KSI 2.5kW, as on every other Kaden 2.5kW template.
  if (n === "Kaden 2.6kW Split System - Roof Mounted") n = "Kaden 2.5kW Split System - Roof Mounted";
  if (n === "Reclaim Split GL 315 V2") n = "Reclaim Split GL 315L V2";
  // Panasonic heat pumps read like air conditioners without it.
  n = n.replace(/^Panasonic Split /, "Panasonic Heat Pump Split ");
  return n;
}

/** Internal codes: FAMILY-TYPE-BRAND-SIZE in capitals, no spaces. */
export function tidyCode(code: string): string {
  let c = code.replace(/[\s\u2028\u2029]+/g, "").toUpperCase();
  // The 285L heat pump was coded as the 300L.
  c = c.replace(/^HW-THERMANN-300-/, "HW-THERMANN-285-");
  if (c === "AC-SPLIT-RTR-KADEN-2.6") c = "AC-SPLIT-RTR-KADEN-2.5";
  return c;
}

/**
 * The test templates ("fefefefe", "Mitsubishi ew eewe System"), and any
 * one-word name: left alone. Deleting the test ones is Jake's call.
 */
export const isTestTemplate = (name: string, code: string) =>
  /(\w{2,4})\1{2,}/i.test(`${name} ${code}`) || !/\s/.test(name.trim()) || /\bew\b|sdfg|gwgerrg/i.test(`${name} ${code}`);
