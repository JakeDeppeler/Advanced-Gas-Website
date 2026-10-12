import type { PLDetail, PLLine } from "@/lib/portal/xero";

/**
 * Xero's profit and loss, as the four lines the KPIs read: sales, the cost of
 * the jobs, overheads and what's left — split the way KpiStack splits it
 * (field wages in cost of sales, other income kept apart), so the two can't
 * disagree. Wages are every wage, super and WorkCover line, wherever it sits.
 */
export type PLSummary = { revenue: number; cogs: number; gp: number; overheads: number; net: number; wages: number };

const isOther = (t: string) => /other income/i.test(t);
const isCogs = (t: string) => /cost of (sales|goods)|direct cost/i.test(t);
const isWage = (l: PLLine) => /wage|salar|superannuation|\bsuper\b|workcover|payroll/i.test(l.label);

export function summarisePL(d: PLDetail): PLSummary | null {
  const lines = (pick: (title: string, kind: string) => boolean) =>
    d.sections.filter((s) => s.kind !== "summary" && pick(s.title, s.kind)).flatMap((s) => s.lines);
  const sum = (ls: PLLine[]) => ls.reduce((a, l) => a + l.amount, 0);
  const rev = lines((t, k) => k === "in" && !isOther(t));
  const other = lines((t, k) => k === "in" && isOther(t));
  const cogs = lines((t, k) => k === "out" && isCogs(t));
  const oh = lines((t, k) => k === "out" && !isCogs(t));
  const revenue = sum(rev) || d.income;
  if (!(revenue > 0)) return null;
  const c = sum(cogs), o = sum(oh);
  return { revenue, cogs: c, gp: revenue - c, overheads: o, net: revenue - c - o + sum(other), wages: sum([...cogs, ...oh].filter(isWage)) };
}

/** 1 July this financial year, Melbourne, as YYYY-MM-DD. */
export function fyStart(today: Date): string {
  const y = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return `${y}-07-01`;
}
