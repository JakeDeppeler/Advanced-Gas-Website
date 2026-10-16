"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getCapSettings, saveSettings } from "@/lib/portal/db";
import { normalisePricing } from "@/lib/portal/pricingTypes";

/**
 * The rate we charge, the call-out and after-hours, and the profit we want —
 * that last one is capacity.margin, which Our hourly rate builds every rate
 * from, so it's changed on the stored capacity row and nothing else moves.
 */
export async function savePricing(v: Record<string, number | null>): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  const p = await saveSettings("pricing", normalisePricing({ hourly: v.hourly, solo: v.solo, install: v.install, callout: v.callout, afterHours: v.afterHours }));
  if (!p.ok) return { ok: false, error: "Couldn’t save." };
  const margin = v.margin;
  if (margin != null) {
    if (!(margin >= 0 && margin < 100)) return { ok: false, error: "Profit has to be between 0 and 100%." };
    const stored = await getCapSettings();
    if (!stored) return { ok: false, error: "The rates saved. Set up Team & wages first, then the profit can be saved." };
    const r = await saveSettings("capacity", { ...stored, margin });
    if (!r.ok) return { ok: false, error: "The rates saved; the profit didn’t." };
  }
  for (const path of ["/portal/pricing", "/portal/rates", "/portal/finance/hourly", "/portal/finance/capacity", "/portal/finance/cover"]) revalidatePath(path);
  return { ok: true };
}
