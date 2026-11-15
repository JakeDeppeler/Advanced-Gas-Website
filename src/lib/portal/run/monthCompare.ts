import "server-only";
import { unstable_cache } from "next/cache";
import { q, sbCount, sbSelect } from "@/lib/dashboard/db";
import { isoDateMelbourne, melbourneDayStart, startOfMonthMelbourne } from "@/lib/dashboard/dates";
import { QUOTE_CAP, quoteKey, quotes } from "@/lib/dashboard/metrics";
import { jobClass } from "@/lib/dashboard/pace";
import { jobProfits } from "@/lib/dashboard/jobProfit";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { savedGoal } from "@/lib/portal/office";
import { shapeBetween } from "@/lib/portal/hours/dayShape";
import { loadPipeline } from "@/lib/pipeline/store";
import { FIRST_CALL_DAYS, daysBetween } from "@/lib/pipeline/types";

/**
 * This month against last month, every KPI worked out the same way for both
 * (Jake, 15 Nov: "kpi for this and last month, how do we improve this").
 *
 * The snapshot only carries this month, and each of its figures was built for
 * the wall with its own window, so last month couldn't be read off it. These
 * are recomputed from the replica for three spans with one definition each:
 *
 *   - this month so far
 *   - last month to the same point, the fair comparison for a running total:
 *     the 15th against the 15th, not against all of October
 *   - all of last month, for the size of a whole month
 *
 * Rates (win rate, average job, margin, time on site, follow-up) compare as
 * they are; totals compare against the same point.
 *
 * Kept ten minutes: three spans of sales, quotes, jobs, invoices, job costing
 * and clock-ins is too many reads for every visit to the page, and none of it
 * moves faster than the ServiceTitan pull that feeds it.
 */

export type MonthFigures = {
  from: string;
  /** The last day covered. */
  to: string;
  sold: number;
  soldJobs: number;
  /** Each quote once, at the average of its options, because at most one sells. */
  quoted: number;
  quotedJobs: number;
  winRate: number | null;
  avgJob: number | null;
  invoiced: number;
  jobsDone: number;
  /** New work booked: quote visits, services, breakdowns, repairs. Installs come from quotes, so they're left out, as on the board. */
  booked: number;
  leads: number;
  /** Job margin after parts and hours, over the jobs that could be costed. */
  margin: number | null;
  costed: number;
  losing: number;
  /** Average hours on site per tech per weekday. */
  onSite: number | null;
  /** First-dispatch time, decimal hours. */
  start: number | null;
  /** Share of quotes followed up or sold within two days, of those at least two days old. */
  followup: number | null;
  followupOf: number;
};

export type MonthCompare = { now: MonthFigures; same: MonthFigures; last: MonthFigures; monthName: string; lastName: string };

const DAY = 86_400_000;
/** Below these the rate is a coin toss, and shows as a dash. */
const MIN_QUOTED = 8;
const MIN_COSTED = 5;
const MIN_FOLLOW = 10;

type Span = { start: Date; end: Date };

