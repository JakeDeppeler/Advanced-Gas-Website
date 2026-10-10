"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSettings } from "@/lib/portal/db";
import { readPayPlan, type PayPlan } from "@/lib/portal/payPlan";

/** Keep the pay plan, so Our hourly rate's "From January" view uses it. */
export async function savePayPlan(input: PayPlan): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Only the office can change the plan." };
  const plan = readPayPlan(input);
  const res = await saveSettings("payplan", plan);
  if (!res.ok) return { ok: false, error: "Couldn't save the plan. Try again." };
  revalidatePath("/portal/finance/planning/commission");
  revalidatePath("/portal/finance/hourly");
  return { ok: true };
}
