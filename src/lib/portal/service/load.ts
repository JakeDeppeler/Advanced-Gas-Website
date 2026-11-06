import "server-only";
import { cache } from "react";
import { q, sbSelect } from "@/lib/dashboard/db";
import { jobProfits, type JobProfit, type ProfitSummary } from "@/lib/dashboard/jobProfit";
import { dailyPace, type TechDay } from "@/lib/dashboard/dailyPace";
import { toBillJobs } from "@/lib/dashboard/toBill";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { latestBoard, savedGoal } from "@/lib/portal/office";
import { buildDailyReminder } from "@/lib/reminders/daily";
import { addDays, melDate } from "@/lib/reminders/dailyTypes";
import { addRework, byJobType, nameKey, reworkFrom, scoreTechs, type DoneJob, type LaterJob, type Rework, type TechScore, type TypeScore } from "./scoreTypes";

/**
 * Everything the Service manager pages show, read from the replica the rest
 * of the portal uses, so a figure here matches Profit on every job, Per van
 * and the wall.
 */

export type Period = "month" | "last" | "90";
export const PERIODS: { k: Period; label: string }[] = [
  { k: "month", label: "This month" },
  { k: "last", label: "Last month" },
  { k: "90", label: "Last 90 days" },
];

export function periodRange(p: Period, now = new Date()): { from: string; to: string; label: string } {
  const today = melDate(now);
  const first = `${today.slice(0, 8)}01`;
  if (p === "last") {
    const lastDay = addDays(first, -1);
    return { from: `${lastDay.slice(0, 8)}01`, to: lastDay, label: "last month" };
  }
  if (p === "90") return { from: addDays(today, -89), to: today, label: "the last 90 days" };
  return { from: first, to: today, label: "this month" };
}

type Sales = { sold: number; soldJobs: number; quotedJobs: number; closeRate: number | null; avgTicket: number | null };
export type Scorecard = {
  from: string; to: string; label: string;
  techs: (TechScore & { sales: Sales | null })[];
  types: TypeScore[];
  /** The jobs that lost the most, worst first. */
  worst: JobProfit[];
  rework: Rework[];
  summary: ProfitSummary | null;
  /** The sales figures are the wall's, this month only. */
  salesMonth: boolean;
};

async function techsOn(jobIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  for (let i = 0; i < jobIds.length; i += 200) {
    const rows = await sbSelect<{ job_id: number; technician_name: string | null }>(
      "st_appointment_assignments", [q.select("job_id,technician_name"), `job_id=in.(${jobIds.slice(i, i + 200).join(",")})`, "active=not.is.false"].join("&"),
    );
    for (const r of rows) {
      if (!r.technician_name) continue;
      const list = out.get(Number(r.job_id)) ?? [];
      if (!list.includes(r.technician_name.trim())) list.push(r.technician_name.trim());
      out.set(Number(r.job_id), list);
    }
  }
  return out;
}

/** Finished jobs since `from`, with who did them, and every look/fix/warranty job booked since. */
async function reworkSince(from: string, to: string): Promise<{ done: DoneJob[]; rework: Rework[] }> {
  const start = `${addDays(from, -REWORK_LOOKBACK)}T00:00:00+11:00`;
  const [doneRows, laterRows] = await Promise.all([
    sbSelect<{ id: number; job_number: string | null; job_type: string | null; location_id: number | null; completed_on: string }>(
      "st_jobs", [q.select("id,job_number,job_type,location_id,completed_on"), q.eq("status", "Completed"), q.gte("completed_on", start), q.lt("completed_on", `${addDays(to, 1)}T00:00:00+11:00`), "limit=5000"].join("&"),
    ),
    sbSelect<{ id: number; job_number: string | null; job_type: string | null; location_id: number | null; created_on: string; status: string | null; est: string | null }>(
      "st_jobs",
      [q.select("id,job_number,job_type,location_id,created_on,status,est:raw->>createdFromEstimateId"), q.gte("created_on", `${from}T00:00:00+11:00`),
        "or=(job_type.ilike.*warrant*,job_type.ilike.*diagnos*,job_type.ilike.*repair*,job_type.ilike.*leak*,job_type.ilike.*fault*,job_type.ilike.*recall*,job_type.ilike.*return*)", "limit=5000"].join("&"),
    ),
  ]);
  const who = await techsOn(doneRows.map((d) => Number(d.id)));
  const allDone: DoneJob[] = doneRows.map((d) => ({ id: Number(d.id), jobNumber: d.job_number, jobType: d.job_type, locationId: d.location_id, completedOn: d.completed_on, techs: who.get(Number(d.id)) ?? [] }));
  const later: LaterJob[] = laterRows.map((l) => ({ id: Number(l.id), jobNumber: l.job_number, jobType: l.job_type, locationId: l.location_id, createdOn: l.created_on, status: l.status, fromEstimate: !!l.est }));
  // Returns booked in the period; the job they went back to may be just before it.
  const rework = reworkFrom(allDone, later).filter((r) => melDate(r.back.createdOn) >= from && melDate(r.back.createdOn) <= to);
  const done = allDone.filter((d) => melDate(d.completedOn) >= from);
  return { done, rework };
}
const REWORK_LOOKBACK = 30;

