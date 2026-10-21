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
  /** The list it's on: Quoting, Advanced Gas, or one the office added. Null sits in the first. */
  list: string | null;
  /** Flagged as important: kept at the top of its list (0081). */
  important: boolean;
};

/** The lists Settings › Automatic writes to: the accounts person's, and the quote follow-ups. */
export const FINANCE_LIST = "Finance";
/**
 * Finance split in two, so the office has a clean list of each: finished jobs
 * waiting on an invoice, and invoices out and unpaid past their due date. A
 * board still on the one Finance list is moved over by the automatic run.
 */
export const READY_LIST = "Invoice ready";
export const OVERDUE_LIST = "Invoice overdue";
export const isFinanceList = (l: string | null | undefined): boolean => l === READY_LIST || l === OVERDUE_LIST || l === FINANCE_LIST;
export const FOLLOW_UP_LIST = "Follow up";
/** A quote the customer said yes to, waiting on their payment before ServiceTitan marks it sold. */
export const WON_LIST = "Won, to be paid";

/**
 * The lists the portal writes customer work to: invoices and late payments,
 * quote follow-ups, and sold jobs to book in ("Jobs to Book", found by name
 * as the automation finds it).
 */
export const isAccountList = (l: string | null | undefined): boolean => !!l && (isFinanceList(l) || l === FOLLOW_UP_LIST || l === WON_LIST || /\bbook/i.test(l));

/** A quote's to-do, which can be marked won or lost: on the quoting or follow-up lists. */
export const isQuoteList = (l: string | null | undefined): boolean => !!l && (l === FOLLOW_UP_LIST || /quot|sales/i.test(l));

/**
 * Account to-dos: everything the portal wrote, and anything put on one of its
 * lists. Kept off people's own to-do list, so ringing a customer back isn't
 * mixed in with what someone set themselves.
 */
export const isAccountTodo = (t: Pick<Todo, "createdBy" | "list">): boolean => t.createdBy === "Automatic" || isAccountList(t.list);

/** Account to-dos run in the order the work does: quote, chase, book, bill. */
export const ACCOUNT_ORDER = [/quot|sales/i, new RegExp(`^${FOLLOW_UP_LIST}$`, "i"), /^won\b/i, /\bbook/i, new RegExp(`^${READY_LIST}$`, "i"), new RegExp(`^${OVERDUE_LIST}$`, "i"), new RegExp(`^${FINANCE_LIST}$`, "i")];
export const accountRank = (l: string) => { const i = ACCOUNT_ORDER.findIndex((r) => r.test(l)); return i < 0 ? ACCOUNT_ORDER.length : i; };

/** The ServiceTitan job a to-do names ("job #20131", "Invoice job 20304"), so it can link to it. */
export const jobNumberIn = (t: Pick<Todo, "title" | "notes">): string | null =>
  `${t.title}\n${t.notes ?? ""}`.match(/\bjob #?(\d{4,9})\b/i)?.[1] ?? null;

/** The ServiceTitan customer a to-do names ("customer #300986080"), for a quote written on the customer with no job. */
export const customerIn = (t: Pick<Todo, "title" | "notes">): string | null =>
  `${t.title}\n${t.notes ?? ""}`.match(/\bcustomer #(\d{5,12})\b/i)?.[1] ?? null;

/** A phone number in a to-do's notes, to ring from the pop-up. */
export const phoneIn = (t: Pick<Todo, "notes">): string | null =>
  (t.notes ?? "").match(/(?:^|[\s·(])((?:\+?61|0)[2-478](?:[ -]?\d){8})(?=$|[\s.,·)])/)?.[1]?.replace(/[\s-]/g, "") ?? null;

/** The lists until the office changes them on the page. */
export const DEFAULT_LISTS = ["Quoting", "Advanced Gas"];

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
