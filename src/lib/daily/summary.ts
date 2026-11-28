import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { dbConfigured } from "@/lib/portal/db";
import { localToday } from "@/lib/portal/xero";
import { todayMelbourne } from "@/lib/todos/store";
import { firstName } from "@/lib/todos/types";
import { loadSchedule, loadSessions, loadToolbox } from "@/lib/toolbox/store";
import { timeWords, upcoming } from "@/lib/toolbox/types";
import { FAULT_BRANDS, FAULT_CODES } from "@/lib/faultCodes";

/**
 * What the Daily tools pages put in their heads, the way the home screen puts
 * its figures beside its title (Jake, 28 Nov: "redesign the Daily tools and
 * each tool to match the home screen"). Each part is read on its own and
 * comes back null when it can't be, so one tool's figures failing never
 * blanks another's, and a figure that wasn't read is left off rather than
 * shown as a zero.
 */

/** "G'day Jake · Saturday 28 November", the home screen's line over its title. */
export function greeting(name: string): string {
  return `G’day ${firstName(name)} · ${dayWords()}`;
}

/** Melbourne's date in words, for the line over a tool's title. */
export function dayWords(): string {
  return localToday().toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

export type WriteupRow = { job_number: string | null; doc_kind: string; status: string; created_by: string | null; created_at: string };
export type Writeups = { month: number; monthName: string; last: WriteupRow | null; recent: WriteupRow[]; putBack: number };

/** Write-ups put on ServiceTitan: this month's, the latest few, and how many were put back or undone. */
export async function writeupSummary(): Promise<Writeups | null> {
  if (!dbConfigured()) return null;
  const rows = await sbSelect<WriteupRow>("job_writeups", [q.select("job_number,doc_kind,status,created_by,created_at"), "order=created_at.desc", "limit=300"].join("&")).catch(() => null);
  if (!rows) return null;
  const today = todayMelbourne();
  const ym = today.slice(0, 7);
  const melbDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const done = rows.filter((r) => r.status === "done");
  return {
    month: done.filter((r) => melbDay(r.created_at).startsWith(ym)).length,
    monthName: new Date(`${today}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" }),
    last: done[0] ?? null,
    recent: rows.slice(0, 4),
    putBack: rows.filter((r) => melbDay(r.created_at).startsWith(ym) && (r.status === "restored" || r.status === "undone")).length,
  };
}

export type NextTalk = { on: string; day: string; short: string; time: string | null; days: number; topics: number; held: number };

/** The next toolbox talk: when, how many topics are on it, and how many wait on hold. */
export async function nextTalk(): Promise<NextTalk | null> {
  if (!dbConfigured()) return null;
  try {
    const today = todayMelbourne();
    const [box, schedule] = await Promise.all([loadToolbox(), loadSchedule(today)]);
    const [on] = upcoming(schedule, today, 1);
    if (!on) return null;
    const [session] = await loadSessions(on, on).catch(() => []);
    return {
      on,
      day: new Date(`${on}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(",", ""),
      short: shortDate(on),
      time: schedule.time ? timeWords(schedule.time) : null,
      days: Math.round((Date.parse(`${on}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000),
      topics: session?.notes.length ?? 0,
      held: box.topics.length,
    };
  } catch {
    return null;
  }
}

/** "Mon 30 Nov", for a figure beside a title. */
export const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");

/** "today", "tomorrow", "in 3 days". */
export const inDays = (d: number) => (d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);

/** The fault-code finder's reach: the codes it knows and the brands they cover. */
export const faultReach = () => ({ codes: FAULT_CODES.length, brands: FAULT_BRANDS.length });
