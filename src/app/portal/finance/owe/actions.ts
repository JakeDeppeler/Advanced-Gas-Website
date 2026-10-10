"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { addPayable, closePayable, setPriority } from "@/lib/owe/store";
import { isPriority } from "@/lib/owe/types";

export type OweResult = { ok: boolean; error?: string };

async function me() {
  const u = await getPortalUser();
  return u && can(u, "overhead") ? u : null;
}

export async function savePriority(supplier: string, priority: string, reason: string): Promise<OweResult> {
  const u = await me();
  if (!u) return { ok: false, error: "Only the office can change this." };
  if (!supplier.trim() || !isPriority(priority)) return { ok: false, error: "Pick a priority." };
  try { await setPriority(supplier, priority, reason, u.name); } catch { return { ok: false, error: "Couldn't save that. Try again." }; }
  revalidatePath("/portal/finance/owe");
  return { ok: true };
}

export async function addOwed(input: { supplier: string; what: string; amount: string; dueOn: string }): Promise<OweResult> {
  const u = await me();
  if (!u) return { ok: false, error: "Only the office can change this." };
  const amount = Number(String(input.amount).replace(/[$,\s]/g, ""));
  if (!input.supplier.trim()) return { ok: false, error: "Who is it owed to?" };
  if (!(amount > 0)) return { ok: false, error: "How much is owed?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn)) return { ok: false, error: "When is it due?" };
  try { await addPayable({ supplier: input.supplier, what: input.what, amount, dueOn: input.dueOn, by: u.name }); } catch { return { ok: false, error: "Couldn't save that. Try again." }; }
  revalidatePath("/portal/finance/owe");
  return { ok: true };
}

export async function closeOwed(id: string, how: "paid" | "removed"): Promise<OweResult> {
  const u = await me();
  if (!u) return { ok: false, error: "Only the office can change this." };
  try { await closePayable(id, how); } catch { return { ok: false, error: "Couldn't save that. Try again." }; }
  revalidatePath("/portal/finance/owe");
  return { ok: true };
}
