/**
 * Keep in touch: someone worth staying close to, who looks after them, how
 * often they want hearing from, and when they last did.
 *
 * Shared by the page and the server, so nothing here touches the database.
 * When the next one is due is worked out here, once, so the page, the bell
 * and the report can't disagree about who's late.
 */

import { daysFrom, shiftDay } from "@/lib/todos/types";

export type Cadence = "fortnight" | "month" | "2months" | "quarter";

export const CADENCES: Array<{ key: Cadence; label: string }> = [
  { key: "fortnight", label: "Every 2 weeks" },
  { key: "month", label: "Every month" },
  { key: "2months", label: "Every 2 months" },
  { key: "quarter", label: "Every 3 months" },
];
export const CADENCE_LABEL = Object.fromEntries(CADENCES.map((c) => [c.key, c.label])) as Record<Cadence, string>;

/** What they are to the business. Free to grow; an unknown key reads as "Other". */
export const KINDS: Array<{ key: string; label: string }> = [
  { key: "builder", label: "Builder" },
  { key: "agent", label: "Real estate / property manager" },
  { key: "supplier", label: "Supplier" },
  { key: "trade", label: "Trade partner" },
  { key: "referrer", label: "Referrer" },
  { key: "customer", label: "Big customer" },
  { key: "industry", label: "Industry / council" },
  { key: "other", label: "Other" },
];
export const kindLabel = (k: string | null) => KINDS.find((x) => x.key === k)?.label ?? "Other";

export type How = "call" | "text" | "email" | "visit" | "coffee" | "other";
export const HOWS: Array<{ key: How; label: string; past: string }> = [
  { key: "call", label: "Call", past: "Called" },
  { key: "text", label: "Text", past: "Texted" },
  { key: "email", label: "Email", past: "Emailed" },
  { key: "visit", label: "Visit", past: "Visited" },
  { key: "coffee", label: "Coffee / lunch", past: "Met for coffee" },
  { key: "other", label: "Other", past: "In touch" },
];
export const howPast = (h: string | null) => HOWS.find((x) => x.key === h)?.past ?? "In touch";

export type Contact = {
  id: string;
  name: string;
  company: string | null;
  kind: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  ownerId: string | null;
  cadence: Cadence;
  lastOn: string | null;
  lastHow: string | null;
  createdAt: string;
};

export type Touch = { id: string; contactId: string; on: string; how: string; note: string | null; byName: string | null };

/**
 * When the next reach-out is due. A month is a calendar month — "the 7th of
 * every month" is how people keep a habit like this, not "every 30 days" —
 * clamped to the end of a shorter month. Never reached out to: due the day
 * they went on the list.
 */
export function nextDue(c: Pick<Contact, "cadence" | "lastOn" | "createdAt">): string {
  if (!c.lastOn) return c.createdAt.slice(0, 10);
  if (c.cadence === "fortnight") return shiftDay(c.lastOn, 14);
  const months = c.cadence === "quarter" ? 3 : c.cadence === "2months" ? 2 : 1;
  const [y, m, d] = c.lastOn.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

export type TouchState = "overdue" | "today" | "soon" | "later" | "new";

/** Overdue past the day; due within the week is "soon"; never reached out to is "new" and counts as due. */
export function touchState(c: Pick<Contact, "cadence" | "lastOn" | "createdAt">, today: string): TouchState {
  if (!c.lastOn) return "new";
  const d = daysFrom(today, nextDue(c));
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 7) return "soon";
  return "later";
}

/** Due now: overdue, today, or never reached out to. What the flags and counts are made of. */
export const isDue = (s: TouchState) => s === "overdue" || s === "today" || s === "new";

const dayName = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "Overdue · 5 days", "Due today", "Due this week · Fri 9 Oct", "Next Mon 9 Nov", "Not reached out to yet". */
export function touchWords(c: Pick<Contact, "cadence" | "lastOn" | "createdAt">, today: string): string {
  const s = touchState(c, today);
  if (s === "new") return "Not reached out to yet";
  const due = nextDue(c);
  const d = daysFrom(today, due);
  if (s === "overdue") return `Overdue · ${-d} ${d === -1 ? "day" : "days"}`;
  if (s === "today") return "Due today";
  if (s === "soon") return `Due ${d === 1 ? "tomorrow" : dayName(due)}`;
  return `Next ${dayName(due)}`;
}

/** "Called 12 Sep · 25 days ago". */
export function lastWords(c: Pick<Contact, "lastOn" | "lastHow">, today: string): string {
  if (!c.lastOn) return "No reach-out logged yet";
  const ago = daysFrom(c.lastOn, today);
  return `${howPast(c.lastHow)} ${dayName(c.lastOn)} · ${ago <= 0 ? "today" : ago === 1 ? "yesterday" : `${ago} days ago`}`;
}

/** Most overdue first, then the soonest due; never-contacted after anyone overdue or due today. */
export function byDue(a: Contact, b: Contact): number {
  const x = a.lastOn ? nextDue(a) : "9999";
  const y = b.lastOn ? nextDue(b) : "9999";
  return x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
}
