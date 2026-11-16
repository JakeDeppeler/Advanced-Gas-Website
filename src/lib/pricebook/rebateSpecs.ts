import type { TemplateItem } from "./labour";

/**
 * Jake, 16 Nov: "a total government rebates for hot water as it has
 * requirement and then for the heating and cooling as it for removal of gas
 * heater and has no requirement apart from [that]". Asked the same day, he
 * keeps each rebate on its own line under the total.
 *
 * The office's templates already head their rebate lines with one item,
 * "Total Government Rebates Applied", on hot water and ducted alike, so its
 * wording can't say what each needs. These are the two in its place, each
 * saying the conditions on the quote. Pure, for scripts/check-quote-templates.ts.
 *
 * The Solar Victoria conditions are as they stand from 1 July 2026 (income
 * cap down from $210,000 to $150,000). Sources disagree on a $3 million
 * property cap, so it isn't stated.
 */

/** The generic header the office's templates use now. */
export const GENERIC_REBATE_HEADER = 301034048;

/** Rebate lines only a hot water job carries: STC, Solar Victoria and its Australian-made bonus. */
const HOT_WATER_REBATES = new Set([301034179, 301034190, 301034952]);

export const REBATE_HEADERS = {
  hotWater: {
    code: "REBATES-HW",
    name: "Total Government Rebates Applied - Hot Water",
    description:
      "The government rebates taken off this quote, each listed below. The VEU discount applies because your existing gas or electric hot water system is replaced and removed, and the STC discount comes with the new system. The Solar Victoria rebate, and its Australian-made bonus where shown, applies only if you qualify: you own and live in the home, it is an existing home, your combined household taxable income is under $150,000, the system being replaced is at least 3 years old, and the address hasn't had a Solar Homes hot water or battery rebate before. If you don't qualify, that rebate comes off and the price goes up by the same amount. We'll go through it with you before booking.",
  },
  heatingCooling: {
    code: "REBATES-HC",
    name: "Total Government Rebates Applied - Heating & Cooling",
    description:
      "The Victorian Energy Upgrades (VEU) discount taken off this quote, listed below. The one condition is that your existing gas heater is decommissioned and removed as part of this installation.",
  },
} as const;
export type RebateKind = keyof typeof REBATE_HEADERS;

/**
 * A template's generic rebate header and which kind it should be: hot water
 * if any line under it is one only hot water carries, else heating and
 * cooling (the VEU discount alone). Null when it has no generic header.
 */
export function rebateGroup(items: TemplateItem[]): { header: TemplateItem; members: TemplateItem[]; kind: RebateKind } | null {
  const header = items.find((i) => Number(i.skuId) === GENERIC_REBATE_HEADER && !i.itemGroupParentId && !i.isAddOn);
  if (!header || header.id == null) return null;
  const members = items.filter((i) => i.itemGroupParentId === header.id);
  const kind: RebateKind = members.some((m) => HOT_WATER_REBATES.has(Number(m.skuId))) ? "hotWater" : "heatingCooling";
  return { header, members, kind };
}

/**
 * The lines with the generic header swapped for the new one, everything else
 * as it is: the same place in the quote, the same lines under it. `newId` is
 * the new header's line id once it has one (the second step of a swap
 * ServiceTitan won't do in place); until then the old line keeps its id and
 * only its item changes.
 */
export function swapHeader(items: TemplateItem[], header: TemplateItem, skuId: number, description: string, newId?: number): TemplateItem[] {
  return items.map((i) => {
    if (i === header) return { ...i, ...(newId != null ? { id: newId } : {}), skuId, description };
    if (newId != null && i.itemGroupParentId === header.id) return { ...i, itemGroupParentId: newId };
    return i;
  });
}
