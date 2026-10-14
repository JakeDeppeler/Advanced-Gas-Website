/**
 * Today's money in, split into deposits, part payments and finals.
 *
 * The rule and the reason it has to be derived are in `paidKindTypes.ts`.
 * This is the reading half.
 *
 * **Where "what was already paid" comes from.** A final paid today against a
 * deposit taken in August is a final, so each invoice needs its paid-to-date
 * before today. Rather than scan every payment ever made, that comes off the
 * invoice itself: `total - balance` is what it has taken, balance being current
 * as of the last sync, so subtracting today's own payments leaves what it had
 * before. One extra read of the invoices actually involved, instead of a table
 * scan of 4,500 payments for a figure the invoice already holds.
 */

import "server-only";
import { q, sbSelect } from "./db";
import {
  kindsForInvoice,
  tallyKinds,
  type AppliedPayment,
  type PaidKindRow,
  type PaidKinds,
} from "./paidKindTypes";

export * from "./paidKindTypes";

type PaymentRow = {
  id: number;
  total: number | null;
  active: boolean | null;
  paid_on: string | null;
  applied_to: unknown;
};

/** One entry of `applied_to`, as ServiceTitan writes it. */
type Applied = { appliedTo?: unknown; appliedAmount?: unknown };

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The day's payments by kind. Null when nothing has been banked, which the
 * card shows as a quiet day rather than three zeroes.
 */
export async function paidKinds(day: string): Promise<PaidKinds | null> {
  const payments = await sbSelect<PaymentRow>(
    "st_payments",
    [q.select("id,total,active,paid_on,applied_to"), q.eq("paid_on", day)].join("&"),
  );

  // Reversed and voided payments are payment records and are not money that
  // arrived — the same rule the day's total uses.
  const banked = payments.filter((p) => p.active !== false);
  if (banked.length === 0) return null;

  const applied: Omit<AppliedPayment, "invoiceTotal">[] = [];
  const matchedPayments = new Set<number>();
  for (const p of banked) {
    const rows = Array.isArray(p.applied_to) ? (p.applied_to as Applied[]) : [];
    for (const a of rows) {
      const invoiceId = Number(a?.appliedTo);
      const amount = num(a?.appliedAmount);
      if (!Number.isFinite(invoiceId) || invoiceId <= 0 || amount <= 0) continue;
      applied.push({ paymentId: Number(p.id), invoiceId, amount, on: String(p.paid_on ?? day) });
      matchedPayments.add(Number(p.id));
    }
  }

  /*
   * A payment with nothing applied to it has no kind.
   *
   * It happens: an online payment lands before anybody has put it against an
   * invoice. Counted on its own rather than folded into one of the three — it
   * is money in and it is also somebody's job this afternoon.
   */
  const unmatched = banked
    .filter((p) => !matchedPayments.has(Number(p.id)))
    .reduce((t, p) => ({ count: t.count + 1, value: t.value + num(p.total) }), { count: 0, value: 0 });

  if (applied.length === 0) return tallyKinds([], unmatched);

  const ids = [...new Set(applied.map((a) => a.invoiceId))];
  const invoices = await sbSelect<{ id: number; total: number | null; balance: number | null }>(
    "st_invoices",
    [q.select("id,total,balance"), `id=in.(${ids.join(",")})`].join("&"),
  ).catch(() => []);
  const invoice = new Map(invoices.map((i) => [Number(i.id), i]));

  const byInvoice = new Map<number, Omit<AppliedPayment, "invoiceTotal">[]>();
  for (const a of applied) {
    const got = byInvoice.get(a.invoiceId);
    if (got) got.push(a);
    else byInvoice.set(a.invoiceId, [a]);
  }

  const rows: PaidKindRow[] = [];
  let unknown = { ...unmatched };
  for (const [invoiceId, list] of byInvoice) {
    const inv = invoice.get(invoiceId);
    const invoiceTotal = num(inv?.total);
    if (!inv || !(invoiceTotal > 0)) {
      // The invoice did not come back, so there is nothing to call settled
      // against. Same treatment as a payment nobody has applied: counted, not
      // guessed at.
      unknown = {
        count: unknown.count + list.length,
        value: unknown.value + list.reduce((t, a) => t + a.amount, 0),
      };
      continue;
    }
    const today = list.reduce((t, a) => t + a.amount, 0);
    // What the invoice had taken before today. Floored at zero: a credit or an
    // over-payment can make the arithmetic negative, and a negative prior would
    // turn the first payment of the day into a deposit on an invoice already
    // settled.
    const priorPaid = Math.max(0, invoiceTotal - num(inv.balance) - today);
    rows.push(...kindsForInvoice(list.map((a) => ({ ...a, invoiceTotal })), priorPaid));
  }

  return tallyKinds(rows, unknown);
}
