import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { ST_LEDGER_FROM } from "@/lib/dashboard/stOwed";
import { onHold } from "@/lib/dashboard/onHold";
import { toBillJobs } from "@/lib/dashboard/toBill";
import { pipelineDue } from "@/lib/pipeline/store";

/**
 * The office's morning, in the order the AGA job workflow runs it: review
 * yesterday's invoices, send the ones with money owing, clear the Hold list,
 * ring the quotes due, chase part-paid installs — plus the finished jobs with
 * no invoice at all, which the workflow assumes can't happen and the data
 * says does.
 *
 * Everything reads the ServiceTitan replica, so the page opens in a second and
 * each line says the same thing ServiceTitan's own list would. Only finished
 * jobs from the day ServiceTitan took over invoicing count: an open job's
 * invoice isn't ready to review, and earlier ones were billed in Xero.
 */

export type OfficeItem = { jobId: number; jobNumber: string | null; customer: string | null; what: string | null; amount: number | null; since: string | null };
export type OfficeLine = { count: number; value: number | null; items: OfficeItem[] };
export type OfficeDay = {
  review: OfficeLine & { yesterday: number };
  notSent: OfficeLine;
  partPaid: OfficeLine;
  hold: OfficeLine & { onUs: number };
  followUps: { due: number; late: number; open: number };
  toBill: OfficeLine;
};

type Inv = { job_id: number | null; total: number | null; review: string | null; sent: string | null; balance: string | null; invoice_date: string | null; business_unit: string | null };
type Job = { id: number; job_number: string | null; customer_name: string | null; job_type: string | null; completed_on: string | null; status: string | null };

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const TOP = 8;

export async function officeDay(now: Date = new Date()): Promise<OfficeDay> {
  const [invs, held, due, unbilled] = await Promise.all([
    sbSelect<Inv>("st_invoices", [
      q.select("job_id,total,review:raw->>reviewStatus,sent:raw->>sentStatus,balance:raw->>balance,invoice_date,business_unit"),
      q.gte("invoice_date", ST_LEDGER_FROM), "limit=5000",
    ].join("&")),
    onHold(now).catch(() => null),
    pipelineDue().catch(() => ({ due: 0, late: 0, openCount: 0, openValue: 0 })),
    toBillJobs().catch(() => []),
  ]);

  // Only finished jobs' invoices: one on an open job is a booking, not a bill.
  const jobIds = [...new Set(invs.map((i) => i.job_id).filter((v): v is number => v != null))];
  const jobs = new Map<number, Job>();
  for (let i = 0; i < jobIds.length; i += 200) {
    const rows = await sbSelect<Job>("st_jobs", [q.select("id,job_number,customer_name,job_type,completed_on,status"), `id=in.(${jobIds.slice(i, i + 200).join(",")})`].join("&"));
    for (const j of rows) jobs.set(Number(j.id), j);
  }
  const done = invs
    .filter((i) => !/imported|default/i.test(i.business_unit ?? ""))
    .map((i) => ({ i, j: i.job_id != null ? jobs.get(Number(i.job_id)) : undefined }))
    .filter((x): x is { i: Inv; j: Job } => !!x.j && x.j.status === "Completed");

  const item = (x: { i: Inv; j: Job }, amount: number | null): OfficeItem => ({
    jobId: Number(x.j.id), jobNumber: x.j.job_number, customer: x.j.customer_name, what: x.j.job_type, amount, since: x.j.completed_on,
  });
  const line = (list: Array<{ i: Inv; j: Job }>, amount: (i: Inv) => number | null): OfficeLine => {
    const sorted = [...list].sort((a, b) => (a.j.completed_on ?? "").localeCompare(b.j.completed_on ?? ""));
    const vals = list.map((x) => amount(x.i)).filter((v): v is number => v != null);
    return { count: list.length, value: vals.length ? vals.reduce((a, b) => a + b, 0) : null, items: sorted.slice(0, TOP).map((x) => item(x, amount(x.i))) };
  };

  const yesterday = new Date(now.getTime() - 86_400_000 + 10 * 3_600_000).toISOString().slice(0, 10);
  const needsReview = done.filter((x) => (x.i.review ?? "") !== "Reviewed");
  const review = { ...line(needsReview, (i) => n(i.total)), yesterday: needsReview.filter((x) => (x.j.completed_on ?? "").slice(0, 10) >= yesterday).length };
  const notSent = line(done.filter((x) => x.i.sent === "NotSent" && n(x.i.balance) > 0.5), (i) => n(i.balance));
  const partPaid = line(done.filter((x) => n(x.i.balance) > 0.5 && n(x.i.total) - n(x.i.balance) > 0.5), (i) => n(i.balance));

  const heldJobs = held?.jobs ?? [];
  const hold: OfficeDay["hold"] = {
    count: heldJobs.length,
    value: heldJobs.some((h) => h.value != null) ? heldJobs.reduce((a, h) => a + (h.value ?? 0), 0) : null,
    items: [...heldJobs].sort((a, b) => b.ageDays - a.ageDays).slice(0, TOP).map((h) => ({ jobId: h.jobId, jobNumber: h.jobNumber, customer: h.who, what: h.reasons.join(", ") || h.what, amount: h.value, since: new Date(now.getTime() - h.ageDays * 86_400_000).toISOString() })),
    onUs: held?.jobsOnUs ?? 0,
  };

  const toBill: OfficeLine = {
    count: unbilled.length,
    value: unbilled.some((u) => u.value != null) ? unbilled.reduce((a, u) => a + (u.value ?? 0), 0) : null,
    items: unbilled.slice(0, TOP).map((u) => ({ jobId: u.id, jobNumber: u.jobNumber, customer: u.customer ?? null, what: u.jobType, amount: u.value, since: u.at })),
  };

  return { review, notSent, partPaid, hold, followUps: { due: due.due, late: due.late, open: due.openCount }, toBill };
}
