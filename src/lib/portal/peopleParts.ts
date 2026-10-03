/**
 * Shapes and arithmetic for time off, timesheets and the Take 5, shared by the
 * server pages and the browser forms. Pure.
 */

export type LeaveKind = "annual" | "rdo" | "sick" | "unpaid";

export type LeaveRequest = {
  id: string; userId: string | null; userName: string | null; kind: LeaveKind;
  from: string; to: string; note: string | null; status: "asked" | "approved" | "declined";
  answeredBy: string | null; createdAt: string;
};

export const LEAVE_KINDS: { k: LeaveKind; label: string }[] = [
  { k: "annual", label: "Annual leave" },
  { k: "rdo", label: "RDO" },
  { k: "sick", label: "Sick leave" },
  { k: "unpaid", label: "Unpaid leave" },
];

export const leaveLabel = (k: LeaveKind) => LEAVE_KINDS.find((x) => x.k === k)?.label ?? k;

/* ---------------------------------------------------------------- timesheets */

export type TimesheetDay = { start?: string; finish?: string; note?: string };
/** ISO date → the day's times. */
export type TimesheetDays = Record<string, TimesheetDay>;
export type Timesheet = { id: string; userId: string; userName: string | null; weekOf: string; days: TimesheetDays; submittedAt: string | null };

/** The award's ordinary day: a 38-hour week over five days. */
export const ORDINARY_DAY = 7.6;

/** Minutes past midnight from "7:30", "07:30", "7:30am", "3:30pm" or "15:30". Null if it isn't a time. */
export function minutesOf(raw: string | undefined): number | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i.exec(raw ?? "");
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (min > 59 || h > 23) return null;
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Hours worked in a day, less a half-hour unpaid lunch on any day over five
 * hours. Null when either time is missing or the finish isn't after the start.
 */
export function dayHours(d: TimesheetDay | undefined): number | null {
  const s = minutesOf(d?.start);
  const f = minutesOf(d?.finish);
  if (s == null || f == null || f <= s) return null;
  const worked = (f - s) / 60;
  return worked > 5 ? worked - 0.5 : worked;
}

export function weekTotals(days: TimesheetDays): { total: number; ordinary: number; overtime: number } {
  let total = 0;
  let ordinary = 0;
  for (const d of Object.values(days)) {
    const h = dayHours(d);
    if (h == null) continue;
    total += h;
    ordinary += Math.min(h, ORDINARY_DAY);
  }
  return { total, ordinary, overtime: total - ordinary };
}

export const hrs = (n: number) => `${n.toFixed(2)} hrs`;

/** "7:30am" from minutes — how a time is written back into the box. */
export function timeLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ap}`;
}

/* ---------------------------------------------------------------- take 5 */

export type Take5 = {
  id: string; kind: "take5" | "incident"; userName: string | null; job: string | null; hazards: string[];
  controls: string | null; safe: boolean | null; detail: string | null; seenAt: string | null; seenBy: string | null; createdAt: string;
};

/**
 * What can be on site, and the one thing to remember about each that is easy
 * to forget at eight in the morning. A hazard without a warning is still
 * recorded — it just doesn't need a banner.
 */
export const HAZARDS: { k: string; label: string; warn?: string }[] = [
  { k: "height", label: "Roof or ladder", warn: "Working at height: ladder footed or tied off, three points of contact, harness on a roof." },
  { k: "ceiling", label: "Ceiling space", warn: "Ceiling space: power off at the board before you go up, walk the joists, watch for old cabling." },
  { k: "asbestos", label: "Built before 1990 (asbestos)", warn: "Older home: assume there is asbestos. Don't drill, cut or sand eaves, walls or flue surrounds until it's been checked." },
  { k: "electrical", label: "Live electrical", warn: "Live electrical: isolate and test before you touch it. If you can't isolate it, stop and ring the office." },
  { k: "gas", label: "Gas", warn: "Gas: isolate, leak test after, and keep the CO monitor on you." },
  { k: "heat", label: "Hot weather", warn: "Hot weather: water on you, nothing in a roof space past late morning." },
  { k: "people", label: "Pets or kids on site", warn: "Pets or kids: ask for them to be kept inside and clear of the work area." },
  { k: "confined", label: "Tight or confined space", warn: "Confined space: tell someone you're going in and how long for." },
];
