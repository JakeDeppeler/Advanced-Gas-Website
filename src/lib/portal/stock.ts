import "server-only";
import { cache } from "react";
import { q, sbInsert, sbRpc, sbSelect } from "@/lib/dashboard/db";
import { dbConfigured } from "@/lib/portal/db";

/**
 * The factory shelf: what is on it, and who took what.
 *
 * The count on an item is never written directly. Every change is a movement
 * through `portal_stock_move`, which records it and moves the count together
 * (migration 0038), so the log always adds up to the shelf.
 */

export type StockItem = { id: string; name: string; unit: string; qty: number; minQty: number; location: string | null; category: string | null };
export type StockMove = { id: string; itemId: string; item: string; change: number; reason: string; who: string | null; forWhat: string | null; at: string };

type ItemRow = { id: string; name: string; unit: string; qty: number | string; min_qty: number | string; location: string | null; category?: string | null };
type MoveRow = { id: string; item_id: string; change: number | string; reason: string; who: string | null; for_what: string | null; created_at: string };

export const isLow = (i: Pick<StockItem, "qty" | "minQty">) => i.minQty > 0 && i.qty <= i.minQty;

/** Null when the table can't be read, so the page says so instead of showing an empty shelf. */
export const listStock = cache(async (): Promise<StockItem[] | null> => {
  if (!dbConfigured()) return null;
  try {
    const rows = await sbSelect<ItemRow>(
      "portal_stock_items",
      [q.select("id,name,unit,qty,min_qty,location,category"), "order=sort_order.asc.nullslast,name.asc"].join("&"),
    );
    return rows.map((r) => ({ id: r.id, name: r.name, unit: r.unit, qty: Number(r.qty), minQty: Number(r.min_qty), location: r.location, category: r.category ?? null }));
  } catch {
    return null;
  }
});

export async function listMoves(limit = 40): Promise<StockMove[]> {
  if (!dbConfigured()) return [];
  const [moves, items] = await Promise.all([
    sbSelect<MoveRow>("portal_stock_moves", [q.select("id,item_id,change,reason,who,for_what,created_at"), q.order("created_at", "desc"), `limit=${limit}`].join("&")).catch(() => []),
    listStock(),
  ]);
  const name = new Map((items ?? []).map((i) => [i.id, i.name]));
  return moves.map((m) => ({
    id: m.id, itemId: m.item_id, item: name.get(m.item_id) ?? "Removed item", change: Number(m.change),
    reason: m.reason, who: m.who, forWhat: m.for_what, at: m.created_at,
  }));
}

/** Items at or under their minimum. Null when the shelf can't be read. */
export async function lowStockCount(): Promise<number | null> {
  const items = await listStock();
  return items ? items.filter(isLow).length : null;
}

export async function addStockItem(input: { name: string; unit: string; qty: number; minQty: number; location: string; who: string; category?: string }): Promise<void> {
  await sbInsert("portal_stock_items", {
    name: input.name, unit: input.unit || "each", qty: 0, min_qty: input.minQty, location: input.location || null,
    category: input.category?.trim() || null,
  });
  // The opening count goes in as a movement, so the log starts where the shelf does.
  if (input.qty > 0) {
    const rows = await sbSelect<{ id: string }>("portal_stock_items", [q.select("id"), q.eq("name", input.name), q.order("created_at", "desc"), "limit=1"].join("&"));
    if (rows[0]) await sbRpc("portal_stock_move", { p_item: rows[0].id, p_change: input.qty, p_reason: "count", p_who: input.who, p_for: "Opening count" });
  }
}

export async function moveStock(input: { itemId: string; change: number; reason: "taken" | "delivered" | "returned" | "count"; who: string; forWhat: string }): Promise<void> {
  await sbRpc("portal_stock_move", {
    p_item: input.itemId, p_change: input.change, p_reason: input.reason, p_who: input.who, p_for: input.forWhat || null,
  });
}
