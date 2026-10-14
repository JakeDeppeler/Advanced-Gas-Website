import "server-only";
import { getSupplierBills, type SupplierBill } from "@/lib/portal/xero";

/**
 * Reece bills that look like a statement balance rather than the month's
 * purchases.
 *
 * Reece sends one statement a month, and it goes into Xero as one bill. The
 * statement's closing balance carries whatever of last month is still unpaid,
 * so entering the balance instead of the month's new invoices counts last
 * month's materials twice. September 2026 did exactly this: $60,686.84,
 * against $60,000.00 still owing on August's bill. Reece's own invoices aren't
 * read by the portal, so this works from the bills alone:
 *
 *  - the bill matches what was still owing on the one before it, on its date
 *    (within 2%, or $1,000) — the balance carried; or
 *  - its line says it was worked out from a balance ("less … paid from
 *    previous bill", "brought forward").
 *
 * Either is a question, not a verdict: the Reece statement answers it.
 */

export type ReeceFlag = {
  bill: SupplierBill;
  month: string;
  why: "carried" | "worded";
  /** What was still owing on the bill before, on this one's date. */
  owing: number;
  previous: SupplierBill | null;
  /** If it is the balance, the month's own purchases, ex GST. */
  purchasesExGst: number | null;
  /** And how far cost of goods is overstated, ex GST. */
  overstatedExGst: number | null;
};

const REECE = "reece|metalflex";
const monthName = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
const isoMinus = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);

export function flagBills(bills: SupplierBill[]): ReeceFlag[] {
  const out: ReeceFlag[] = [];
  bills.forEach((b, i) => {
    const prev = i > 0 ? bills[i - 1] : null;
    // What was still owing on the bill before: as at this bill's date, and as
    // it stands now — the statement may have been cut after a payment that
    // Xero dates later, so either matching is enough to ask the question.
    const atDate = prev ? Math.max(0, prev.total - prev.payments.filter((p) => p.date && p.date <= b.date).reduce((a, p) => a + p.amount, 0)) : 0;
    const nowOwing = prev ? prev.amountDue : 0;
    const close = (o: number) => o > 500 && Math.abs(b.total - o) <= Math.max(1000, b.total * 0.02);
    const owing = close(atDate) ? atDate : close(nowOwing) ? nowOwing : atDate;
    const carried = close(owing);
    const worded = b.lines.some((l) => /less\b.*\bpaid|previous (bill|statement)|brought forward|\bb\/f\b|balance/i.test(l));
    if (!carried && !worded) return;
    const exRate = b.total > 0 ? b.subTotal / b.total : 1 / 1.1;
    const purchases = carried ? Math.max(0, b.total - owing) * exRate : null;
    out.push({
      bill: b, month: monthName(b.date), why: carried ? "carried" : "worded", owing, previous: prev,
      purchasesExGst: purchases, overstatedExGst: purchases == null ? null : b.subTotal - purchases,
    });
  });
  return out;
}

/** The Reece bills dated in a span that look like a balance. Reads back far enough to have the bill before. */
export async function reeceFlags(from: string, to: string): Promise<ReeceFlag[] | null> {
  const bills = await getSupplierBills(REECE, isoMinus(from, 75), to);
  if (!bills) return null;
  return flagBills(bills).filter((f) => f.bill.date >= from && f.bill.date <= to);
}
