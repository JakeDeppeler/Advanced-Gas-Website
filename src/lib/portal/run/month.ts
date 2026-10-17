import type { Metrics } from "@/lib/dashboard/metrics";

/**
 * How far through the month's working days we are, as a share: what "goal by
 * now" multiplies the month's goal by. The pace engine's own share when it has
 * one (it counts the part of today gone), otherwise working days done.
 */
export function monthElapsed(m: Metrics): number | null {
  const s = m.pace?.standing.month.sold;
  if (s?.need && s.byNow != null) return Math.max(0, Math.min(1, s.byNow / s.need));
  if (m.workingDaysTotal > 0) return Math.max(0, Math.min(1, (m.workingDaysTotal - m.workingDaysLeft) / m.workingDaysTotal));
  return null;
}

/** The month's sales goal, and where it says we should be by now. */
export function salesGoal(m: Metrics): { month: number | null; byNow: number | null } {
  const month = m.salesTargetMonthly ?? null;
  const f = monthElapsed(m);
  return { month, byNow: month != null && f != null ? month * f : null };
}

/** Working days done this month, today counted if it is one. */
export function dayOfMonth(m: Metrics): { n: number; of: number } | null {
  if (!(m.workingDaysTotal > 0)) return null;
  return { n: Math.min(m.workingDaysTotal, m.workingDaysTotal - m.workingDaysLeft + 1), of: m.workingDaysTotal };
}

const short = (n: number) => (n >= 1_000_000 ? `$${(Math.round(n / 100_000) / 10).toString()}M` : `$${Math.round(n / 1000)}K`);

/**
 * A goal figure that says which goal it is. The year has two, the goal and
 * the floor under it ($3.2M and $2.5M), and a bare "goal $266,667" left the
 * room guessing which; with both set, both are given.
 */
export function goalWords(m: Pick<Metrics, "goalLevels">, amount: number, lead = "goal"): string {
  const lv = m.goalLevels;
  if (!lv?.goal) return `${lead} ${money(amount)}`;
  const top = `${short(lv.goal)} ${lead} ${money(amount)}`;
  return lv.floor ? `${top} · ${short(lv.floor)} ${money((amount * lv.floor) / lv.goal)}` : top;
}

export const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
export const pc = (n: number, dp = 0) => `${n.toFixed(dp)}%`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-AU")} ${n === 1 ? one : many}`;
export const melNow = () => {
  const now = new Date();
  const day = now.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "long", day: "numeric", month: "long" });
  const time = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  const month = now.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });
  const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }).format(now)) % 24
    + now.getUTCMinutes() / 60;
  return { day, time, month, hour };
};
