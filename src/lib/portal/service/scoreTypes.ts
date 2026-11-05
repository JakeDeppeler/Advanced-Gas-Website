/**
 * The Service manager's scorecard, worked out from rows the portal already
 * has (Jake, 5 Nov: "who is the most efficient, who is losing money ... who is
 * and isn't selling, who is working on track on time, who has call backs").
 * Pure, for scripts/check-service.ts.
 *
 * Every figure comes from a job someone was on in ServiceTitan:
 *  - money and hours from Profit on every job (lib/dashboard/jobProfit.ts):
 *    the invoice before GST, less equipment and materials, less the hours
 *    on site at what an hour of the crew costs. A job two techs were on is
 *    split between them evenly; that's said on the page.
 *  - on track: hours on site against what the quote allowed, over the jobs
 *    that carry both.
 *  - call-backs: see reworkFrom.
 * A tech with too few costed jobs gets no profit figure rather than a
 * confident one off two jobs.
 */

import type { JobProfit } from "@/lib/dashboard/jobProfit";

/** Below this many costed jobs in the period, a tech's profit figures are held back. */
export const MIN_COSTED = 4;
/** How soon a return visit counts as a call-back on the first job. */
export const REWORK_DAYS = 30;

export type TechScore = {
  name: string;
  /** Jobs invoiced with them on it (a shared job counts once for each). */
  jobs: number;
  /** Their share, before GST. */
  revenue: number;
  /** Of their jobs, the ones every cost is known for. */
  costed: number;
  /** Their share of the price of the costed jobs: what profit and margin are measured against. */
  costedRevenue: number;
  profit: number;
  margin: number | null;
  /** Their share of the hours on site. */
  hours: number;
  /** Profit per hour on site: the efficiency figure. Null under MIN_COSTED. */
  profitPerHour: number | null;
  revenuePerHour: number | null;
  /** Jobs they were on that lost money. */
  losing: number;
  /** Over the jobs with a quoted time and a timesheet. */
  timeJobs: number;
  timeAllowed: number;
  timeActual: number;
  timeOver: number;
  /** Call-backs on jobs they did (reworkFrom), and of how many finished. */
  callBacks: number;
  finished: number;
};

const blank = (name: string): TechScore => ({
  name, jobs: 0, revenue: 0, costed: 0, costedRevenue: 0, profit: 0, margin: null, hours: 0, profitPerHour: null, revenuePerHour: null,
  losing: 0, timeJobs: 0, timeAllowed: 0, timeActual: 0, timeOver: 0, callBacks: 0, finished: 0,
});

/** Name as a key: "Dean  Winbanks" and "dean winbanks" are one person. */
export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function scoreTechs(rows: Pick<JobProfit, "techs" | "price" | "profit" | "actualHours" | "allowedHours" | "hours">[]): TechScore[] {
  const by = new Map<string, TechScore>();
  for (const r of rows) {
    const techs = [...new Set(r.techs.map((t) => t.trim()).filter(Boolean))];
    if (!techs.length) continue;
    const share = 1 / techs.length;
    for (const t of techs) {
      const k = nameKey(t);
      const s = by.get(k) ?? blank(t);
      s.jobs += 1;
      s.revenue += r.price * share;
      if (r.profit != null) {
        s.costed += 1;
        s.costedRevenue += r.price * share;
        s.profit += r.profit * share;
        s.hours += (r.hours ?? 0) * share;
        if (r.profit < 0) s.losing += 1;
      }
      if (r.allowedHours != null && r.actualHours != null && r.allowedHours > 0) {
        s.timeJobs += 1;
        s.timeAllowed += r.allowedHours;
        s.timeActual += r.actualHours;
        if (r.actualHours > r.allowedHours * 1.1) s.timeOver += 1;
      }
      by.set(k, s);
    }
  }
  for (const s of by.values()) {
    s.margin = s.costed >= MIN_COSTED && s.costedRevenue > 0 ? s.profit / s.costedRevenue : null;
    s.profitPerHour = s.costed >= MIN_COSTED && s.hours > 0 ? s.profit / s.hours : null;
    s.revenuePerHour = s.costed >= MIN_COSTED && s.hours > 0 ? s.costedRevenue / s.hours : null;
  }
  // Most efficient first: profit for every hour on site. Those without enough jobs to say, last.
  return [...by.values()].sort((a, b) => (b.profitPerHour ?? -Infinity) - (a.profitPerHour ?? -Infinity) || b.revenue - a.revenue);
}

