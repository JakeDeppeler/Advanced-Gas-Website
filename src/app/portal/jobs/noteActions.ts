"use server";

import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { q, sbSelectOne } from "@/lib/dashboard/db";
import { serviceTitanConfigured, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

/**
 * A note on any job in ServiceTitan, from the office, by job number. Signed
 * with who wrote it, so the job's history in ServiceTitan says where it came
 * from. The same people who can open the job tracker.
 */
export async function addOfficeJobNote(jobNumber: string, text: string): Promise<{ ok: boolean; error?: string; said?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "That's for the office." };
  const num = String(jobNumber ?? "").replace(/[^\d]/g, "");
  const body = String(text ?? "").trim();
  if (!num) return { ok: false, error: "Which job? Put the job number in." };
  if (!body) return { ok: false, error: "Write the note first." };
  if (!serviceTitanConfigured()) return { ok: false, error: "ServiceTitan isn't connected." };
  const job = await sbSelectOne<{ id: number; customer_name: string | null; suburb: string | null }>(
    "st_jobs", [q.select("id,customer_name,suburb"), q.eq("job_number", num)].join("&"),
  ).catch(() => null);
  if (!job) return { ok: false, error: `There's no job ${num} in ServiceTitan's copy here. Check the number, or it may be brand new: try again in ten minutes.` };
  try {
    await stSend("POST", stTenantPath("jpm", `jobs/${job.id}/notes`), { text: `${body.slice(0, 3800)}\n— ${me.name}, from the portal`, pinToTop: false });
  } catch {
    return { ok: false, error: "ServiceTitan didn't take the note. Try again." };
  }
  return { ok: true, said: `On job ${num}${job.customer_name ? `, ${job.customer_name}` : ""}${job.suburb ? `, ${job.suburb}` : ""}.` };
}
