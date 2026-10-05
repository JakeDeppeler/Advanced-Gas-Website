/**
 * Pace: the year goal worked backwards into what each stage of the business
 * has to do, and whether each stage is keeping up.
 *
 * The chain is the one the business runs on:
 *
 *   leads → booked → quoted → sold → completed → invoiced
 *
 * but the money does not flow down one pipe. Most of it comes through a quote
 * — a quote visit is booked, priced, sold, then installed — while service and
 * repair work is booked, done and billed without ever being quoted. A single
 * average ticket across both would have the plan asking for forty quotes to
 * make up for a slow week of gas heater services. So the goal splits by the
 * share of invoiced money that actually came through a quote, and each half is
 * worked back on its own rates:
 *
 *   sold work    invoiced × sold share → sold $ → jobs sold (avg sale)
 *                → jobs quoted (close rate) → quote visits booked
 *   service work invoiced × the rest → service jobs (avg service invoice)
 *                → service calls booked (allowing for cancellations)
 *
 * Completed is installs plus service jobs; booked is quote visits plus service
 * calls; leads are bookings over the share of enquiries that book.
 *
 * Every rate is measured off the replica over recent weeks unless the business
 * has set one. The booking rate cannot be measured — phone calls aren't
 * recorded anywhere this can read — so it is the business's to set, and until
 * it is the leads row says so rather than guessing.
 *
 * Money includes GST throughout, because that is what the business is paid on
 * and what the goal is set in. Profit is the exception and lives in
 * jobProfit.ts: GST was never ours to keep, so a margin is worked out on the
 * price before it.
 *
 * Nothing here reads the database, so the arithmetic can be checked against
 * real figures without a login (scripts/check-pace.ts).
 */

import { normalisedShape, periodLabel, yearSpans, type PaceSettings, type YearBasis } from "@/lib/portal/yearGoal";
import { GST_RATE } from "./boardSettings";

export { GST_RATE };
export { NO_PACE_SETTINGS, readPaceSettings, type PaceSettings } from "@/lib/portal/yearGoal";

/**
 * The first day ServiceTitan was the system of record. The Field Plus import
 * ran on the morning of 31 August Melbourne time and stamped 985 jobs and 487
 * quotes with that date, so a booking count reaching back past it reads a
 * thousand jobs booked in a day.
 */
export const ST_LIVE = "2026-09-01";

export type Stage = "leads" | "booked" | "quoted" | "sold" | "completed" | "invoiced";
export const STAGES: Stage[] = ["leads", "booked", "quoted", "sold", "completed", "invoiced"];

export const STAGE_LABEL: Record<Stage, string> = {
  leads: "Leads",
  booked: "Booked",
  quoted: "Quoted",
  sold: "Sold",
  completed: "Completed",
  invoiced: "Invoiced",
};

/** What each stage counts, in the words on the page. */
export const STAGE_NOTE: Record<Stage, string> = {
  leads: "enquiries in",
  booked: "quote visits and service calls",
  quoted: "jobs priced",
  sold: "jobs that said yes",
  completed: "installs and service jobs done",
  invoiced: "billed, including GST",
};

/** Which way a job makes money. */
export type JobClass = "quote" | "install" | "service";

/**
 * From ServiceTitan's job type. "Quotation" and "Site Assessment" are visits to
 * price work; anything starting "Install" is sold work being put in; the rest —
 * services, repairs, diagnostics, warranty, commercial maintenance — is work
 * that is booked and billed without a quote in between.
 */
export function jobClass(jobType: string | null | undefined): JobClass {
  const t = String(jobType ?? "").trim();
  if (/^(quotation|quote|site assessment)/i.test(t)) return "quote";
  if (/^install/i.test(t)) return "install";
  return "service";
}

// ---------------------------------------------------------------- measured

/**
 * What the business actually did over the measuring window. Counts are jobs,
 * never quote options; money includes GST.
 */
