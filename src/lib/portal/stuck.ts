/**
 * Where the money is stuck — the reading half. Rules in `stuckTypes.ts`.
 *
 * Built from the replica rather than from ServiceTitan directly, so the page
 * opens in a second and costs no API quota. The one thing it does not read is
 * Xero: what customers owed before 17 September is Xero's, and the wall board
 * already merges the two (`stOwed.ts`). This page is honest about that and
 * says which ledger it is counting.
 */

import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { ST_LEDGER_FROM } from "@/lib/dashboard/stOwed";
import { onHold } from "@/lib/dashboard/onHold";
import {
  addTo,
  billable,
  classOf,
  emptyBanded,
  type StuckJob,
  type StuckView,
} from "./stuckTypes";

/** How far back to look for work that was finished and never billed. */
const SINCE_DAYS = 180;

const daysSince = (iso: string | null, now: Date) =>
  iso ? Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000) : 0;

type JobRow = {
  id: number;
  job_number: string | null;
  job_type: string | null;
  customer_name: string | null;
  suburb: string | null;
  completed_on: string | null;
  no_charge: unknown;
};

type InvRow = {
  id: number;
  job_id: number | null;
  total: number | null;
  invoice_date: string | null;
  business_unit: string | null;
  balance: string | null;
  due: string | null;
  customer: string | null;
  ref: string | null;
};

export async function stuckView(now: Date = new Date()): Promise<StuckView> {
  const since = new Date(now.getTime() - SINCE_DAYS * 86_400_000).toISOString();

  const [jobs, invoices, open] = await Promise.all([
    sbSelect<JobRow>(
      "st_jobs",
      [
        q.select("id,job_number,job_type,customer_name,suburb,completed_on,no_charge:raw->noCharge"),
        q.eq("status", "Completed"),
        q.gte("completed_on", since),
        "limit=5000",
      ].join("&"),
    ),
    // Only what is needed to know whether a job has anything on its invoice.
    sbSelect<{ job_id: number | null; total: number | null }>(
      "st_invoices",
      [q.select("job_id,total"), q.gte("invoice_date", since.slice(0, 10)), "limit=10000"].join("&"),
    ),
    sbSelect<InvRow>(
      "st_invoices",
      [
        q.select("id,job_id,total,invoice_date,business_unit,balance:raw->>balance,due:raw->>dueDate,customer:raw->customer->>name,ref:raw->>referenceNumber"),
        q.gte("invoice_date", ST_LEDGER_FROM),
        "limit=5000",
      ].join("&"),
    ),
  ]);

  /* ---------------------------------------------------- done, not billed */
  const billed = new Map<number, number>();
  for (const i of invoices) {
    if (i.job_id == null) continue;
    billed.set(Number(i.job_id), (billed.get(Number(i.job_id)) ?? 0) + Number(i.total ?? 0));
  }

  const bands = emptyBanded();
  const unbilledJobs: StuckJob[] = [];
  let unknownType = 0;
  let noCharge = 0;
  let quoteVisits = 0;

  for (const j of jobs) {
    if (Number(billed.get(Number(j.id)) ?? 0) > 0) continue;
    // ServiceTitan writes the flag as a JSON boolean; a missing one is false.
    if (j.no_charge === true) {
      noCharge += 1;
      continue;
    }
    const cls = classOf(j.job_type);
    if (cls === "quote") {
      quoteVisits += 1;
      continue;
    }
    if (cls === "unknown") {
      unknownType += 1;
      continue;
    }
    if (!billable(cls)) continue;
    const days = daysSince(j.completed_on, now);
    addTo(bands, days);
    unbilledJobs.push({
      jobId: Number(j.id),
      jobNumber: j.job_number ?? null,
      what: j.job_type ?? "Job",
      who: j.customer_name ?? null,
      where: j.suburb ?? null,
      days,
    });
  }
  unbilledJobs.sort((a, b) => b.days - a.days);

  /* ------------------------------------------------------ billed, not paid */
  const owedBands = emptyBanded();
  const notDueYet = { count: 0, value: 0 };
  const owedJobs: Array<StuckJob & { amount: number }> = [];

  for (const i of open) {
    const amount = Number(i.balance ?? 0);
    // Imported rows are Xero's history copied in; they are counted from Xero.
    if (!(amount > 0.5) || /imported|default/i.test(i.business_unit ?? "")) continue;
    const dueOn = (i.due ?? i.invoice_date ?? "").slice(0, 10);
    const late = dueOn ? Math.floor((now.getTime() - Date.parse(`${dueOn}T00:00:00Z`)) / 86_400_000) : 0;
    if (late <= 0) {
      notDueYet.count += 1;
      notDueYet.value += amount;
      continue;
    }
    addTo(owedBands, late, amount);
    owedJobs.push({
      jobId: Number(i.id),
      jobNumber: i.ref ?? null,
      what: "Invoice",
      who: i.customer ?? null,
      where: null,
      days: late,
      amount,
    });
  }
  owedJobs.sort((a, b) => b.days - a.days || b.amount - a.amount);

  /* ------------------------------------------------------------- on hold */
  const hold = await onHold(now).catch(() => null);

  return {
    unbilled: { bands, oldest: unbilledJobs.slice(0, 8), unknownType, noCharge, quoteVisits },
    owed: { bands: owedBands, notDueYet, oldest: owedJobs.slice(0, 8) },
    held: hold
      ? {
          jobs: hold.jobsOnUs + hold.jobsOnThem,
          onUs: hold.jobsOnUs,
          onThem: hold.jobsOnThem,
          reasons: hold.reasons.slice(0, 6).map((r) => ({ name: r.name, jobs: r.jobs, oldestDays: r.oldestDays })),
        }
      : null,
    sinceDays: SINCE_DAYS,
  };
}
