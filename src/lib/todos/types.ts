/**
 * To-dos: one job, one person, the day it has to be done by.
 *
 * Shared by the page and the server, so nothing here touches the database —
 * just the shape and the arithmetic of "how late is it", done the same way on
 * both sides so a to-do can't read overdue on the page and on time in the bell.
 */

export type Todo = {
  id: string;
  title: string;
  notes: string | null;
  /** Who it's for. Null when that person has since been taken off the team. */
  assigneeId: string | null;
  /** The day it has to be done by, YYYY-MM-DD, Melbourne. */
  dueOn: string;
  doneAt: string | null;
  doneBy: string | null;
  createdById: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type Person = { id: string; name: string };

/** Overdue and due today are the two that need someone; colour backs up the words, never replaces them. */
export type DueState = "done" | "overdue" | "today" | "soon" | "later";

const DAY = 86_400_000;
const noon = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

/** Whole days from `a` to `b`, both YYYY-MM-DD. */
export const daysFrom = (a: string, b: string) => Math.round((noon(b) - noon(a)) / DAY);

export const shiftDay = (iso: string, days: number) => new Date(noon(iso) + days * DAY).toISOString().slice(0, 10);

export function dueState(t: Pick<Todo, "dueOn" | "doneAt">, today: string): DueState {
  if (t.doneAt) return "done";
  const d = daysFrom(today, t.dueOn);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 6) return "soon";
  return "later";
}

const dayName = (iso: string, long = false) =>
  new Date(noon(iso)).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" });

/** "Overdue · 2 days", "Due today", "Due tomorrow", "Due Fri 9 Oct". */
export function dueWords(t: Pick<Todo, "dueOn" | "doneAt">, today: string): string {
  const d = daysFrom(today, t.dueOn);
  if (t.doneAt) return `Was due ${dayName(t.dueOn)}`;
  if (d < 0) return `Overdue · ${-d} ${d === -1 ? "day" : "days"}`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due ${dayName(t.dueOn, d > 300)}`;
}

/** Most overdue first, then today, then by the day it's due; the newest of a day last. */
export function byUrgency(a: Todo, b: Todo): number {
  return a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : a.createdAt < b.createdAt ? -1 : 1;
}

/**
 * The quick picks under the date: today, tomorrow, Friday, next Monday. Friday
 * is this week's until Friday itself, then next week's — "by Friday" said on a
 * Saturday means the coming one.
 */
export function quickDays(today: string): Array<{ label: string; iso: string }> {
  const dow = new Date(noon(today)).getUTCDay(); // 0 Sun … 6 Sat
  const toFri = (5 - dow + 7) % 7 || 7;
  const toMon = (1 - dow + 7) % 7 || 7;
  return [
    { label: "Today", iso: today },
    { label: "Tomorrow", iso: shiftDay(today, 1) },
    { label: dow === 5 ? "Next Fri" : "Friday", iso: shiftDay(today, dow === 5 ? 7 : toFri) },
    { label: "Next Mon", iso: shiftDay(today, toMon) },
  ];
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