export type Measured = {
  /** First and last day measured, inclusive. */
  from: string;
  to: string;
  /** Working weeks in the window, for "a week" on the rate cards. */
  weeks: number;
  /** Enquiries counted: website form and ServiceTitan leads. Not phone calls. */
  leads: number;
  quoteVisits: number;
  serviceBooked: number;
  serviceCompleted: number;
  installsCompleted: number;
  quoted: number;
  sold: number;
  soldValue: number;
  invoiced: number;
  /** Invoiced on install and quote jobs: the money that came through a quote. */
  soldWorkInvoiced: number;
  /** Invoiced on everything else. */
  serviceInvoiced: number;
};

/** One rate: the figure the plan uses, what was measured, and whether it was set by hand. */
export type Rate = { value: number | null; measured: number | null; set: boolean };

export type Rates = {
  bookRate: Rate;
  closeRate: Rate;
  avgSale: Rate;
  /** Share of invoiced money that came through a quote. */
  soldShare: Rate;
  /** Quote visits booked for every job quoted. Under 1 when repairs get quoted on the spot. */
  visitsPerQuote: Rate;
  /** Invoiced per service job done, $0 jobs included — they still take a booking. */
  avgService: Rate;
  /** Service jobs done for every one booked: what cancellations leave. */
  serviceCompletion: Rate;
};

/**
 * The smallest sample a rate is drawn from. A close rate off four quotes is a
 * coin toss, and a plan multiplied out from it would ask for a year of work on
 * the strength of a fortnight.
 */
const MIN_SAMPLE = 8;

const ratio = (a: number, b: number, min = MIN_SAMPLE) => (b >= min && b > 0 ? a / b : null);

export function ratesFrom(m: Measured | null, s: PaceSettings): Rates {
  const rate = (measured: number | null, set: number | null = null): Rate =>
    set != null ? { value: set, measured, set: true } : { value: measured, measured, set: false };

  const close = m ? ratio(m.sold, m.quoted) : null;
  const sale = m && m.sold >= 3 ? m.soldValue / m.sold : null;
  const share = m && m.invoiced > 0 ? Math.min(1, Math.max(0, m.soldWorkInvoiced / m.invoiced)) : null;
  const visits = m ? ratio(m.quoteVisits, m.quoted) : null;
  const service = m ? ratio(m.serviceInvoiced, m.serviceCompleted) : null;
  const completion = m ? ratio(m.serviceCompleted, m.serviceBooked) : null;

  return {
    bookRate: rate(null, s.bookRate),
    closeRate: rate(close, s.closeRate),
    avgSale: rate(sale, s.avgSale),
    soldShare: rate(share),
    visitsPerQuote: rate(visits),
    avgService: rate(service),
    // Done can outrun booked inside a window (last month's bookings finishing
    // this month), and a completion rate over 100% would shrink the plan.
    serviceCompletion: rate(completion == null ? null : Math.min(1, completion)),
  };
}

// ---------------------------------------------------------------- the plan

/** A need: a number of jobs, an amount of money, or both. */
export type Need = { count: number | null; value: number | null };
export type Plan = Record<Stage, Need>;

/** The two lanes the plan splits into, so the page can show its working. */
export type Lanes = {
  quoteVisits: number | null;
  serviceBooked: number | null;
  installs: number | null;
  serviceJobs: number | null;
  soldWork: number | null;
  serviceWork: number | null;
};

const NONE: Need = { count: null, value: null };

