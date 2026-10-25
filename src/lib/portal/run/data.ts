import "server-only";
import { cache } from "react";
import { q, sbSelect } from "@/lib/dashboard/db";
import { quotes, quoteKey } from "@/lib/dashboard/metrics";
import { isoDateMelbourne, startOfMonthMelbourne } from "@/lib/dashboard/dates";

/**
 * Reads for the rebuilt Run the company pages that the board's snapshot
 * doesn't already hold. Sales come from the sales ledger (st_sales, migration
 * 0058), so a re-sold quote is counted once, on the day it first sold.
 */

const melHour = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date(iso));
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0) % 24;
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return h + m / 60;
};

/** Melbourne midnight today, as an instant. */
function startOfTodayMelbourne(now = new Date()): Date {
  const day = isoDateMelbourne(now);
  // Melbourne is UTC+10 or +11; find the instant whose Melbourne date is today and hour 0.
  for (const off of [10, 11]) {
    const t = new Date(`${day}T00:00:00+${String(off).padStart(2, "0")}:00`);
    if (isoDateMelbourne(t) === day && melHour(t.toISOString()) < 0.01) return t;
  }
  return new Date(`${day}T00:00:00+10:00`);
}

type SaleRow = { id: number; sold_on: string; total_inc: number | null; business_unit: string | null; first: boolean; job_id: number | null; customer_id: number | null; created_on: string | null };

/** Today's sales, added up through the day: [hour, sold by then], in order. */
export const soldTodayPoints = cache(async (): Promise<[number, number][]> => {
  const rows = quotes(await sbSelect<SaleRow>("st_sales", [q.select("id,sold_on,total_inc,business_unit,first,job_id,customer_id,created_on"), q.gte("sold_on", startOfTodayMelbourne().toISOString()), "order=sold_on.asc"].join("&")).catch(() => []));
  let run = 0;
  return rows.map((r) => {
    run += Number(r.total_inc ?? 0);
    return [melHour(r.sold_on), run] as [number, number];
  });
});

