/**
 * The goals every KPI is measured against, other than the ones the year goal
 * already holds (sales for the year and how it falls by month, the profit %,
 * the win rate — those stay in portal_settings.yeargoal, one place each).
 *
 * Kept in portal_settings key `goals`, edited on Our numbers › Goals. A goal
 * that isn't set is null, and the page it's used on says "No goal yet" rather
 * than measuring against a number nobody chose. Gross margin and overheads
 * start at the aims the KPI stack has always used, 40% and 25%.
 *
 * Pure: shared by the editor in the browser and the pages on the server.
 */

export type Goals = {
  /** Gross margin, % of sales, or more. */
  gm: number | null;
  /** Overheads, % of sales, or less. */
  ovh: number | null;
  /** Wages, super and WorkCover, % of sales, or less. */
  wagesPct: number | null;
  /** Quotes a month. */
  quotesMonth: number | null;
  /** Average job, $ with GST. */
  avgJob: number | null;
  /** Quotes followed up within two days, %. */
  followup: number | null;
  /**
   * The win rate to aim for, %. Only a goal: the plan works out how many
   * quotes the year needs from the rate we're really winning at (or the one
   * set on Pace), so aiming at 60% doesn't cut the quotes it asks for to a
   * third of what we'd actually need.
   */
  winRate: number | null;
  /** Jobs done a month. */
  jobsMonth: number | null;
  /** Overdue, $ or less. */
  overdue: number | null;
  /** Billable hours, % of hours paid. */
  billable: number | null;
};

export const GOAL_KEYS: (keyof Goals)[] = ["gm", "ovh", "wagesPct", "quotesMonth", "avgJob", "followup", "winRate", "jobsMonth", "overdue", "billable"];

export const DEFAULT_GOALS: Goals = {
  gm: 40, ovh: 25, wagesPct: null, quotesMonth: null, avgJob: null, followup: null, winRate: null, jobsMonth: null, overdue: null, billable: null,
};

export function normaliseGoals(raw: unknown): Goals {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_GOALS };
  for (const k of GOAL_KEYS) {
    if (!(k in r)) continue;
    const v = r[k];
    out[k] = v == null || v === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : out[k];
  }
  return out;
}
