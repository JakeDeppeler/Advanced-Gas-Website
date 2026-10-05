import "server-only";
import { cache } from "react";
import { q, sbDelete, sbInsert, sbRpc, sbSelect, sbUpdate, sbUpsert } from "@/lib/dashboard/db";
import { dbConfigured } from "@/lib/portal/db";
import { VAN_STOCK, itemKey } from "@/lib/portal/vanChecks";

/**
 * The factory: the materials on the shelf, the systems waiting to go in, and
 * the tools that go out and come back.
 *
 * The count on a line is never written directly. Every change is a movement
 * through `portal_stock_move`, which records it and moves the count together
 * (migration 0038), so the log always adds up to the shelf. A tool is one row,
 * in or out, signed out and back through `portal_tool_sign` (0043), which
 * moves who has it with the count.
 */

export type StockSection = "materials" | "systems" | "tools";

export const SECTIONS: { key: StockSection; label: string; one: string }[] = [
  { key: "materials", label: "Materials", one: "line" },
  { key: "systems", label: "Systems", one: "model" },
  { key: "tools", label: "Tools", one: "tool" },
];

export const isSection = (s: unknown): s is StockSection => s === "materials" || s === "systems" || s === "tools";

export type StockItem = {
  id: string;
  section: StockSection;
  name: string;
  unit: string;
  qty: number;
  minQty: number;
  location: string | null;
  category: string | null;
  brand: string | null;
  productId: string | null;
  serial: string | null;
  holder: string | null;
  dueOn: string | null;
  countedAt: string | null;
};
export type StockMove = { id: string; itemId: string; item: string; change: number; reason: string; who: string | null; forWhat: string | null; at: string };

type ItemRow = {
  id: string; name: string; unit: string; qty: number | string; min_qty: number | string; location: string | null;
  category?: string | null; section?: string | null; brand?: string | null; product_id?: string | null;
  serial?: string | null; holder?: string | null; due_on?: string | null; counted_at?: string | null;
};
type MoveRow = { id: string; item_id: string; change: number | string; reason: string; who: string | null; for_what: string | null; created_at: string };

/**
 * At or under its low mark — once somebody has counted it. A line nobody has
 * counted has no quantity anyone knows, so it can't be called low; and a tool
 * isn't counted at all.
 */
export const isLow = (i: Pick<StockItem, "qty" | "minQty" | "section" | "countedAt">) =>
  i.section !== "tools" && i.countedAt != null && i.minQty > 0 && i.qty <= i.minQty;

