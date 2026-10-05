"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listVehicles } from "@/lib/portal/db";
import { VAN_STOCK, itemKey } from "@/lib/portal/vanChecks";
import {
  addStockItem, addUncounted, editStockItem, isSection, keptVanLines, listStock, moveStock, removeStockItem, signTool as signToolDb,
  type StockSection,
} from "@/lib/portal/stock";

export type ActionResult = { ok: boolean; error?: string; note?: string };

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const clip = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n);

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

function done(): void {
  revalidatePath("/portal/stock");
  revalidatePath("/trade/stock");
  revalidatePath("/portal");
}

export async function addItem(input: {
  section: StockSection; name: string; unit: string; qty: string; minQty: string; location: string; category?: string;
  brand?: string; productId?: string; serial?: string; dueOn?: string;
}): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isSection(input.section)) return { ok: false, error: "Which part of the factory?" };
  const name = clip(input.name, 80);
  if (!name) return { ok: false, error: "Give it a name." };
  const qty = input.qty.trim() === "" ? null : num(input.qty);
  const minQty = input.minQty.trim() === "" ? 0 : num(input.minQty);
  if ((qty != null && !(qty >= 0)) || !(minQty >= 0)) return { ok: false, error: "Counts have to be zero or more." };
  const dueOn = clip(input.dueOn, 10);
  if (dueOn && !isDate(dueOn)) return { ok: false, error: "That due date isn't a date." };
  // One line per thing: a second line for the same model or material splits
  // its count in two. Tools are the exception — two ladders are two tools.
  if (input.section !== "tools") {
    const shelf = await listStock();
    const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
    const same = (shelf ?? []).find((i) => i.section === input.section && (
      (input.productId && i.productId === input.productId)
      || (lc(i.name) === lc(name) && lc(i.brand) === lc(input.brand) && (input.section === "systems" || lc(i.category) === lc(input.category)))
    ));
    if (same) return { ok: false, error: `${same.brand ? `${same.brand} ${same.name}` : same.name} is already on the list — use Add or Count on its line.` };
  }
  try {
    await addStockItem({
      section: input.section, name, unit: clip(input.unit, 20) || "each", qty, minQty, location: clip(input.location, 60),
      category: clip(input.category, 40), brand: clip(input.brand, 40), productId: clip(input.productId, 120),
      serial: clip(input.serial, 60), dueOn: dueOn || null, who: me.name,
    });
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  done();
  return { ok: true };
}

/**
 * Take some, put some back, or correct the count after a stocktake. Who did it
 * is the signed-in person — not a field anybody types — so the log of who took
 * what can't be written in someone else's name.
 */
export async function move(input: { itemId: string; reason: "taken" | "delivered" | "returned" | "count"; qty: string; forWhat: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.itemId)) return { ok: false, error: "No such item." };
  if (!["taken", "delivered", "returned", "count"].includes(input.reason)) return { ok: false, error: "Unknown change." };
  const qty = num(input.qty);
  if (!(qty >= 0) || (input.reason !== "count" && !(qty > 0))) return { ok: false, error: "How many?" };
  const change = input.reason === "taken" ? -qty : qty;
  try {
    await moveStock({ itemId: input.itemId, change, reason: input.reason, who: me.name, forWhat: input.forWhat.trim() });
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  done();
  return { ok: true };
}

/**
 * The whole shelf counted at once: a stocktake movement for every line whose
 * count changed — or that had never been counted — and the low marks as typed.
 * A blank count leaves the line as it was.
 */
export async function stocktake(input: { rows: { id: string; count: string; minQty: string }[] }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const shelf = await listStock();
  if (!shelf) return { ok: false, error: "The stock list can't be read right now." };
  const byId = new Map(shelf.map((i) => [i.id, i]));
  let counted = 0;
  let failed = 0;
  for (const r of input.rows.slice(0, 400)) {
    const it = byId.get(r.id);
    if (!it || it.section === "tools") continue;
    const count = r.count.trim() === "" ? null : num(r.count);
    const min = r.minQty.trim() === "" ? null : num(r.minQty);
    if ((count != null && !(count >= 0)) || (min != null && !(min >= 0))) return { ok: false, error: `Check the numbers on ${it.name}.` };
    try {
      if (count != null && (count !== it.qty || it.countedAt == null)) {
        await moveStock({ itemId: it.id, change: count, reason: "count", who: me.name, forWhat: "Stocktake" });
        counted++;
      }
      if (min != null && min !== it.minQty) await editStockItem(it.id, { minQty: min });
    } catch {
      failed++;
    }
  }
  done();
  if (failed) return { ok: false, error: `${failed} ${failed === 1 ? "line" : "lines"} didn't save. The rest did — check them and save again.` };
  return { ok: true, note: counted ? `Counted ${counted} ${counted === 1 ? "line" : "lines"}.` : "Saved." };
}

