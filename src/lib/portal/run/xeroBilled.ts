import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { jobClass } from "@/lib/dashboard/pace";
import { ST_LEDGER_FROM } from "@/lib/dashboard/stOwed";
import { currentYear, yearSpans } from "@/lib/portal/yearGoal";
import { getSalesInvoiceIndex, type SalesInvoiceRow } from "@/lib/portal/xero";

/**
 * The jobs finished before ServiceTitan took over invoicing, checked against
 * Xero.
 *
 * Before 17 September the office invoiced in Xero, so a finished job from then
 * has a $0 invoice in ServiceTitan whether it was billed or not. The To bill
 * list leaves them out; this is the check it can't make. Xero holds no
 * ServiceTitan job number, so each job is matched three ways, strongest first:
 *
 *   reference  ServiceTitan's customer PO is the agent's work-order number
 *              (TAPI-022335, JOB NO. 24020, REF NO. 10055), and the Xero
 *              invoice for the job carries the same reference. Exact.
 *   amount     An invoice to the same customer, within the job's window, for
 *              what the job was sold for. Near enough exact.
 *   customer   Invoices to the same customer around when the job was done,
 *              but nothing to tie one to this job — an agency is billed for
 *              many jobs a month. Said as a maybe, with the invoices to look at.
 *
 * And none: nothing in Xero to that customer from three months before the job
 * to six weeks after. That's the list to chase. Jobs copied across from the
 * old system carry no reference, so most of theirs are customer matches.
 */

export type XeroCheck = {
  id: number;
  jobNumber: string | null;
  jobType: string | null;
  customer: string | null;
  suburb: string | null;
  doneOn: string;
  /** What it was sold for, inc GST, where it was sold before the visit. */
  sold: number | null;
  reference: string | null;
  match: "reference" | "amount" | "customer" | "none";
  invoices: SalesInvoiceRow[];
};

const BEFORE_DAYS = 90;
const AFTER_DAYS = 45;
const DAY = 86_400_000;
const shift = (iso: string, days: number) => new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

// "TAPI-022335", "JOB NO. 24020", "REF NO. 10055", "Reference no. 9039",
// "JOB REF. 9126", "Work order #23786" → the number that identifies it.
// A Property Tree TAPI number is unique on its own; a plain job or reference
// number is the agent's, so it only counts with the same customer.
export const refKey = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const t = s.toUpperCase();
  const tapi = t.match(/TAPI\W*0*(\d{3,})/);
  if (tapi) return `T${tapi[1]}`;
  const num = t.match(/(?:JOB|REF(?:ERENCE)?|WORK\s*ORDER|WO)\W{0,4}(?:(?:NO|NUMBER|REF)\W{0,3})?#?\s*0*(\d{3,})/);
  if (num) return `N${num[1]}`;
  const plain = t.replace(/[^A-Z0-9]/g, "");
  return plain.length >= 5 ? `P${plain}` : null;
};

