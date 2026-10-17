import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";

/**
 * Items tagged Factory stock: ones we keep on the shelf, so a line for one on
 * an order reads "Factory stock" and can be taken from the shelf rather than
 * ordered. Keyed by the pricebook item where there is one, else the model.
 */
export type Stocked = { key: string; name: string; by?: string; at?: string };
const KEY = "ordering_stocked";

export async function loadStocked(): Promise<Stocked[]> {
  const s = await getSettings<{ items?: Stocked[] }>(KEY).catch(() => null);
  return Array.isArray(s?.items) ? s.items : [];
}

export async function saveStocked(items: Stocked[]) {
  return saveSettings(KEY, { items: items.slice(0, 1000) });
}