/** Monday of the week a Melbourne date falls in. */
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/** Sold each week, the last `n` weeks including this one. */
export const soldByWeek = cache(async (n = 8): Promise<{ week: string; value: number }[]> => {
  const thisMon = mondayOf(isoDateMelbourne(new Date()));
  const weeks = Array.from({ length: n }, (_, i) => {
    const d = new Date(`${thisMon}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
  const rows = quotes(await sbSelect<SaleRow>("st_sales", [q.select("id,sold_on,total_inc,business_unit,first,job_id,customer_id,created_on"), q.gte("sold_on", new Date(`${weeks[0]}T00:00:00+11:00`).toISOString())].join("&")).catch(() => []));
  const by = new Map(weeks.map((w) => [w, 0]));
  for (const r of rows) {
    const w = mondayOf(isoDateMelbourne(new Date(r.sold_on)));
    if (by.has(w)) by.set(w, (by.get(w) ?? 0) + Number(r.total_inc ?? 0));
  }
  return weeks.map((w) => ({ week: w, value: by.get(w) ?? 0 }));
});

/**
 * Invoiced each week, the same weeks as soldByWeek, by the day the job was
 * done (the invoice date), so it reads as work finished rather than the day
 * the office got round to pricing it. Completed jobs only, as everywhere else.
 */
export const invoicedByWeek = cache(async (weeks: string[]): Promise<number[]> => {
  if (!weeks.length) return [];
  const last = new Date(`${weeks[weeks.length - 1]}T12:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 7);
  const rows = await sbSelect<{ invoice_date: string | null; total: number | null }>(
    "st_invoices_billed",
    [q.select("invoice_date,total"), q.gte("invoice_date", weeks[0]), q.lt("invoice_date", last.toISOString().slice(0, 10))].join("&"),
  );
  const by = new Map(weeks.map((w) => [w, 0]));
  for (const r of rows) {
    if (!r.invoice_date) continue;
    const w = mondayOf(r.invoice_date.slice(0, 10));
    if (by.has(w)) by.set(w, (by.get(w) ?? 0) + Number(r.total ?? 0));
  }
  return weeks.map((w) => by.get(w) ?? 0);
});

/** Sold this month by job type: jobs, value, average. */
export const soldByType = cache(async (): Promise<{ type: string; jobs: number; value: number }[]> => {
  const rows = quotes(await sbSelect<SaleRow>("st_sales", [q.select("id,sold_on,total_inc,business_unit,first,job_id,customer_id,created_on"), q.gte("sold_on", startOfMonthMelbourne(new Date()).toISOString())].join("&")).catch(() => []));
  const ids = [...new Set(rows.map((r) => r.job_id).filter((v): v is number => v != null))];
  const types = new Map<number, string>();
  for (let i = 0; i < ids.length; i += 150) {
    const js = await sbSelect<{ id: number; job_type: string | null }>("st_jobs", [q.select("id,job_type"), `id=in.(${ids.slice(i, i + 150).join(",")})`].join("&")).catch(() => []);
    for (const j of js) if (j.job_type) types.set(Number(j.id), j.job_type);
  }
  const by = new Map<string, { jobs: Set<string>; value: number }>();
  for (const r of rows) {
    const t = (r.job_id != null && types.get(Number(r.job_id))) || "Not typed in ServiceTitan";
    const g = by.get(t) ?? { jobs: new Set<string>(), value: 0 };
    if (r.first) g.jobs.add(quoteKey(r));
    g.value += Number(r.total_inc ?? 0);
    by.set(t, g);
  }
  return [...by.entries()].map(([type, g]) => ({ type, jobs: g.jobs.size, value: g.value })).sort((a, b) => b.value - a.value);
});

export type CallStats = { inbound: number; booked: number; missed: number; reasons: [string, number][]; byWho: { name: string; calls: number; booked: number }[]; days: number };

/**
 * Inbound calls and which became a job, from ServiceTitan's call log. A call
 * with a job on it booked; the rest carry the reason the office logged.
 */
export const callStats = cache(async (days: number): Promise<CallStats> => {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await sbSelect<{ id: number; agent: string | null; direction: string | null; duration_seconds: number | null; received_on: string | null; raw: { job?: unknown; reason?: { name?: string } | null } | null }>(
    "st_calls", [q.select("id,agent,direction,duration_seconds,received_on,raw"), q.gte("received_on", since)].join("&"),
  ).catch(() => []);
  const inb = rows.filter((r) => /^in/i.test(r.direction ?? ""));
  const booked = inb.filter((r) => r.raw?.job != null);
  const missed = inb.filter((r) => !r.duration_seconds);
  const reasons = new Map<string, number>();
  for (const r of inb) if (r.raw?.job == null && r.duration_seconds) { const k = r.raw?.reason?.name ?? "No reason logged"; reasons.set(k, (reasons.get(k) ?? 0) + 1); }
  const who = new Map<string, { calls: number; booked: number }>();
  for (const r of inb) { const k = r.agent ?? "Not recorded"; const w = who.get(k) ?? { calls: 0, booked: 0 }; w.calls += 1; if (r.raw?.job != null) w.booked += 1; who.set(k, w); }
  return {
    inbound: inb.length, booked: booked.length, missed: missed.length, days,
    reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
    byWho: [...who.entries()].map(([name, w]) => ({ name, ...w })).sort((a, b) => b.calls - a.calls),
  };
});

/**
 * Quotes followed up within two days: of the quotes that went out 2 to 30 days
 * ago, how many had a call, text or note logged on the pipeline (or sold)
 * within two days of going out. Null when fewer than ten quotes qualify.
 */
export const followupRate = cache(async (): Promise<{ pct: number; of: number } | null> => {
  const { loadPipeline } = await import("@/lib/pipeline/store");
  const { daysBetween, FIRST_CALL_DAYS } = await import("@/lib/pipeline/types");
  const p = await loadPipeline({ detail: false }).catch(() => null);
  if (!p) return null;
  const due = [...p.quotes, ...p.stale].filter((x) => {
    const age = daysBetween(x.quotedOn, p.today);
    return age >= FIRST_CALL_DAYS && age <= 30;
  });
  if (due.length < 10) return null;
  const done = due.filter((x) =>
    (x.soldOn && daysBetween(x.quotedOn, x.soldOn) <= FIRST_CALL_DAYS) ||
    x.touches.some((t) => daysBetween(x.quotedOn, t.at.slice(0, 10)) <= FIRST_CALL_DAYS));
  return { pct: (done.length / due.length) * 100, of: due.length };
});
