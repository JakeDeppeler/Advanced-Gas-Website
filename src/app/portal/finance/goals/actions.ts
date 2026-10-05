"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { readWinRatePct, readYearGoal, storedPace, type PaceSettings, type YearGoal } from "@/lib/portal/yearGoal";

export type ActionResult = { ok: boolean; error?: string };

/**
 * The year's goal lives in shared settings, not one person's browser: it is
 * the business's number, and the figure on this page has to be the same one
 * the breakdown is derived from.
 *
 * Everything is clamped here rather than trusted from the form. A negative
 * goal or a thirteen-month shape would not crash anything — it would quietly
 * produce a page of plausible nonsense, which is worse.
 */
export async function saveYearGoal(g: YearGoal): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };

  const year = Math.round(Number(g.year));
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return { ok: false, error: "That year doesn't look right." };

  const shape =
    Array.isArray(g.shape) && g.shape.length === 12 && g.shape.some((v) => Number(v) > 0)
      ? g.shape.map((v) => Math.max(0, Number(v) || 0))
      : null;

  const pct = Number(g.profitPct);
  if (g.profitPct != null && (!Number.isFinite(pct) || pct <= 0 || pct >= 100)) {
    return { ok: false, error: "Profit has to be a percentage between 0 and 100." };
  }
  const weeks = Math.round(Number(g.weeks));
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) return { ok: false, error: "Working weeks has to be between 1 and 52." };

  const mix = (Array.isArray(g.mix) ? g.mix : [])
    .filter((j) => typeof j?.name === "string" && j.name.trim() !== "")
    .slice(0, 20)
    .map((j, i) => ({
      id: String(j.id || `job${i}`).slice(0, 40),
      name: j.name.trim().slice(0, 60),
      avgJob: Math.max(0, Math.round(Number(j.avgJob) || 0)),
      margin: Math.min(99, Math.max(0, Math.round((Number(j.margin) || 0) * 10) / 10)),
      perWeek: Math.min(500, Math.max(0, Math.round((Number(j.perWeek) || 0) * 10) / 10)),
    }));

  const clean: YearGoal = {
    basis: g.basis === "calendar" ? "calendar" : "financial",
    year,
    revenue: Math.max(0, Math.round(Number(g.revenue) || 0)),
    // Null, not zero: "no overhead expectation set" and "we expect to spend
    // nothing" are different, and only one of them should blank the tile.
    overhead: g.overhead == null || g.overhead === ("" as unknown) ? null : Math.max(0, Math.round(Number(g.overhead) || 0)),
    shape,
    profitPct: g.profitPct == null ? null : Math.round(pct * 10) / 10,
    weeks,
    mix,
    // Set on the Pace page, and carried through here so saving the planned
    // week doesn't wipe them. Read through the same clamps, so a stale form
    // can't write a booking rate of 7 (meaning 7%) back.
    winRatePct: readWinRatePct(g.winRatePct),
    pace: g.pace,
  };

  return write(clean);
}

/** Every page that reads the goal, so each shows the saved figure straight away. */
const READERS = ["/portal/goal", "/portal/pace", "/portal/profit", "/portal/finance/goals", "/portal/finance", "/portal/finance/targets", "/portal/finance/board", "/portal/board"];

async function write(clean: YearGoal): Promise<ActionResult> {
  // The close rate is stored once, as winRatePct; `pace` keeps the rest.
  const res = await saveSettings("yeargoal", { ...clean, pace: storedPace(clean.pace) });
  if (!res.ok) {
    return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  }
  // Everything that reads the goal. The wall board itself picks it up on its
  // next snapshot, within the minute.
  for (const path of READERS) revalidatePath(path);
  return { ok: true };
}

/**
 * The Pace page's save: the goal's headline (how much, at what profit, for
 * which year) and the rates it plans on. Merged into the stored row rather than
 * replacing it, so the week planned on the Year goal page survives a change of
 * close rate here.
 */
export async function savePace(input: {
  revenue: number;
  profitPct: number | null;
  basis: YearGoal["basis"];
  year: number;
  pace: PaceSettings;
}): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };

  const revenue = Math.round(Number(input.revenue));
  if (!Number.isFinite(revenue) || revenue <= 0) return { ok: false, error: "The goal needs a dollar figure." };
  const year = Math.round(Number(input.year));
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return { ok: false, error: "That year doesn't look right." };
  const pct = input.profitPct == null ? null : Number(input.profitPct);
  if (pct != null && (!Number.isFinite(pct) || pct <= 0 || pct >= 100)) {
    return { ok: false, error: "Profit has to be a percentage between 0 and 100." };
  }

  const stored = readYearGoal(await getSettings<unknown>("yeargoal").catch(() => null), new Date());
  return write({
    ...stored,
    basis: input.basis === "calendar" ? "calendar" : "financial",
    year,
    revenue,
    profitPct: pct == null ? null : Math.round(pct * 10) / 10,
    winRatePct: input.pace.closeRate == null ? null : readWinRatePct(Math.round(input.pace.closeRate * 1000) / 10),
    pace: input.pace,
  });
}
