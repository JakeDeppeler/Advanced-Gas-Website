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
  { k: "prevmonth", label: "Month before" },
  { k: "lastmonth", label: "Last month" },
  { k: "month", label: "This month" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["k"];

/**
 * The period tabs as the office reads them: the months by name, newest
 * first, then the financial year, then the last twelve months. Worked out
 * each time, because the names move with the calendar.
 */
export function periodItems(): { k: PeriodKey; label: string }[] {
  const t = localToday();
  const name = (back: number) => new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - back, 1)).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });
  return [
    { k: "month", label: name(0) },
    { k: "lastmonth", label: name(1) },
    { k: "prevmonth", label: name(2) },
    { k: "fy", label: "This financial year" },
    { k: "12m", label: "Last 12 months" },
  ];
}

export const readPeriod = (v: string | undefined, dflt: PeriodKey = "fy"): PeriodKey =>
  PERIODS.some((p) => p.k === v) ? (v as PeriodKey) : dflt;

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function periodSpans(k: PeriodKey): { now: PLSpan; before: PLSpan } {
  if (k === "12m") return rangeSpans("12m");
  if (k === "month" || k === "lastmonth") return plSpans(k);
  const t = localToday();
  if (k === "prevmonth") {
    // The whole month before last, against the whole month before that.
    const whole = (back: number): PLSpan => {
      const a = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - back, 1));
      const b = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - back + 1, 0));
      return { from: iso(a), to: iso(b), label: a.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }) };
    };
    return { now: whole(2), before: whole(3) };
  }
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
  const m = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - (k === "lastmonth" ? 1 : k === "prevmonth" ? 2 : 0), 1));
  const name = m.toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });
  return k === "month" ? `${name} so far` : name;
}
