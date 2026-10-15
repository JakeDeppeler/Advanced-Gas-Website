import { q, sbSelect } from "./db";
import { jobClass } from "./pace";
import { ST_LEDGER_FROM } from "./stOwed";

/**
 * Jobs finished and not billed — the wall board's To bill, and the whole list
 * on Jobs › Not billed.
 *
 * ServiceTitan opens an invoice the moment a job is created, so a finished job
 * always has an invoice row; what marks one as unbilled is that its invoice is
 * still at zero. Counting missing rows instead would put a confident 0 on the
 * wall forever.
 *
 * From the day ServiceTitan took over invoicing (ST_LEDGER_FROM), not the
 * financial year. Before it, jobs were billed in Xero and their ServiceTitan
 * invoice was never filled in, so every one of them read as unbilled — the
 * list sent the office looking for jobs like Bonbeach #10039 that had long
 * been invoiced and weren't in ServiceTitan to find.
 *
 * Quote visits and site assessments are finished work that was never going to
 * be invoiced, and a cancelled job still gets a completed date; both are left
 * out. Oldest first, because that is the order they get chased in.
 */
export type ToBillRow = {
  id: number;
  jobNumber: string | null;
  jobType: string | null;
  customer?: string | null;
  suburb: string | null;
  /** When it was finished. */
  at: string;
  /** What it was sold for before the visit, inc GST. Null when it's priced after, as most service work is. */
  value: number | null;
};

export const TO_BILL_FROM = ST_LEDGER_FROM;

export async function toBillJobs(): Promise<ToBillRow[]> {
  const done = await sbSelect<{ id: number; job_number: string | null; job_type: string | null; customer_name: string | null; suburb: string | null; completed_on: string }>(
    "st_jobs",
    [
      q.select("id,job_number,job_type,customer_name,suburb,completed_on"),
      q.gte("completed_on", `${TO_BILL_FROM}T00:00:00Z`),
      q.eq("status", "Completed"),
      q.order("completed_on", "asc"),
      "limit=5000",
    ].join("&"),
  );

  const ids = done.map((j) => Number(j.id)).filter(Number.isFinite);
  const billed = new Map<number, number>();
  const sold = new Map<number, number>();
  // Chunked rather than truncated: a cut partway down would make every job
  // past it read as unbilled.
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200).join(",");
    const [invs, ests] = await Promise.all([
      // The base table, not st_invoices_billed: this asks which finished jobs
      // are still at a zero invoice, and the view exists to hide those.
      sbSelect<{ job_id: number | null; total: number | null }>("st_invoices", [q.select("job_id,total"), `job_id=in.(${chunk})`].join("&")),
      sbSelect<{ job_id: number | null; total: number | null }>("st_estimates", [q.select("job_id,total"), `job_id=in.(${chunk})`, "sold_on=not.is.null"].join("&")),
    ]);
    for (const r of invs) if (r.job_id != null) billed.set(Number(r.job_id), (billed.get(Number(r.job_id)) ?? 0) + Number(r.total ?? 0));
    for (const r of ests) if (r.job_id != null) sold.set(Number(r.job_id), (sold.get(Number(r.job_id)) ?? 0) + Number(r.total ?? 0));
  }

  return done
    .filter((j) => (billed.get(Number(j.id)) ?? 0) === 0)
    .filter((j) => jobClass(j.job_type) !== "quote")
    .map((j) => ({
      id: Number(j.id),
      jobNumber: j.job_number ? String(j.job_number) : null,
      jobType: j.job_type ? String(j.job_type) : null,
      customer: j.customer_name ? String(j.customer_name) : null,
      suburb: j.suburb ? String(j.suburb) : null,
      at: String(j.completed_on),
      value: sold.get(Number(j.id)) ?? null,
    }));
}

/** The job in ServiceTitan, to open from the list. */
export const stJobUrl = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
