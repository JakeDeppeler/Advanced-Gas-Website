import { q, sbCount, sbSelect } from "./db";
import { quotes, quoteKey, QUOTE_CAP } from "./metrics";
import {
  isoDateMelbourne,
  startOfDayMelbourne,
  startOfMonthMelbourne,
  startOfWeekMelbourne,
  weekdayMelbourne,
  workdayFraction,
  workingDaysBetween,
  workingDaysInMonth,
  workingDaysInWeek,
  type WorkingCalendar,
} from "./dates";
import { jobClass, shiftIso, ST_LIVE, type Measured, type PaceCounts, type PaceData } from "./pace";

/**
 * What the business did, by stage, over the periods the Pace view compares:
 * today, this week, last week, this month, the measuring window the rates come
 * from, and the year so far.
 *
 * One read per table over the widest range any period needs, then bucketed
 * here — eight period queries per table on every board refresh would be most
 * of the sync's time spent counting the same rows.
 */

/** Twelve weeks: long enough that one big week doesn't set the rates, short enough to follow the season. */
const WINDOW_DAYS = 84;

type Range = { from: string; to: string };
const within = (iso: string | null | undefined, r: Range) => !!iso && iso >= r.from && iso <= r.to;
const day = (ts: string | null | undefined) => (ts ? isoDateMelbourne(new Date(ts)) : null);
/** The instant a Melbourne date began, daylight saving and all. */
const midnight = (iso: string) => startOfDayMelbourne(new Date(`${iso}T12:00:00+10:00`)).toISOString();

