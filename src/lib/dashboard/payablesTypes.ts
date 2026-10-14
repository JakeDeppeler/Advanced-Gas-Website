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

/** The thirties, the same bands the AR report uses. See XeroArAging. */
export type Aging = Record<ArBandKey, number>;

export const emptyAging = (): Aging => ({ current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90: 0 });

/** One supplier bill, as much of it as the ageing needs. */
export type RawBill = { supplier: string; number: string; due: string | null; amount: number };

/** The same bill once aged. `days` is positive past its due date, negative before it. */
export type XeroBill = { supplier: string; number: string; days: number; amount: number; due: string };

export type XeroPayables = {
  total: number;
  overdueTotal: number;
  overdueCount: number;
  count: number;
  /** Due inside a week and not yet late: the ones to have the cash for. */
  dueSoon: { count: number; value: number };
  aging: Aging;
  /** Every bill, worst first: most overdue down to soonest due. */
  bills: XeroBill[];
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
 */
export function agePayables(rows: RawBill[], todayMel: string): XeroPayables {
  const aging = emptyAging();
  const bills: XeroBill[] = [];
  let total = 0;
  let overdueTotal = 0;
  let overdueCount = 0;
  let soonCount = 0;
  let soonValue = 0;

  for (const r of rows) {
    const amount = Number(r.amount);
    // A credit or a zero is not a bill to pay. Xero returns both.
    if (!Number.isFinite(amount) || amount <= 0) continue;
    total += amount;

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

  return { total, overdueTotal, overdueCount, count: bills.length, dueSoon: { count: soonCount, value: soonValue }, aging, bills };
}
