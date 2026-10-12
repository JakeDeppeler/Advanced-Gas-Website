import "server-only";
import { sbDelete, sbInsert, sbSelect, sbSelectOne, sbUpdate, type Row } from "@/lib/dashboard/db";
import { getSettings } from "@/lib/portal/db";
import {
  planWeek, poNumber, type OrderLine, type OrderingSettings, type PlannedLine, type Supplier, type Week, type WeekPlan,
  type WorkOrderDetails, type WorkOrderRow,
} from "./plan";

// Reads and writes for Supply › Next week. The logic that decides what goes on
// an order lives in plan.ts; this file only moves rows.

export type PoStatus = "draft" | "approved" | "sent" | "cancelled";

export type PurchaseOrder = {
  id: number;
  po_number: string;
  supplier_id: string;
  week_of: string;
  kind: "order" | "work_order";
  group_key: string;
  status: PoStatus;
  delivery_address: string | null;
  delivery_to_site: boolean;
  delivery_instructions: string | null;
  details: WorkOrderDetails | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  sent_to: string | null;
  send_error: string | null;
  updated_at: string;
};

export type PoLine = PlannedLine & { id: number; po_id: number };

export type PoWithLines = PurchaseOrder & { lines: PoLine[] };

export const DEFAULT_SETTINGS: OrderingSettings = {
  replyTo: "admin@advancedgas.com.au",
  deliveryAddress: "1 Sierra Circuit, Pakenham VIC 3810",
  orderedBy: "Kellie Winbanks",
};

export async function loadOrderingSettings(): Promise<OrderingSettings> {
  const s = await getSettings<Partial<OrderingSettings>>("ordering");
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function loadSuppliers(): Promise<Supplier[]> {
  return sbSelect<Supplier>("order_suppliers", "select=id,name,method,email,notes,work_order_note,active&order=name.asc");
}

const weekFilter = (w: Week) => `install_date=gte.${w.start}&install_date=lte.${w.end}`;

export async function loadWeekInputs(w: Week): Promise<{ lines: OrderLine[]; workOrders: WorkOrderRow[] }> {
  const [lines, workOrders] = await Promise.all([
    sbSelect<OrderLine>("upcoming_order_lines", `${weekFilter(w)}&order=job_id.asc,sku_id.asc.nullslast`),
    sbSelect<WorkOrderRow>("electrician_work_orders", `${weekFilter(w)}&order=job_id.asc`),
  ]);
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    // numeric columns arrive from PostgREST as strings
    lines: lines.map((l) => ({ ...l, qty: n(l.qty), unit_cost: n(l.unit_cost) })),
    workOrders,
  };
}

/**
 * Everything already on an approved or sent order: `job:sku` for goods,
 * `job:work` for an electrician booked. Looks back four months, which covers
 * any job moved between weeks after its gear went out.
 */
export async function loadAlreadyOrdered(): Promise<Set<string>> {
  const since = new Date(Date.now() - 120 * 86400000).toISOString();
  const pos = await sbSelect<{ id: number; kind: string }>(
    "purchase_orders",
    `select=id,kind&status=in.(approved,sent)&created_at=gte.${encodeURIComponent(since)}&order=id.asc`,
  );
  const out = new Set<string>();
  const kind = new Map(pos.map((p) => [p.id, p.kind]));
  for (let i = 0; i < pos.length; i += 100) {
    const ids = pos.slice(i, i + 100).map((p) => p.id).join(",");
    const lines = await sbSelect<{ po_id: number; job_id: number; sku_id: number | null }>(
      "purchase_order_lines", `select=po_id,job_id,sku_id&po_id=in.(${ids})&order=id.asc`,
    );
    for (const l of lines) out.add(kind.get(l.po_id) === "work_order" ? `${l.job_id}:work` : `${l.job_id}:${l.sku_id ?? "-"}`);
  }
  return out;
}

export async function listWeekOrders(w: Week): Promise<PoWithLines[]> {
  const pos = await sbSelect<PurchaseOrder>("purchase_orders", `week_of=eq.${w.start}&order=id.asc`);
  if (!pos.length) return [];
  const lines = await sbSelect<PoLine>("purchase_order_lines", `po_id=in.(${pos.map((p) => p.id).join(",")})&order=id.asc`);
  const num = (v: unknown) => (v == null ? null : Number(v));
  return pos.map((p) => ({
    ...p,
    lines: lines
      .filter((l) => l.po_id === p.id)
      .map((l) => ({ ...l, qty: Number(l.qty), unit_cost: num(l.unit_cost) })),
  }));
}

export async function getOrder(id: number): Promise<PoWithLines | null> {
  const po = await sbSelectOne<PurchaseOrder>("purchase_orders", `id=eq.${id}`);
  if (!po) return null;
  const lines = await sbSelect<PoLine>("purchase_order_lines", `po_id=eq.${id}&order=id.asc`);
  return { ...po, lines: lines.map((l) => ({ ...l, qty: Number(l.qty), unit_cost: l.unit_cost == null ? null : Number(l.unit_cost) })) };
}

export async function appointmentsSynced(): Promise<boolean> {
  const one = await sbSelectOne<{ id: number }>("st_appointments", "select=id&limit=1");
  return !!one;
}

/* ---------------------------------------------------------------- drafting */

const lineRow = (poId: number, l: PlannedLine): Row => ({
  po_id: poId, job_id: l.job_id, job_number: l.job_number, customer_name: l.customer_name, suburb: l.suburb,
  install_date: l.install_date, appointment_start: l.appointment_start, sku_id: l.sku_id, sku_name: l.sku_name,
  sku_type: l.sku_type, description: l.description, supplier_model: l.supplier_model, qty: l.qty, unit_cost: l.unit_cost,
});

