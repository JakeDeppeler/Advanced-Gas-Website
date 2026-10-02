"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, saveSettings } from "@/lib/portal/db";

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