const words = (s: string) => s.toLowerCase().replace(/&/g, " ").replace(/\b(pty|ltd|limited|the|and)\b/g, " ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1);

/** The same customer: the same name, or sharing a first and last name ("Jason Jurgens & Heather Jurgens" and "Jason Jurgens"). */
function sameCustomer(a: string, b: string): boolean {
  const x = words(a), y = words(b);
  if (!x.length || !y.length) return false;
  if (x.join(" ") === y.join(" ")) return true;
  const shared = x.filter((w) => y.includes(w));
  return shared.length >= 2 && shared.length >= Math.min(x.length, y.length) - 1;
}

/** The span of Xero invoices a job done on this day is looked for in. */
export const xeroWindow = (doneOn: string) => ({ from: shift(doneOn, -BEFORE_DAYS), to: shift(doneOn, AFTER_DAYS) });

/**
 * Each job against Xero's invoices, by reference, then amount, then customer,
 * as above. Shared with the job tracker's check of the jobs the old system
 * left open, so both lists call a job billed for the same reasons. `xero`
 * must cover every job's window (xeroWindow).
 */
export function matchAgainstXero(jobs: Array<Omit<XeroCheck, "match" | "invoices">>, xero: SalesInvoiceRow[]): XeroCheck[] {
  const byRef = new Map<string, SalesInvoiceRow[]>();
  for (const inv of xero) {
    const k = refKey(inv.reference);
    if (k) byRef.set(k, [...(byRef.get(k) ?? []), inv]);
  }

  const checks: XeroCheck[] = jobs.map((base) => {
    const done = base.doneOn.slice(0, 10);
    const { from: lo, to: hi } = xeroWindow(done);
    const k = refKey(base.reference);
    const byReference = k ? (byRef.get(k) ?? []).filter((x) => k.startsWith("T") || (base.customer ? sameCustomer(x.contact, base.customer) : false)) : [];
    if (byReference.length) return { ...base, match: "reference" as const, invoices: byReference };
    const theirs = base.customer ? xero.filter((x) => x.date >= lo && x.date <= hi && sameCustomer(x.contact, base.customer!)) : [];
    const want = base.sold;
    if (want && want > 0) {
      const exact = theirs.filter((x) => Math.abs(x.total - want) <= Math.max(2, want * 0.02));
      if (exact.length) return { ...base, match: "amount" as const, invoices: exact };
    }
    if (theirs.length) {
      // Nearest the finish date first: the invoice most likely to be this job's.
      const near = [...theirs].sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(done)) - Math.abs(Date.parse(b.date) - Date.parse(done)));
      return { ...base, match: "customer" as const, invoices: near.slice(0, 4) };
    }
    return { ...base, match: "none" as const, invoices: [] };
  });

  const order = { none: 0, customer: 1, amount: 2, reference: 3 } as const;
  checks.sort((a, b) => order[a.match] - order[b.match] || a.doneOn.localeCompare(b.doneOn));
  return checks;
}

export async function oldJobsAgainstXero(): Promise<{ checks: XeroCheck[]; from: string; to: string } | null> {
  const from = yearSpans("financial", currentYear("financial", new Date()))[0].from;
  const to = ST_LEDGER_FROM;
  const jobs = await sbSelect<{ id: number; job_number: string | null; job_type: string | null; customer_name: string | null; suburb: string | null; completed_on: string; no_charge: unknown; po: string | null }>(
    "st_jobs",
    [
      q.select("id,job_number,job_type,customer_name,suburb,completed_on,no_charge:raw->noCharge,po:raw->>customerPo"),
      q.gte("completed_on", `${from}T00:00:00Z`),
      `completed_on=lt.${to}T00:00:00Z`,
      q.eq("status", "Completed"),
      q.order("completed_on", "asc"),
      "limit=5000",
    ].join("&"),
  );

  const ids = jobs.map((j) => Number(j.id));
  const billed = new Map<number, number>();
  const sold = new Map<number, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200).join(",");
    const [invs, ests] = await Promise.all([
      sbSelect<{ job_id: number | null; total: number | null }>("st_invoices", [q.select("job_id,total"), `job_id=in.(${chunk})`].join("&")),
      sbSelect<{ job_id: number | null; total: number | null }>("st_estimates", [q.select("job_id,total"), `job_id=in.(${chunk})`, "sold_on=not.is.null"].join("&")),
    ]);
    for (const r of invs) if (r.job_id != null) billed.set(Number(r.job_id), (billed.get(Number(r.job_id)) ?? 0) + Number(r.total ?? 0));
    for (const r of ests) if (r.job_id != null) sold.set(Number(r.job_id), (sold.get(Number(r.job_id)) ?? 0) + Number(r.total ?? 0));
  }
  // Billed in ServiceTitan after all (finished before the switch, invoiced after it) — nothing to check.
  const open = jobs.filter((j) => !((billed.get(Number(j.id)) ?? 0) > 0.5) && j.no_charge !== true && jobClass(j.job_type) !== "quote");
  if (!open.length) return { checks: [], from, to };

  const xero = await getSalesInvoiceIndex(shift(from, -BEFORE_DAYS), shift(to, AFTER_DAYS));
  if (!xero) return null;
  const checks = matchAgainstXero(open.map((j) => ({
    id: Number(j.id), jobNumber: j.job_number, jobType: j.job_type, customer: j.customer_name, suburb: j.suburb,
    doneOn: j.completed_on, sold: sold.get(Number(j.id)) ?? null, reference: j.po?.trim() || null,
  })), xero);
  return { checks, from, to };
}