export async function computePaceData(now: Date, calendar: WorkingCalendar, yearFrom: string | null): Promise<PaceData> {
  const today = isoDateMelbourne(now);
  const yesterday = shiftIso(today, -1);
  const weekStart = isoDateMelbourne(startOfWeekMelbourne(now));
  const monthStart = isoDateMelbourne(startOfMonthMelbourne(now));

  const periods = {
    today: { from: today, to: today },
    week: { from: weekStart, to: today },
    lastWeek: { from: shiftIso(weekStart, -7), to: shiftIso(weekStart, -1) },
    month: { from: monthStart, to: today },
  };
  const windowFrom = [shiftIso(today, -WINDOW_DAYS), ST_LIVE].sort().pop() as string;
  const window: Range = { from: windowFrom, to: yesterday };

  // The earliest day any period reaches back to. Bookings and quotes before
  // go-live are the Field Plus import, not activity, so nothing reads past it.
  const earliest = [window.from, periods.lastWeek.from, periods.month.from].sort()[0];
  const from = earliest < ST_LIVE ? ST_LIVE : earliest;
  const fromTs = midnight(from);
  /*
   * Invoices go back a year further than anything else here, so the wall can
   * say how this year is going against the same date last year. One query over
   * two years rather than two queries: a year of this tenant's invoices is
   * about 1,200 rows, which is nothing beside the four thousand the window
   * already reads.
   */
  const lastYearFrom = yearFrom ? shiftIso(yearFrom, -365) : null;
  const invoicesFrom = [from, yearFrom, lastYearFrom].filter((v): v is string => v != null).sort()[0];

  const [webLeads, stLeads, booked, done, quotedRows, soldRows, invoices, calls] = await Promise.all([
    sbSelect<{ created_at: string }>("portal_leads", [q.select("created_at"), q.gte("created_at", fromTs)].join("&")),
    sbSelect<{ created_on: string | null }>("st_leads", [q.select("created_on"), q.gte("created_on", fromTs)].join("&")).catch(() => []),
    sbSelect<{ created_on: string | null; job_type: string | null }>(
      "st_jobs",
      [q.select("created_on,job_type"), q.gte("created_on", fromTs)].join("&"),
    ),
    sbSelect<{ completed_on: string | null; job_type: string | null; status: string | null }>(
      "st_jobs",
      [q.select("completed_on,job_type,status"), q.gte("completed_on", fromTs)].join("&"),
    ),
    sbSelect<{ id: number; job_id: number | null; customer_id: number | null; created_on: string | null; value: number | null; business_unit: string | null }>(
      "st_estimates",
      [
        q.select("id,job_id,customer_id,created_on,value:total_inc,business_unit"),
        q.gte("created_on", fromTs),
        q.lt("total", String(QUOTE_CAP)),
      ].join("&"),
    ),
    sbSelect<{ id: number; job_id: number | null; customer_id: number | null; created_on: string | null; sold_on: string | null; value: number | null; business_unit: string | null }>(
      "st_estimates",
      [q.select("id,job_id,customer_id,created_on,sold_on,value:total_inc,business_unit"), q.gte("sold_on", fromTs), q.lt("total", String(QUOTE_CAP))].join("&"),
    ),
    sbSelect<{ invoice_date: string | null; total: number | null; job_type: string | null }>(
      "st_invoices",
      [q.select("invoice_date,total,job_type"), q.gte("invoice_date", invoicesFrom)].join("&"),
    ),
    sbCount("st_calls", q.gte("received_on", midnight(window.from))).catch(() => 0),
  ]);

  const leadDays = [...webLeads.map((r) => day(r.created_at)), ...stLeads.map((r) => day(r.created_on))];
  const bookedRows = booked.map((r) => ({ d: day(r.created_on), c: jobClass(r.job_type) })).filter((r) => r.c !== "install");
  const doneRows = done
    .filter((r) => r.status === "Completed")
    .map((r) => ({ d: day(r.completed_on), c: jobClass(r.job_type) }))
    .filter((r) => r.c !== "quote");

  // A quote is the job it was written for, dated by its first option and worth
  // the average of the options put in front of that customer — good, better and
  // best are one offer, and at most one of them sells.
  const quotedFirst = new Map<string, { d: string; sum: number; n: number }>();
  for (const r of quotes(quotedRows)) {
    const d = day(r.created_on);
    if (!d) continue;
    const k = quoteKey(r);
    const was = quotedFirst.get(k);
    if (was) {
      was.sum += Number(r.value ?? 0);
      was.n += 1;
      if (d < was.d) was.d = d;
    } else {
      quotedFirst.set(k, { d, sum: Number(r.value ?? 0), n: 1 });
    }
  }
  const quotedJobs = [...quotedFirst.values()].map((j) => ({ d: j.d, v: j.n > 0 ? j.sum / j.n : 0 }));
  // Sold once per job, on the day it was sold, at what the chosen option was worth.
  const soldJobs = new Map<string, { d: string; v: number }>();
  for (const r of quotes(soldRows)) {
    const d = day(r.sold_on);
    if (!d) continue;
    const k = quoteKey(r);
    const was = soldJobs.get(k);
    if (was) was.v += Number(r.value ?? 0);
    else soldJobs.set(k, { d, v: Number(r.value ?? 0) });
  }
  const inv = invoices.map((r) => ({ d: r.invoice_date, v: Number(r.total ?? 0), c: jobClass(r.job_type) }));

  const count = (r: Range): PaceCounts => {
    // Nothing before go-live is a booking or a quote — it is the import.
    const live = r.to >= ST_LIVE;
    const sold = [...soldJobs.values()].filter((s) => within(s.d, r));
    const quoted = quotedJobs.filter((x) => within(x.d, r));
    return {
      leads: leadDays.filter((d) => within(d, r)).length,
      booked: live ? bookedRows.filter((b) => within(b.d, r)).length : null,
      quoted: live ? quoted.length : null,
      quotedValue: live ? quoted.reduce((t, x) => t + x.v, 0) : null,
      sold: live ? sold.length : null,
      soldValue: live ? sold.reduce((t, s) => t + s.v, 0) : null,
      completed: doneRows.filter((x) => within(x.d, r)).length,
      invoiced: inv.filter((x) => within(x.d, r)).reduce((t, x) => t + x.v, 0),
    };
  };

  let measured: Measured | null = null;
  if (window.to >= window.from) {
    const inWin = inv.filter((x) => within(x.d, window));
    const sold = [...soldJobs.values()].filter((s) => within(s.d, window));
    const daysPerWeek = Math.max(1, calendar.days.length);
    measured = {
      from: window.from,
      to: window.to,
      weeks: workingDaysBetween(window.from, window.to, calendar) / daysPerWeek,
      leads: leadDays.filter((d) => within(d, window)).length,
      quoteVisits: bookedRows.filter((b) => b.c === "quote" && within(b.d, window)).length,
      serviceBooked: bookedRows.filter((b) => b.c === "service" && within(b.d, window)).length,
      serviceCompleted: doneRows.filter((x) => x.c === "service" && within(x.d, window)).length,
      installsCompleted: doneRows.filter((x) => x.c === "install" && within(x.d, window)).length,
      quoted: quotedJobs.filter((x) => within(x.d, window)).length,
      sold: sold.length,
      soldValue: sold.reduce((t, s) => t + s.v, 0),
      invoiced: inWin.reduce((t, x) => t + x.v, 0),
      soldWorkInvoiced: inWin.filter((x) => x.c !== "service").reduce((t, x) => t + x.v, 0),
      serviceInvoiced: inWin.filter((x) => x.c === "service").reduce((t, x) => t + x.v, 0),
    };
  }

  let year: PaceData["year"] = null;
  if (yearFrom && lastYearFrom) {
    const sum = (f: string, t: string) => inv.filter((x) => within(x.d, { from: f, to: t })).reduce((a, x) => a + x.v, 0);
    const upTo = (to: string) => sum(yearFrom, to);
    // The same stretch of last year, to the day: a year-to-date figure is only
    // worth comparing against the same slice of the one before it.
    const lastYearTo = shiftIso(today, -365);
    year = {
      ytd: upTo(today),
      ytdYesterday: upTo(yesterday),
      ytdLastWeek: upTo(shiftIso(today, -7)),
      last28: sum(shiftIso(today, -28), yesterday),
      lastYearTotal: sum(lastYearFrom, shiftIso(yearFrom, -1)),
      lastYearToDate: sum(lastYearFrom, lastYearTo),
    };
  }

  const todayWorking = calendar.days.includes(weekdayMelbourne(now)) && !calendar.holidays.includes(today);
  return {
    asOf: now.toISOString(),
    today,
    calendar: {
      daysPerWeek: Math.max(1, calendar.days.length),
      week: workingDaysInWeek(now, calendar),
      month: workingDaysInMonth(now, calendar),
      dayFraction: todayWorking ? workdayFraction(now) : 0,
      todayWorking,
    },
    periods: { today: count(periods.today), week: count(periods.week), lastWeek: count(periods.lastWeek), month: count(periods.month) },
    measured,
    year,
    calls,
  };
}

/** How far back the rates are measured, for the page to say. */
export const PACE_WINDOW_DAYS = WINDOW_DAYS;