async function replaceLines(poId: number, lines: PlannedLine[]) {
  await sbDelete("purchase_order_lines", `po_id=eq.${poId}`);
  // PostgREST takes an array body as one multi-row insert; one request per
  // order rather than one per line keeps a 100-line Reece order quick.
  if (lines.length) await sbInsert("purchase_order_lines", lines.map((l) => lineRow(poId, l)) as unknown as Row);
}

async function createOrder(row: Row): Promise<number> {
  await sbInsert("purchase_orders", row);
  const made = await sbSelectOne<{ id: number }>("purchase_orders", `select=id&po_number=eq.${encodeURIComponent(String(row.po_number))}`);
  if (!made) throw new Error(`Order ${row.po_number} didn't save`);
  return made.id;
}

export type DraftResult = { plan: WeekPlan; created: number; updated: number; removed: number };

/**
 * Draft (or redraft) a week's orders and work orders from the live bookings.
 *
 * Only drafts are ever touched. An order the office has approved or sent is
 * left exactly as it went; anything new since then — a job booked in
 * afterwards, a line added to a quote — becomes a new top-up draft beside it,
 * because the plan already leaves out whatever was ordered.
 */
export async function draftWeek(week: Week): Promise<DraftResult> {
  const settings = await loadOrderingSettings();
  const [suppliers, inputs, alreadyOrdered, existing] = await Promise.all([
    loadSuppliers(), loadWeekInputs(week), loadAlreadyOrdered(), listWeekOrders(week),
  ]);
  const plan = planWeek({ week, ...inputs, suppliers, alreadyOrdered });
  let created = 0, updated = 0, removed = 0;
  const kept = new Set<number>();
  const now = new Date().toISOString();
  // Order numbers run per supplier per week: AGA-261019-MIT, then -MIT-2 for
  // a top-up. Counted from every order that week, cancelled ones included,
  // so a number is never reused.
  const count = new Map<string, number>();
  for (const p of existing) count.set(p.supplier_id, (count.get(p.supplier_id) ?? 0) + 1);
  const nextNumber = (supplierId: string) => {
    const n = (count.get(supplierId) ?? 0) + 1;
    count.set(supplierId, n);
    return { n, po: poNumber(week, supplierId, n) };
  };

  for (const o of plan.orders) {
    const mine = existing.filter((p) => p.kind === "order" && p.supplier_id === o.supplier_id);
    const draft = mine.find((p) => p.status === "draft");
    if (draft) {
      await replaceLines(draft.id, o.lines);
      await sbUpdate("purchase_orders", `id=eq.${draft.id}`, { updated_at: now, send_error: null });
      kept.add(draft.id);
      updated++;
    } else {
      const { po } = nextNumber(o.supplier_id);
      const id = await createOrder({
        po_number: po, supplier_id: o.supplier_id, week_of: week.start, kind: "order",
        group_key: mine.length ? `all-${mine.length + 1}` : "all", status: "draft", delivery_address: settings.deliveryAddress,
      });
      await replaceLines(id, o.lines);
      kept.add(id);
      created++;
    }
  }

  for (const wo of plan.workOrders) {
    const mine = existing.filter((p) => p.kind === "work_order" && p.group_key.split("#")[0] === wo.group_key);
    const draft = mine.find((p) => p.status === "draft");
    if (draft) {
      await replaceLines(draft.id, wo.lines);
      await sbUpdate("purchase_orders", `id=eq.${draft.id}`, { details: wo.details, updated_at: now, send_error: null });
      kept.add(draft.id);
      updated++;
    } else {
      const { po } = nextNumber(wo.supplier_id);
      const id = await createOrder({
        po_number: po,
        supplier_id: wo.supplier_id, week_of: week.start, kind: "work_order",
        group_key: mine.length ? `${wo.group_key}#${mine.length + 1}` : wo.group_key,
        status: "draft", details: wo.details, delivery_address: wo.details.site_address, delivery_to_site: true,
      });
      await replaceLines(id, wo.lines);
      kept.add(id);
      created++;
    }
  }

  // A draft the plan no longer wants — the job moved weeks, the quote changed
  // — goes, so the page never offers to send something that's no longer true.
  for (const p of existing) {
    if (p.status === "draft" && !kept.has(p.id)) {
      await sbDelete("purchase_orders", `id=eq.${p.id}&status=eq.draft`);
      removed++;
    }
  }
  return { plan, created, updated, removed };
}

export async function cancelDraft(id: number): Promise<boolean> {
  const po = await sbSelectOne<{ status: string }>("purchase_orders", `select=status&id=eq.${id}`);
  if (po?.status !== "draft") return false;
  await sbUpdate("purchase_orders", `id=eq.${id}&status=eq.draft`, { status: "cancelled", updated_at: new Date().toISOString() });
  return true;
}

export async function setDelivery(id: number, patch: { toSite: boolean; address: string; instructions: string }): Promise<boolean> {
  const po = await sbSelectOne<{ status: string; kind: string }>("purchase_orders", `select=status,kind&id=eq.${id}`);
  if (po?.status !== "draft" || po.kind !== "order") return false;
  await sbUpdate("purchase_orders", `id=eq.${id}&status=eq.draft`, {
    delivery_to_site: patch.toSite, delivery_address: patch.address, delivery_instructions: patch.instructions || null,
    updated_at: new Date().toISOString(),
  });
  return true;
}
