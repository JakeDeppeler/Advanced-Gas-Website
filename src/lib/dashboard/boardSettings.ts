/**
 * Everything the wall board is told, rather than measures.
 *
 * Targets, commission bands and the definition of a working day all live in one
 * `portal_settings` row under the key `dashboard`. Until now the only way to set
 * that row was to write the SQL by hand — DASHBOARD.md documented an `insert`
 * as the procedure — so the figures the whole board paces against were the one
 * part of it nobody in the office could touch.
 *
 * This module is the shape of that row, in one place, with one normaliser. The
 * board reads through it and the portal editor writes through it, which is the
 * point: a second copy of "what counts as a valid target" would drift, and the
 * failure mode of that drift is a wall full of confident numbers derived from
 * settings the editor thinks it saved.
 *
 * Nothing here touches the network or the database, so the clamps and the
 * commission maths can be checked against real figures without either.
 */

import { normalisedShape, yearSpans, type YearBasis } from "@/lib/portal/yearGoal";

/**
 * One commission band. `from` is the month's sold total at which `rate` starts,
 * and `rate` is a fraction — 0.05, not 5.
 */
export type CommissionTier = { from: number; rate: number };

export type BoardSettings = {
  /** What has to be invoiced in the month. Drives "to invoice per day". */
  revenueTargetMonthly: number | null;
  /**
   * Take the month's revenue target from the year goal instead of the figure
   * above, as that month's share of the year.
   *
   * Off by default, and deliberately: an existing row that predates this flag
   * has to keep behaving exactly as it did, because it is on a wall right now.
   */
  revenueFromYearGoal: boolean;
  /** What has to be SOLD in the month — the value of quotes closed. */
  salesTargetMonthly: number | null;
  /** Gross profit for the month. */
  profitTargetMonthly: number | null;
  /** Jobs booked in the month. A count, not dollars. */
  bookingsTargetMonthly: number | null;
  commissionTiers: CommissionTier[];
  /** Weekday numbers that count as working days. 1 = Monday … 7 = Sunday. */
  workingDays: number[];
  /** YYYY-MM-DD dates to exclude — public holidays, shutdown weeks. */
  holidays: string[];
};

/**
 * Nothing is targeted until somebody says so.
 *
 * Every figure starts null rather than at a plausible number. A default target
 * is indistinguishable on the wall from an agreed one, and the board already
 * knows how to blank a figure and say the target isn't configured — which is
 * the honest answer to "what are we aiming at" before anybody has decided.
 */
export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  revenueTargetMonthly: null,
  revenueFromYearGoal: false,
  salesTargetMonthly: null,
  profitTargetMonthly: null,
  bookingsTargetMonthly: null,
  commissionTiers: [],
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A target, or null. Zero and negative both mean "not set", not "aim at nothing". */
function positive(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The stored row as something safe to render, whatever is actually in it.
 *
 * Tiers are filtered but not rewritten: a rate stored as 5 where 0.05 was meant
 * is a data-entry mistake, and quietly clamping it to 100% would hide the
 * mistake behind a merely implausible number. The editor refuses to save one;
 * the read path doesn't second-guess what is already there.
 */
export function normaliseBoardSettings(raw: unknown): BoardSettings {
  const v = (raw ?? {}) as Record<string, unknown>;

  const tiers = (Array.isArray(v.commissionTiers) ? v.commissionTiers : [])
    .map((t) => t as Record<string, unknown>)
    .filter((t) => Number.isFinite(Number(t?.from)) && Number(t?.from) >= 0 && Number.isFinite(Number(t?.rate)) && Number(t?.rate) >= 0)
    .map((t) => ({ from: Number(t.from), rate: Number(t.rate) }))
    .sort((a, b) => a.from - b.from);

  const days = [...new Set((Array.isArray(v.workingDays) ? v.workingDays : []).map((d) => Math.round(Number(d))))]
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b);

  const holidays = [...new Set((Array.isArray(v.holidays) ? v.holidays : []).map((h) => String(h).trim()))]
    .filter((h) => ISO_DATE.test(h))
    .sort();

  return {
    revenueTargetMonthly: positive(v.revenueTargetMonthly),
    revenueFromYearGoal: v.revenueFromYearGoal === true,
    salesTargetMonthly: positive(v.salesTargetMonthly),
    profitTargetMonthly: positive(v.profitTargetMonthly),
    bookingsTargetMonthly: positive(v.bookingsTargetMonthly),
    commissionTiers: tiers,
    // A board with no working days would divide the month's shortfall by a
    // floor of one day and put the whole month on today. Mon-Fri is a fallback,
    // not a guess at anything.
    workingDays: days.length ? days : DEFAULT_BOARD_SETTINGS.workingDays,
    holidays,
  };
}

