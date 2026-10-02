/**
 * The year's goal, month by month, against what Xero says actually happened.
 *
 * Three questions, in the order anybody actually asks them:
 *   1. Are we going to make the year?
 *   2. Are we ahead or behind right now?
 *   3. Was last month better or worse than the one before?
 *
 * Nothing here reads the database or calls Xero. It takes the goal, the
 * calendar and a list of monthly actuals and returns figures, so the maths
 * can be checked against real numbers without a browser or a login.
 *
 * Every actual is nullable and null means "Xero didn't answer for that
 * month" — never zero. A failed read drawn as a genuine $0 month is the
 * single easiest way to make this page lie, and it would lie downward, which
 * is the direction that gets acted on.
 */

/** Australian businesses run on 1 July – 30 June; the calendar year is there for anyone who'd rather. */
export type YearBasis = "financial" | "calendar";

export type YearGoal = {
  basis: YearBasis;
  /**
   * The year the period ENDS in. FY2026-27 is `2027`; calendar 2026 is `2026`.
   * One field either way, so changing basis doesn't silently reinterpret it.
   */
  year: number;
  /** Revenue to invoice across the year. */
  revenue: number;
  /** What overheads are expected to run at across the year. Null = not set. */
  overhead: number | null;
  /**
   * How the year is expected to fall, as twelve weights in period order.
   * Null means spread evenly. A heating and cooling business is nowhere near
   * flat — a flat line would call every winter "ahead" and every spring
   * "behind" for reasons that have nothing to do with how the year is going.
   */
  shape: number[] | null;
};

