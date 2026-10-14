"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings } from "@/lib/portal/db";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { saveGoals } from "@/lib/portal/goals";
import { normaliseGoals, type Goals } from "@/lib/portal/goalsTypes";
import { saveYearGoal } from "@/app/portal/finance/goals/actions";

/**
 * Pricing & costs › Goals saves two records: the parts of the year goal it shows
 * (the months, so the year's sales; the profit %) and every other KPI goal,
 * the win rate to aim for among them. The year goal is read fresh and only
 * those fields changed, so the mix and the pace settings saved on Pace —
 * including a close rate to plan on, the year goal's winRatePct — are left
 * as they were. That one is a planning rate, not a target, and lives on Pace.
 */
export async function saveGoalsPage(input: { months: number[]; profitPct: number | null; goals: Goals }): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  if (!Array.isArray(input.months) || input.months.length !== 12) return { ok: false, error: "Twelve months, please." };
  // Months stay as they are (they're the year's shape, weights); the year is
  // their sum, rounded once, so an even split of $3.2M saves as $3.2M.
  const months = input.months.map((v) => Math.max(0, Number(v) || 0));
  const revenue = Math.round(months.reduce((a, b) => a + b, 0));
  const current = readYearGoal(await getSettings<unknown>("yeargoal").catch(() => null), new Date());
  const res = await saveYearGoal({
    ...current,
    revenue,
    shape: revenue > 0 ? months : null,
    profitPct: input.profitPct == null ? null : Number(input.profitPct),
  });
  if (!res.ok) return res;
  const g = await saveGoals(normaliseGoals(input.goals));
  if (!g.ok) return { ok: false, error: "The year saved; the other goals didn't." };
  for (const p of ["/portal/numbers", "/portal/kpis", "/portal/sales", "/portal/today", "/portal", "/portal/jobs", "/portal/goal"]) revalidatePath(p);
  return { ok: true };
}
