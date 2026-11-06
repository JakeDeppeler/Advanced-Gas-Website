"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveWorkOrderSettings } from "@/lib/outlook/workOrderList";
import type { WorkOrderSettings } from "@/lib/outlook/workOrderTypes";

/** What goes to tenants is a manager's call, as the chat assistant's settings are. */
export async function saveWorkOrderSettingsAction(s: WorkOrderSettings): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Only managers can change what tenants are sent." };
  if (!s.subject.trim() || !s.body.trim()) return { ok: false, error: "The email needs a subject and some words." };
  const res = await saveWorkOrderSettings({ tenantEmail: Boolean(s.tenantEmail), subject: s.subject.trim().slice(0, 200), body: s.body.trim().slice(0, 4000) });
  revalidatePath("/portal/work-orders");
  return res.ok ? { ok: true } : { ok: false, error: "Couldn't save. Try again." };
}
