/**
 * What a payment is: a deposit, a payment along the way, or the one that
 * settles the job. Pure, so the rule can be checked without a database.
 *
 * **Why it has to be derived.** ServiceTitan records no such thing. Its
 * payment `type` is the *method* — Bank Deposit/EFT, Online Payments, Visa,
 * Cash, Cheque — and its invoices carry no deposit flag: of 885 jobs invoiced
 * in 120 days only five have more than one invoice, so the deposit and the
 * balance are two payments against one invoice rather than two invoices.
 *
 * **The rule.** Each payment is applied to an invoice for an amount. Order
 * them by the day they were paid and run a total:
 *
 *   - the one that takes the invoice to fully paid is the **final**;
 *   - the **first** one that doesn't is the **deposit**;
 *   - anything between is a **part payment**.
 *
 * That matches how this business is actually paid: domestic installs take 40%
 * up front and the balance on completion — two payments — while a real estate
 * job is paid in instalments as the rent comes in, which is a deposit, one or
 * more part payments, and a final. Nothing here assumes 40%, because nothing
 * records it and a job paid 50% up front is still a deposit.
 */

export type PaidKind = "deposit" | "part" | "final";

/** One payment, as much of it as the rule needs. */
export type AppliedPayment = {
  paymentId: number;
  invoiceId: number;
  /** What this payment put against that invoice. */
  amount: number;
  /** The day it was paid, as YYYY-MM-DD. Ordering only. */
  on: string;
  /** The invoice's own total, which is what "settled" means. */
  invoiceTotal: number;
};

export type PaidKindRow = AppliedPayment & { kind: PaidKind };

export type PaidKinds = {
  deposit: { count: number; value: number };
  part: { count: number; value: number };
  final: { count: number; value: number };
  /**
   * Payments that could not be matched to an invoice, so no kind could be
   * worked out. Counted and shown rather than quietly folded into one of the
   * three: an unexplained payment is a thing to go and look at.
   */
  unmatched: { count: number; value: number };
};

const CENT = 0.005;

/**
 * Classify every applied payment on one invoice.
 *
 * `priorPaid` is what the invoice had already taken before this window — the
 * board only reads a few days of payments, and a final paid today against a
 * deposit paid in August would otherwise read as a deposit itself.
 */
export function kindsForInvoice(rows: AppliedPayment[], priorPaid = 0): PaidKindRow[] {
  const inOrder = [...rows].sort((a, b) => a.on.localeCompare(b.on) || a.paymentId - b.paymentId);
  let paid = priorPaid;
  let first = priorPaid <= CENT;
  return inOrder.map((r) => {
    paid += r.amount;
    const settles = r.invoiceTotal > 0 && paid >= r.invoiceTotal - CENT;
    const kind: PaidKind = settles ? "final" : first ? "deposit" : "part";
    if (!settles) first = false;
    return { ...r, kind };
  });
}

/** Totals by kind, for the card. */
export function tallyKinds(rows: PaidKindRow[], unmatched: { count: number; value: number }): PaidKinds {
  const z = () => ({ count: 0, value: 0 });
  const out: PaidKinds = { deposit: z(), part: z(), final: z(), unmatched };
  for (const r of rows) {
    out[r.kind].count += 1;
    out[r.kind].value += r.amount;
  }
  return out;
}
