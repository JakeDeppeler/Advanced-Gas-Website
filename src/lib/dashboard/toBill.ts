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
  /**
   * The job the sale was booked onto, when what was sold on this visit is
   * being done as a job of its own (an install booked from the quote). This
   * one isn't billed: the work, and the bill, are on that one.
   */
  waitingOn?: { id: number; jobNumber: string | null; status: string | null };
};

export const TO_BILL_FROM = ST_LEDGER_FROM;

/** Finished jobs to bill — not the ones waiting on the job their sale was booked as. */
export async function toBillJobs(): Promise<ToBillRow[]> {
  return (await toBillAndWaiting()).filter((r) => !r.waitingOn);
}

/**
 * Every finished job at a $0 invoice, with the ones whose sale went to a job
 * of its own marked `waitingOn`. A visit that sold a $8,517 install, booked as
 * #20397 with the deposit paid, read as "Bill it" on the visit — before the
 * install had even happened.
 */
export async function toBillAndWaiting(): Promise<ToBillRow[]> {
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
  /** Sold estimate → the job it was on. */
  const soldEst = new Map<number, number>();
  // Chunked rather than truncated: a cut partway down would make every job
  // past it read as unbilled.
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200).join(",");
    const [invs, ests] = await Promise.all([
      // The base table, not st_invoices_billed: this asks which finished jobs
      // are still at a zero invoice, and the view exists to hide those.
      sbSelect<{ job_id: number | null; total: number | null }>("st_invoices", [q.select("job_id,total"), `job_id=in.(${chunk})`].join("&")),
      sbSelect<{ id: number; job_id: number | null; total: number | null }>("st_estimates", [q.select("id,job_id,total"), `job_id=in.(${chunk})`, "sold_on=not.is.null"].join("&")),
    ]);
    for (const r of ests) if (r.job_id != null) soldEst.set(Number(r.id), Number(r.job_id));
    for (const r of invs) if (r.job_id != null) billed.set(Number(r.job_id), (billed.get(Number(r.job_id)) ?? 0) + Number(r.total ?? 0));
    for (const r of ests) if (r.job_id != null) sold.set(Number(r.job_id), (sold.get(Number(r.job_id)) ?? 0) + Number(r.total ?? 0));
  }

  const unbilled = done.filter((j) => (billed.get(Number(j.id)) ?? 0) === 0).filter((j) => jobClass(j.job_type) !== "quote");

  // The jobs booked from what these visits sold: ServiceTitan records the
  // estimate a job was made from. Only for the unbilled ones that sold.
  const ests = [...soldEst].filter(([, job]) => unbilled.some((j) => Number(j.id) === job)).map(([id]) => id);
  const next = new Map<number, { id: number; jobNumber: string | null; status: string | null; completed: boolean }>();
  for (let i = 0; i < ests.length; i += 100) {
    const rows = await sbSelect<{ id: number; job_number: string | null; status: string | null; est: string | null }>(
      "st_jobs",
      [q.select("id,job_number,status,est:raw->>createdFromEstimateId"), `raw->>createdFromEstimateId=in.(${ests.slice(i, i + 100).join(",")})`].join("&"),
    );
    for (const r of rows) {
      const visit = soldEst.get(Number(r.est));
      // A cancelled follow-on puts the visit back to billing as normal.
      if (visit == null || r.status === "Canceled") continue;
      next.set(visit, { id: Number(r.id), jobNumber: r.job_number ? String(r.job_number) : null, status: r.status, completed: r.status === "Completed" });
    }
  }

  return unbilled
    // Its sale's job is done: that job carries the bill (and is on this list itself until it's billed).
    .filter((j) => !next.get(Number(j.id))?.completed)
    .map((j) => ({
      id: Number(j.id),
      jobNumber: j.job_number ? String(j.job_number) : null,
      jobType: j.job_type ? String(j.job_type) : null,
      customer: j.customer_name ? String(j.customer_name) : null,
      suburb: j.suburb ? String(j.suburb) : null,
      at: String(j.completed_on),
      value: sold.get(Number(j.id)) ?? null,
      ...(next.has(Number(j.id)) ? { waitingOn: (({ id, jobNumber, status }) => ({ id, jobNumber, status }))(next.get(Number(j.id))!) } : {}),
    }));
}

/** The job in ServiceTitan, to open from the list. */
export const stJobUrl = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