export const DEFAULT_YEAR_GOAL: Omit<YearGoal, "year"> = {
  basis: "financial",
  revenue: 0,
  overhead: null,
  shape: null,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The calendar month index (0–11) each of the twelve period slots maps to. */
export function monthOrder(basis: YearBasis): number[] {
  return basis === "financial"
    ? [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5] // Jul … Jun
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

/** The calendar year each slot falls in, given the year the period ends in. */
export function yearOf(basis: YearBasis, endYear: number, slot: number): number {
  if (basis === "calendar") return endYear;
  return slot < 6 ? endYear - 1 : endYear;
}

export function periodLabel(goal: Pick<YearGoal, "basis" | "year">): string {
  return goal.basis === "financial" ? `FY${String(goal.year - 1).slice(2)}/${String(goal.year).slice(2)}` : `${goal.year}`;
}

/** Which period a date falls in, so "this year" means the one we're standing in. */
export function currentYear(basis: YearBasis, today: Date): number {
  const y = today.getUTCFullYear();
  if (basis === "calendar") return y;
  return today.getUTCMonth() >= 6 ? y + 1 : y;
}

/** The twelve month spans of a period, as ISO dates. */
export function yearSpans(basis: YearBasis, endYear: number): Array<{ label: string; from: string; to: string; month: number; year: number }> {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return monthOrder(basis).map((m, slot) => {
    const y = yearOf(basis, endYear, slot);
    return {
      label: MONTHS[m],
      month: m,
      year: y,
      from: iso(new Date(Date.UTC(y, m, 1))),
      to: iso(new Date(Date.UTC(y, m + 1, 0))),
    };
  });
}

/** Weights normalised to sum to 1. An unusable shape falls back to even. */
export function normalisedShape(shape: number[] | null): number[] {
  if (!shape || shape.length !== 12) return new Array(12).fill(1 / 12);
  const clean = shape.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total <= 0) return new Array(12).fill(1 / 12);
  return clean.map((v) => v / total);
}

export type MonthActual = {
  /** Invoiced. Null when Xero didn't answer for this month. */
  income: number | null;
  /** Everything out, which for this page is the overhead line. */
  expenses: number | null;
  netProfit: number | null;
};

export type MonthRow = {
  label: string;
  /** True once the month has started. */
  started: boolean;
  /** True once it is fully behind us — the only months worth comparing. */
  complete: boolean;
  goal: number;
  income: number | null;
  expenses: number | null;
  netProfit: number | null;
  /** income − goal, for a complete or in-progress month. Null without an actual. */
  vsGoal: number | null;
};

export type YearStanding = {
  label: string;
  /** The goal for the whole period. */
  goal: number;
  /** Invoiced so far. Null when no month answered. */
  banked: number | null;
  /**
   * What should be banked by today for the year to land — complete months at
   * their full goal, plus the current month pro-rated by the days elapsed.
   */
  expectedToDate: number;
  /** banked − expectedToDate. Positive is ahead. Null without actuals. */
  delta: number | null;
  /** Share of the year's goal banked, 0–1. Null without actuals. */
  progress: number | null;
  /** Share of the year elapsed, 0–1. */
  elapsed: number;
  /** What the rest of the year has to average per month to still land it. */
  neededPerRemainingMonth: number | null;
  /** Whole months still to come, counting the one we're in. */
  monthsLeft: number;
  months: MonthRow[];
  /** Any month at all answered. False means Xero told us nothing. */
  hasActuals: boolean;
  /** Months Xero failed to answer for, so the page can say the total is short. */
  missingMonths: number;
};

export type OverheadStanding = {
  /** The year's expectation, when one is set. */
  goal: number | null;
  /** Spent so far. Null when no month answered. */
  spent: number | null;
  /** Pro-rata share of the expectation for the time elapsed. */
  expectedToDate: number | null;
  /** spent − expectedToDate. Positive means overspending. */
  delta: number | null;
  /** Average per complete month, which is the figure worth knowing. */
  perMonth: number | null;
};

export type MonthOnMonth = {
  /** The last complete month. */
  latest: { label: string; income: number | null; expenses: number | null; netProfit: number | null } | null;
  /** The one before it. */
  previous: { label: string; income: number | null; expenses: number | null; netProfit: number | null } | null;
  /** latest − previous, on invoiced. Null when either is missing. */
  change: number | null;
  /** The same as a share of the previous month. Null when that month was zero. */
  changePct: number | null;
};

/**
 * How far through the period we are, 0–1, counting part-months.
 *
 * Calendar days, not working days. The wall board paces against working days
 * because it is asking what to do today; this page is asking whether a year
 * is on track, and over a year the two converge while calendar days are the
 * ones anyone can check by looking at a date.
 */
function elapsedShare(spans: ReturnType<typeof yearSpans>, today: Date): { share: number; perMonth: number[] } {
  const start = Date.parse(spans[0].from + "T00:00:00Z");
  const endExclusive = Date.parse(spans[11].to + "T00:00:00Z") + 86_400_000;
  const now = Math.min(Math.max(today.getTime(), start), endExclusive);
  const perMonth = spans.map((s) => {
    const a = Date.parse(s.from + "T00:00:00Z");
    const b = Date.parse(s.to + "T00:00:00Z") + 86_400_000;
    if (now <= a) return 0;
    if (now >= b) return 1;
    return (now - a) / (b - a);
  });
  return { share: (now - start) / (endExclusive - start), perMonth };
}

export function standing(goal: YearGoal, actuals: MonthActual[], today: Date): YearStanding {
  const spans = yearSpans(goal.basis, goal.year);
  const shape = normalisedShape(goal.shape);
  const { share, perMonth } = elapsedShare(spans, today);

  const months: MonthRow[] = spans.map((s, i) => {
    const a = actuals[i] ?? { income: null, expenses: null, netProfit: null };
    const g = goal.revenue * shape[i];
    return {
      label: s.label,
      started: perMonth[i] > 0,
      complete: perMonth[i] >= 1,
      goal: g,
      income: a.income,
      expenses: a.expenses,
      netProfit: a.netProfit,
      vsGoal: a.income == null ? null : a.income - g,
    };
  });

  const answered = months.filter((m) => m.started && m.income != null);
  const banked = answered.length ? answered.reduce((t, m) => t + (m.income ?? 0), 0) : null;
  const expectedToDate = months.reduce((t, m, i) => t + m.goal * perMonth[i], 0);
  const monthsLeft = perMonth.filter((p) => p < 1).length;
  const remainingGoal = banked == null ? null : Math.max(0, goal.revenue - banked);

  return {
    label: periodLabel(goal),
    goal: goal.revenue,
    banked,
    expectedToDate,
    delta: banked == null ? null : banked - expectedToDate,
    progress: banked == null || goal.revenue <= 0 ? null : banked / goal.revenue,
    elapsed: share,
    neededPerRemainingMonth: remainingGoal == null || monthsLeft === 0 ? null : remainingGoal / monthsLeft,
    monthsLeft,
    months,
    hasActuals: answered.length > 0,
    missingMonths: months.filter((m) => m.started && m.income == null).length,
  };
}

export function overheadStanding(goal: YearGoal, year: YearStanding): OverheadStanding {
  const seen = year.months.filter((m) => m.started && m.expenses != null);
  const spent = seen.length ? seen.reduce((t, m) => t + (m.expenses ?? 0), 0) : null;
  const complete = year.months.filter((m) => m.complete && m.expenses != null);
  const expectedToDate = goal.overhead == null ? null : goal.overhead * year.elapsed;
  return {
    goal: goal.overhead,
    spent,
    expectedToDate,
    delta: spent == null || expectedToDate == null ? null : spent - expectedToDate,
    perMonth: complete.length ? complete.reduce((t, m) => t + (m.expenses ?? 0), 0) / complete.length : null,
  };
}

/**
 * Last complete month against the one before it.
 *
 * Complete months only. A month three days old compared against a whole one
 * always reads as a collapse, and that is the comparison people make by
 * accident every time it is offered to them.
 */
export function monthOnMonth(year: YearStanding): MonthOnMonth {
  const done = year.months.filter((m) => m.complete);
  const latest = done[done.length - 1] ?? null;
  const previous = done[done.length - 2] ?? null;
  const pick = (m: MonthRow | null) =>
    m ? { label: m.label, income: m.income, expenses: m.expenses, netProfit: m.netProfit } : null;
  const change = latest?.income != null && previous?.income != null ? latest.income - previous.income : null;
  return {
    latest: pick(latest),
    previous: pick(previous),
    change,
    changePct: change != null && previous?.income ? change / previous.income : null,
  };
}
