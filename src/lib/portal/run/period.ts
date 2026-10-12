import { localToday, plSpans, rangeSpans, type PLSpan } from "@/lib/portal/xero";

/**
 * The one set of periods the money pages filter by: the tabs across the top
 * of Our KPIs, the Profit & finance overview, Profit & loss and Spending.
 * Each comes with the same stretch before it, so "up" and "down" compare like
 * with like — eight days into this month against the first eight of last.
 */
export const PERIODS = [
  { k: "12m", label: "Last 12 months" },
  { k: "fy", label: "This financial year" },
  { k: "month", label: "This month" },
  { k: "lastmonth", label: "Last month" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["k"];

export const readPeriod = (v: string | undefined, dflt: PeriodKey = "fy"): PeriodKey =>
  PERIODS.some((p) => p.k === v) ? (v as PeriodKey) : dflt;

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function periodSpans(k: PeriodKey): { now: PLSpan; before: PLSpan } {
  if (k === "12m") return rangeSpans("12m");
  if (k === "month" || k === "lastmonth") return plSpans(k);
  const t = localToday();
  const y = t.getUTCMonth() >= 6 ? t.getUTCFullYear() : t.getUTCFullYear() - 1;
  const from = new Date(Date.UTC(y, 6, 1));
  const lastYear = new Date(Date.UTC(t.getUTCFullYear() - 1, t.getUTCMonth(), t.getUTCDate()));
  return {
    now: { from: iso(from), to: iso(t), label: "this financial year so far" },
    before: { from: iso(new Date(Date.UTC(y - 1, 6, 1))), to: iso(lastYear), label: "the same point last financial year" },
  };
}

/** What the period is called in a sentence: "this financial year", "October". */
export function periodWords(k: PeriodKey): string {
  if (k === "12m") return "the last 12 months";
  if (k === "fy") return "this financial year";
  const t = localToday();
  const m = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - (k === "lastmonth" ? 1 : 0), 1));
  const name = m.toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });
  return k === "month" ? `${name} so far` : name;
}
