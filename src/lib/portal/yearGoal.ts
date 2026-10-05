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
  /**
   * The profit to keep, as a percentage of revenue — the "25%" in "$3M at 25%
   * profit". Null = not set, and the board's profit dial says so.
   */
  profitPct: number | null;
  /** Weeks a year the crew is on the tools. The design plans on 48. */
  weeks: number;
  /**
   * The week the year is built from: how many of each kind of job, what each
   * is worth and what it keeps. Empty = not planned yet, and the board's
   * bookings dial says so rather than inventing a count.
   */
  mix: GoalJob[];
  /** What the Pace page plans on beyond the goal itself. See pace.ts. */
  pace: PaceSettings;
};

/** Settings the business chooses, stored on the year goal row as `pace`. */
export type PaceSettings = {
  /** Share of enquiries that turn into a booking, 0–1. Nothing measures it. */
  bookRate: number | null;
  /** A close rate to plan on instead of the measured one, 0–1. */
  closeRate: number | null;
  /** An average sale to plan on instead of the measured one, including GST. */
  avgSale: number | null;
};

export const NO_PACE_SETTINGS: PaceSettings = { bookRate: null, closeRate: null, avgSale: null };

export function readPaceSettings(raw: unknown): PaceSettings {
  const v = (raw ?? {}) as Record<string, unknown>;
  const frac = (x: unknown) => {
    const n = Number(x);
    return x != null && x !== "" && Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
  };
  const amt = Number(v.avgSale);
  return {
    bookRate: frac(v.bookRate),
    closeRate: frac(v.closeRate),
    avgSale: v.avgSale != null && v.avgSale !== "" && Number.isFinite(amt) && amt > 0 ? amt : null,
  };
}

/** One kind of job in the plan. `margin` is a percentage of the job's price. */
export type GoalJob = { id: string; name: string; avgJob: number; margin: number; perWeek: number };

export const DEFAULT_YEAR_GOAL: Omit<YearGoal, "year"> = {
  basis: "financial",
  revenue: 0,
  overhead: null,
  shape: null,
  profitPct: null,
  weeks: 48,
  mix: [],
  pace: NO_PACE_SETTINGS,
};

/**
 * The design's starting week, shown on the Year goal page until a real one is
 * saved — and labelled as that. Never read by the wall board: the board only
 * reads what somebody has pressed Save on, so these can't turn into a target
 * nobody agreed to.
 */
export const STARTING_MIX: GoalJob[] = [
  { id: "heatpump", name: "Heat pump hot water", avgJob: 4800, margin: 28, perWeek: 4 },
  { id: "split", name: "Split systems", avgJob: 3400, margin: 33, perWeek: 5 },
  { id: "ducted", name: "Ducted aircon", avgJob: 14000, margin: 28, perWeek: 1 },
  { id: "hotwater", name: "Hot water (gas / electric)", avgJob: 2600, margin: 20, perWeek: 2 },
  { id: "service", name: "Service & repairs", avgJob: 320, margin: 15, perWeek: 15 },
];

/** The same starting goal the design is drawn at: $3M at 25%. Also never read by the board. */
export const STARTING_GOAL = { revenue: 3_000_000, profitPct: 25 };

/**
 * A stored row, whatever is in it, as a whole goal.
 *
 * The row predates the profit, weeks and mix fields, so each falls back on its
 * own — an old row reads as "goal set, mix not planned" rather than failing.
 */
export function readYearGoal(raw: unknown, today: Date): YearGoal {
  const v = (raw ?? {}) as Partial<Record<keyof YearGoal, unknown>>;
  const basis: YearBasis = v.basis === "calendar" ? "calendar" : "financial";
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : Number(x));
  const mix = (Array.isArray(v.mix) ? v.mix : [])
    .map((j) => j as Partial<GoalJob>)
    .filter((j) => typeof j?.name === "string" && j.name.trim() !== "")
    .map((j, i) => ({
      id: String(j.id ?? `job${i}`),
      name: String(j.name).trim(),
      avgJob: Math.max(0, num(j.avgJob) || 0),
      margin: Math.min(100, Math.max(0, num(j.margin) || 0)),
      perWeek: Math.max(0, num(j.perWeek) || 0),
    }));
  const pct = num(v.profitPct);
  const weeks = num(v.weeks);
  return {
    basis,
    year: typeof v.year === "number" ? v.year : currentYear(basis, today),
    revenue: Math.max(0, num(v.revenue) || 0),
    overhead: v.overhead == null || !Number.isFinite(num(v.overhead)) ? null : Math.max(0, num(v.overhead)),
    shape: Array.isArray(v.shape) && v.shape.length === 12 ? (v.shape as number[]) : null,
    profitPct: Number.isFinite(pct) && pct > 0 && pct < 100 ? pct : null,
    weeks: Number.isFinite(weeks) && weeks >= 1 && weeks <= 52 ? Math.round(weeks) : DEFAULT_YEAR_GOAL.weeks,
    mix,
    pace: readPaceSettings(v.pace),
  };
}

export type MixTotals = {
  jobsWeek: number;
  jobsYear: number;
  revenueWeek: number;
  revenueYear: number;
  profitYear: number;
  /** Profit over revenue, 0–1. Null when the mix brings in nothing. */
  margin: number | null;
};

/** What a week of this mix adds up to, and the year of it. */
export function mixTotals(mix: GoalJob[], weeks: number): MixTotals {
  let jobsWeek = 0, revenueWeek = 0, profitWeek = 0;
  for (const j of mix) {
    jobsWeek += j.perWeek;
    revenueWeek += j.perWeek * j.avgJob;
    profitWeek += j.perWeek * j.avgJob * (j.margin / 100);
  }
  return {
    jobsWeek,
    jobsYear: jobsWeek * weeks,
    revenueWeek,
    revenueYear: revenueWeek * weeks,
    profitYear: profitWeek * weeks,
    margin: revenueWeek > 0 ? profitWeek / revenueWeek : null,
  };
}

/**
 * The fewest extra jobs a week of one kind that would close a revenue gap —
 * "about 1 more heat pump a week closes it".
 *
 * Fewest wins; on a tie, the kind already bringing in the most, because one
 * more of the work the year is built on is a more believable ask than one more
 * of a sideline.
 */
export function closeTheGap(mix: GoalJob[], weeks: number, short: number): { name: string; extra: number } | null {
  if (!(short > 0) || weeks <= 0) return null;
  let best: { name: string; extra: number; brings: number } | null = null;
  for (const j of mix) {
    if (!(j.avgJob > 0)) continue;
    const extra = Math.ceil(short / (j.avgJob * weeks));
    const brings = j.perWeek * j.avgJob;
    if (!best || extra < best.extra || (extra === best.extra && brings > best.brings)) {
      best = { name: j.name, extra, brings };
    }
  }
  return best ? { name: best.name, extra: best.extra } : null;
}

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
