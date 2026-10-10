import "server-only";
import { q, sbInsert, sbSelect, sbUpdate, sbUpsert } from "@/lib/dashboard/db";
import { isPriority, supplierKey, type Owed, type Priority, type SupplierPriority } from "./types";

export async function listPriorities(): Promise<SupplierPriority[]> {
  const rows = await sbSelect<{ supplier: string; priority: string; reason: string | null }>("portal_supplier_priority", q.select("supplier,priority,reason")).catch(() => []);
  return rows.map((r) => ({ supplier: r.supplier, priority: isPriority(r.priority) ? r.priority : "normal", reason: r.reason }));
}

export async function setPriority(supplier: string, priority: Priority, reason: string | null, by: string): Promise<void> {
  await sbUpsert("portal_supplier_priority", [{ supplier: supplierKey(supplier), priority, reason: reason?.trim().slice(0, 300) || null, updated_by: by, updated_at: new Date().toISOString() }], "supplier");
}

export async function listPayables(): Promise<Owed[]> {
  const rows = await sbSelect<{ id: string; supplier: string; what: string | null; amount: number | string; due_on: string }>(
    "portal_payables", [q.select("id,supplier,what,amount,due_on"), "paid_at=is.null", "removed_at=is.null"].join("&"),
  ).catch(() => []);
  return rows.map((r) => ({ id: r.id, supplier: r.supplier, what: r.what, due: r.due_on, amount: Number(r.amount), source: "portal" as const }));
}

export async function addPayable(input: { supplier: string; what: string | null; amount: number; dueOn: string; by: string }): Promise<void> {
  await sbInsert("portal_payables", { supplier: input.supplier.trim(), what: input.what?.trim() || null, amount: input.amount, due_on: input.dueOn, created_by: input.by });
}

export async function closePayable(id: string, how: "paid" | "removed"): Promise<void> {
  await sbUpdate("portal_payables", `id=eq.${encodeURIComponent(id)}`, how === "paid" ? { paid_at: new Date().toISOString() } : { removed_at: new Date().toISOString() });
}
