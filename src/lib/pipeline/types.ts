/**
 * The quote pipeline's shapes and rules. Pure: no database, no React, so the
 * board in the browser and the loader on the server agree on which column a
 * quote is in.
 */

export type Stage = "new" | "due" | "waiting" | "won" | "lost";

export const STAGES: Array<{ k: Stage; label: string; blurb: string }> = [
  { k: "new", label: "Just quoted", blurb: "Out less than 2 days" },
  { k: "due", label: "Follow up today", blurb: "Ring these" },
  { k: "waiting", label: "Waiting on them", blurb: "Followed up, next call booked" },
  { k: "won", label: "Won", blurb: "Sold in the last 30 days" },
];

export type TouchHow = "call" | "no_answer" | "text" | "email" | "visit" | "note";

export const HOW_LABEL: Record<TouchHow, string> = {
  call: "Spoke to them",
  no_answer: "No answer",
  text: "Texted",
  email: "Emailed",
  visit: "Went back out",
  note: "Note",
};

export const isHow = (v: unknown): v is TouchHow => typeof v === "string" && v in HOW_LABEL;

export const LOST_REASONS = ["Price", "Went with someone else", "Not going ahead", "No reply after 5 tries", "Other"] as const;

export type Touch = { at: string; how: TouchHow; note: string | null; by: string | null };

export type PipeQuote = {
  /** One quote, not one option — see quoteKey(). */
  key: string;
  stage: Stage;
  jobId: number | null;
  jobNumber: string | null;
  customerId: number | null;
  customer: string | null;
  suburb: string | null;
  phone: string | null;
  /** What was quoted: the estimate's own name, else the job type. */
  what: string | null;
  /** The average of the options, because at most one sells — or what did sell. */
  value: number;
  options: number;
  /** The day the quote went out (its first option). */
  quotedOn: string;
  /** Whole days since the newest option: a re-price counts as being worked. */
  quietDays: number;
  quotedBy: string | null;
  soldOn: string | null;
  owner: string | null;
  nextOn: string | null;
  lostReason: string | null;
  /** Lost in ServiceTitan (dismissed), rather than marked here. */
  dismissed: boolean;
  touches: Touch[];
};

/** Days between two ISO dates, by calendar day. */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * The first call goes two days after the quote: long enough for them to have
 * read it, soon enough that they haven't rung someone else. Every guide on
 * chasing home-service quotes lands somewhere between day 2 and day 3.
 */
export const FIRST_CALL_DAYS = 2;

/**
 * When to ring again, by how many times they've been tried: 3 days, a week,
 * a fortnight, then a month. Spaced out because a customer chased every day
 * stops answering, and most quotes that sell late sell inside 30 days.
 */
export function nextGap(touches: number): number {
  return touches <= 1 ? 3 : touches === 2 ? 7 : touches === 3 ? 14 : 30;
}

/** After this many tries with no answer either way, the board suggests closing it off. */
export const GIVE_UP_AFTER = 5;

/**
 * The column for an open quote, judged from when it was last priced (a quote
 * re-priced today has just gone out again). A booked next call decides it outright; with
 * none booked, a quote nobody has touched waits out its first two days and is
 * then due, and one that has been touched but given no next day is due now —
 * a call with no next step is how quotes go quiet.
 */
export function openStage(q: { pricedOn: string; nextOn: string | null; touches: number }, today: string): Stage {
  if (q.nextOn) return q.nextOn <= today ? "due" : "waiting";
  if (q.touches > 0) return "due";
  return daysBetween(q.pricedOn, today) < FIRST_CALL_DAYS ? "new" : "due";
}
