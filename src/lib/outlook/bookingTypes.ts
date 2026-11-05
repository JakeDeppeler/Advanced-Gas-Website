/**
 * A supplier or trade confirming a booking flips the job's tag (Jake, 5 Nov:
 * "do 1"): the rubbish removal company's "your booking is confirmed" turns
 * "Rubbish Removal Not Booked" into "Rubbish Removal Booked", and the
 * electrician confirming a GTE job turns "GTE Not Booked" into "GTE Booked".
 * Those tags are what the morning to-do email reads, so a confirmed booking
 * comes off the list without anyone going into ServiceTitan.
 *
 * Materials and systems aren't here: the portal's own orders already swap
 * those tags when they go (lib/ordering/stJobNotes.ts).
 *
 * Pure, for scripts/check-outlook.ts.
 */

export type BookingKind = "rubbish_removal" | "electrician";

/** The office's tag pairs, in the words-only form (see tagWords). */
export const BOOKING_TAGS: Record<BookingKind, { not: string; booked: string; label: string }> = {
  rubbish_removal: { not: "rubbish removal not booked", booked: "rubbish removal booked", label: "rubbish removal" },
  electrician: { not: "gte not booked", booked: "gte booked", label: "electrician (GTE)" },
};

/** Only the words count: the office's tags carry emoji and stray spaces. */
export const tagWords = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

/** The trades we know send these. Anyone else needs the words to say so. */
const SENDERS = /@(?:[\w.-]+\.)?(veolia\.com|wastemate\.com\.au|gtelectrics\.com\.au)$/i;
const WHO = /\b(veolia|waste ?mate|skip|bin hire|rubbish|waste|electric(?:al|ian|s)?|sparky|GTE)\b/i;
const CONFIRMS = /\b(confirm(?:ed|ation|s)?|booked|booking|scheduled|delivery (?:date|day)|will attend|all set|locked in)\b/i;

/**
 * Worth asking the model about: cheap, so every email can be put through it.
 * A known sender saying it's confirmed, or anyone using both a trade's words
 * and a booking's.
 */
export function mightConfirmBooking(m: { from?: { emailAddress?: { address?: string | null } | null } | null; subject?: string | null }, body: string): boolean {
  const from = m.from?.emailAddress?.address ?? "";
  const text = `${m.subject ?? ""}\n${body.slice(0, 3000)}`;
  if (!CONFIRMS.test(text)) return false;
  return SENDERS.test(from) || WHO.test(`${m.subject ?? ""}\n${body.slice(0, 1500)}`);
}

export const BOOKING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["confirms_booking", "kind", "job_number", "street", "suburb", "when"],
  properties: {
    confirms_booking: { type: "boolean", description: "True only when this email confirms a booking has been made: a rubbish removal / skip bin / waste collection booked for a site, or an electrician confirming they'll do the electrical work at a site. False for quotes, invoices, newsletters, holiday notices, questions, or anything still to be arranged." },
    kind: { type: "string", enum: ["rubbish_removal", "electrician", "other"], description: "rubbish_removal for a skip, bin or waste removal; electrician for electrical work by an electrician; otherwise other." },
    job_number: { type: "string", description: "Our 5-digit job number if the email gives one (often in a PO or reference like 'Job 20769'); otherwise empty. Not the supplier's own booking reference." },
    street: { type: "string", description: "The site's street address (number and street, e.g. '5 Golden Green Street'); empty if none." },
    suburb: { type: "string", description: "The site's suburb; empty if none." },
    when: { type: "string", description: "The booked date and time as written, e.g. 'Thu 12 Nov, AM'; empty if none." },
  },
} as const;

export type BookingRead = { confirms: boolean; kind: BookingKind | null; jobNumber: string; street: string; suburb: string; when: string };

export function parseBooking(text: string): BookingRead {
  const o = JSON.parse(text) as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || typeof o.confirms_booking !== "boolean") throw new Error("no decision in it");
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const kind = o.kind === "rubbish_removal" || o.kind === "electrician" ? o.kind : null;
  const jobNumber = /^\d{5}$/.test(s(o.job_number, 10)) ? s(o.job_number, 10) : "";
  return { confirms: o.confirms_booking && !!kind, kind, jobNumber, street: s(o.street, 120), suburb: s(o.suburb, 60), when: s(o.when, 80) };
}

/**
 * The job's tags after the booking: the "not booked" one off, the "booked"
 * one on, every other tag kept (ServiceTitan replaces the whole list).
 * Null when there's nothing to change.
 */
export function swapTag(current: number[], notId: number, bookedId: number): number[] | null {
  if (!current.includes(notId) && current.includes(bookedId)) return null;
  const next = [...new Set([...current.filter((x) => x !== notId), bookedId])];
  return next.length === current.length && next.every((x) => current.includes(x)) ? null : next;
}
