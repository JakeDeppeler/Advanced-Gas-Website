import "server-only";
import { dbConfigured, listVanChecks, listVehicles } from "@/lib/portal/db";
import { TOOL_BAG, VAN_PLANT, VAN_STOCK, itemKey, type CheckKind, type CountGroup } from "@/lib/portal/vanChecks";

/**
 * Crew & vans › Kit lists: what a new starter carries, what every van carries,
 * and the stock every van keeps — each beside what the vans last counted.
 *
 * The lists are the same ones the Monday checks count against (vanChecks.ts),
 * not a copy. A second list kept for reading would drift from the one the
 * techs tick, and then the page would say a van is short of something nobody
 * is asked to count.
 */

export type KitList = "starter" | "van" | "stock";

export const KIT_LISTS: { k: KitList; label: string; kind: CheckKind; lists: CountGroup[] }[] = [
  { k: "starter", label: "New starter", kind: "bag", lists: TOOL_BAG },
  { k: "van", label: "Tools for vans", kind: "plant", lists: VAN_PLANT },
  { k: "stock", label: "Van stock", kind: "stock", lists: VAN_STOCK },
];

export type VanCount = {
  vanId: string;
  van: string;
  /** The day of the last sheet of this kind; null when the van has never done one. */
  checkedOn: string | null;
  qty: Record<string, number | null>;
};

/** Each working van's last count of this list, keyed as the check keys it. */
export async function lastCounts(list: KitList): Promise<VanCount[]> {
  if (!dbConfigured()) return [];
  const def = KIT_LISTS.find((l) => l.k === list)!;
  const vans = (await listVehicles().catch(() => [])).filter((v) => v.active);
  return Promise.all(vans.map(async (v) => {
    const [sheet] = await listVanChecks(v.id, def.kind, 1).catch(() => []);
    const qty: Record<string, number | null> = {};
    for (const g of def.lists) for (const it of g.items) {
      const k = itemKey(g.group, it.item);
      qty[k] = sheet?.items[k]?.qty ?? null;
    }
    return { vanId: v.id, van: v.name, checkedOn: sheet?.checkedOn ?? null, qty };
  }));
}
