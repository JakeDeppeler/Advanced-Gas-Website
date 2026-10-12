"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveBusiness } from "@/lib/portal/business";
import { normaliseBusiness, type Business } from "@/lib/portal/businessTypes";

/** The business's name and what it has: admins only, since it changes the portal for everyone. */
export async function saveBusinessSettings(input: Business): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change the business settings." };
  const res = await saveBusiness(normaliseBusiness(input));
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  // Every page draws the side bar from these.
  revalidatePath("/portal", "layout");
  return { ok: true };
}
