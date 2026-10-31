import "server-only";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { LEVEL_BILLABLE } from "@/lib/portal/crew";
import { isoDateMelbourne, melbourneDayStart } from "@/lib/dashboard/dates";
import { MAX_VISIT_HRS } from "@/lib/portal/onTheTools";

/**
 * Hours › time on the tools for a range, against another: this week so far
 * against last week to the same point, a month against the same month last
 * year, or any two spans of days. The same clock-in rules as the rest of
 * the portal (onTheTools): arrived to done is on site, dispatched to arrived
 * the drive, a visit over twelve hours a clock left running.
 */

export type RangeKey = "week" | "last" | "month" | "custom";
export type CompareKey = "prev" | "year" | "custom";

/** A span of time: `from` inclusive, `to` exclusive, as instants. */
export type Span = {
  from: Date; to: Date;
  /** "Mon 26 – Sat 31 Oct", and ", to 2:56 pm" when it stops at a moment rather than a day's end. */
  label: string;
  /** What a column calls it: "This week", "Last week", "Same week last year". */
  short: string;
  /** Weekdays it covers that had begun by its end: what the rostered week is scaled by. */
  weekdays: number;
};

export type HoursPerson = { name: string; field: boolean; roster: number | null; on: number; travel: number; visits: number };
export type HoursWindow = { span: Span; people: HoursPerson[]; on: number; travel: number; visits: number; roster: number };

