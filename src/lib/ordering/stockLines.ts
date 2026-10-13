import "server-only";
import { sbSelect, sbSelectOne, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { addStockItem, listStock, moveStock, type StockItem, type StockSection } from "@/lib/portal/stock";

/**
 * Factory stock's side of the orders: the lines added to an order by hand for
 * the shelf (no job), and where each has got to — still on a draft, sent and
 * on its way, or arrived and on the shelf (migration 0072).
 */

export type StockLine = {
  id: number;
  poId: number;
  poNumber: string;
  supplierId: string;
  status: "draft" | "approved" | "sent";
  sentAt: string | null;
  name: string;
  model: string | null;
  type: string | null;
  qty: number;
  unitCost: number | null;
  receivedAt: string | null;
  receivedBy: string | null;
};

type Row = {
  id: number; po_id: number; sku_name: string | null; description: string | null; supplier_model: string | null; sku_type: string | null;
  qty: number | string; unit_cost: number | string | null; received_at: string | null; received_by: string | null;
};
type Po = { id: number; po_number: string; supplier_id: string; status: string; sent_at: string | null; updated_at: string };

/**
 * Stock lines on orders from the last 90 days that weren't cancelled. A
 * failed read throws, so the page can say so rather than show nothing on order.
 */
export async function listStockLines(): Promise<StockLine[]> {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const pos = await sbSelect<Po>("purchase_orders", `select=id,po_number,supplier_id,status,sent_at,updated_at&kind=eq.order&status=neq.cancelled&updated_at=gte.${since}`);
  if (!pos.length) return [];
  const byId = new Map(pos.map((p) => [p.id, p]));
  const rows = await sbSelect<Row>(
    "purchase_order_lines",
    `select=id,po_id,sku_name,description,supplier_model,sku_type,qty,unit_cost,received_at,received_by&job_id=is.null&po_id=in.(${pos.map((p) => p.id).join(",")})&order=id.asc`,
  );
  return rows.map((r) => {
    const po = byId.get(r.po_id)!;
    return {
      id: r.id, poId: r.po_id, poNumber: po.po_number, supplierId: po.supplier_id,
      status: (po.status === "sent" || po.status === "approved" ? po.status : "draft") as StockLine["status"],
      sentAt: po.sent_at,
      name: r.sku_name || r.description || r.supplier_model || "Stock",
      model: r.supplier_model, type: r.sku_type, qty: Number(r.qty), unitCost: r.unit_cost == null ? null : Number(r.unit_cost),
      receivedAt: r.received_at, receivedBy: r.received_by,
    };
  });
}

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** The factory line a stock line is, by its name or its model. */
export function shelfMatch(line: Pick<StockLine, "name" | "model">, shelf: StockItem[]): StockItem | null {
  return shelf.find((i) => i.section !== "tools" && (lc(i.name) === lc(line.name) || (!!line.model && (lc(i.name) === lc(line.model) || lc(`${i.brand ?? ""} ${i.name}`) === lc(line.model))))) ?? null;
}

/**
 * Mark a sent stock line arrived and put it on the shelf. The line is claimed
 * first — only a line not yet received matches — so a second press does
 * nothing; if the shelf can't be moved, the claim is undone.
 */
export async function receiveStockLine(lineId: number, who: string): Promise<{ ok: boolean; error?: string; item?: string }> {
  const line = await sbSelectOne<Row & { job_id: number | null }>("purchase_order_lines", `select=id,po_id,job_id,sku_name,description,supplier_model,sku_type,qty,unit_cost,received_at,received_by&id=eq.${lineId}`);
  if (!line || line.job_id != null) return { ok: false, error: "That isn't a stock line." };
  if (line.received_at) return { ok: false, error: "That's already been marked arrived." };
  const po = await sbSelectOne<Po>("purchase_orders", `select=id,po_number,supplier_id,status,sent_at,updated_at&id=eq.${line.po_id}`);
  if (!po || (po.status !== "sent" && po.status !== "approved")) return { ok: false, error: "That order hasn't been sent yet." };

  const now = new Date().toISOString();
  const claimed = await sbUpdateReturning("purchase_order_lines", `id=eq.${lineId}&received_at=is.null`, { received_at: now, received_by: who });
  if (!claimed.length) return { ok: false, error: "That's already been marked arrived." };

  try {
    const name = line.sku_name || line.description || line.supplier_model || "Stock";
    const qty = Number(line.qty);
    const shelf = (await listStock()) ?? [];
    let item = shelfMatch({ name, model: line.supplier_model }, shelf);
    if (!item) {
      // New to the factory: a system if it's equipment, otherwise a material,
      // started at a count of nought so the delivery is the first thing on it.
      const section: StockSection = /equip/i.test(line.sku_type ?? "") ? "systems" : "materials";
      await addStockItem({ section, name, unit: "each", qty: 0, minQty: 0, location: "", category: "", who });
      item = shelfMatch({ name, model: line.supplier_model }, (await listStock()) ?? []);
      if (!item) throw new Error("not found after adding");
    }
    await moveStock({ itemId: item.id, change: qty, reason: "delivered", who, forWhat: `Order ${po.po_number}` });
    await sbUpdate("purchase_order_lines", `id=eq.${lineId}`, { stock_item_id: item.id });
    return { ok: true, item: item.name };
  } catch {
    await sbUpdate("purchase_order_lines", `id=eq.${lineId}`, { received_at: null, received_by: null }).catch(() => undefined);
    return { ok: false, error: "Couldn’t put it on the shelf — nothing has changed. Try again." };
  }
}
