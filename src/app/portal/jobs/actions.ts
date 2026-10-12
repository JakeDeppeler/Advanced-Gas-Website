"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { setCert } from "@/lib/portal/run/certs";

/** Lodged with the VBA, not needed, or undo. Office only. */
export async function markCert(form: FormData): Promise<void> {
  const me = await getPortalUser();
  if (!me || !(can(me, "overhead") || can(me, "quotes"))) return;
  const jobId = Number(form.get("job"));
  const what = String(form.get("what") ?? "");
  if (!Number.isFinite(jobId)) return;
  const status = what === "lodged" ? "lodged" : what === "not_needed" ? "not_needed" : null;
  await setCert(jobId, status, String(form.get("number") ?? "") || null, me.name);
  revalidatePath("/portal/jobs");
}
