import "server-only";
import { q, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { getSettings, listUsers } from "@/lib/portal/db";
import { bonusFor, normaliseCommission, type Commission } from "@/lib/portal/commissionTypes";
import type { Metrics } from "@/lib/dashboard/metrics";
import { matchName } from "./match";

export type CommissionMonth = { month: string; sold: number; target: number; rate: number; hit: boolean; bonus: number };

/** This month in Melbourne, as YYYY-MM. */
export const monthNow = (now = new Date()) =>
  now.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit" }).slice(0, 7);

export async function commissionRule(): Promise<Commission> {
  return normaliseCommission(await getSettings<unknown>("commission").catch(() => null));
}

/** What this person has sold this month by the board's leaderboard, or null when ServiceTitan has no one by that name. */
export function soldThisMonth(name: string, m: Metrics | null): number | null {
  const board = m?.salesLeaderboard ?? [];
  const hit = matchName(name, board.map((r) => r.name));
  return hit ? board.find((r) => r.name === hit)?.sold ?? 0 : null;
}

/**
 * Write this month's commission line for everyone ServiceTitan has sales for.
 *
 * Called after every sync. The row for the month is overwritten while the
 * month runs and not touched once it's over, so the last sync of a month is
 * that month's record — the sold figure, and the target and rate that were
 * in force, kept together so changing the rule later doesn't rewrite what
 * somebody was paid on.
 */
export async function saveCommissionMonth(m: Metrics, now = new Date()): Promise<number> {
  const [rule, users] = await Promise.all([commissionRule(), listUsers()]);
  const month = monthNow(now);
  const rows = users
    .filter((u) => u.active && u.id)
    .map((u) => ({ u, sold: soldThisMonth(u.name, m) }))
    .filter((x): x is { u: typeof x.u; sold: number } => x.sold != null)
    .map(({ u, sold }) => {
      const b = bonusFor(sold, rule);
      return { user_id: u.id, month, sold: Math.round(sold * 100) / 100, target: rule.monthTarget, rate: rule.ratePct, hit: b.hit, bonus: Math.round(b.bonus * 100) / 100, saved_at: now.toISOString() };
    });
  await sbUpsert("portal_commission", rows, "user_id,month");
  return rows.length;
}

/** Every month on this person's file, newest first. */
export async function commissionHistory(userId: string): Promise<CommissionMonth[]> {
  const rows = await sbSelect<{ month: string; sold: string | number; target: string | number; rate: string | number; hit: boolean; bonus: string | number }>(
    "portal_commission", [q.select("month,sold,target,rate,hit,bonus"), q.eq("user_id", userId), "order=month.desc", "limit=36"].join("&"),
  ).catch(() => []);
  return rows.map((r) => ({ month: r.month, sold: Number(r.sold), target: Number(r.target), rate: Number(r.rate), hit: r.hit, bonus: Number(r.bonus) }));
}
