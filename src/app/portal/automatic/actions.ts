"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { loadSwitches, saveSwitches } from "@/lib/automation/log";

/** Turn the quote-tag clean-up on or off. Admins only: it writes to ServiceTitan. */
export async function setQuoteTag(on: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change this." };
  const r = await saveSwitches({ ...(await loadSwitches()), quoteTag: !!on });
  revalidatePath("/portal/automatic");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}
