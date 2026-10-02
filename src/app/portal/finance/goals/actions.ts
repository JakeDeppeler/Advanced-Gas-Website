"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSettings } from "@/lib/portal/db";
import type { YearGoal } from "@/lib/portal/yearGoal";

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

  const clean: YearGoal = {
    basis: g.basis === "calendar" ? "calendar" : "financial",
    year,
    revenue: Math.max(0, Math.round(Number(g.revenue) || 0)),
    // Null, not zero: "no overhead expectation set" and "we expect to spend
    // nothing" are different, and only one of them should blank the tile.
    overhead: g.overhead == null || g.overhead === ("" as unknown) ? null : Math.max(0, Math.round(Number(g.overhead) || 0)),
    shape,
  };

  const res = await saveSettings("yeargoal", clean);
  if (!res.ok) {
    return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  }
  revalidatePath("/portal/finance/goals");
  revalidatePath("/portal/finance");
  return { ok: true };
}
