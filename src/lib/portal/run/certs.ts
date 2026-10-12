import "server-only";
import { q, sbDelete, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

/**
 * Compliance certificates and their five-day clock (migration 0059).
 *
 * Which jobs need one, as the prototype puts it: any job over $750, and every
 * gas appliance, gas pipe or drain whatever the value. ServiceTitan doesn't
 * say which jobs are plumbing work, so it's read off the job type and total:
 * a gas job of any value, or anything over $750 — but never a quote visit, a
 * diagnostic or a site assessment, which do no work. Where that's wrong for a
 * job, the office marks it "No cert needed" and it leaves the list.
 */

export const CERT_DAYS = 5;
const LOOK_BACK_DAYS = 14;
const NO_WORK = /quotation|diagnos|site assessment|warranty/i;
const GAS = /gas|hot water|drain/i;

export type CertJob = {
  jobId: number;
  jobNumber: string | null;
  what: string;
  suburb: string | null;
  value: number | null;
  finished: string;
  daysLeft: number;
  status: "due" | "lodged" | "not_needed";
  number: string | null;
};

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export async function certJobs(): Promise<CertJob[]> {
  const since = new Date(Date.now() - LOOK_BACK_DAYS * 86_400_000).toISOString();
  const [jobs, certs] = await Promise.all([
    sbSelect<{ id: number; job_number: string | null; job_type: string | null; suburb: string | null; total: number | null; completed_on: string | null; business_unit: string | null }>(
      "st_jobs", [q.select("id,job_number,job_type,suburb,total,completed_on,business_unit"), q.gte("completed_on", since), "order=completed_on.desc"].join("&"),
    ).catch(() => []),
    sbSelect<{ job_id: number; status: "lodged" | "not_needed"; number: string | null }>("portal_certs", q.select("job_id,status,number")).catch(() => []),
  ]);
  const byJob = new Map(certs.map((c) => [Number(c.job_id), c]));
  const today = isoDateMelbourne(new Date());
  return jobs
    .filter((j) => {
      const t = j.job_type ?? "";
      if (!j.completed_on || NO_WORK.test(t)) return false;
      return GAS.test(t) || Number(j.total ?? 0) > 750;
    })
    .map((j) => {
      const finished = isoDateMelbourne(new Date(j.completed_on as string));
      const c = byJob.get(Number(j.id));
      return {
        jobId: Number(j.id), jobNumber: j.job_number, what: j.job_type ?? "Job", suburb: j.suburb, value: j.total == null ? null : Number(j.total),
        finished, daysLeft: CERT_DAYS - daysBetween(finished, today), status: c?.status ?? "due", number: c?.number ?? null,
      } satisfies CertJob;
    })
    .sort((a, b) => (a.status === "due" ? 0 : 1) - (b.status === "due" ? 0 : 1) || a.daysLeft - b.daysLeft);
}

export async function setCert(jobId: number, status: "lodged" | "not_needed" | null, number: string | null, by: string) {
  if (status == null) return sbDelete("portal_certs", q.eq("job_id", String(jobId)));
  await sbUpsert("portal_certs", [{
    job_id: jobId, status, number: number?.trim().slice(0, 40) || null,
    lodged_on: status === "lodged" ? isoDateMelbourne(new Date()) : null, updated_by: by, updated_at: new Date().toISOString(),
  }], "job_id");
}
