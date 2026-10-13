import "server-only";
import { sbDelete, sbInsert, sbSelect, sbSelectOne, sbUpdate, type Row } from "@/lib/dashboard/db";
import { getSettings } from "@/lib/portal/db";
import {
  isoAddDays, lineKey, nextWeek, planWeek, poNumber, thisWeek, todayMelbourne, type OrderedLine, type OrderLine, type OrderingSettings, type PlannedLine, type Supplier, type Week, type WeekPlan,
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
  cc_emails: string[] | null;
  updated_at: string;
};

export type PoLine = PlannedLine & { id: number; po_id: number };

export type PoWithLines = PurchaseOrder & { lines: PoLine[] };

export const DEFAULT_SETTINGS: OrderingSettings = {
  replyTo: "admin@advancedgas.com.au",
  deliveryAddress: "1 Sierra Circuit, Pakenham VIC 3810",
  orderedBy: "Kellie Winbanks",
  signName: "Kellie Winbanks",
  signPosition: "Owner",
  factoryInstructions: "Deliver to our factory",
  deliveryNote: "We do not have a forklift.",
};

/** The signature for Mitsubishi's form, or null if none has been stored. */
export async function loadSignature(): Promise<Uint8Array | null> {
  const s = await getSettings<{ png?: string }>("ordering_signature");
  return s?.png ? new Uint8Array(Buffer.from(s.png, "base64")) : null;
}

