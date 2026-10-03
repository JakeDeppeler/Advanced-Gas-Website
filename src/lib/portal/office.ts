import "server-only";
import { cache } from "react";
import { latestSnapshot } from "@/lib/dashboard/metrics";
import { q, sbCount, sbSelect } from "@/lib/dashboard/db";
import { actions, shortfalls, type CheckItems } from "@/lib/portal/vanChecks";
import { dbConfigured, getSettings, listVanChecks, listVehicles } from "@/lib/portal/db";
import { readYearGoal, yearSpans, type YearGoal } from "@/lib/portal/yearGoal";
import { getProfitAndLoss, localToday, xeroStatus, type ProfitLoss } from "@/lib/portal/xero";
import { startOfMonthMelbourne } from "@/lib/dashboard/dates";

/**
 * What the office pages read, in one place.
 *
 * The figures the wall board already computes come from its latest snapshot —
 * one row, the same numbers the TV shows — so the Scoreboard and the board can
 * never disagree about the month. What the board doesn't compute is read here
 * from the same replica, with the same rules.
 */

/** The board's latest snapshot, once per request. Null before the first one. */
export const latestBoard = cache(async () => (dbConfigured() ? latestSnapshot().catch(() => null) : null));

/** The saved year goal, once per request. Null when nothing has been saved. */
export const savedGoal = cache(async (): Promise<YearGoal | null> => {
  if (!dbConfigured()) return null;
  const row = await getSettings<unknown>("yeargoal").catch(() => null);
  if (row == null) return null;
  const goal = readYearGoal(row, new Date());
  return goal.revenue > 0 ? goal : null;
});

/** "$3M", "$2.5M", "$750k" — a goal as people say it. */
export function shortMoney(n: number): string {
  if (n >= 1_000_000) return `$${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

/**
 * Enquiries since the 1st of the month, every source we can see.
 *
 * Website enquiries (the quote form and phone taps, from `portal_leads`) and
 * ServiceTitan's own leads. Inbound calls are counted on their own: a call is
 * as often an existing customer as a new one, and folding them in would make
 * the lead count a call count.
 */
export const leadsThisMonth = cache(async (): Promise<{ web: number; st: number; calls: number; total: number } | null> => {
  if (!dbConfigured()) return null;
  const from = startOfMonthMelbourne(new Date()).toISOString();
  try {
    const [web, st, calls] = await Promise.all([
      sbCount("portal_leads", q.gte("created_at", from)),
      sbCount("st_leads", q.gte("created_on", from)),
      sbCount("st_calls", [q.gte("received_on", from), q.eq("direction", "Inbound")].join("&")),
    ]);
    return { web, st, calls, total: web + st };
  } catch {
    return null;
  }
});

export type VanIssue = { vehicleId: string; van: string; item: string; note: string; kind: "service" | "tool"; on: string };

/**
 * What the latest checks flagged on each van that is on the road: anything
 * the weekly or monthly check marked as needing doing is a service request,
 * and anything the tool bag or plant count found under its minimum is a tool
 * short. Only the latest sheet of each kind counts — a tyre flagged three
 * weeks ago and passed since is not waiting on anyone.
 */
export const vanIssues = cache(async (): Promise<VanIssue[]> => {
  if (!dbConfigured()) return [];
  const vans = (await listVehicles().catch(() => [])).filter((v) => v.status === "on");
  const out: VanIssue[] = [];
  await Promise.all(
    vans.map(async (v) => {
      const [weekly, monthly, bag, plant] = await Promise.all(
        (["weekly", "monthly", "bag", "plant"] as const).map((k) => listVanChecks(v.id, k, 1).catch(() => [])),
      );
      for (const [rows, kind] of [[weekly, "weekly"], [monthly, "monthly"]] as const) {
        const c = rows[0];
        if (!c) continue;
        for (const a of actions(kind, (c.items ?? {}) as CheckItems)) {
          out.push({ vehicleId: v.id, van: v.name, item: a.item, note: a.note, kind: "service", on: c.checkedOn });
        }
      }
      for (const [rows, kind] of [[bag, "bag"], [plant, "plant"]] as const) {
        const c = rows[0];
        if (!c) continue;
        for (const sh of shortfalls(kind, (c.items ?? {}) as CheckItems)) {
          out.push({ vehicleId: v.id, van: v.name, item: sh.item, note: `${sh.qty} of ${sh.min}`, kind: "tool", on: c.checkedOn });
        }
      }
    }),
  );
  return out;
});

/** Jobs ServiceTitan has for one customer, newest first. */
export async function customerJobs(customerId: number) {
  return sbSelect<{ id: number; job_number: string | null; status: string | null; job_type: string | null; suburb: string | null; total: number | null; created_on: string | null; completed_on: string | null; campaign: string | null }>(
    "st_jobs",
    [q.select("id,job_number,status,job_type,suburb,total,created_on,completed_on,campaign"), q.eq("customer_id", String(customerId)), q.order("created_on", "desc")].join("&"),
  );
}

/**
 * Xero's profit for the month so far and the year so far, once per request.
 * The year runs from the saved goal's start, or 1 July when there's no goal.
 * Null halves when Xero isn't connected or didn't answer.
 */
export const xeroProfit = cache(async (): Promise<{ month: ProfitLoss | null; year: ProfitLoss | null; yearFrom: string }> => {
  const today = localToday();
  const iso = today.toISOString().slice(0, 10);
  const goal = await savedGoal();
  const fyStartYear = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const yearFrom = goal ? yearSpans(goal.basis, goal.year)[0].from : `${fyStartYear}-07-01`;
  const monthFrom = `${iso.slice(0, 7)}-01`;
  const { status } = await xeroStatus().catch(() => ({ status: "not-configured" as const }));
  if (status !== "connected") return { month: null, year: null, yearFrom };
  const [month, year] = await Promise.all([
    getProfitAndLoss(monthFrom, iso).catch(() => null),
    getProfitAndLoss(yearFrom, iso).catch(() => null),
  ]);
  return { month, year, yearFrom };
});

/** "30 June 2027" — the day the goal's year ends, or the financial year's when there's no goal. */
export function yearEndLabel(goal: YearGoal | null): string {
  const today = localToday();
  const end = goal
    ? yearSpans(goal.basis, goal.year)[11].to
    : `${today.getUTCMonth() >= 6 ? today.getUTCFullYear() + 1 : today.getUTCFullYear()}-06-30`;
  return new Date(`${end}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

/** "October" — Melbourne's month. */
export function monthName(): string {
  return localToday().toLocaleDateString("en-AU", { timeZone: "UTC", month: "long" });
}
