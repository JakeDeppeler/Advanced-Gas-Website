import "server-only";
import { stFetch, stTenantPath } from "@/lib/dashboard/servicetitan";
import type { Submission } from "./report";

/** A job with more equipment than this gets the newest; a work order email has a size limit. */
const MAX_REPORTS = 6;

/** The tenant's Condition Report forms, by name: the form is "Condition Report " (171) today, but an id would break if it's ever rebuilt. */
async function reportForms(): Promise<string[]> {
  const r = await stFetch<{ data?: Array<{ id?: number; name?: string | null }> }>(stTenantPath("forms", "forms"), { pageSize: "200" });
  return (r.data ?? []).filter((f) => f.id != null && /^\s*condition report/i.test(f.name ?? "")).map((f) => String(f.id));
}

/**
 * The completed Condition Reports on these jobs, newest first. ServiceTitan
 * filters the list by job with owners[0].type/owners[0].id (the probe tried
 * it on 31 Oct; ownerIds is ignored), and each answer is checked to be the
 * job's anyway. A report left at Started isn't finished, so isn't sent.
 */
export async function conditionReports(jobIds: number[]): Promise<Submission[]> {
  if (!jobIds.length) return [];
  const forms = await reportForms();
  if (!forms.length) return [];
  const out: Submission[] = [];
  for (const job of jobIds.slice(0, 6)) {
    const r = await stFetch<{ data?: Submission[] }>(stTenantPath("forms", "submissions"), {
      formIds: forms.join(","), "owners[0].type": "Job", "owners[0].id": String(job), pageSize: "20",
    });
    for (const s of r.data ?? []) {
      if (s.status !== "Completed") continue;
      if (!(s.owners ?? []).some((o) => o.type === "Job" && Number(o.id) === job)) continue;
      if (!out.some((x) => x.id === s.id)) out.push(s);
    }
  }
  return out.sort((a, b) => (b.submittedOn ?? "").localeCompare(a.submittedOn ?? "")).slice(0, MAX_REPORTS);
}
