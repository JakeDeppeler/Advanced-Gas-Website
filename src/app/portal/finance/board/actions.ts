"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { normaliseBoardSettings } from "@/lib/dashboard/boardSettings";
import { computeSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";

export type BoardTargets = {
  revenueTargetMonthly: number | null;
  salesTargetMonthly: number | null;
  profitTargetMonthly: number | null;
  bookingsTargetMonthly: number | null;
  commissionTiers: Array<{ from: number; rate: number }>;
};

export type ActionResult = { ok: boolean; error?: string };

/**
 * The wall board's monthly targets.
 *
 * They live under the same `dashboard` settings key the board already reads, so
 * there is one row and no second source of truth. That row also carries the
 * working calendar, which this form knows nothing about — hence the read before
 * the write: replacing the value wholesale would silently drop the holidays and
 * put the board back on calendar days.
 */
export async function saveBoardTargets(t: BoardTargets): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };

  // A blank box means "no target", which the board renders as "no monthly
  // target set". Zero would be a target of nothing, and the dial would read
  // every month as a triumph.
  const money = (v: number | null) => (v == null || !Number.isFinite(v) || v <= 0 ? null : Math.round(v));

  const tiers = (t.commissionTiers ?? [])
    .filter((x) => Number.isFinite(x.from) && Number.isFinite(x.rate) && x.from > 0 && x.rate > 0)
    .map((x) => ({ from: Math.round(x.from), rate: Math.min(1, Math.max(0, x.rate)) }))
    .sort((a, b) => a.from - b.from);

  const existing = (await getSettings<Record<string, unknown>>("dashboard")) ?? {};
  const res = await saveSettings("dashboard", {
    ...existing,
    revenueTargetMonthly: money(t.revenueTargetMonthly),
    salesTargetMonthly: money(t.salesTargetMonthly),
    profitTargetMonthly: money(t.profitTargetMonthly),
    bookingsTargetMonthly: money(t.bookingsTargetMonthly),
    commissionTiers: tiers,
  });

  if (!res.ok) {
    return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  }

  revalidatePath("/portal/finance/board");
  return { ok: true };
}

/**
 * The half of the board's row the targets form doesn't touch: where the revenue
 * target comes from, and what counts as a working day.
 *
 * A separate action over the same row, read-then-merge like the one above, so
 * neither form can drop the other's keys. Everything is clamped through
 * `normaliseBoardSettings` — the same function the board reads with — so what is
 * stored is exactly what comes back out.
 */
export async function saveBoardCalendar(input: {
  revenueFromYearGoal: boolean;
  workingDays: number[];
  holidays: string[];
}): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };

  for (const h of input.holidays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h)) return { ok: false, error: `"${h}" isn't a date the board can read.` };
  }
  if (input.workingDays.length === 0) {
    return { ok: false, error: "Pick at least one working day — the board can't divide a month by none." };
  }

  const existing = (await getSettings<Record<string, unknown>>("dashboard")) ?? {};
  const merged = normaliseBoardSettings({ ...existing, ...input });

  const res = await saveSettings("dashboard", { ...existing, ...merged });
  if (!res.ok) {
    return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  }

  revalidatePath("/portal/finance/board");
  return { ok: true };
}

/**
 * Recompute the snapshot the board reads, now, rather than waiting for it to ask.
 *
 * The board recomputes on its own every thirty seconds, so this is for the case
 * where somebody has just changed a number and wants to watch it land — which is
 * also the only way to check the change was the one they meant. Same two calls
 * the cron makes; it appends a snapshot and deletes nothing.
 */
export async function pushToBoard(): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  try {
    await storeSnapshot(await computeSnapshot());
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Couldn't recompute the board." };
  }
  revalidatePath("/portal/finance/board");
  return { ok: true };
}
