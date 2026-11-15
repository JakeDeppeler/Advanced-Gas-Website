import "server-only";
import { cache } from "react";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { LEVEL_BILLABLE } from "@/lib/portal/crew";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { MAX_VISIT_HRS } from "@/lib/portal/onTheTools";

/**
 * Where a tech's paid day goes, from ServiceTitan's clock-ins (Jake, 15 Nov:
 * "a big thing to work on is time on tools").
 *
 * The Hours page already says how many hours were on site. What it couldn't
 * say is where the rest went, and that is the part anyone can act on. Each
 * weekday a tech clocked in is cut into four:
 *
 *   - on site:        arrived to done, overlapping visits counted once
 *   - driving:        dispatched to arrived, outside time already on site
 *   - between jobs:   inside the working span (first dispatch to last done)
 *                     but on neither: the yard, the supplier, lunch, and the
 *                     drives nobody clocked
 *   - not on a job:   the paid day left over before the first job and after
 *                     the last one
 *
 * The first-job time is the one that moves the most. In the four weeks to 15
 * Nov the crew was dispatched to its first job at 8:20 on average, and two
 * techs after 9:30, against an 8-hour day: an hour or more of some days gone
 * before the van left, which no amount of speed on site wins back.
 *
 * About a third of visits are dispatched the moment the tech arrives, which
 * records no drive. Those drives land in "between jobs", so that band is the
 * drive and the gaps together, and the page says so rather than claim the
 * crew sits idle.
 */

export type DayBands = { onSite: number; drive: number; between: number; off: number };

export type DayShapePerson = DayBands & {
  name: string;
  /** Weekdays with at least one finished visit. */
  days: number;
  /** Paid hours in their day: their rostered week over five, else the business's 8. */
  paidDay: number;
  /** Decimal hours, Melbourne: when the first job was dispatched (or arrived at), and the last finished. */
  start: number;
  end: number;
  visits: number;
};

export type DayShape = {
  from: string;
  to: string;
  people: DayShapePerson[];
  /** The field crew together, each person's average day weighted by the days they worked. */
  crew: DayShapePerson | null;
};

type Sheet = { technician_id: number | null; dispatched_on: string | null; arrived_on: string | null; done_on: string | null; active: boolean | null };

const HR = 3_600_000;
/** A dispatch further back than this is a job sent the night before, not a drive. */
const MAX_DRIVE_HRS = 3;
/** Fewer days than this and one odd day is the whole average. */
const MIN_DAYS = 3;
const DEFAULT_DAY = 8;

/** Total length of a set of intervals, overlaps counted once. */
function unionHrs(spans: Array<[number, number]>): number {
  const s = spans.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0, curA = -1, curB = -1;
  for (const [a, b] of s) {
    if (a > curB) { if (curB > curA) total += curB - curA; curA = a; curB = b; }
    else if (b > curB) curB = b;
  }
  if (curB > curA) total += curB - curA;
  return total / HR;
}

/** Decimal hour of the day in Melbourne: 8:30 am is 8.5. */
function melHour(ms: number): number {
  const p = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date(ms));
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0);
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return h + m / 60;
}

const isWeekday = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return d >= 1 && d <= 5; };

