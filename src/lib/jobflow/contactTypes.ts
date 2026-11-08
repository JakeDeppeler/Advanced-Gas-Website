/**
 * The customer's side of each line on the Job tracker: when we were last in
 * touch, what goes to them next, and who the job is waiting on (Jake, 8 Nov:
 * "a clear and simple way for us to track job status with the customer, with
 * follow-up"). Gathered in contact.ts; the rules are here, pure, for the
 * check script.
 */
import type { FlowStage } from "./types";

export type Touch = { at: string; what: string };

export type Contact = {
  /** The most recent time we and they were in touch, and how. */
  last: Touch | null;
  /** The next email going to them by itself, and the day it's due. */
  next: { what: string; on: string } | null;
  /** Who the job is waiting on, when the tags or the stage say more than the column does. */
  waiting: string | null;
  /** Whole days since anyone was in touch, when the customer is waiting on us or deciding and it's been 7 or more. */
  quietDays: number | null;
};

/** A week with no contact while the customer waits on us, or is making up their mind, is gone quiet. */
export const QUIET_DAYS = 7;

/**
 * The stages where silence costs us: a job booked with no visit, a quote
 * still to write or out with them, a sale not yet booked, a job on hold, and
 * money owed. Not a booked visit (they know when we're coming), and not the
 * paperwork stages (closing a job, invoicing it), which the customer doesn't see.
 */
export const QUIET_STAGES: FlowStage[] = ["nodate", "toquote", "quoted", "sold", "hold", "overdue"];

/** Only the words count: the office's tags carry emoji and stray spaces (bookingTypes.ts › tagWords). */
const words = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

/**
 * Who a job is waiting on, from its tags, in the office's own words. Only the
 * tags that say something is still to do; "System Ordered" alone says the
 * gear's ordered, not that anyone's waiting on it.
 */
export function waitingOn(tags: string[], stage: FlowStage): string | null {
  const t = new Set(tags.map(words));
  const us: string[] = [];
  if (t.has("system not ordered") || t.has("materials not ordered") || t.has("order custom capping")) us.push("order the gear");
  if (t.has("gte not booked")) us.push("book the electrician");
  if (t.has("rubbish removal not booked")) us.push("book rubbish removal");
  const parts: string[] = [];
  if (us.length) parts.push(`us to ${us.length > 1 ? `${us.slice(0, -1).join(", ")} and ${us.at(-1)}` : us[0]}`);
  if (t.has("awaiting further instructions")) parts.push("them for further instructions");
  if (!parts.length && stage === "quoted") return "them to decide";
  if (!parts.length && stage === "overdue") return "them to pay";
  return parts.length ? parts.join(", and ") : null;
}

/** The latest of several moments, or null. */
export function latest(touches: (Touch | null | undefined)[]): Touch | null {
  return touches.filter((t): t is Touch => !!t && !Number.isNaN(Date.parse(t.at))).sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
}

/** Days quiet, when it counts as gone quiet: the stage is one where silence matters and it's been QUIET_DAYS or more. */
export function quietFor(last: Touch | null, stage: FlowStage, nowMs: number): number | null {
  if (!QUIET_STAGES.includes(stage)) return null;
  if (!last) return null;
  const d = Math.floor((nowMs - Date.parse(last.at)) / 86_400_000);
  return d >= QUIET_DAYS ? d : null;
}

/** "today", "yesterday", "Tue", "3 Nov": how long ago, in the words the office uses. */
export function when(iso: string, nowMs: number): string {
  const mel = (ms: number) => new Date(ms).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" });
  const d = Math.round((Date.parse(`${isoDay(nowMs)}T00:00:00Z`) - Date.parse(`${isoDay(Date.parse(iso))}T00:00:00Z`)) / 86_400_000);
  if (mel(Date.parse(iso)) === mel(nowMs)) return "today";
  if (d === 1) return "yesterday";
  if (d > 1 && d < 7) return new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short" });
  return new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });
}

function isoDay(ms: number): string {
  const p = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ms));
  const g = (k: string) => p.find((x) => x.type === k)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

/** What an email we sent was, in a few words, from its kind. */
export const SENT_KIND: Record<string, string> = {
  "quote-followup": "Follow-up email",
  "quote-answer-reply": "Reply to their answer",
  "review-request": "Review request",
  "work-order-tenant": "Booking email",
  "chat-reply": "Chat reply",
  "quote-customer": "Thank-you email",
};
