import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { QUOTE_CAP, quotes } from "@/lib/dashboard/metrics";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { revenueGoalFor, type YearGoal } from "@/lib/portal/yearGoal";
import { loadPipeline } from "@/lib/pipeline/store";
import { daysBetween, isSold, type PipeQuote, type Stage } from "@/lib/pipeline/types";

/**
 * Home's overview: sold each month against the month's goal, the quotes most
 * worth chasing, and where the open quotes sit.
 *
 * Sold is the board's own figure — st_sales, inc GST, every option row summed,
 * residential, under the quote cap — month by month, so this month's bar is
 * the number the board and Today show. The goal for each month is the year
 * goal spread by its shape, as Pace has it.
 */

export type MonthSold = { key: string; label: string; sold: number; goal: number | null; current: boolean };
export type StageSlice = { k: Stage; label: string; count: number; value: number };
export type Overview = {
  months: MonthSold[];
  /** This month so far, and last month to the same day, for "vs last month". */
  mtd: number;
  lastToDate: number;
  hot: PipeQuote[];
  stages: StageSlice[];
  open: { count: number; value: number };
};

const mel = (d: Date) => new Date(d.getTime() + 10 * 3_600_000);

export async function overview(goal: YearGoal | null, span: 6 | 12 = 12): Promise<Overview> {
  const now = new Date();
  const today = isoDateMelbourne(now);
  const [y, mo] = today.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - span, 1));
  // A month earlier than the window, for last month to date when the window is short.
  const from = new Date(Date.UTC(y, mo - Math.max(span, 2), 1));
  const [rows, pipe] = await Promise.all([
    sbSelect<{ total: number | null; sold_on: string | null; business_unit: string | null }>("st_sales", [
      q.select("total:total_inc,sold_on,business_unit"), q.gte("sold_on", from.toISOString()), q.lt("est_total", String(QUOTE_CAP)), "limit=20000",
    ].join("&")).catch(() => []),
    loadPipeline().catch(() => null),
  ]);

  const byMonth = new Map<string, number>();
  let lastToDate = 0;
  const dayOfMonth = Number(today.slice(8, 10));
  const lastKey = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  let firstDay = "9999";
  for (const r of quotes(rows)) {
    if (!r.sold_on) continue;
    const d = mel(new Date(r.sold_on)).toISOString();
    if (d < firstDay) firstDay = d;
    const key = d.slice(0, 7);
    const v = Number(r.total ?? 0);
    byMonth.set(key, (byMonth.get(key) ?? 0) + v);
    if (key === lastKey && Number(d.slice(8, 10)) <= dayOfMonth) lastToDate += v;
  }

  const months: MonthSold[] = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    months.push({
      key,
      label: d.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }),
      sold: byMonth.get(key) ?? 0,
      goal: goal?.revenue ? revenueGoalFor(goal, `${key}-01`, end) : null,
      current: key === today.slice(0, 7),
    });
  }

  const open = (pipe?.quotes ?? []).filter((x) => x.stage === "new" || x.stage === "due" || x.stage === "waiting");
  // Newest first, so today's quotes are the ones in front of the office.
  const hot = [...open].sort((a, b) => b.quotedOn.localeCompare(a.quotedOn) || b.value - a.value).slice(0, 6);
  const LABEL: Record<string, string> = { new: "Just quoted", due: "Follow up today", waiting: "Waiting on them", won: "Sold, last 30 days" };
  const soldRecent = (x: PipeQuote) => isSold(x.stage) && x.soldOn != null && daysBetween(x.soldOn, today) <= 30;
  const stages: StageSlice[] = (["new", "due", "waiting", "won"] as Stage[]).map((k) => {
    const l = (pipe?.quotes ?? []).filter((x) => (k === "won" ? soldRecent(x) : x.stage === k));
    return { k, label: LABEL[k], count: l.length, value: l.reduce((a, x) => a + x.value, 0) };
  });

  // Sales only reach back to when ServiceTitan took over, mid-September 2026.
  // A last month that started before that was half counted, and "this month
  // against it" read +2,547%; with no whole month to compare, say nothing.
  const lastWhole = firstDay.slice(0, 10) <= `${lastKey}-03`;
  return {
    months,
    mtd: byMonth.get(today.slice(0, 7)) ?? 0,
    lastToDate: lastWhole ? lastToDate : 0,
    hot,
    stages,
    open: { count: open.length, value: open.reduce((a, x) => a + x.value, 0) },
  };
}