/** Just the fields of the year goal this needs, so the signature survives it changing. */
export type YearGoalShape = { basis: YearBasis; year: number; revenue: number; shape: number[] | null };

/**
 * A single month's share of the year's goal.
 *
 * Derived at read time, not written into the board's row at save time. A figure
 * copied across in October is wrong in November and nothing would say so; a
 * derivation is right every month without anybody going back to it, which is
 * the whole reason to point the board at the year goal in the first place.
 *
 * `month` is Melbourne's current month as `YYYY-MM`. Null when the goal is
 * unset, has no revenue, or doesn't cover that month — a goal left on last
 * financial year should blank the target and say so, not pace the wall against
 * a year that finished.
 */
export function monthTargetFromYearGoal(goal: YearGoalShape | null, month: string): number | null {
  if (!goal || !(goal.revenue > 0)) return null;
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const slot = yearSpans(goal.basis, goal.year).findIndex((s) => s.year === y && s.month === m - 1);
  if (slot < 0) return null;
  return goal.revenue * normalisedShape(goal.shape)[slot];
}

/**
 * An option on a quote, as the board counts them.
 *
 * ServiceTitan writes one estimate per *option*, not per quote: good, better
 * and best on the same job are three rows, and a system swapped for a different
 * brand is a fourth. Over the last thirty days that is four options for every
 * job actually quoted.
 */
export type OptionRow = {
  id: number | string;
  jobId: number | string | null;
  soldOn?: string | null;
  /** Together with createdOn, identifies a quote that arrived with no job on it. */
  customerId?: number | string | null;
  createdOn?: string | null;
};

export type Opportunity = { key: string; options: number; won: boolean };

/**
 * Options grouped into the jobs they were written for.
 *
 * Job id first. Where there is none, the customer and the day it was written:
 * options of one quote are priced together, for one customer, on one day, and
 * ServiceTitan leaves `job_id` null on a good share of them. Falling straight
 * through to the estimate id instead counted each option as its own job and put
 * 150 in the close-rate denominator where there were 118 — the headline on the
 * Today page then disagreed with the per-person rates on the Team page, which
 * group the same rows the same way.
 *
 * Last resort is the estimate id, because lumping every unidentifiable row
 * under one key would merge a dozen unrelated quotes into a single one.
 */
export function byOpportunity(rows: OptionRow[]): Opportunity[] {
  const out = new Map<string, Opportunity>();
  for (const r of rows) {
    const key =
      r.jobId != null && r.jobId !== ""
        ? `j${r.jobId}`
        : r.customerId != null && r.customerId !== "" && r.createdOn
          ? `c${r.customerId}-${String(r.createdOn).slice(0, 10)}`
          : `e${r.id}`;
    const got = out.get(key);
    if (got) {
      got.options += 1;
      got.won = got.won || !!r.soldOn;
    } else {
      out.set(key, { key, options: 1, won: !!r.soldOn });
    }
  }
  return [...out.values()];
}

export type CloseRate = {
  /** Won over quoted, both counted per job. Null when nothing was quoted. */
  rate: number | null;
  won: number;
  /** Jobs quoted — the denominator anyone would mean by "how many quotes". */
  quoted: number;
  /** The raw option count, for saying how many were written. */
  options: number;
};

/**
 * How many of the jobs we quoted turned into work.
 *
 * Counted per job, not per option, because only one option on a job can ever
 * be sold — counting options puts four in the denominator for every one that
 * could possibly land, and reported 6% on a month that actually closed 14%.
 * A board that understates the close rate by a factor of three is a board the
 * room stops arguing with and starts ignoring.
 */
export function closeRate(rows: OptionRow[]): CloseRate {
  const opps = byOpportunity(rows);
  const won = opps.filter((o) => o.won).length;
  return {
    rate: opps.length ? won / opps.length : null,
    won,
    quoted: opps.length,
    options: rows.length,
  };
}

