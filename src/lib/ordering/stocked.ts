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

/**
 * Lines on a sold, not-booked sale we'll take from the shelf rather than
 * order: keyed by sale and item (estKey), so it holds when the job is booked
 * and drafted, and never touches the same item on anyone else's sale. Kept
 * apart from the Factory stock tag, which says we usually hold an item, not
 * that this one is set aside.
 */
export type FromStock = { key: string; name: string; by?: string; at?: string };
const FROM = "ordering_from_stock";

export async function loadFromStock(): Promise<FromStock[]> {
  const s = await getSettings<{ items?: FromStock[] }>(FROM).catch(() => null);
  return Array.isArray(s?.items) ? s.items : [];
}

export async function saveFromStock(items: FromStock[]) {
  return saveSettings(FROM, { items: items.slice(-2000) });
}
