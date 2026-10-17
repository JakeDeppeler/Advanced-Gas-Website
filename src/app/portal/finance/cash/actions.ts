"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSettings } from "@/lib/portal/db";

/**
 * The office says the bank is reconciled in Xero up to a day. The portal's
 * Xero connection can't read reconciliation itself (that needs another
 * permission and a reconnect), so this is the stamp the figures are read
 * against: up to date, or how long it's been.
 */
export async function markReconciled(to: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Only the office can mark this." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return { ok: false, error: "Pick the day it's reconciled to." };
  const r = await saveSettings("bank-reconciled", { to, by: me.name, at: new Date().toISOString() });
  if (!r.ok) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/portal/finance/cash");
  revalidatePath("/portal/finance");
  return { ok: true };
}