/** The four weeks up to yesterday, by default: today is never finished. */
export const dayShape = cache(async (days = 28): Promise<DayShape> => {
  const end = new Date(`${isoDateMelbourne(new Date())}T00:00:00+10:00`);
  const start = new Date(end.getTime() - days * 86_400_000);
  const from = isoDateMelbourne(start);
  const to = isoDateMelbourne(new Date(end.getTime() - 1));
  if (!dbConfigured()) return { from, to, people: [], crew: null };

  const [sheets, techs, users] = await Promise.all([
    sbSelect<Sheet>("st_timesheets", [
      q.select("technician_id,dispatched_on,arrived_on,done_on,active"),
      q.gte("arrived_on", start.toISOString()), `arrived_on=lt.${end.toISOString()}`, "limit=6000",
    ].join("&")).catch(() => [] as Sheet[]),
    sbSelect<{ id: number; name: string | null }>("st_technicians", q.select("id,name")).catch(() => []),
    listUsers().catch(() => []),
  ]);
  const techName = new Map(techs.map((t) => [t.id, t.name ?? `Tech ${t.id}`]));
  // Matched as onTheTools does: whole name, then first name, because
  // ServiceTitan spells some surnames differently from the portal.
  const card = (name: string) => {
    const n = name.trim().toLowerCase();
    const first = n.split(/\s+/)[0];
    const u = users.find((x) => x.active && x.name.trim().toLowerCase() === n)
      ?? users.find((x) => x.active && x.name.trim().split(/\s+/)[0].toLowerCase() === first);
    const hrs = Number(u?.costing?.hrsWeek);
    return { field: u?.level ? LEVEL_BILLABLE[u.level] : !!u, paidDay: hrs > 0 ? Math.min(12, hrs / 5) : DEFAULT_DAY };
  };

  // Visits by person and Melbourne day.
  const byDay = new Map<string, { tech: number; site: Array<[number, number]>; busy: Array<[number, number]>; first: number; last: number }>();
  for (const s of sheets) {
    if (s.active === false || s.technician_id == null || !s.arrived_on || !s.done_on) continue;
    const a = Date.parse(s.arrived_on), d = Date.parse(s.done_on);
    if (!(d > a) || d - a > MAX_VISIT_HRS * HR) continue;
    const day = isoDateMelbourne(new Date(a));
    if (!isWeekday(day)) continue;
    const disp = s.dispatched_on ? Math.max(Date.parse(s.dispatched_on), a - MAX_DRIVE_HRS * HR) : a;
    const k = `${s.technician_id}|${day}`;
    const e = byDay.get(k) ?? { tech: s.technician_id, site: [], busy: [], first: Infinity, last: -Infinity };
    e.site.push([a, d]);
    e.busy.push([Math.min(disp, a), d]);
    e.first = Math.min(e.first, Math.min(disp, a));
    e.last = Math.max(e.last, d);
    byDay.set(k, e);
  }

  type Acc = { days: number; onSite: number; drive: number; between: number; off: number; start: number; end: number; visits: number };
  const acc = new Map<number, Acc>();
  for (const e of byDay.values()) {
    const name = techName.get(e.tech) ?? "Someone";
    const { paidDay } = card(name);
    const onSite = unionHrs(e.site);
    const busy = unionHrs(e.busy);
    const span = (e.last - e.first) / HR;
    const a = acc.get(e.tech) ?? { days: 0, onSite: 0, drive: 0, between: 0, off: 0, start: 0, end: 0, visits: 0 };
    a.days += 1;
    a.onSite += onSite;
    a.drive += Math.max(0, busy - onSite);
    a.between += Math.max(0, span - busy);
    a.off += Math.max(0, paidDay - span);
    a.start += melHour(e.first);
    a.end += melHour(e.last);
    a.visits += e.site.length;
    acc.set(e.tech, a);
  }

  const people: DayShapePerson[] = [];
  for (const [tech, a] of acc) {
    const name = techName.get(tech) ?? "Someone";
    const c = card(name);
    if (!c.field || a.days < MIN_DAYS) continue;
    people.push({
      name, days: a.days, paidDay: c.paidDay,
      onSite: a.onSite / a.days, drive: a.drive / a.days, between: a.between / a.days, off: a.off / a.days,
      start: a.start / a.days, end: a.end / a.days, visits: a.visits / a.days,
    });
  }
  people.sort((x, y) => y.onSite - x.onSite);

  const total = people.reduce((n, p) => n + p.days, 0);
  const w = (f: (p: DayShapePerson) => number) => people.reduce((n, p) => n + f(p) * p.days, 0) / total;
  const crew: DayShapePerson | null = total > 0 ? {
    name: "The crew", days: total, paidDay: w((p) => p.paidDay),
    onSite: w((p) => p.onSite), drive: w((p) => p.drive), between: w((p) => p.between), off: w((p) => p.off),
    start: w((p) => p.start), end: w((p) => p.end), visits: w((p) => p.visits),
  } : null;
  return { from, to, people, crew };
});

/** 8.67 → "8:40 am". */
export function clock(h: number): string {
  const mins = Math.round(h * 60);
  const hh = Math.floor(mins / 60) % 24, mm = mins % 60;
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "am" : "pm"}`;
}
