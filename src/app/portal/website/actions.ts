"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { linkLead, pushLeadToJob, unlinkLead, type LinkResult } from "@/lib/leads/jobLink";

/**
 * Website leads: tie an enquiry to its ServiceTitan job, untie it, or try
 * again to put the form and photos on the job. The office's, as the rest
 * of the page is: linking writes to ServiceTitan.
 */
async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

export async function linkLeadToJob(input: { id: string; job: string }): Promise<LinkResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Only the office can link enquiries." };
  try {
    const r = await linkLead(String(input.id ?? ""), String(input.job ?? "").slice(0, 20), me.name || me.email);
    revalidatePath("/portal/website");
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200) };
  }
}

export async function unlinkLeadFromJob(id: string): Promise<LinkResult> {
  if (!(await office())) return { ok: false, error: "Only the office can unlink enquiries." };
  try {
    const r = await unlinkLead(String(id ?? ""));
    revalidatePath("/portal/website");
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200) };
  }
}

export async function retryLeadUpload(id: string): Promise<LinkResult> {
  if (!(await office())) return { ok: false, error: "Only the office can do that." };
  try {
    const r = await pushLeadToJob(String(id ?? ""));
    revalidatePath("/portal/website");
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200) };
  }
}