/**
 * Where the year's goal says we should be by today.
 *
 * Month by month off the goal's own shape, plus the part of the current month
 * that has elapsed on calendar days. Calendar days, not working days, because
 * this is the long view — the figure on the wall under "by now" answers "are we
 * on for the three million", and a long weekend does not change the answer.
 *
 * Null when there is no goal, or the goal's year does not contain today: a
 * blank is honest where a number would be a guess.
 */
export function yearByNow(goal: YearGoalShape | null, today: string): number | null {
  if (!goal || !(goal.revenue > 0)) return null;
  const spans = yearSpans(goal.basis, goal.year);
  const shape = normalisedShape(goal.shape);
  const y = Number(today.slice(0, 4));
  const mo = Number(today.slice(5, 7)) - 1;
  const day = Number(today.slice(8, 10));
  const slot = spans.findIndex((s) => s.year === y && s.month === mo);
  if (slot < 0) return null;

  const whole = shape.slice(0, slot).reduce((a, b) => a + b, 0);
  const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const partial = shape[slot] * (day / daysInMonth);
  return goal.revenue * (whole + partial);
}

/** The first day of the goal's year, as YYYY-MM-DD. */
export function yearStart(goal: YearGoalShape | null): string | null {
  if (!goal) return null;
  const spans = yearSpans(goal.basis, goal.year);
  return spans[0]?.from ?? null;
}

export type Pacing = {
  /** Achieved over what should be achieved by now. 1 is exactly on pace. */
  pacePct: number | null;
  /** What each remaining working day has to bring in to still land the target. */
  daily: number | null;
  /** Achieved minus the pro-rata expectation. Positive is ahead. */
  aheadBehind: number | null;
};

/**
 * One target against one month-to-date figure, paced over working days.
 *
 * Lives here rather than beside the board because the portal's editor previews
 * these exact three numbers before anybody saves a target. Two copies of this
 * arithmetic would be two chances for the preview to reassure somebody about a
 * figure the wall then renders differently.
 *
 * Pace is measured against working days elapsed, not calendar days: being "80%
 * through the month" means nothing if the days left are a long weekend.
 *
 * `Math.max(0, …)` floors the shortfall rather than the rate: once the target is
 * met the daily number is 0, not a negative figure that reads as money owed
 * back. `Math.max(1, …)` guards the last working day of the month, where
 * dividing by zero remaining days would otherwise print Infinity on the wall.
 */
export function pacePerDay(
  target: number | null,
  achieved: number | null,
  days: { total: number; elapsed: number; remaining: number },
): Pacing {
  const progress = days.total > 0 ? days.elapsed / days.total : 0;
  return {
    pacePct: target && achieved != null && progress > 0 ? achieved / (target * progress) : null,
    // An unmeasurable figure leaves the daily number unset too: "$8,000 a day to
    // go" computed against a null is just the target spread over the days left,
    // dressed up as a shortfall.
    daily:
      target == null || achieved == null
        ? null
        : Math.max(0, target - achieved) / Math.max(1, days.remaining),
    aheadBehind: target && achieved != null ? achieved - target * progress : null,
  };
}

/**
 * Commission on a month's sold total, under a tiered rate.
 *
 * Tiers are marginal, not cliff-edged: crossing a threshold lifts the rate on
 * the amount above it only. A cliff would mean a $1 sale could be worth
 * thousands, which is how commission schemes end up gamed.
 */
export function commissionFor(
  sold: number,
  tiers: CommissionTier[],
): { commission: number | null; tier: number | null; toNextTier: number | null } {
  if (!tiers.length) return { commission: null, tier: null, toNextTier: null };

  const steps = [...tiers].sort((a, b) => a.from - b.from);
  let commission = 0;
  let tier = 0;

  for (let i = 0; i < steps.length; i++) {
    const from = steps[i].from;
    if (sold <= from) break;
    const to = i + 1 < steps.length ? Math.min(sold, steps[i + 1].from) : sold;
    commission += (to - from) * steps[i].rate;
    tier = i + 1;
  }

  const next = steps[tier];
  return {
    commission,
    tier,
    toNextTier: next && sold < next.from ? next.from - sold : null,
  };
}