/** The year's goal, worked back through every stage. */
export function yearPlan(goal: number, r: Rates): { plan: Plan; lanes: Lanes } {
  const share = r.soldShare.value;
  const soldWork = share == null ? null : goal * share;
  const serviceWork = share == null ? null : goal * (1 - share);

  const sold = soldWork != null && r.avgSale.value ? soldWork / r.avgSale.value : null;
  const quoted = sold != null && r.closeRate.value ? sold / r.closeRate.value : null;
  // What has to go in front of customers to sell that much of it. The close
  // rate is counted in jobs, so this is the work the plan needs quoted, not a
  // separate rate — sell a quarter of what you write and you have to write four
  // times what you mean to sell.
  const quotedWork = soldWork != null && r.closeRate.value ? soldWork / r.closeRate.value : null;
  const quoteVisits = quoted != null && r.visitsPerQuote.value != null ? quoted * r.visitsPerQuote.value : null;

  // No service money in the plan is no service jobs, not an unknown number.
  const serviceJobs =
    serviceWork == null ? null : serviceWork <= 0 ? 0 : r.avgService.value ? serviceWork / r.avgService.value : null;
  const serviceBooked =
    serviceJobs == null ? null : serviceJobs === 0 ? 0 : r.serviceCompletion.value ? serviceJobs / r.serviceCompletion.value : null;

  const booked = quoteVisits != null && serviceBooked != null ? quoteVisits + serviceBooked : null;
  const leads = booked != null && r.bookRate.value ? booked / r.bookRate.value : null;
  const completed = sold != null && serviceJobs != null ? sold + serviceJobs : null;

  return {
    plan: {
      leads: { count: leads, value: null },
      booked: { count: booked, value: null },
      quoted: { count: quoted, value: quotedWork },
      sold: { count: sold, value: soldWork },
      completed: { count: completed, value: null },
      invoiced: { count: null, value: goal },
    },
    lanes: { quoteVisits, serviceBooked, installs: sold, serviceJobs, soldWork, serviceWork },
  };
}

export function scalePlan(p: Plan, f: number): Plan {
  const out = {} as Plan;
  for (const s of STAGES) {
    out[s] = {
      count: p[s].count == null ? null : p[s].count! * f,
      value: p[s].value == null ? null : p[s].value! * f,
    };
  }
  return out;
}

// ---------------------------------------------------------------- the goal

/** The fields of the year goal this reads. */
export type PaceGoal = {
  basis: YearBasis;
  year: number;
  revenue: number;
  shape: number[] | null;
  profitPct?: number | null;
  weeks?: number;
};

/** Which slot of the goal's year a date falls in, or -1 outside it. */
function slotOf(goal: PaceGoal, iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  return yearSpans(goal.basis, goal.year).findIndex((s) => s.year === y && s.month === m);
}

/** The share of the year's goal that falls in the month containing `iso`. */
export function monthShare(goal: PaceGoal, iso: string): number | null {
  const slot = slotOf(goal, iso);
  return slot < 0 ? null : normalisedShape(goal.shape)[slot];
}

/**
 * What the goal says should be invoiced by a moment in a day: whole months at
 * their share, the current month pro rata on calendar days, and `dayFraction`
 * of the day itself. Calendar days because this is the year's view; a long
 * weekend doesn't change whether the year is on.
 */
export function expectedBy(goal: PaceGoal, iso: string, dayFraction = 1): number | null {
  const slot = slotOf(goal, iso);
  if (slot < 0 || !(goal.revenue > 0)) return null;
  const shape = normalisedShape(goal.shape);
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  const day = Number(iso.slice(8, 10));
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const whole = shape.slice(0, slot).reduce((a, b) => a + b, 0);
  return goal.revenue * (whole + shape[slot] * ((day - 1 + Math.min(1, Math.max(0, dayFraction))) / days));
}

// ---------------------------------------------------------------- standing

export type Verdict = "ahead" | "on" | "behind";

export type Standing = {
  /** The period's need. */
  need: number | null;
  /** Where the need says we should be by now. */
  byNow: number | null;
  done: number | null;
  /** done − byNow. Positive is ahead. */
  gap: number | null;
  /** To still land the period: what each working day left has to bring. */
  perDayLeft: number | null;
  verdict: Verdict | null;
};

/**
 * Within five per cent of where we should be is on pace. Tighter than that and
 * a single job either way flips the wall between ahead and behind every hour;
 * looser and "on pace" covers a week that is quietly sliding.
 */
const ON_PACE = 0.05;

