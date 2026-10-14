"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSpread } from "@/lib/portal/run/spread";

/** Which Xero accounts are once-a-year bills, spread across the year on the KPI pages. */
export async function saveSpreadAccounts(accounts: string[]): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  const clean = [...new Set((Array.isArray(accounts) ? accounts : []).filter((a) => typeof a === "string").map((a) => a.trim().slice(0, 120)).filter(Boolean))].slice(0, 30);
  if (!(await saveSpread(clean))) return { ok: false, error: "Couldn't save." };
  revalidatePath("/portal/kpis");
  return { ok: true };
}