/** A tool's test & tag or service: past due, due inside a fortnight, or fine. */
export function dueState(dueOn: string | null, today: string): "over" | "soon" | "ok" | null {
  if (!dueOn) return null;
  if (dueOn < today) return "over";
  const soon = new Date(`${today}T12:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 14);
  return dueOn <= soon.toISOString().slice(0, 10) ? "soon" : "ok";
}

/** What a line is called, with its make when it has one: "Daikin · Cora 7.1 kW". */
export const fullName = (i: Pick<StockItem, "name" | "brand">) => (i.brand ? `${i.brand} · ${i.name}` : i.name);

/**
 * The van-sheet lines the factory already keeps. A name the sheet uses once
 * matches a materials line of that name under any kind — the office may have
 * filed duct tape under Consumables — and a name the sheet uses in more than
 * one group (Cap 1/2" is brass, B-Press water and B-Press gas) only matches in
 * its own group.
 */
export function keptVanLines(items: Pick<StockItem, "section" | "name" | "category">[]): Set<string> {
  const norm = (s: string) => s.trim().toLowerCase();
  const uses = new Map<string, number>();
  for (const g of VAN_STOCK) for (const it of g.items) uses.set(norm(it.item), (uses.get(norm(it.item)) ?? 0) + 1);
  const mats = items.filter((i) => i.section === "materials");
  const byName = new Set(mats.map((i) => norm(i.name)));
  const byGroup = new Set(mats.map((i) => `${norm(i.category ?? "")}|${norm(i.name)}`));
  const kept = new Set<string>();
  for (const g of VAN_STOCK) {
    for (const it of g.items) {
      const n = norm(it.item);
      if (byGroup.has(`${norm(g.group)}|${n}`) || ((uses.get(n) ?? 0) === 1 && byName.has(n))) kept.add(itemKey(g.group, it.item));
    }
  }
  return kept;
}

/** Null when the table can't be read, so the page says so instead of showing an empty shelf. */
export const listStock = cache(async (): Promise<StockItem[] | null> => {
  if (!dbConfigured()) return null;
  try {
    const rows = await sbSelect<ItemRow>(
      "portal_stock_items",
      [
        q.select("id,name,unit,qty,min_qty,location,category,section,brand,product_id,serial,holder,due_on,counted_at"),
        "order=sort_order.asc.nullslast,name.asc",
      ].join("&"),
    );
    return rows.map((r) => ({
      id: r.id, section: isSection(r.section) ? r.section : "materials", name: r.name, unit: r.unit,
      qty: Number(r.qty), minQty: Number(r.min_qty), location: r.location, category: r.category ?? null,
      brand: r.brand ?? null, productId: r.product_id ?? null, serial: r.serial ?? null, holder: r.holder ?? null,
      dueOn: r.due_on ?? null, countedAt: r.counted_at ?? null,
    }));
  } catch {
    return null;
  }
});

/** The latest movements, of these lines when given. */
export async function listMoves(limit = 40, itemIds?: string[]): Promise<StockMove[]> {
  if (!dbConfigured()) return [];
  if (itemIds && itemIds.length === 0) return [];
  const [moves, items] = await Promise.all([
    sbSelect<MoveRow>(
      "portal_stock_moves",
      [
        q.select("id,item_id,change,reason,who,for_what,created_at"),
        ...(itemIds ? [`item_id=in.(${itemIds.join(",")})`] : []),
        q.order("created_at", "desc"),
        `limit=${limit}`,
      ].join("&"),
    ).catch(() => []),
    listStock(),
  ]);
  const name = new Map((items ?? []).map((i) => [i.id, fullName(i)]));
  return moves.map((m) => ({
    id: m.id, itemId: m.item_id, item: name.get(m.item_id) ?? "Removed item", change: Number(m.change),
    reason: m.reason, who: m.who, forWhat: m.for_what, at: m.created_at,
  }));
}

/** Lines at or under their minimum. Null when the shelf can't be read. */
export async function lowStockCount(): Promise<number | null> {
  const items = await listStock();
  return items ? items.filter(isLow).length : null;
}

export type NewItem = {
  section: StockSection;
  name: string;
  unit: string;
  /** What is on the shelf now. Null when nobody has counted it yet. */
  qty: number | null;
  minQty: number;
  location: string;
  category: string;
  brand?: string;
  productId?: string;
  serial?: string;
  dueOn?: string | null;
  who: string;
};

export async function addStockItem(input: NewItem): Promise<void> {
  // The id is made here so the opening count can be written against it,
  // rather than finding the row again by a name two lines might share.
  const id = crypto.randomUUID();
  const tool = input.section === "tools";
  await sbInsert("portal_stock_items", {
    id, section: input.section, name: input.name, unit: tool ? "each" : input.unit || "each", qty: 0,
    min_qty: tool ? 0 : input.minQty, location: input.location || null, category: input.category?.trim() || null,
    brand: input.brand?.trim() || null, product_id: input.productId?.trim() || null,
    serial: input.serial?.trim() || null, due_on: input.dueOn || null,
  });
  // The opening count goes in as a movement, so the log starts where the shelf
  // does. A tool is one, in the factory, from the moment it's on the register.
  const opening = tool ? 1 : input.qty;
  if (opening != null) {
    await sbRpc("portal_stock_move", { p_item: id, p_change: opening, p_reason: "count", p_who: input.who, p_for: tool ? "Added to the register" : "Opening count" });
  }
}

/** Many lines at once, none of them counted yet — the list to count against. */
export async function addUncounted(section: StockSection, lines: { name: string; unit: string; category: string; minQty: number }[]): Promise<void> {
  if (!lines.length) return;
  await sbUpsert(
    "portal_stock_items",
    lines.map((l) => ({ id: crypto.randomUUID(), section, name: l.name, unit: l.unit || "each", qty: 0, min_qty: l.minQty, category: l.category || null })),
    "id",
  );
}

export async function moveStock(input: { itemId: string; change: number; reason: "taken" | "delivered" | "returned" | "count"; who: string; forWhat: string }): Promise<void> {
  await sbRpc("portal_stock_move", {
    p_item: input.itemId, p_change: input.change, p_reason: input.reason, p_who: input.who, p_for: input.forWhat || null,
  });
}

export async function signTool(input: { itemId: string; out: boolean; holder: string; who: string }): Promise<void> {
  await sbRpc("portal_tool_sign", { p_item: input.itemId, p_out: input.out, p_holder: input.holder || null, p_who: input.who });
}

/** The parts of a line that are words, not counts. The count only moves by movement. */
export async function editStockItem(id: string, patch: {
  name?: string; unit?: string; minQty?: number; location?: string | null; category?: string | null;
  brand?: string | null; serial?: string | null; dueOn?: string | null;
}): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.unit !== undefined) row.unit = patch.unit;
  if (patch.minQty !== undefined) row.min_qty = patch.minQty;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.brand !== undefined) row.brand = patch.brand;
  if (patch.serial !== undefined) row.serial = patch.serial;
  if (patch.dueOn !== undefined) row.due_on = patch.dueOn;
  await sbUpdate("portal_stock_items", q.eq("id", id), row);
}

/**
 * Take a line off the list — only one nothing has come off or gone onto. A
 * count alone is no history (a line added by mistake has its opening count);
 * anything taken, delivered or put back is, and the log of who took what is
 * the point of the page, so a line with that stays.
 */
export async function removeStockItem(id: string): Promise<"removed" | "has-history"> {
  const moves = await sbSelect<{ id: string }>(
    "portal_stock_moves",
    [q.select("id"), q.eq("item_id", id), "reason=in.(taken,delivered,returned)", "limit=1"].join("&"),
  );
  if (moves.length) return "has-history";
  await sbDelete("portal_stock_items", q.eq("id", id));
  return "removed";
}
