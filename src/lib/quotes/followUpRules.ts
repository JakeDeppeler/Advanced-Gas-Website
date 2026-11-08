/**
 * Who gets the quote follow-up emails, which one is due, and when they stop.
 * The sending is in followUps.ts; this is the part worth pinning down, so
 * it's pure and scripts/check-reviews.ts runs it.
 *
 * **When a quote counts as sent.** ServiceTitan doesn't record a quote going
 * out: no field on the estimate says so (reviewStatus is always "None"), and
 * the job history has nothing for it (quoteStage.ts). The office tags the job
 * "Awaiting Quote Approval" when they send one (Jake, 31 Oct), so that tag is
 * the signal, and a quote's days count from the first time the sender sees
 * it. A quote written on the customer with no job can't carry the tag, so
 * it isn't followed: a "checking in on your quote" for a draft nobody has
 * seen would be worse than no email.
 *
 * **Only from the switch.** Jake, 8 Nov: "leave the older quotes alone". When
 * the follow-ups are switched on, every quote already tagged is written down
 * as already out, and only quotes tagged after that get the emails.
 *
 * **When they stop.** The moment anything says the customer or the office has
 * taken it from here: sold, closed, lost, they tapped a button, they emailed
 * us, the office spoke to them, or the tag came off.
 */

const DAY = 86_400_000;

/** The office's tag, in the words-only form (bookingTypes.ts › tagWords): theirs carries an emoji. */
export const SENT_TAG_WORDS = "awaiting quote approval";

/** Two follow-ups never land closer together than this, whatever the days say. */
export const MIN_GAP_DAYS = 2;
/** Emails per run. The run is every ten minutes in sending hours, so a busy morning still clears in an hour. */
export const PER_RUN = 8;

const TEAM_OR_PLATFORM = /@(?:[\w.-]+\.)?(advancedgas\.com\.au|tapihq\.com|propertyme\.com|propertytree\.com|servicetitan\.com|ailo\.io)$/i;
const EMAIL = /^[^\s@<>()",;]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** Why an address can't have the follow-ups, or null when it can. */
export function emailProblem(email: string | null | undefined): string | null {
  const e = (email ?? "").trim();
  if (!e) return "No email for them in ServiceTitan";
  if (!EMAIL.test(e)) return "Their email in ServiceTitan doesn't look right";
  if (TEAM_OR_PLATFORM.test(e)) return "The email on file is ours or an agency platform's, not theirs";
  return null;
}

/** A household's own quote: Domestic, as the review emails count it. Real estate, retirement villages and commercial are the office's to chase. */
export const householdUnit = (bu: string | null | undefined) => /^domestic/i.test((bu ?? "").trim());

/** The calendar day in Melbourne, "2026-11-08". */
export function melDay(d: Date): string {
  const p = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

/** Whole calendar days in Melbourne from `startIso` to `now`: sent on Monday, Wednesday is day 2. */
export function daysSince(startIso: string, now: Date): number {
  const a = Date.parse(`${melDay(new Date(startIso))}T00:00:00Z`);
  const b = Date.parse(`${melDay(now)}T00:00:00Z`);
  return Math.round((b - a) / DAY);
}

/** 9am to 7pm, Monday to Saturday, in Melbourne: the same hours as the review emails. */
export function inSendingHours(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
  return day !== "Sun" && hour >= 9 && hour < 19;
}

/* ------------------------------------------------------------ stopping */

export type QuoteFacts = {
  /** Its options, inactive ones left out. */
  options: { status: string | null }[];
  jobCancelled: boolean;
  /** The job still carries Awaiting Quote Approval. */
  tagged: boolean;
  lostOnPipeline: boolean;
  /** The first button they tapped, if any ("yes", "question", "no"). */
  answered: "yes" | "question" | "no" | null;
  /** An email from their address reached admin@ or jake@ since the first follow-up was due. */
  emailedUs: boolean;
  /** Someone logged a call, visit or email on the Pipeline since it started. */
  officeTouched: boolean;
};

const TAPPED = { yes: "Let's go ahead", question: "I've got a question", no: "Not this time" } as const;

/** Why this quote's follow-ups stop now, or null to carry on. In the order the office would want to hear it. */
export function stopReason(f: QuoteFacts): string | null {
  if (f.options.some((o) => o.status === "Sold")) return "Sold";
  if (f.answered) return `They tapped “${TAPPED[f.answered]}”`;
  if (f.jobCancelled) return "The job was cancelled";
  if (!f.options.some((o) => o.status === "Open")) return "Closed off in ServiceTitan";
  if (f.lostOnPipeline) return "Marked lost on the Pipeline";
  if (f.emailedUs) return "They emailed us";
  if (f.officeTouched) return "The office has been in touch";
  if (!f.tagged) return "Taken off Awaiting Quote Approval";
  return null;
}

/* ------------------------------------------------------------ what's due */

export type Step = { key: string; day: number };
export type Sent = { key: string; status: "sending" | "sent" | "failed" | "skipped"; at: string; attempts?: number };

export type Plan = {
  /** The one to send now, if any. */
  send: Step | null;
  /** Earlier ones that came due while nothing was sending (switched off, or out of hours for days): passed over, so a customer never gets two at once. */
  skip: Step[];
  /** The next one still to come, and the day it's due. */
  next: Step | null;
  /** Every step sent or passed over: the series is finished. */
  done: boolean;
  /** Why nothing goes this run when something is due. */
  wait: string | null;
};

/**
 * The step to send for a quote whose days started at `started`. Only the
 * latest one that's due goes; the ones before it that were missed are passed
 * over. Never two within MIN_GAP_DAYS. A failed send is tried again up to
 * three times before it's passed over.
 */
export function planFor(series: Step[], started: string, now: Date, sent: Sent[]): Plan {
  const steps = [...series].sort((a, b) => a.day - b.day);
  const settled = new Set(sent.filter((s) => s.status === "sent" || s.status === "skipped" || s.status === "sending" || (s.status === "failed" && (s.attempts ?? 1) >= 3)).map((s) => s.key));
  const d = daysSince(started, now);
  const due = steps.filter((s) => s.day <= d && !settled.has(s.key));
  const later = steps.filter((s) => s.day > d && !settled.has(s.key));
  const next = later[0] ?? null;
  if (!due.length) return { send: null, skip: [], next, done: !next, wait: null };
  const send = due[due.length - 1];
  const lastAt = sent.filter((s) => s.status === "sent").map((s) => s.at).sort().pop();
  if (lastAt && now.getTime() - Date.parse(lastAt) < MIN_GAP_DAYS * DAY) {
    return { send: null, skip: [], next: send, done: false, wait: `The last one went ${lastAt.slice(0, 10)}; at least ${MIN_GAP_DAYS} days between them` };
  }
  return { send, skip: due.slice(0, -1), next, done: false, wait: null };
}
