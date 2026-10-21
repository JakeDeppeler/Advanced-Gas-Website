/**
 * Email that didn't arrive: what counts as trouble, and how the wall says so.
 *
 * Pure in the strict sense: no node builtins either, because the wall board
 * is a client component and imports the alert's wording from here — one
 * `node:crypto` at the top of this file and the whole bundle refuses to
 * build. The signature check that used to live here is in svix.ts, which only
 * the webhook route reaches.
 *
 * Pure, so scripts/check-email.ts can run the rules — which matter more here
 * than usual, because every one of them is about a message somebody is
 * entitled to assume went out. A quote emailed to a customer that bounced is
 * not a smaller version of a quote that was sent; it is a quote that was never
 * read, and the only difference between the two on any screen in this business
 * was nothing at all.
 */

/** What the message was, so a failure says what was lost rather than "an email". */
export const EMAIL_KINDS = {
  "quote-lead": { label: "Website enquiry", who: "the office" },
  "quote-customer": { label: "Quote to a customer", who: "a customer" },
  "sign-in": { label: "Portal sign-in link", who: "the crew" },
  pairing: { label: "Wall board pairing code", who: "the crew" },
  report: { label: "Scheduled report", who: "the office" },
  order: { label: "Supplier order", who: "a supplier" },
  "journal-alert": { label: "Journal alert", who: "the office" },
  newsletter: { label: "Newsletter sign-up", who: "the office" },
  other: { label: "Email", who: "somebody" },
} as const;

export type EmailKind = keyof typeof EMAIL_KINDS;

export const isKind = (v: unknown): v is EmailKind => typeof v === "string" && v in EMAIL_KINDS;
export const kindLabel = (k: string): string => (isKind(k) ? EMAIL_KINDS[k].label : EMAIL_KINDS.other.label);

/**
 * Where a message got to.
 *
 * `failed` is ours — the send itself did not go through, which we know the
 * moment we try. The other three are the provider's, and they arrive later or
 * never: a bounce can take seconds or a day, and "delivered" only ever means
 * the receiving server took it.
 */
export type EmailStatus = "sent" | "delivered" | "failed" | "bounced" | "complained";

/**
 * The two that mean nobody read it.
 *
 * A complaint — somebody pressing "this is spam" — is deliberately not in
 * here. It is worth knowing and it is not an undelivered message, and a wall
 * that says the same word for both teaches the room that the word means
 * nothing in particular.
 */
export const isTrouble = (status: string): boolean => status === "failed" || status === "bounced";

/** Resend's event names, as the statuses above. Anything else is not news. */
export function statusFromResend(type: unknown): EmailStatus | null {
  switch (type) {
    case "email.sent": return "sent";
    case "email.delivered": return "delivered";
    case "email.bounced": return "bounced";
    case "email.complained": return "complained";
    // delivery_delayed is not a failure: the provider is still trying, and a
    // board that cried about every slow mail server would be amber all week.
    default: return null;
  }
}

/** What the board's footer says. Null when there is nothing wrong. */
export type EmailHealth = {
  /** Unresolved sends that never arrived. */
  trouble: number;
  /** How long the oldest of them has been sitting, in hours. */
  oldestHours: number | null;
  /** The worst one's kind, so the line can name what was lost. */
  worstKind: string | null;
  /** Whether any of them was going to somebody outside the business. */
  toCustomer: boolean;
};

/**
 * The alert line, in words.
 *
 * Names what was lost rather than counting events: "a quote to a customer
 * never arrived" is a thing somebody stands up for, and "2 email events" is
 * not. The age rides along for the same reason it does on the journal alert —
 * an hour old is a mistake, three days old is a habit.
 */
export function emailAlertLine(h: EmailHealth): string {
  const n = h.trouble;
  const what = h.worstKind ? kindLabel(h.worstKind).toLowerCase() : "email";
  const head = n === 1 ? `1 ${what} never arrived` : `${n} emails never arrived`;
  if (h.oldestHours == null) return head;
  if (h.oldestHours < 1) return `${head} · just now`;
  if (h.oldestHours < 48) return `${head} · oldest ${Math.round(h.oldestHours)}h`;
  return `${head} · oldest ${Math.round(h.oldestHours / 24)} days`;
}