export function standingOf(need: number | null, done: number | null, elapsed: number, daysLeft: number): Standing {
  if (need == null || done == null) {
    return { need, byNow: null, done, gap: null, perDayLeft: null, verdict: null };
  }
  const byNow = need * Math.min(1, Math.max(0, elapsed));
  const gap = done - byNow;
  // Nothing expected yet (first thing Monday) and nothing done is on pace, not
  // a division by zero.
  const verdict: Verdict =
    byNow <= 0 ? "on" : done > byNow * (1 + ON_PACE) ? "ahead" : done < byNow * (1 - ON_PACE) ? "behind" : "on";
  return {
    need,
    byNow,
    done,
    gap,
    perDayLeft: Math.max(0, need - done) / Math.max(1, daysLeft),
    verdict,
  };
}

// ---------------------------------------------------------------- the data

/** One period's actuals. Null where the replica can't say. */
export type PaceCounts = {
  leads: number | null;
  booked: number | null;
  quoted: number | null;
  /**
   * What those quotes were worth, one figure per job at the average of the
   * options offered. Summing every option counts good, better and best as
   * three quotes, and at most one of them sells — the same basis the
   * outstanding list and the close rate already use.
   */
  quotedValue: number | null;
  sold: number | null;
  soldValue: number | null;
  completed: number | null;
  invoiced: number | null;
};

export type DaySplit = { total: number; elapsed: number; remaining: number };

/** Everything the sync measured that the pace view is built from. */
export type PaceData = {
  asOf: string;
  /** Melbourne date the figures were taken on. */
  today: string;
  calendar: {
    daysPerWeek: number;
    week: DaySplit;
    month: DaySplit;
    /** How far through today's working hours, 0–1. Zero on a day off. */
    dayFraction: number;
    todayWorking: boolean;
  };
  periods: { today: PaceCounts; week: PaceCounts; lastWeek: PaceCounts; month: PaceCounts };
  measured: Measured | null;
  /** Invoiced since the goal's year began: now, at the end of yesterday, and a week ago. */
  year: { ytd: number; ytdYesterday: number; ytdLastWeek: number; last28: number } | null;
  /** Calls ServiceTitan's phone log holds for the window — to say how thin it is. */
  calls: number;
};

// ---------------------------------------------------------------- the view

export type YearView = {
  label: string;
  goal: number;
  ytd: number;
  byNow: number;
  /** ytd − byNow. Positive is ahead. */
  gap: number;
  gapYesterday: number | null;
  gapLastWeek: number | null;
  /** Share of the goal still to invoice over the share of the plan still to come. */
  catchUp: number | null;
  /** This month's planned week, and the week it takes to land the year from here. */
  weekPlanned: number | null;
  weekNeeded: number | null;
  /** Where the year lands if the last four weeks are the rate from here. */
  landing: number | null;
};

export type PaceView = {
  goal: number;
  profitPct: number | null;
  rates: Rates;
  lanes: Lanes;
  year: Plan;
  month: Plan;
  week: Plan;
  day: Plan;
  standing: { today: Record<Step, Standing>; week: Record<Step, Standing>; month: Record<Step, Standing> };
  lastWeek: PaceCounts;
  thisWeek: PaceCounts;
  yearView: YearView | null;
  /** Leads are counted only from the web form and ServiceTitan; no verdict is drawn on them. */
  leadsPartial: boolean;
};

/**
 * The stages, plus what the quoting was worth.
 *
 * Quote value is not a seventh stage of the funnel — it is the third one in
 * dollars — so it lives beside `Stage` rather than in it. The plan already
 * carries it (`plan.quoted.value`), and the wall shows it in place of leads,
 * which nothing counts the phone calls behind.
 */
export type Step = Stage | "quotedValue";
export const STEPS: Step[] = ["leads", "booked", "quoted", "quotedValue", "sold", "completed", "invoiced"];

const actualOf = (c: PaceCounts, s: Step): number | null =>
  s === "quotedValue" ? c.quotedValue : s === "sold" ? c.sold : c[s];

/** Money for the two money steps, a count for the rest. */
const needOf = (plan: Plan, s: Step): number | null =>
  s === "quotedValue" ? plan.quoted.value : s === "invoiced" ? plan.invoiced.value : plan[s].count;

/**
 * The whole view: the plan at every scale, where each stage stands this week
 * and this month, and the year's gap now against yesterday and last week.
 * Null when there is no goal for the year we're in.
 */