async function figures({ start, end }: Span, ctx: { costPerHr: number | null; crew: Array<{ name: string; cost: number | null }>; target: number | null; pipe: Awaited<ReturnType<typeof loadPipeline>> | null }): Promise<MonthFigures> {
  const s = start.toISOString(), e = end.toISOString();
  const fromDay = isoDateMelbourne(start);
  const lastDay = isoDateMelbourne(new Date(end.getTime() - 1));

  const [sales, ests, jobsIn, jobsDone, invoices, leads, profit, shape] = await Promise.all([
    sbSelect<{ total: number | null; first: boolean | null; business_unit: string | null }>("st_sales", [
      q.select("total:total_inc,first,business_unit"), q.gte("sold_on", s), q.lt("sold_on", e), q.lt("est_total", String(QUOTE_CAP)), "limit=5000",
    ].join("&")).catch(() => []),
    sbSelect<{ id: number; job_id: number | null; customer_id: number | null; created_on: string | null; total: number | null; business_unit: string | null }>("st_estimates", [
      q.select("id,job_id,customer_id,created_on,total:total_inc,business_unit"), q.gte("created_on", s), q.lt("created_on", e), "limit=5000",
    ].join("&")).catch(() => []),
    sbSelect<{ job_type: string | null; status: string | null }>("st_jobs", [
      q.select("job_type,status"), q.gte("created_on", s), q.lt("created_on", e), "limit=5000",
    ].join("&")).catch(() => []),
    sbCount("st_jobs", [q.eq("status", "Completed"), q.gte("completed_on", s), q.lt("completed_on", e)].join("&")).catch(() => 0),
    sbSelect<{ total: number | null }>("st_invoices_billed", [
      q.select("total"), q.gte("invoice_date", fromDay), `invoice_date=lte.${lastDay}`, "limit=5000",
    ].join("&")).catch(() => []),
    sbCount("portal_leads", [q.gte("created_at", s), q.lt("created_at", e)].join("&")).catch(() => 0),
    ctx.costPerHr != null ? jobProfits(fromDay, lastDay, ctx.costPerHr, ctx.target, ctx.crew).then((r) => r.summary).catch(() => null) : Promise.resolve(null),
    shapeBetween(s, e).catch(() => null),
  ]);

  const sold = quotes(sales);
  const soldValue = sold.reduce((n, r) => n + Number(r.total ?? 0), 0);
  const soldJobs = sold.filter((r) => r.first).length;

  // Options grouped into quotes the way the board and the pipeline group them.
  const groups = new Map<string, number[]>();
  for (const r of quotes(ests)) {
    if (Number(r.total ?? 0) >= QUOTE_CAP) continue;
    const k = quoteKey(r);
    groups.set(k, [...(groups.get(k) ?? []), Number(r.total ?? 0)]);
  }
  const quoted = [...groups.values()].reduce((n, v) => n + v.reduce((a, b) => a + b, 0) / v.length, 0);

  // Followed up within two days, of the quotes written in the span that are two days old now.
  const today = ctx.pipe?.today ?? isoDateMelbourne(new Date());
  const pq = ctx.pipe ? [...ctx.pipe.quotes, ...ctx.pipe.stale].filter((x) => x.quotedOn >= fromDay && x.quotedOn <= lastDay && daysBetween(x.quotedOn, today) >= FIRST_CALL_DAYS) : [];
  const followed = pq.filter((x) =>
    (x.soldOn && daysBetween(x.quotedOn, x.soldOn) <= FIRST_CALL_DAYS) ||
    x.touches.some((t) => t.how !== "note" && daysBetween(x.quotedOn, t.at.slice(0, 10)) <= FIRST_CALL_DAYS));

  return {
    from: fromDay, to: lastDay,
    sold: soldValue, soldJobs,
    quoted, quotedJobs: groups.size,
    winRate: groups.size >= MIN_QUOTED ? soldJobs / groups.size : null,
    avgJob: soldJobs > 0 ? soldValue / soldJobs : null,
    invoiced: invoices.reduce((n, r) => n + Number(r.total ?? 0), 0),
    jobsDone,
    booked: jobsIn.filter((r) => r.status !== "Canceled" && jobClass(r.job_type) !== "install").length,
    leads,
    margin: profit && profit.costed >= MIN_COSTED ? profit.margin : null,
    costed: profit?.costed ?? 0,
    losing: profit?.losing ?? 0,
    onSite: shape?.crew?.onSite ?? null,
    start: shape?.crew?.start ?? null,
    followup: pq.length >= MIN_FOLLOW ? followed.length / pq.length : null,
    followupOf: pq.length,
  };
}

/** The same instant a month earlier, held to that month's length: 31 Mar → 28 Feb. */
function monthBack(now: Date): Date {
  const iso = isoDateMelbourne(now);
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 2, 1));
  const len = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  const back = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, len)).padStart(2, "0")}`;
  const intoDay = now.getTime() - melbourneDayStart(iso).getTime();
  return new Date(melbourneDayStart(back).getTime() + intoDay);
}

const read = unstable_cache(async (_hour: string): Promise<MonthCompare> => {
  const now = new Date();
  const monthStart = startOfMonthMelbourne(now);
  const lastStart = startOfMonthMelbourne(new Date(monthStart.getTime() - DAY));
  const [costs, goal, pipe] = await Promise.all([
    hourJobCosts().catch(() => null),
    savedGoal().catch(() => null),
    loadPipeline().catch(() => null),
  ]);
  const ctx = { costPerHr: costs?.costPerHr ?? null, crew: costs?.crew ?? [], target: goal?.profitPct ?? null, pipe };
  const [a, b, c] = await Promise.all([
    figures({ start: monthStart, end: now }, ctx),
    figures({ start: lastStart, end: monthBack(now) }, ctx),
    figures({ start: lastStart, end: monthStart }, ctx),
  ]);
  const name = (d: Date) => d.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });
  return { now: a, same: b, last: c, monthName: name(monthStart), lastName: name(lastStart) };
}, ["month-compare-v1"], { revalidate: 600 });

/** Keyed on the hour as well as cached for ten minutes, so "so far" never stops at yesterday. */
export function monthCompare(): Promise<MonthCompare> {
  return read(new Date().toISOString().slice(0, 13));
}
