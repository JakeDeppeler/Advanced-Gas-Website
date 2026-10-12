"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSettings } from "@/lib/portal/db";
import { normaliseCommission } from "@/lib/portal/commissionTypes";

/** The month target and the bonus rate. Admins only: it's pay. */
export async function saveCommission(v: Record<string, number | null>): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change commission." };
  const r = await saveSettings("commission", normaliseCommission({ monthTarget: v.monthTarget, ratePct: v.ratePct }));
  if (!r.ok) return { ok: false, error: "Couldn’t save." };
  revalidatePath("/portal/commission");
  revalidatePath("/portal/rates");
  return { ok: true };
}
