import "server-only";
import { cache } from "react";
import { latestBoard, savedGoal } from "@/lib/portal/office";
import { getGoals } from "@/lib/portal/goals";
import { callStats, followupRate } from "@/lib/portal/run/data";
import { coverBase } from "@/lib/portal/cover/load";
import { dayShape, clock } from "@/lib/portal/hours/dayShape";
import { loadPipeline } from "@/lib/pipeline/store";
import { daysBetween } from "@/lib/pipeline/types";
import type { SectorKey } from "@/lib/dashboard/sectors";

/**
 * What needs fixing in how the business runs, and how to fix it (Jake, 15 Nov:
 * "we are lacking in the area of flagging things that need to be fixed and
 * also how to fix them").
 *
 * needs.ts is the day's queue: three quotes to ring, a van report to answer.
 * Each line there is its own instruction. This is the layer under it, the
 * patterns that keep refilling the queue: jobs left unbilled for weeks, a
 * sector priced under its costs, a day that starts at half past nine. Each
 * flag says what's wrong with the number in it, why it matters in money where
 * that can be said honestly, whose job it is, and the steps that fix it.
 *
 * Every rule hides when its figure is fine or can't be read; nothing here is
 * shown off a figure nobody measured. "Blind" flags are the other kind of
 * problem: something the business can't see at all, because nothing records
 * it. They sit last.
 */

export type FixLevel = "serious" | "warning" | "blind";

export type Fix = {
  key: string;
  level: FixLevel;
  /** What's wrong, with the number in it. */
  title: string;
  /** Why it matters. */
  why: string;
  /** How to fix it, in order. */
  steps: string[];
  /** Whose job it is. */
  who: string;
  href: string;
  /** The words on the link. */
  go: string;
  /** Rough dollars at stake, only for ordering within a level. */
  worth: number;
};

const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const $k = (n: number) => (Math.abs(n) >= 100_000 ? `$${Math.round(n / 1000)}K` : Math.abs(n) >= 10_000 ? `$${(n / 1000).toFixed(1)}K` : $(n));
const pl = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-AU")} ${n === 1 ? one : many}`;
const first = (name: string) => name.trim().split(/\s+/)[0];
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const SECTOR_WORD: Record<SectorKey, string> = { maintenance: "Maintenance makes", breakdown: "Breakdowns make", repair: "Repairs make", install: "Installs make" };
const RANK: Record<FixLevel, number> = { serious: 0, warning: 1, blind: 2 };

/** Fewer inbound calls than this in 30 days and the phones plainly aren't logging. */
const CALLS_FLOOR = 30;

