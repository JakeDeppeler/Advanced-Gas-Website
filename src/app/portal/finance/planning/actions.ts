"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSettings } from "@/lib/portal/db";
import type { Targets } from "@/lib/portal/targets";

export type ActionResult = { ok: boolean; error?: string };

/**
 * The year's target lives in the shared settings rather than in one person's
 * browser, because it is the business's number: the figure on the planning
 * page and the figure behind the quoting maths have to be the same one.
 */
export async function saveTargets(t: Targets): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  const clean: Targets = {
    revenue: Math.max(0, Math.round(t.revenue) || 0),
    winRate: Math.min(100, Math.max(1, Math.round(t.winRate) || 1)),
    avgJob: Math.max(1, Math.round(t.avgJob) || 1),
    daysWeek: Math.min(7, Math.max(1, Math.round(t.daysWeek) || 5)),
  };
  const res = await saveSettings("targets", clean);
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  revalidatePath("/portal/finance/planning");
  revalidatePath("/portal/finance");
  return { ok: true };
}
