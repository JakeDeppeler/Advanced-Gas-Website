import "server-only";
import { getSalesInvoiceIndex } from "@/lib/portal/xero";
import { matchAgainstXero, xeroWindow, type XeroCheck } from "@/lib/portal/run/xeroBilled";
import { openJobs, type OpenFacts } from "./load";

/**
 * What to do with each job the old system left open.
 *
 * About 125 jobs came across into ServiceTitan's "Imported Default" unit still
 * open, some with $160K of charges sitting on invoices that were never issued.
 * They were worked and billed in Xero before 17 September, mostly, but nothing
 * said which. Each is looked up in Xero the way the finished jobs from then are
 * (matchAgainstXero): by reference, by customer and amount, by customer near
 * the date. What's left with a charge on it and nothing in Xero is work that
 * may never have been billed.
 */
export type ImportedVerdict = "billed" | "check" | "unbilled" | "empty";
export type ImportedCheck = XeroCheck & { verdict: ImportedVerdict; status: string; customerId: number | null };

function verdictOf(c: XeroCheck): ImportedVerdict {
  if (c.match === "reference" || c.match === "amount") return "billed";
  if (c.match === "customer") return "check";
  // Nothing in Xero: with a charge on the job that's money; without one it's a record to close.
  return c.sold != null ? "unbilled" : "empty";
}

/** Null when Xero isn't connected or didn't answer: the list says so rather than calling every job unbilled. */
export async function importedAgainstXero(nowMs: number): Promise<ImportedCheck[] | null> {
  const jobs = (await openJobs(nowMs)).filter((j) => j.stage === "imported");
  if (!jobs.length) return [];
  const doneOn = (j: OpenFacts) => j.lastVisit ?? j.createdOn ?? new Date(nowMs).toISOString();
  const spans = jobs.map((j) => xeroWindow(doneOn(j).slice(0, 10)));
  const from = spans.reduce((m, s) => (s.from < m ? s.from : m), spans[0].from);
  const to = spans.reduce((m, s) => (s.to > m ? s.to : m), spans[0].to);
  const xero = await getSalesInvoiceIndex(from, to);
  if (!xero) return null;

  const facts = new Map(jobs.map((j) => [j.id, j]));
  const checks = matchAgainstXero(jobs.map((j) => ({
    id: j.id, jobNumber: j.jobNumber, jobType: j.jobType, customer: j.customer, suburb: j.suburb, doneOn: doneOn(j),
    // What's charged on the job is what the Xero invoice would be for; a sold quote stands in where nothing's charged.
    sold: j.invoiced > 0.5 ? j.invoiced : j.sold > 0.5 ? j.sold : null,
    reference: j.reference,
  })), xero);

  const order: Record<ImportedVerdict, number> = { unbilled: 0, check: 1, empty: 2, billed: 3 };
  return checks
    .map((c) => ({ ...c, verdict: verdictOf(c), status: facts.get(c.id)?.status ?? "", customerId: facts.get(c.id)?.customerId ?? null }))
    .sort((a, b) => order[a.verdict] - order[b.verdict] || (b.sold ?? 0) - (a.sold ?? 0));
}