export const serviceScorecard = cache(async (p: Period): Promise<Scorecard> => {
  const r = periodRange(p);
  const [crew, goal] = await Promise.all([hourJobCosts().catch(() => null), savedGoal().catch(() => null)]);
  const [profits, rw, board] = await Promise.all([
    jobProfits(r.from, r.to, crew?.costPerHr ?? null, goal?.profitPct ?? null, crew?.crew ?? []).catch(() => null),
    reworkSince(r.from, r.to).catch(() => ({ done: [] as DoneJob[], rework: [] as Rework[] })),
    p === "month" ? latestBoard() : Promise.resolve(null),
  ]);
  const rows = profits?.rows ?? [];
  const scores = addRework(scoreTechs(rows), rw.done, rw.rework);

  const leaders = board?.metrics?.salesLeaderboard ?? [];
  const salesOf = (name: string): Sales | null => {
    const k = nameKey(name);
    const first = k.split(" ")[0];
    const hit = leaders.find((l) => nameKey(l.name) === k) ?? (leaders.filter((l) => nameKey(l.name).split(" ")[0] === first).length === 1 ? leaders.find((l) => nameKey(l.name).split(" ")[0] === first) : undefined);
    return hit ? { sold: hit.sold, soldJobs: hit.soldJobs, quotedJobs: hit.quotedJobs, closeRate: hit.closeRate, avgTicket: hit.avgTicket } : null;
  };

  return {
    ...r,
    techs: scores.filter((s) => s.jobs > 0 || s.finished > 0).map((s) => ({ ...s, sales: p === "month" ? salesOf(s.name) : null })),
    types: byJobType(rows),
    worst: rows.filter((x) => x.profit != null && x.profit < 0).sort((a, b) => (a.profit ?? 0) - (b.profit ?? 0)).slice(0, 12),
    rework: rw.rework,
    summary: profits?.summary ?? null,
    salesMonth: p === "month",
  };
});

export type ServiceDay = {
  /** Today's techs with time on the quoted jobs over what was allowed. */
  pace: TechDay[] | null;
  /** Jobs that lost money, invoiced in the last 7 days. */
  losing: JobProfit[];
  rework: Rework[];
  toBill: number;
  toBillOld: number;
  gear: { key: string; title: string; count: number; soon: number }[];
  callBacks: number;
};

/** The day's checks, each counted. */
export const serviceDay = cache(async (): Promise<ServiceDay> => {
  const today = melDate(new Date());
  const [pace, week, rw, unbilled, reminder, cb] = await Promise.all([
    dailyPace().catch(() => null),
    (async () => {
      const [crew, goal] = await Promise.all([hourJobCosts().catch(() => null), savedGoal().catch(() => null)]);
      return jobProfits(addDays(today, -7), today, crew?.costPerHr ?? null, goal?.profitPct ?? null, crew?.crew ?? []).catch(() => null);
    })(),
    reworkSince(addDays(today, -13), today).catch(() => ({ done: [], rework: [] as Rework[] })),
    toBillJobs().catch(() => []),
    buildDailyReminder(new Date(), { live: false, callBacks: false }).catch(() => null),
    sbSelect<{ id: string }>("mail_drafts", [q.select("id"), q.gte("callback_at", new Date(Date.now() - 14 * 86_400_000).toISOString()), q.isNull("callback_done_at"), "limit=100"].join("&")).catch(() => []),
  ]);
  const yesterday = addDays(today, -1);
  return {
    pace: pace?.techs ?? null,
    losing: (week?.rows ?? []).filter((x) => x.profit != null && x.profit < 0).sort((a, b) => (a.profit ?? 0) - (b.profit ?? 0)),
    rework: rw.rework,
    toBill: unbilled.length,
    toBillOld: unbilled.filter((u) => melDate(u.at) < yesterday).length,
    gear: (reminder?.groups ?? []).filter((g) => g.key !== "billing").map((g) => ({ key: g.key, title: g.title, count: g.jobs.length, soon: g.jobs.filter((j) => j.visit && melDate(j.visit) <= addDays(today, 2)).length })),
    callBacks: cb.length,
  };
});