export function buildPace(goal: PaceGoal | null, settings: PaceSettings, d: PaceData): PaceView | null {
  if (!goal || !(goal.revenue > 0)) return null;
  const share = monthShare(goal, d.today);
  if (share == null) return null;

  const rates = ratesFrom(d.measured, settings);
  const { plan: year, lanes } = yearPlan(goal.revenue, rates);

  const cal = d.calendar;
  const month = scalePlan(year, share);
  const dayShare = cal.month.total > 0 ? share / cal.month.total : 0;
  const day = scalePlan(year, dayShare);
  // A week at this month's rate. Weeks that straddle two months are planned at
  // the month they end up being counted against, which is this one.
  const week = scalePlan(year, dayShare * cal.daysPerWeek);
  const weekNeed = scalePlan(year, dayShare * cal.week.total);

  const frac = cal.todayWorking ? cal.dayFraction : 0;
  const weekElapsed = cal.week.total > 0 ? (cal.week.elapsed + frac) / cal.week.total : 0;
  const monthElapsed = cal.month.total > 0 ? (cal.month.elapsed + frac) / cal.month.total : 0;

  const stand = (plan: Plan, counts: PaceCounts, elapsed: number, left: number) => {
    const out = {} as Record<Step, Standing>;
    for (const s of STEPS) {
      const st = standingOf(needOf(plan, s), actualOf(counts, s), elapsed, left);
      // Leads are only partly counted — no phone calls — so "behind" would be
      // a statement about the data, not the phones. The figures stay; the
      // verdict doesn't.
      out[s] = s === "leads" ? { ...st, verdict: null } : st;
    }
    return out;
  };

  let yearView: YearView | null = null;
  if (d.year) {
    const yesterday = shiftIso(d.today, -1);
    const weekAgo = shiftIso(d.today, -7);
    const byNow = expectedBy(goal, d.today, frac) ?? 0;
    const byYesterday = expectedBy(goal, yesterday, 1);
    const byWeekAgo = expectedBy(goal, weekAgo, 1);
    const gap = d.year.ytd - byNow;
    const leftToInvoice = Math.max(0, goal.revenue - d.year.ytd);
    const planLeft = goal.revenue - byNow;
    const catchUp = planLeft > 0 ? leftToInvoice / planLeft : null;
    const weekPlanned = week.invoiced.value;
    // Days left in the goal's year, for the run-rate landing.
    const spans = yearSpans(goal.basis, goal.year);
    const end = spans[spans.length - 1].to;
    const daysLeft = Math.max(0, (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${d.today}T00:00:00Z`)) / 86_400_000 + (1 - frac));
    yearView = {
      label: periodLabel(goal),
      goal: goal.revenue,
      ytd: d.year.ytd,
      byNow,
      gap,
      gapYesterday: byYesterday == null ? null : d.year.ytdYesterday - byYesterday,
      gapLastWeek: byWeekAgo == null ? null : d.year.ytdLastWeek - byWeekAgo,
      catchUp,
      weekPlanned,
      weekNeeded: weekPlanned != null && catchUp != null ? weekPlanned * catchUp : null,
      landing: d.year.ytd + (d.year.last28 / 28) * daysLeft,
    };
  }

  return {
    goal: goal.revenue,
    profitPct: goal.profitPct ?? null,
    rates,
    lanes,
    year,
    month,
    week,
    day,
    standing: {
      // A day off asks for nothing; whatever comes in is a bonus, not a pace.
      today: stand(cal.todayWorking ? day : scalePlan(year, 0), d.periods.today, frac, 1),
      week: stand(weekNeed, d.periods.week, weekElapsed, cal.week.remaining),
      month: stand(month, d.periods.month, monthElapsed, cal.month.remaining),
    },
    lastWeek: d.periods.lastWeek,
    thisWeek: d.periods.week,
    yearView,
    leadsPartial: true,
  };
}

/** A YYYY-MM-DD date moved by whole days. */
export function shiftIso(iso: string, days: number): string {
  const t = Date.parse(`${iso}T12:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