const DAY = 86_400_000;
const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));
/** Date strings stepped by whole days, at midday UTC so no offset can tip them over. */
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const mondayOf = (iso: string) => addDays(iso, -((dow(iso) + 6) % 7));
const daysIn = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
/** The same day-of-month `back` months earlier, held to that month's length. */
function monthsBack(iso: string, back: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 - back, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, daysIn(t.getUTCFullYear(), t.getUTCMonth()))).padStart(2, "0")}`;
}

const dayWords = (iso: string, month: boolean) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", ...(month ? { month: "short" } : {}), timeZone: "UTC" }).replace(",", "");
const timeWords = (d: Date) => d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * A span from the start of `fromIso` to `to`. `toIso` is the last day it
 * covers; `partial` says it stops at a moment within that day, as "so far"
 * does, and how to say so.
 */
function span(fromIso: string, toIso: string, to: Date, short: string, partial: string | null): Span {
  const sameMonth = fromIso.slice(0, 7) === toIso.slice(0, 7);
  // A span from another year says which: "Mon 27 Oct 2025" isn't this October.
  const year = toIso.slice(0, 4) !== isoDateMelbourne().slice(0, 4) ? ` ${toIso.slice(0, 4)}` : "";
  const label = (fromIso === toIso ? dayWords(toIso, true) : `${dayWords(fromIso, !sameMonth)} – ${dayWords(toIso, true)}`) + year;
  let weekdays = 0;
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) if (dow(d) >= 1 && dow(d) <= 5 && melbourneDayStart(d).getTime() < to.getTime()) weekdays++;
  return { from: melbourneDayStart(fromIso), to, label: partial ? `${label}, ${partial}` : label, short, weekdays };
}
/** A whole run of days, the last one included. */
const days = (fromIso: string, toIso: string, short: string) => span(fromIso, toIso, melbourneDayStart(addDays(toIso, 1)), short, null);

/**
 * The two spans asked for. A range that runs to now is compared to the same
 * point in the other: Saturday afternoon of this week against Saturday
 * afternoon of last week, not against all of it.
 */
export function resolveSpans(r: RangeKey, c: CompareKey, p: { from?: string; to?: string; cfrom?: string; cto?: string }, now = new Date()): { range: Span; compare: Span } {
  const today = isoDateMelbourne(now);
  const mon = mondayOf(today);
  const ago = (ms: number) => new Date(now.getTime() - ms);
  let range: Span;
  // How to step back to the comparison: by days, or by calendar months.
  let back: { days: number } | { months: number };
  let prevShort: string, yearShort: string;
  if (r === "last") {
    range = days(addDays(mon, -7), addDays(mon, -1), "Last week");
    back = { days: 7 }; prevShort = "The week before"; yearShort = "Same week last year";
  } else if (r === "month") {
    range = span(`${today.slice(0, 8)}01`, today, now, "This month", `to ${timeWords(now)}`);
    back = { months: 1 }; prevShort = "Last month"; yearShort = "Same month last year";
  } else if (r === "custom" && isIso(p.from) && isIso(p.to) && p.from <= p.to) {
    range = days(p.from, p.to, "This range");
    const n = Math.round((Date.parse(`${p.to}T12:00:00Z`) - Date.parse(`${p.from}T12:00:00Z`)) / DAY) + 1;
    back = { days: n }; prevShort = "The days before"; yearShort = "A year earlier";
  } else {
    range = span(mon, today, now, "This week", `to ${timeWords(now)}`);
    back = { days: 7 }; prevShort = "Last week"; yearShort = "Same week last year";
  }
  const fromIso = isoDateMelbourne(range.from);
  const toIso = isoDateMelbourne(new Date(range.to.getTime() - 1));
  const partial = range.label.includes(", to ");
  let compare: Span;
  if (c === "custom" && isIso(p.cfrom) && isIso(p.cto) && p.cfrom <= p.cto) {
    compare = days(p.cfrom, p.cto, "Other range");
  } else if (c === "year") {
    // A week back a year is 52 weeks, so Monday stays Monday; a month or a range is the calendar year.
    if ("days" in back && r !== "custom") {
      const f = addDays(fromIso, -364), t = addDays(toIso, -364);
      compare = partial ? span(f, t, ago(364 * DAY), yearShort, "to the same point") : days(f, t, yearShort);
    } else {
      const f = monthsBack(fromIso, 12), t = monthsBack(toIso, 12);
      compare = partial ? span(f, t, new Date(now.getTime() - (melbourneDayStart(today).getTime() - melbourneDayStart(t).getTime())), yearShort, "to the same point") : days(f, t, yearShort);
    }
  } else if ("months" in back) {
    const f = monthsBack(fromIso, back.months), t = monthsBack(toIso, back.months);
    // The same time of day on the same date last month.
    compare = span(f, t, new Date(now.getTime() - (melbourneDayStart(today).getTime() - melbourneDayStart(t).getTime())), prevShort, "to the same point");
  } else {
    const f = addDays(fromIso, -back.days), t = addDays(toIso, -back.days);
    compare = partial ? span(f, t, ago(back.days * DAY), prevShort, "to the same point") : days(f, t, prevShort);
  }
  return { range, compare };
}

type Sheet = { technician_id: number | null; dispatched_on: string | null; arrived_on: string | null; done_on: string | null; active: boolean | null };
const hoursBetween = (a: string | null, b: string | null) => (a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 3_600_000) : 0);

/** Each person's time on the tools in each span, and the field crew's totals. */
export async function hoursCompared(range: Span, compare: Span): Promise<[HoursWindow, HoursWindow]> {
  if (!dbConfigured()) return [empty(range), empty(compare)];
  const read = (s: Span) => sbSelect<Sheet>("st_timesheets", [
    q.select("technician_id,dispatched_on,arrived_on,done_on,active"), q.gte("arrived_on", s.from.toISOString()), q.lt("arrived_on", s.to.toISOString()), "limit=5000",
  ].join("&")).catch(() => [] as Sheet[]);
  const [a, b, techs, users] = await Promise.all([
    read(range), read(compare),
    sbSelect<{ id: number; name: string | null }>("st_technicians", q.select("id,name")).catch(() => []),
    listUsers().catch(() => []),
  ]);
  const techName = new Map(techs.map((t) => [t.id, t.name ?? `Tech ${t.id}`]));
  // ServiceTitan spells some names differently from the portal ("Winbanks"),
  // so the rostered week is matched on the whole name, then the first.
  const card = (name: string) => {
    const first = name.trim().split(/\s+/)[0].toLowerCase();
    const u = users.find((x) => x.active && x.name.trim().toLowerCase() === name.trim().toLowerCase())
      ?? users.find((x) => x.active && x.name.trim().split(/\s+/)[0].toLowerCase() === first);
    return { roster: u?.costing?.hrsWeek ?? null, field: u?.level ? LEVEL_BILLABLE[u.level] : true };
  };
  const tally = (sheets: Sheet[], s: Span): HoursWindow => {
    const by = new Map<string, HoursPerson>();
    for (const t of sheets) {
      if (t.active === false || !t.arrived_on || !t.done_on || t.technician_id == null) continue;
      const on = hoursBetween(t.arrived_on, t.done_on);
      if (on <= 0 || on > MAX_VISIT_HRS) continue;
      const name = techName.get(t.technician_id) ?? "Someone";
      const p = by.get(name) ?? { name, ...card(name), on: 0, travel: 0, visits: 0 };
      p.on += on; p.travel += Math.min(3, hoursBetween(t.dispatched_on, t.arrived_on)); p.visits += 1;
      by.set(name, p);
    }
    const people = [...by.values()];
    // The totals are the field crew's: the office's odd visit (an owner
    // quoting) would drag the share down for a reason that isn't the crew's.
    const field = people.filter((p) => p.field);
    return {
      span: s, people,
      on: field.reduce((n, p) => n + p.on, 0),
      travel: field.reduce((n, p) => n + p.travel, 0),
      visits: field.reduce((n, p) => n + p.visits, 0),
      // A rostered week is five weekdays; a span is so many of them.
      roster: field.filter((p) => p.roster).reduce((n, p) => n + (p.roster as number) * (s.weekdays / 5), 0),
    };
  };
  return [tally(a, range), tally(b, compare)];
}

const empty = (s: Span): HoursWindow => ({ span: s, people: [], on: 0, travel: 0, visits: 0, roster: 0 });

/**
 * The first day ServiceTitan's clock-ins were properly kept: the first with
 * three or more people clocking in. Before it there's the odd visit, so a
 * span reaching back past it would read as a slow week when it was a gap in
 * the record.
 */
export async function clockInsStart(): Promise<string | null> {
  if (!dbConfigured()) return null;
  const rows = await sbSelect<{ technician_id: number | null; arrived_on: string | null }>("st_timesheets", [
    q.select("technician_id,arrived_on"), q.order("arrived_on", "asc", "last"), "limit=400",
  ].join("&")).catch(() => []);
  const by = new Map<string, Set<number>>();
  for (const r of rows) {
    if (!r.arrived_on || r.technician_id == null) continue;
    const d = isoDateMelbourne(new Date(r.arrived_on));
    const s = by.get(d) ?? new Set<number>();
    s.add(r.technician_id);
    by.set(d, s);
    if (s.size >= 3) return d;
  }
  return null;
}
