/**
 * A van's finance, month by month: what was borrowed, what each repayment
 * pays off, and what's still owing today. Pure, so the van page, Vans & loans
 * and the fleet totals all read the same balance.
 *
 * The balance is worked out from the contract — amount financed, rate,
 * repayment, first payment — rather than typed in, so it comes down by itself
 * every month a payment falls due. A van with no contract entered keeps the
 * "still owing" figure that was typed for it.
 */

export type VanLoan = {
  /** Who the loan is with. */
  lender: string | null;
  /** Paid up front, out of our own money. */
  deposit: number | null;
  /** What was borrowed. Defaults to the price less the deposit. */
  financed: number | null;
  /** Interest, a year, as a percentage. */
  ratePct: number | null;
  /** Length of the loan in months. */
  termMonths: number | null;
  /** The first repayment's date, YYYY-MM-DD. Later ones fall on the same day each month. */
  firstPayment: string | null;
  /** The lump left at the end of a balloon (residual) loan, paid with the last repayment. */
  balloon: number | null;
};

export const EMPTY_LOAN: VanLoan = { lender: null, deposit: null, financed: null, ratePct: null, termMonths: null, firstPayment: null, balloon: null };

/** Every van's loan, keyed by vehicle id, as stored. */
export type VanLoans = Record<string, VanLoan>;

const num = (v: unknown): number | null => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const date = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function readLoans(raw: unknown): VanLoans {
  const out: VanLoans = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, Record<string, unknown>>)) {
    if (!v || typeof v !== "object") continue;
    out[id] = {
      lender: typeof v.lender === "string" && v.lender.trim() ? v.lender.trim().slice(0, 80) : null,
      deposit: num(v.deposit), financed: num(v.financed), ratePct: num(v.ratePct),
      termMonths: num(v.termMonths), firstPayment: date(v.firstPayment), balloon: num(v.balloon),
    };
  }
  return out;
}

export type LoanRow = { n: number; date: string; payment: number; interest: number; principal: number; balance: number; paid: boolean };

export type LoanState = {
  financed: number;
  repayment: number;
  /** True when the repayment came from the rate and term, not from what was typed. */
  repaymentWorkedOut: boolean;
  rows: LoanRow[];
  paidCount: number;
  owingNow: number;
  paidOff: number;
  interestPaid: number;
  interestLeft: number;
  /** Date of the last repayment. */
  endsOn: string;
  next: LoanRow | null;
};

/** The same day of the month, `k` months after `iso`, held to the month's last day. */
function addMonths(iso: string, k: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + k, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}

/** What a month's repayment has to be to reach the balloon at the end of the term. */
export function repaymentFor(financed: number, ratePct: number, termMonths: number, balloon = 0): number {
  const r = ratePct / 100 / 12;
  if (r === 0) return (financed - balloon) / termMonths;
  const f = (1 + r) ** termMonths;
  return ((financed - balloon / f) * r) / (1 - 1 / f);
}

/**
 * The whole schedule and where it stands on `today`. Null until there's
 * enough of the contract to work it: an amount, a first payment, and either
 * a repayment or a rate and a term to work one out from.
 */
export function loanState(loan: VanLoan | null | undefined, v: { purchasePrice: number | null; monthlyRepayment: number | null }, today: string): LoanState | null {
  if (!loan || !loan.firstPayment) return null;
  const financed = loan.financed ?? (v.purchasePrice != null ? v.purchasePrice - (loan.deposit ?? 0) : null);
  if (financed == null || financed <= 0) return null;
  const rate = loan.ratePct ?? 0;
  const balloon = loan.balloon ?? 0;
  let repayment = v.monthlyRepayment ?? null;
  let worked = false;
  if ((repayment == null || repayment <= 0) && loan.termMonths) { repayment = repaymentFor(financed, rate, loan.termMonths, balloon); worked = true; }
  if (repayment == null || repayment <= 0) return null;

  const r = rate / 100 / 12;
  const rows: LoanRow[] = [];
  let bal = financed;
  // A typed repayment that doesn't cover the interest would never end; stop at
  // the term, or at 40 years, whichever comes first.
  const cap = loan.termMonths ?? 480;
  for (let i = 0; i < cap && bal > 0.005; i++) {
    const interest = bal * r;
    const last = loan.termMonths != null && i === loan.termMonths - 1;
    let payment = Math.min(repayment, bal + interest);
    // The last repayment on a balloon loan carries the balloon with it.
    if (last) payment = bal + interest;
    const principal = payment - interest;
    bal = Math.max(0, bal - principal);
    const d = addMonths(loan.firstPayment, i);
    rows.push({ n: i + 1, date: d, payment, interest, principal, balance: bal, paid: d <= today });
  }
  const paid = rows.filter((x) => x.paid);
  const owingNow = paid.length ? paid[paid.length - 1].balance : financed;
  return {
    financed, repayment, repaymentWorkedOut: worked, rows,
    paidCount: paid.length,
    owingNow,
    paidOff: financed - owingNow,
    interestPaid: paid.reduce((a, x) => a + x.interest, 0),
    interestLeft: rows.filter((x) => !x.paid).reduce((a, x) => a + x.interest, 0),
    endsOn: rows.length ? rows[rows.length - 1].date : loan.firstPayment,
    next: rows.find((x) => !x.paid) ?? null,
  };
}