export type DoneJob = { id: number; jobNumber: string | null; jobType: string | null; locationId: number | null; completedOn: string; techs: string[] };
export type LaterJob = { id: number; jobNumber: string | null; jobType: string | null; locationId: number | null; createdOn: string; status: string | null; fromEstimate: boolean };
export type Rework = { first: DoneJob; back: LaterJob; days: number };

const NOT_WORK = /quot|assess|inspection/i;
/** The kinds of job that mean something wasn't right: back to look, fix, or a warranty. */
const COME_BACK = /warrant|diagnos|repair|leak|fault|recall|return/i;

/**
 * Call-backs: we went back to the same site within REWORK_DAYS of finishing a
 * job there, for a look, a fix or a warranty, and the return wasn't booked
 * from a quote (a diagnostic that sold a repair is a sale, not a call-back).
 * Put against whoever did the first job. Each return counts once, against the
 * latest job before it.
 */
export function reworkFrom(done: DoneJob[], later: LaterJob[]): Rework[] {
  const out: Rework[] = [];
  for (const b of later) {
    if (!b.locationId || b.fromEstimate || (b.status ?? "") === "Canceled" || !COME_BACK.test(b.jobType ?? "")) continue;
    const at = Date.parse(b.createdOn);
    const before = done
      .filter((d) => d.locationId === b.locationId && d.id !== b.id && !NOT_WORK.test(d.jobType ?? ""))
      .filter((d) => { const t = Date.parse(d.completedOn); return t < at && at - t <= REWORK_DAYS * 86_400_000; })
      .sort((x, y) => Date.parse(y.completedOn) - Date.parse(x.completedOn));
    const first = before[0];
    if (first) out.push({ first, back: b, days: Math.round((at - Date.parse(first.completedOn)) / 86_400_000) });
  }
  return out.sort((x, y) => Date.parse(y.back.createdOn) - Date.parse(x.back.createdOn));
}

/** Call-backs and finished jobs onto each tech's score; a tech with call-backs but no invoiced jobs gets a row. */
export function addRework(scores: TechScore[], done: DoneJob[], rework: Rework[]): TechScore[] {
  const by = new Map(scores.map((s) => [nameKey(s.name), s]));
  const get = (t: string) => { const k = nameKey(t); let s = by.get(k); if (!s) { s = blank(t.trim()); by.set(k, s); } return s; };
  for (const d of done) if (!NOT_WORK.test(d.jobType ?? "")) for (const t of new Set(d.techs)) get(t).finished += 1;
  for (const r of rework) for (const t of new Set(r.first.techs)) get(t).callBacks += 1;
  return [...by.values()];
}

export type TypeScore = { jobType: string; jobs: number; costed: number; revenue: number; profit: number; margin: number | null; losing: number };

/** Where the money is made and lost: each kind of job, most profit first, losers last. */
export function byJobType(rows: Pick<JobProfit, "jobType" | "price" | "profit">[]): TypeScore[] {
  const by = new Map<string, TypeScore>();
  for (const r of rows) {
    const k = r.jobType?.trim() || "No job type";
    const s = by.get(k) ?? { jobType: k, jobs: 0, costed: 0, revenue: 0, profit: 0, margin: null, losing: 0 };
    s.jobs += 1;
    if (r.profit != null) {
      s.costed += 1;
      s.revenue += r.price;
      s.profit += r.profit;
      if (r.profit < 0) s.losing += 1;
    }
    by.set(k, s);
  }
  for (const s of by.values()) s.margin = s.costed >= 3 && s.revenue > 0 ? s.profit / s.revenue : null;
  return [...by.values()].sort((a, b) => b.profit - a.profit);
}
