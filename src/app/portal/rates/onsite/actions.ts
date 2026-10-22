"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSettings } from "@/lib/portal/db";
import { CREWS } from "@/lib/portal/cover/hour";
import { normaliseSiteRates } from "@/lib/portal/siteRates";

/** The on-site and commercial hours, profit and charges, from the form's flat keys. */
export async function saveSiteRates(v: Record<string, number | null>): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  for (const k of ["onsiteHrs", "commercialHrs"]) if (v[k] != null && !(v[k]! > 0 && v[k]! <= 24)) return { ok: false, error: "Hours billed has to be between 0 and 24." };
  if (v.commercialMargin != null && !(v.commercialMargin >= 0 && v.commercialMargin < 100)) return { ok: false, error: "Profit has to be between 0 and 100%." };
  const r = await saveSettings("site_rates", normaliseSiteRates({
    onsiteHrs: v.onsiteHrs, commercialHrs: v.commercialHrs, commercialMargin: v.commercialMargin,
    onsite: Object.fromEntries(CREWS.map((c) => [c.k, v[`onsite_${c.k}`]])),
    commercial: Object.fromEntries(CREWS.map((c) => [c.k, v[`commercial_${c.k}`]])),
  }));
  revalidatePath("/portal/rates/onsite");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn’t save." };
}
