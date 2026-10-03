"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { addStockItem, moveStock } from "@/lib/portal/stock";

export type ActionResult = { ok: boolean; error?: string };

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export async function addItem(input: { name: string; unit: string; qty: string; minQty: string; location: string }): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Give it a name." };
  const qty = input.qty.trim() === "" ? 0 : num(input.qty);
  const minQty = input.minQty.trim() === "" ? 0 : num(input.minQty);
  if (!(qty >= 0) || !(minQty >= 0)) return { ok: false, error: "Counts have to be zero or more." };
  try {
    await addStockItem({ name, unit: input.unit.trim().slice(0, 20) || "each", qty, minQty, location: input.location.trim().slice(0, 60), who: me.name });
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  revalidatePath("/portal/stock");
  revalidatePath("/portal");
  return { ok: true };
}

/**
 * Take some, put some back, or correct the count after a stocktake. Who did it
 * is the signed-in person — not a field anybody types — so the log of who took
 * what can't be written in someone else's name.
 */
export async function move(input: { itemId: string; reason: "taken" | "delivered" | "returned" | "count"; qty: string; forWhat: string }): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  if (!/^[0-9a-f-]{36}$/i.test(input.itemId)) return { ok: false, error: "No such item." };
  if (!["taken", "delivered", "returned", "count"].includes(input.reason)) return { ok: false, error: "Unknown change." };
  const qty = num(input.qty);
  if (!(qty >= 0) || (input.reason !== "count" && !(qty > 0))) return { ok: false, error: "How many?" };
  const change = input.reason === "taken" ? -qty : qty;
  try {
    await moveStock({ itemId: input.itemId, change, reason: input.reason, who: me.name, forWhat: input.forWhat.trim() });
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  revalidatePath("/portal/stock");
  revalidatePath("/portal");
  return { ok: true };
}
