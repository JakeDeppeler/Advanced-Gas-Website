"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { normaliseBoardSettings } from "@/lib/dashboard/boardSettings";
import { computeSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";

export type CommissionInput = { commissionTiers: Array<{ from: number; rate: number }> };

export type ActionResult = { ok: boolean; error?: string };

/**
 * The commission bands. The month's targets aren't saved here — they come from
 * the year goal — so this writes only the tiers, reading the row first so the
 * working calendar beside them survives.
 */
export async function saveCommission(t: CommissionInput): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };

  const tiers = (t.commissionTiers ?? [])
    .filter((x) => Number.isFinite(x.from) && Number.isFinite(x.rate) && x.from > 0 && x.rate > 0)
    .map((x) => ({ from: Math.round(x.from), rate: Math.min(1, Math.max(0, x.rate)) }))
    .sort((a, b) => a.from - b.from);

  const existing = (await getSettings<Record<string, unknown>>("dashboard")) ?? {};
  const res = await saveSettings("dashboard", { ...existing, commissionTiers: tiers });
  if (!res.ok) {
    return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  }
  revalidatePath("/portal/finance/board");
  return { ok: true };
}

/**
 * The half of the board's row the commission form doesn't touch: what counts
 * as a working day.
 *
 * A separate action over the same row, read-then-merge like the one above, so
 * neither form can drop the other's keys. Everything is clamped through
 * `normaliseBoardSettings` — the same function the board reads with — so what is
 * stored is exactly what comes back out.
 */
export async function saveBoardCalendar(input: {
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