export const fixesNow = cache(async (): Promise<Fix[]> => {
  const [board, goals, year, follow, shape, hour, pipe, calls] = await Promise.all([
    latestBoard(),
    getGoals().catch(() => null),
    savedGoal().catch(() => null),
    followupRate().catch(() => null),
    dayShape().catch(() => null),
    coverBase().catch(() => null),
    loadPipeline().catch(() => null),
    callStats(30).catch(() => null),
  ]);
  const m = board?.metrics ?? null;
  const out: Fix[] = [];
  const target = year?.profitPct != null ? year.profitPct / 100 : null;

  // ---- Billing: work done that can't be paid for.
  if (m && (m.toBillCount ?? 0) > 0 && (m.toBillOldestDays ?? 0) > 2) {
    const n = m.toBillCount, oldest = m.toBillOldestDays ?? 0;
    const old = (m.toBillAges?.d31_60 ?? 0) + (m.toBillAges?.d60plus ?? 0);
    out.push({
      key: "unbilled",
      level: oldest > 7 || n >= 10 ? "serious" : "warning",
      title: `${pl(n, "job")} done and not billed, the oldest ${pl(oldest, "day")}`,
      why: `${m.toBillValue ? `${$k(m.toBillValue)} of work` : "Work"} we've paid wages and parts for and can't be paid for until it's invoiced.${old ? ` ${pl(old, "job is", "jobs are")} over a month old, and an old invoice is the hardest to collect.` : ""}`,
      steps: [
        "Open Not billed and work it oldest first.",
        "For each job: price it and send the invoice in ServiceTitan, or mark it no charge or warranty with the reason, so it leaves the list.",
        "From here on, invoice the visit the same day the tech marks it done.",
      ],
      who: "Admin",
      href: "/portal/jobs?tab=notbilled", go: "Not billed",
      worth: m.toBillValue || n * 600,
    });
  }

  // ---- Selling: quotes not rung, quotes gone quiet, sales not booked.
  if (follow && goals?.followup != null && follow.pct < goals.followup) {
    const gap = goals.followup - follow.pct;
    out.push({
      key: "followup",
      level: gap > 20 ? "serious" : "warning",
      title: `${Math.round(follow.pct)}% of quotes are followed up within 2 days (aim ${goals.followup}%)`,
      why: `Of the last ${follow.of} quotes, ${Math.round(follow.of * (1 - follow.pct / 100))} went more than two days with no call, text or sale. A quote rung on day 2 is rung before they've rung anyone else.`,
      steps: [
        "Work the pipeline's Follow up today column first thing every morning.",
        "Log every call on the quote, no answer included, so the board books the next one.",
        "Three tries: day 2, four days later, a week after that. Then close it off as lost with the reason.",
      ],
      who: "Admin",
      href: "/portal/pipeline", go: "Quote pipeline",
      worth: (m?.avgSoldValue ?? 3000) * follow.of * (gap / 100) * 0.1,
    });
  }

  const unbooked = (pipe?.quotes ?? []).filter((q) => q.stage === "won" && q.soldOn && daysBetween(q.soldOn, pipe!.today) >= 7);
  if (unbooked.length) {
    const value = unbooked.reduce((n, q) => n + q.value, 0);
    out.push({
      key: "unbooked",
      level: unbooked.length >= 5 || value > 30_000 ? "serious" : "warning",
      title: `${pl(unbooked.length, "sale")}${value > 0 ? ` worth ${$k(value)}` : ""} sold over a week ago with no job booked`,
      why: "They said yes and haven't been told when. These are the customers most likely to cancel or go to whoever can come sooner.",
      steps: [
        "Ring each one today and book a day.",
        "Order the gear as you book it, from To order, so it's there on the day.",
        "From here on, book the job within two days of the sale.",
      ],
      who: "Admin",
      href: "/portal/pipeline", go: "Sold, to be booked",
      worth: value,
    });
  }

  if (m && m.quotesQuietCount >= 10) {
    out.push({
      key: "quiet",
      level: m.quotesQuietValue > 100_000 ? "serious" : "warning",
      title: `${pl(m.quotesQuietCount, "quote")} worth ${$k(m.quotesQuietValue)} have gone quiet`,
      why: "Priced at least a week ago, not sold and not lost. Most are still winnable with a call; the rest are clutter that hides the live ones.",
      steps: [
        "Ring the biggest first: Jake for anything over $10K.",
        "Ask what's stopping them: the price, the timing, or waiting on someone else.",
        "If it's dead, mark it lost with the reason, so the Lost page can show why we lose.",
      ],
      who: "Admin, Jake for the big ones",
      href: "/portal/pipeline", go: "Quote pipeline",
      worth: m.quotesQuietValue * 0.05,
    });
  }

  if (m && m.closeRate30d != null && goals?.winRate != null && m.closeRate30d * 100 < goals.winRate - 5) {
    const now = m.closeRate30d * 100;
    const perMonth = goals.quotesMonth ?? null;
    const five = perMonth && m.avgSoldValue ? perMonth * 0.05 * m.avgSoldValue : null;
    out.push({
      key: "win",
      level: now < goals.winRate - 15 ? "serious" : "warning",
      title: `${Math.round(now)}% of quotes sold in the last 30 days (aim ${goals.winRate}%)`,
      why: five ? `At ${perMonth} quotes a month, every 5 points more is about ${$k(five)} a month in sales.` : "Every quote that doesn't sell is a visit and a price we've already paid for.",
      steps: [
        "Follow up every quote on day 2. It's the cheapest lift there is.",
        "Give options on every install quote: a good, a better and a best.",
        "Read the Lost page each week. Mostly price: check the pricebook against the market. Mostly no response: it's the follow-up.",
      ],
      who: "Jake and Admin",
      href: "/portal/pipeline/lost", go: "Why we lose",
      worth: five ?? 0,
    });
  }

  // ---- Profit: jobs under their costs, hours over the quote, sectors under the goal.
  const jp = m?.jobProfitRecent ?? null;
  if (jp && jp.costed >= 10 && jp.losing > 0) {
    out.push({
      key: "losing",
      level: jp.losing / jp.costed > 0.1 ? "serious" : "warning",
      title: `${jp.losing} of ${jp.costed} jobs in the last 30 days lost money`,
      why: `Each paid us less than its parts and hours cost.${jp.under > jp.losing ? ` Another ${jp.under - jp.losing} made something, but less than the goal's margin.` : ""}`,
      steps: [
        "Open Profit on every job and sort it worst first.",
        "For each one ask: more hours than quoted? Parts used and not billed? A pricebook price that's too low?",
        "Fix the cause, not just the job: change the price or the hours allowed on that pricebook item.",
      ],
      who: "Jake",
      href: "/portal/profit", go: "Profit on every job",
      worth: jp.losing * 300,
    });
  }
  if (jp && jp.timeJobs >= 20 && jp.timeActual > jp.timeAllowed * 1.05) {
    const extra = jp.timeActual - jp.timeAllowed;
    const cost = jp.costPerHr ? extra * jp.costPerHr : null;
    out.push({
      key: "overtime",
      level: jp.timeActual > jp.timeAllowed * 1.15 ? "serious" : "warning",
      title: `Jobs are taking longer than quoted: ${Math.round(jp.timeActual)} hrs against ${Math.round(jp.timeAllowed)} allowed`,
      why: `${jp.timeOver} of ${jp.timeJobs} jobs ran over in the last 30 days.${cost ? ` The ${Math.round(extra)} extra hours cost about ${$k(cost)} of profit.` : ""}`,
      steps: [
        "Before each job the tech reads the hours it was quoted for, on the iPad.",
        "When a job runs over, the tech notes why on the job the same day.",
        "If one kind of job always runs over, the allowance is wrong: change the hours on that pricebook item.",
      ],
      who: "Service manager and the techs",
      href: "/portal/profit", go: "Profit on every job",
      worth: cost ?? extra * 150,
    });
  }

  const sec = m?.sectors ?? null;
  if (sec && target != null) {
    for (const k of ["maintenance", "breakdown", "repair", "install"] as SectorKey[]) {
      const f = sec.bySector[k];
      if (f.margin == null || f.margin >= target || f.costed < 5) continue;
      // What each job needs on top, before GST, to reach the goal on today's
      // costs: (t·R − P) / (1 − t) per job, because the extra is profit and
      // revenue both.
      const costedRev = f.margin > 0 ? f.profit / f.margin : null;
      const per = costedRev ? (target * costedRev - f.profit) / (1 - target) / f.costed : null;
      out.push({
        key: `sector-${k}`,
        level: f.margin < target / 2 ? "serious" : "warning",
        title: `${SECTOR_WORD[k]} ${Math.round(f.margin * 100)}% (goal ${Math.round(target * 100)}%)`,
        why: `${pl(f.jobs, "job")} in the last 90 days, ${$k(f.revenue)} billed and ${$k(f.profit)} profit after parts and hours.`,
        steps: [
          per != null && per > 0 ? `Raise the price: about ${$(per)} more a job before GST gets it to ${Math.round(target * 100)}% on today's costs.` : "Raise the price on these jobs in the pricebook.",
          k === "maintenance" || k === "breakdown"
            ? "Or take less time: set the hours a visit should take and have the tech note why when it runs over."
            : "Or take less time: check the hours allowed against what these jobs really take.",
          ...(k === "maintenance" ? ["Sell on the visit: a service that finds a problem should leave a quote behind."] : []),
        ],
        who: "Jake",
        href: "/portal/profit", go: "Profit on every job",
        worth: per != null && per > 0 ? per * f.jobs : 0,
      });
    }
  }

  // ---- Time on the tools: where the paid day goes.
  const crew = shape?.crew ?? null;
  const aim = hour?.i.billPerDay ?? 6;
  if (crew && shape && crew.onSite < aim - 0.25) {
    const techs = shape.people.length;
    const short = aim - crew.onSite;
    const charge = hour?.i.charge ?? null;
    const weekHrs = short * techs * 5;
    const late = shape.people.filter((p) => p.start >= 9).sort((a, b) => b.start - a.start);
    out.push({
      key: "ontools",
      level: short > 1 ? "serious" : "warning",
      title: `The crew is on site ${crew.onSite.toFixed(1)} hrs of a ${Math.round(crew.paidDay)}-hour day (aim ${aim})`,
      why: `Closing the gap is ${Math.round(weekHrs)} more hours on jobs a week across ${pl(techs, "tech")}${charge ? `, about ${$k(weekHrs * charge)} a week at ${$(charge)} an hour` : ""}.`,
      steps: [
        `Get to the first job by 7:30. The crew is dispatched to its first job at ${clock(crew.start)} on average${late.length ? `; ${and(late.map((p) => `${first(p.name)} ${clock(p.start)}`))}` : ""}.`,
        "Load the van and get the parts the afternoon before, or have the supplier deliver to site, so the morning isn't a supplier run.",
        `Book each tech's day close together. They drive ${crew.drive.toFixed(1)} hrs a day on the clock and lose ${crew.between.toFixed(1)} hrs between jobs.`,
      ],
      who: "Office (booking) and the techs",
      href: "/portal/hours", go: "Where the day goes",
      worth: charge ? weekHrs * charge : weekHrs * 200,
    });
  }

  // ---- Visits that asked for a price and heard nothing.
  if (sec) {
    const n = sec.breakdown.quoted + sec.maintenance.quoted;
    if (n >= 5) {
      out.push({
        key: "visit-quotes",
        level: "warning",
        title: `${pl(n, "service or breakdown visit")} quoted and nothing booked since`,
        why: `${sec.breakdown.quoted} breakdowns and ${sec.maintenance.quoted} maintenance visits since ${new Date(`${sec.from}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" })}. They let us in and asked for a price: the warmest leads there are.`,
        steps: [
          "Find them in the pipeline: quotes written on a service or breakdown job.",
          "Ring each one. The tech's notes on the job say what was wrong.",
          "Follow up on day 2 like any other quote, and have the tech mention the quote before leaving.",
        ],
        who: "Admin",
        href: "/portal/pipeline", go: "Quote pipeline",
        worth: n * 1500,
      });
    }
  }

  // ---- Getting paid.
  const aged = m?.receivablesAging?.d30plus ?? 0;
  if (aged > 500) {
    out.push({
      key: "aged",
      level: aged > 10_000 ? "serious" : "warning",
      title: `${$k(aged)} owed to us for more than 30 days`,
      why: `${m?.overdueTotal ? `${$k(m.overdueTotal)} is past due in all. ` : ""}Money a month late is often money two months late, and it's cash the business is lending its customers.`,
      steps: [
        "Ring the oldest first. Real estate agents: email the invoice again, addressed to the property manager.",
        "Offer a payment plan rather than let it age.",
        "Past 60 days: a final notice with a date, then collections.",
      ],
      who: "Admin",
      href: "/portal/money", go: "Owed to us",
      worth: aged,
    });
  }

  // ---- Blind spots.
  if (calls && calls.inbound < CALLS_FLOOR) {
    out.push({
      key: "calls",
      level: "blind",
      title: `Phone calls aren't reaching ServiceTitan: ${pl(calls.inbound, "inbound call")} logged in 30 days`,
      why: "Calls answered, calls missed, and calls turned into bookings can't be counted, so \"every call answered live\" has no number behind it.",
      steps: [
        "Put the office line through ServiceTitan's phones, or connect the phone system's call log to it.",
        "Until then, put a missed call on a to-do the moment it's seen, so it's rung back.",
      ],
      who: "Jake",
      href: "/portal/today?tab=calls", go: "Call booking",
      worth: 0,
    });
  }

  return out.sort((a, b) => RANK[a.level] - RANK[b.level] || b.worth - a.worth);
});
