import { arBand } from "@/lib/portal/ar";
import { q, sbSelect } from "./db";
import type { XeroResult } from "./xero";

/**
 * The day ServiceTitan became the ledger for invoices and payments.
 *
 * Up to 17 September 2026 every sale was a Xero invoice (INV-0xxxx) and was
 * paid against in Xero. From then on ServiceTitan keeps the invoices (20xxx)
 * and the payments, and sends Xero one journal a day: Xero's P&L is complete,
 * but it holds no invoice to show as owing — the last is INV-03654 of 17
 * September. So what customers owe is Xero's unpaid invoices from before this
 * date plus ServiceTitan's open balances from it on. ServiceTitan's balances
 * before it are no good: those payments were only ever recorded in Xero, which
 * is what made ServiceTitan read $420K open.
 */
export const ST_LEDGER_FROM = "2026-09-17";

export type StOpen = {
  id: number; number: string; name: string | null; due: string; amount: number; unit: string | null;
  /** The invoice's full price and its job, so a deposit shows as what's been paid of it. */
  total: number; jobId: number | null;
  /**
   * Whether the work is done. ServiceTitan opens a job's invoice when it's
   * booked, dated that day with its terms running, so a $10,000 install with
   * a $2,000 deposit reads $8,000 owing — and overdue — weeks before anyone
   * has been out. Until the job is finished the balance isn't owed yet.
   */
  done: boolean;
};

/** A business unit that says something. ServiceTitan's imported history all sits in one that doesn't. */
export const realUnit = (bu: string | null | undefined) => (bu && !/imported|default/i.test(bu) ? bu.trim() : null);

/** ServiceTitan's invoices since it became the ledger that still have money owing. Throws when it can't read. */
export async function stOpenInvoices(): Promise<StOpen[]> {
  type R = { id: number; job_id: number | null; total: number | null; invoice_date: string; business_unit: string | null; ref: string | null; balance: string | null; due: string | null; customer: string | null };
  const rows = (await sbSelect<R>("st_invoices", [
    q.select("id,job_id,total,invoice_date,business_unit,ref:raw->>referenceNumber,balance:raw->>balance,due:raw->>dueDate,customer:raw->customer->>name"),
    q.gte("invoice_date", ST_LEDGER_FROM), "limit=5000",
  ].join("&")))
    // Imported rows are Xero's history copied in, already counted from Xero.
    .filter((r) => Number(r.balance) > 0.5 && !/imported|default/i.test(r.business_unit ?? ""));
  const jobIds = [...new Set(rows.map((r) => r.job_id).filter((v): v is number => v != null))];
  const status = new Map<number, string | null>();
  for (let i = 0; i < jobIds.length; i += 200) {
    const js = await sbSelect<{ id: number; status: string | null }>("st_jobs", [q.select("id,status"), `id=in.(${jobIds.slice(i, i + 200).join(",")})`].join("&"));
    for (const j of js) status.set(Number(j.id), j.status);
  }
  return rows.map((r) => ({
    id: r.id, number: r.ref ?? String(r.id), name: r.customer, due: (r.due ?? r.invoice_date).slice(0, 10),
    amount: Number(r.balance), unit: realUnit(r.business_unit), total: Number(r.total ?? r.balance) || Number(r.balance),
    jobId: r.job_id, done: r.job_id == null || status.get(Number(r.job_id)) === "Completed",
  }));
}

/**
 * Xero's receivables with ServiceTitan's open invoices added, for the wall:
 * the same totals, aging buckets and oldest-first chase list, over both. An
 * invoice in both is counted once, from Xero.
 */
export function withStOpen(xero: Extract<XeroResult, { ok: true }>, st: StOpen[], todayMel: string): Extract<XeroResult, { ok: true }> {
  // Both agings copied, not just the one: this adds ServiceTitan's open
  // invoices to whichever bands they fall in, and mutating the reading it was
  // handed would leave the caller's copy quietly double-counted.
  const out = { ...xero, aging: { ...xero.aging }, arAging: { ...xero.arAging }, overdue: [...xero.overdue], numbers: [...xero.numbers] };
  const seen = new Set(xero.numbers);
  const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  for (const i of st) {
    if (seen.has(i.number)) continue;
    out.numbers.push(i.number);
    out.receivablesTotal += i.amount;
    // Overdue from the day after it's due, the same line Xero's are drawn on —
    // and never while the work isn't done: that's a deposit's balance waiting.
    if (!i.done || i.due >= todayMel) {
      out.aging.notDue += i.amount;
      out.arAging.current += i.amount;
      out.rows.push({ customer: i.name ?? "", amount: i.amount, daysOver: 0 });
      continue;
    }
    const days = Math.round((day(todayMel) - day(i.due)) / 86_400_000);
    out.arAging[arBand(days)] += i.amount;
    out.rows.push({ customer: i.name ?? "", amount: i.amount, daysOver: days });
    out.overdueTotal += i.amount;
    out.overdueCount += 1;
    if (days <= 7) out.aging.d1to7 += i.amount;
    else if (days <= 14) out.aging.d8to14 += i.amount;
    else if (days <= 30) out.aging.d15to30 += i.amount;
    else out.aging.d30plus += i.amount;
    out.overdue.push({ number: i.number, name: i.name, days, amount: i.amount });
  }
  out.overdue.sort((a, b) => b.days - a.days);
  return out;
}
