/**
 * What we owe, aged — the rules on their own.
 *
 * Pure, with no database and no Xero in its import graph, for the reason every
 * other `…Types` module in here is: these boundaries decide which column a
 * supplier's money lands in, and a bill in the wrong one is a payment run made
 * on the wrong grounds. Here they can be run against a real day's bills on a
 * machine with no credentials — see scripts/check-payables.ts, which checks
 * them against Xero's own aged-payables report.
 */

import { arBand, type ArBandKey } from "@/lib/portal/ar";
import { supplierKey, type ArrangementKind } from "@/lib/owe/types";

/** The thirties, the same bands the AR report uses. See XeroArAging. */
export type Aging = Record<ArBandKey, number>;

export const emptyAging = (): Aging => ({ current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90: 0 });

/** One supplier bill, as much of it as the ageing needs. */
export type RawBill = { supplier: string; number: string; due: string | null; amount: number };

/** The same bill once aged. `days` is positive past its due date, negative before it. */
export type XeroBill = { supplier: string; number: string; days: number; amount: number; due: string };

/**
 * A supplier being paid off on terms rather than bill by bill.
 *
 * The office already records these in the portal — the ATO on a payment plan,
 * Metalflex on a line of credit — and the portal already keeps their bills out
 * of what is due this week and out of the pay order. Keyed by supplier name
 * the way the portal keys it, so one entry covers every bill they send.
 */
export type OnTerms = Map<string, ArrangementKind>;

/** What one supplier on terms is carrying, for the line that names them. */
export type TermsTotal = { supplier: string; kind: ArrangementKind; total: number; count: number };

export type XeroPayables = {
  /** Everything owed, on terms or not: the figure that matches Xero. */
  total: number;
  overdueTotal: number;
  overdueCount: number;
  count: number;
  /** Due inside a week and not yet late: the ones to have the cash for. */
  dueSoon: { count: number; value: number };
  aging: Aging;
  /** Every bill, worst first: most overdue down to soonest due. */
  bills: XeroBill[];
  /**
   * The part of `total` the pay order is actually about — everything from a
   * supplier not on terms. `bills`, `aging`, the overdue figures and `dueSoon`
   * are all about this money and no other.
   */
  chaseable: { total: number; count: number };
  /** The rest: who is on terms, and for how much. Biggest first. */
  onTerms: { total: number; count: number; suppliers: TermsTotal[] };
};

/** How far ahead "due soon" looks. A week, which is how far a payment run looks. */
export const DUE_SOON_DAYS = 7;

/** Whole days from `from` to `to`, both calendar days. */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * The bills, aged and ordered.
 *
 * A bill's age is one number doing two jobs: days past due, so one that is not
 * due yet is negative. That is what lets a single sort run the list from the
 * most overdue through the ones falling due this week, which is the order a
 * payment run is worked in — two lists would be the board deciding that the
 * rent falling due on Tuesday is not urgent.
 *
 * A due date that will not parse is treated as due today: it is not claimed as
 * overdue, because putting money in the worst band on the strength of a parse
 * failure is the confidently wrong figure this board is not allowed to show,
 * and it is not buried at the bottom of the list either.
 *
 * A supplier on terms is not in this question at all. The ATO's four-month-old
 * statement is not a bill somebody forgot — it is a payment plan running to
 * schedule — and left in, it and the Metalflex credit line were $164K of the
 * $179K the wall called overdue, which buried the two bills that genuinely had
 * been missed. Their money is still owed and still in `total`; it is kept out
 * of the ageing, the overdue figures, this week's cash and the pay order, and
 * named on its own so the panel still adds up.
 */
export function agePayables(rows: RawBill[], todayMel: string, onTerms: OnTerms = new Map()): XeroPayables {
  const aging = emptyAging();
  const bills: XeroBill[] = [];
  let total = 0;
  let overdueTotal = 0;
  let overdueCount = 0;
  let soonCount = 0;
  let soonValue = 0;
  const terms = new Map<string, TermsTotal>();

  for (const r of rows) {
    const amount = Number(r.amount);
    // A credit or a zero is not a bill to pay. Xero returns both.
    if (!Number.isFinite(amount) || amount <= 0) continue;
    total += amount;

    const key = supplierKey(r.supplier);
    const kind = onTerms.get(key);
    if (kind) {
      const got = terms.get(key);
      if (got) {
        got.total += amount;
        got.count += 1;
      } else {
        terms.set(key, { supplier: r.supplier, kind, total: amount, count: 1 });
      }
      continue;
    }

    const days = r.due ? daysBetween(r.due, todayMel) : 0;
    aging[arBand(days)] += amount;
    if (days > 0) {
      overdueTotal += amount;
      overdueCount += 1;
    } else if (days >= -DUE_SOON_DAYS) {
      soonCount += 1;
      soonValue += amount;
    }

    bills.push({ supplier: r.supplier, number: r.number, days, amount, due: r.due ?? todayMel });
  }

  // Worst first, with the bigger of two equally late bills above the smaller:
  // on a short list that is the one somebody needs to have seen.
  bills.sort((a, b) => b.days - a.days || b.amount - a.amount);

  const termsList = [...terms.values()].sort((a, b) => b.total - a.total);
  const termsTotal = termsList.reduce((t, s) => t + s.total, 0);
  const termsCount = termsList.reduce((t, s) => t + s.count, 0);
  const chaseableTotal = bills.reduce((t, b) => t + b.amount, 0);

  return {
    total,
    overdueTotal,
    overdueCount,
    // Every bill there is, so "the worst 6 of 35" still counts the ledger.
    count: bills.length + termsCount,
    dueSoon: { count: soonCount, value: soonValue },
    aging,
    bills,
    chaseable: { total: chaseableTotal, count: bills.length },
    onTerms: { total: termsTotal, count: termsCount, suppliers: termsList },
  };
}