export async function editItem(input: {
  id: string; name: string; unit?: string; minQty?: string; location: string; category: string; brand?: string; serial?: string; dueOn?: string;
}): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "No such item." };
  const name = clip(input.name, 80);
  if (!name) return { ok: false, error: "Give it a name." };
  const minQty = input.minQty === undefined || input.minQty.trim() === "" ? undefined : num(input.minQty);
  if (minQty !== undefined && !(minQty >= 0)) return { ok: false, error: "Low at has to be zero or more." };
  const dueOn = input.dueOn === undefined ? undefined : clip(input.dueOn, 10);
  if (dueOn && !isDate(dueOn)) return { ok: false, error: "That due date isn't a date." };
  try {
    await editStockItem(input.id, {
      name, unit: input.unit === undefined ? undefined : clip(input.unit, 20) || "each", minQty,
      location: clip(input.location, 60) || null, category: clip(input.category, 40) || null,
      brand: input.brand === undefined ? undefined : clip(input.brand, 40) || null,
      serial: input.serial === undefined ? undefined : clip(input.serial, 60) || null,
      dueOn: dueOn === undefined ? undefined : dueOn || null,
    });
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  done();
  return { ok: true };
}

export async function removeItem(input: { id: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "No such item." };
  try {
    const r = await removeStockItem(input.id);
    if (r === "has-history") return { ok: false, error: "Something has been recorded against it, so it stays — the log needs it." };
  } catch {
    return { ok: false, error: "Couldn't remove it." };
  }
  done();
  return { ok: true };
}

/** A tool out to somebody, or back in the factory. */
export async function signTool(input: { id: string; out: boolean; holder: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "No such tool." };
  const holder = clip(input.holder, 80);
  if (input.out && !holder) return { ok: false, error: "Who's taking it?" };
  try {
    await signToolDb({ itemId: input.id, out: input.out, holder, who: me.name });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/already out/.test(m)) return { ok: false, error: "It's already out. Book it back in first." };
    if (/already in/.test(m)) return { ok: false, error: "It's already in the factory." };
    return { ok: false, error: "Couldn't save." };
  }
  done();
  return { ok: true };
}

/**
 * Start the materials from the van stock sheet: the lines picked, under the
 * van sheet's own names and groups so the iPad can match a van's line to the
 * factory's. None is counted yet, so none can read as low until somebody
 * counts it. The low mark starts at one restock for every van — the van
 * sheet's minimum times the vans — for the count to correct.
 */
export async function startFromVanList(input: { keys: string[] }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const [shelf, vans] = await Promise.all([listStock(), listVehicles().catch(() => [])]);
  if (!shelf) return { ok: false, error: "The stock list can't be read right now." };
  const want = new Set(input.keys);
  const have = keptVanLines(shelf);
  const fleet = Math.max(1, vans.filter((v) => v.active).length);
  const lines = VAN_STOCK.flatMap((g) => g.items
    .filter((it) => want.has(itemKey(g.group, it.item)) && !have.has(itemKey(g.group, it.item)))
    .map((it) => ({ name: it.item, unit: it.unit === "ea" ? "each" : it.unit, category: g.group, minQty: it.min * fleet })));
  if (!lines.length) return { ok: false, error: "Those are all on the list already." };
  try {
    await addUncounted("materials", lines);
  } catch {
    return { ok: false, error: "Couldn't add them." };
  }
  done();
  return { ok: true, note: `Added ${lines.length} ${lines.length === 1 ? "line" : "lines"}. Count them to start the shelf.` };
}
