"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getCapSettings, saveSettings } from "@/lib/portal/db";

/**
 * Save the form's wages, crew, hours billed and days on the tools as the
 * numbers every page works the hour from. The charge rate isn't saved here:
 * the rates live on Rates & pricing.
 */
export async function saveHourModel(form: FormData): Promise<void> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return;
  const n = (k: string, lo: number, hi: number) => {
    const v = Number(form.get(k));
    return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined;
  };
  const stored = await getCapSettings();
  if (!stored) return;
  const hourModel = { techWage: n("tw", 1, 500), appWage: n("aw", 1, 500), billPerDay: n("b", 1, 12), daysOnTools: n("d", 50, 260), techs: n("tn", 1, 50), apps: n("an", 0, 50) };
  await saveSettings("capacity", { ...stored, hourModel: { ...(stored.hourModel ?? {}), ...Object.fromEntries(Object.entries(hourModel).filter(([, v]) => v != null)) } });
  for (const p of ["/portal/finance/cover", "/portal/finance/running", "/portal/finance/hourly", "/portal/rates", "/portal/finance/planning", "/portal/finance/capacity", "/portal/month"]) revalidatePath(p);
  redirect("/portal/finance/cover?saved=1");
}