export async function loadOrderingSettings(): Promise<OrderingSettings> {
  const s = await getSettings<Partial<OrderingSettings>>("ordering");
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function loadSuppliers(): Promise<Supplier[]> {
  return sbSelect<Supplier>("order_suppliers", "select=id,name,method,email,notes,work_order_note,active,email_intro,email_signoff,cc_emails,combine_orders&order=name.asc");
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

type OrderStatus = "approved" | "sent" | "cancelled";

/** `job:sku` (or `job:work`) for every line on an order in these states over the last four months. */
async function linesOn(statuses: OrderStatus[]): Promise<Map<string, OrderedLine>> {
  const since = new Date(Date.now() - 120 * 86400000).toISOString();
  const pos = await sbSelect<{ id: number; kind: string; po_number: string; supplier_id: string }>(
    "purchase_orders",
    `select=id,kind,po_number,supplier_id&status=in.(${statuses.join(",")})&created_at=gte.${encodeURIComponent(since)}&order=id.asc`,
  );
  const out = new Map<string, OrderedLine>();
  const byId = new Map(pos.map((p) => [p.id, p]));
  for (let i = 0; i < pos.length; i += 100) {
    const ids = pos.slice(i, i + 100).map((p) => p.id).join(",");
    const lines = await sbSelect<{ po_id: number; job_id: number; sku_id: number | null; install_date: string | null }>(
      "purchase_order_lines", `select=po_id,job_id,sku_id,install_date&po_id=in.(${ids})&order=id.asc`,
    );
    for (const l of lines) {
      const po = byId.get(l.po_id)!;
      out.set(po.kind === "work_order" ? `${l.job_id}:work` : lineKey(l.job_id, l.sku_id),
        { install_date: l.install_date, po_number: po.po_number, supplier_id: po.supplier_id });
    }
  }
  return out;
}

/**
 * Everything already on an approved or sent order: `job:sku` for goods,
 * `job:work` for an electrician booked, with the install date it was ordered
 * for. Looks back four months, which covers any job moved between weeks after
 * its gear went out — it is never ordered twice, and the move is pointed out.
 */
export const loadAlreadyOrdered = () => linesOn(["approved", "sent"]);

/**
 * Lines on drafts the office cancelled. The automatic morning run leaves them
 * out — cancelling usually means "ordered another way" — so they don't come
 * back as a fresh draft every day. Pressing Redraft still includes them.
 */
export async function loadCancelled(): Promise<Set<string>> {
  return new Set((await linesOn(["cancelled"])).keys());
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
  sku_type: l.sku_type, description: l.description, supplier_model: l.supplier_model, supplier_part: l.supplier_part ?? null,
  qty: l.qty, unit_cost: l.unit_cost,
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

export type DraftResult = {
  plan: WeekPlan; created: number; updated: number; removed: number;
  /** Lines that weren't on any draft or order before this run — what's new for the office. */
  added: { supplier_id: string; line: PlannedLine }[];
  /** Work orders that weren't drafted before, by name (job and address). */
  addedWork: WorkOrderDetails[];
};

/**
 * Draft (or redraft) a week's orders and work orders from the live bookings.
 *
 * Only drafts are ever touched. An order the office has approved or sent is
 * left exactly as it went; anything new since then — a job booked in
 * afterwards, a line added to a quote — becomes a new top-up draft beside it,
 * because the plan already leaves out whatever was ordered.
 */
export async function draftWeek(week: Week, opts: { auto?: boolean } = {}): Promise<DraftResult> {
  const now = new Date();
  // Suppliers that charge per delivery get one order for every job not yet
  // ordered from today to the end of next week — the same window whichever
  // week is being drafted, so drafting either tab gives the same order.
  const combineWindow: Week = { start: todayMelbourne(), end: nextWeek(now).end };
  const loadRange: Week = {
    start: combineWindow.start < week.start ? combineWindow.start : week.start,
    end: combineWindow.end > week.end ? combineWindow.end : week.end,
  };
  const settings = await loadOrderingSettings();
  const tw = thisWeek(now), nw = nextWeek(now);
  const otherWeeks = [tw, nw].filter((w) => w.start !== week.start);
  const [suppliers, inputs, alreadyOrdered, existing, skip, ...others] = await Promise.all([
    loadSuppliers(), loadWeekInputs(loadRange), loadAlreadyOrdered(), listWeekOrders(week),
    opts.auto ? loadCancelled() : Promise.resolve(undefined),
    ...otherWeeks.map((w) => listWeekOrders(w)),
  ]);
  const otherDrafts = others.flat().filter((p) => p.status === "draft");
  const plan = planWeek({ week, ...inputs, suppliers, alreadyOrdered, combineWindow, skip });
  let created = 0, updated = 0, removed = 0;
  const kept = new Set<number>();
  const stamp = now.toISOString();

  // What was on a draft before this run, in this week or the other, so "new"
  // means new to the office, not just new to this week's drafts.
  const before = new Set<string>();
  for (const p of [...existing, ...otherDrafts]) {
    if (p.status !== "draft") continue;
    for (const l of p.lines) before.add(p.kind === "work_order" ? `work:${l.job_id}` : `${p.supplier_id}:${lineKey(l.job_id, l.sku_id)}`);
  }
  const added: DraftResult["added"] = [];
  const addedWork: WorkOrderDetails[] = [];

  // A combined supplier has one draft across this week and next. If it is
  // already on the other week it is updated there — keeping any CC or delivery
  // change the office made — rather than a second draft (a second delivery,
  // or the same gear twice) being made here.
  const combined = new Set(suppliers.filter((s) => s.combine_orders && s.active).map((s) => s.id));
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
    for (const l of o.lines) if (!before.has(`${o.supplier_id}:${lineKey(l.job_id, l.sku_id)}`)) added.push({ supplier_id: o.supplier_id, line: l });
    const mine = existing.filter((p) => p.kind === "order" && p.supplier_id === o.supplier_id);
    const draft = mine.find((p) => p.status === "draft")
      ?? (combined.has(o.supplier_id) ? otherDrafts.find((p) => p.kind === "order" && p.supplier_id === o.supplier_id) : undefined);
    if (draft) {
      await replaceLines(draft.id, o.lines);
      await sbUpdate("purchase_orders", `id=eq.${draft.id}`, { updated_at: stamp, send_error: null });
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
    if (wo.lines.some((l) => !before.has(`work:${l.job_id}`))) addedWork.push(wo.details);
    const mine = existing.filter((p) => p.kind === "work_order" && p.group_key.split("#")[0] === wo.group_key);
    const draft = mine.find((p) => p.status === "draft");
    if (draft) {
      await replaceLines(draft.id, wo.lines);
      await sbUpdate("purchase_orders", `id=eq.${draft.id}`, { details: wo.details, updated_at: stamp, send_error: null });
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
  // And a combined supplier's draft on the other week that this run didn't
  // reuse: its lines are on the one it did, or have been ordered since.
  for (const p of otherDrafts) {
    if (p.kind === "order" && combined.has(p.supplier_id) && !kept.has(p.id)) {
      await sbDelete("purchase_orders", `id=eq.${p.id}&status=eq.draft`);
      removed++;
    }
  }
  return { plan, created, updated, removed, added, addedWork };
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

/* ---------------------------------------------------------------- supplier emails page */

export async function saveSupplierEmail(id: string, patch: { email: string | null; intro: string | null; signoff: string | null; cc: string[]; combine: boolean }): Promise<boolean> {
  const rows = await sbSelect<{ id: string }>("order_suppliers", `select=id&id=eq.${encodeURIComponent(id)}`);
  if (!rows.length) return false;
  await sbUpdate("order_suppliers", `id=eq.${encodeURIComponent(id)}`, {
    email: patch.email, email_intro: patch.intro, email_signoff: patch.signoff, cc_emails: patch.cc, combine_orders: patch.combine, updated_at: new Date().toISOString(),
  });
  return true;
}

export type Sample = { lines: PlannedLine[]; details: WorkOrderDetails | null; real: boolean };

/**
 * Something real to show in each supplier's sample: that supplier's lines
 * from installs booked over the next four weeks, or the next electrician
 * visit. A supplier with nothing booked gets one obviously made-up line, so
 * every sample still shows how its email reads.
 */
export async function loadSamples(): Promise<Map<string, Sample>> {
  const start = thisWeek(new Date()).start;
  const range: Week = { start, end: isoAddDays(start, 27) };
  const [suppliers, inputs] = await Promise.all([loadSuppliers(), loadWeekInputs(range)]);
  const plan = planWeek({ week: range, ...inputs, suppliers, alreadyOrdered: new Set() });
  const nextMonday = isoAddDays(start, 7);
  const out = new Map<string, Sample>();
  for (const s of suppliers) {
    if (s.method === "work_order") {
      const wo = plan.workOrders.find((w) => w.supplier_id === s.id);
      out.set(s.id, wo ? { lines: wo.lines, details: wo.details, real: true } : {
        lines: [], real: false,
        details: {
          date: nextMonday, start_at: null, end_at: null, all_visits: null, site_address: "1 Example Street, Pakenham VIC 3810",
          crew: ["Example tech"], customer_name: "Example customer", customer_phone: "0400 000 000", customer_email: null,
          jobs: [{ job_id: 0, job_number: "EXAMPLE", job_type: "Install - Split System", customer_name: "Example customer",
            system_installed: "Example split system", electrical_items: "AC-SPLIT-ELEC x1" }],
          note: s.work_order_note,
        },
      });
      continue;
    }
    const o = plan.orders.find((x) => x.supplier_id === s.id);
    // Mitsubishi's form holds 14 rows; the Reece list shows every job.
    out.set(s.id, o ? { lines: s.method === "email_form" ? o.lines.slice(0, 14) : o.lines, details: null, real: true } : {
      details: null, real: false,
      lines: [{
        job_id: 0, job_number: "EXAMPLE", customer_name: "Example customer", suburb: "Pakenham", install_date: nextMonday,
        appointment_start: null, sku_id: null, sku_name: "EXAMPLE-MODEL", sku_type: "Equipment",
        description: "Example line — nothing from this supplier is booked in the next four weeks", supplier_model: "EXAMPLE-MODEL", qty: 1, unit_cost: null,
      }],
    });
  }
  return out;
}

/** Extra people copied on one draft order (on top of the office and the supplier's usual list). */
export async function setOrderCc(id: number, cc: string[]): Promise<boolean> {
  const po = await sbSelectOne<{ status: string }>("purchase_orders", `select=status&id=eq.${id}`);
  if (po?.status !== "draft") return false;
  await sbUpdate("purchase_orders", `id=eq.${id}&status=eq.draft`, { cc_emails: cc, updated_at: new Date().toISOString() });
  return true;
}
