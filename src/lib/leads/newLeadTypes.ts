/**
 * A new enquiry, as the wall board announces it.
 *
 * Pure: no database, no React, no `server-only`, so the board can import it and
 * scripts/check-leads.ts can run the rules without credentials. What is decided
 * here is which enquiries are worth taking the whole wall for and what the room
 * is told to do about them, and both of those are easy to get quietly wrong —
 * an alert that fires on a phone tap nobody can ring back, or a number printed
 * in a shape nobody can read out loud from four metres.
 *
 * **Why sixty seconds.** It is the office's own rule, and the business case for
 * it is older than this board: an enquiry answered within the minute is spoken
 * to while they are still on the website with the page open, and one answered
 * in an hour is spoken to after they have rung somebody else. The board's job
 * is to make the minute visible — the countdown is the alert, not decoration
 * around it.
 */

/** The window the office gives itself to ring. The countdown is drawn from it. */
export const CALL_WITHIN_SEC = 60;

/**
 * How much of the minute is left, from when the alert opened.
 *
 * Taken from two timestamps rather than by counting ticks down. A television
 * drops frames and a browser throttles a tab it thinks nobody is looking at,
 * and either loses ticks — so a counter that subtracts one per tick finishes
 * the minute late while the bar beside it, which the browser animates
 * properly, finishes on time. Two clocks on one alert disagreeing is worse
 * than either being a quarter-second coarse.
 *
 * Never negative: the alert says the minute has gone rather than counting
 * past it.
 */
export function secondsLeft(fromMs: number, nowMs: number): number {
  const left = CALL_WITHIN_SEC - Math.round((nowMs - fromMs) / 1000);
  return left > 0 ? Math.min(CALL_WITHIN_SEC, left) : 0;
}

/** One enquiry, as much of it as the wall needs. */
export type NewLead = {
  id: string;
  /** When it landed, ISO, from the database's clock. */
  at: string;
  /** The `source` column: "website", "facebook", "facebook-message", "header". */
  source: string;
  /** The `kind` column: "quote" is an enquiry, "call" is a tap on the phone number. */
  kind: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  /** "Heat pump hot water" — what the form says they want. */
  headline: string | null;
  service: string | null;
  suburb: string | null;
  postcode: string | null;
  /** The form's own summary line, or the first line of a Facebook message. */
  summary: string | null;
};

/**
 * Whether this one takes the wall.
 *
 * A tap on the phone number in the header is recorded as a lead and is not one:
 * nobody left a name, nobody left a number, and the person doing the tapping is
 * already dialling. Telling the room to ring them back inside a minute would be
 * telling it to ring nobody, and an alert that fires on nothing is how a board
 * teaches a room to ignore it.
 *
 * Everything else with a way to answer it qualifies — a phone number, an email,
 * or a Facebook thread to reply in.
 */
export function alertable(lead: NewLead): boolean {
  if (lead.kind === "call") return false;
  return Boolean(lead.phone?.trim() || lead.email?.trim() || isMessage(lead));
}

const isMessage = (lead: NewLead) => lead.source === "facebook-message";

/** Where it came from, in the room's words rather than the column's. */
export function sourceLabel(source: string): string {
  if (source === "facebook") return "Facebook lead form";
  if (source === "facebook-message") return "Facebook message";
  if (source === "website") return "Website enquiry";
  if (source === "header") return "Phone tap";
  // Never invented: a source nobody has taught this function about is printed
  // as it was stored, so a new one shows up on the wall as itself rather than
  // as "Other".
  return source || "Enquiry";
}

/**
 * The number as somebody reads it out: "0412 345 678", "03 9123 4567".
 *
 * Only two shapes are grouped, and only when the digits are exactly right for
 * them. Anything else — an overseas number, a number with an extension, a
 * typo — is printed exactly as the customer typed it. A wall board that
 * rearranges a phone number it has not understood is a wall board that gets
 * somebody dialled wrong.
 */
export function phonePretty(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const digits = s.replace(/[^0-9]/g, "");
  const local = digits.startsWith("61") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
  if (local.length !== 10 || !local.startsWith("0")) return s;
  if (local.startsWith("04") || local.startsWith("05")) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
}

/** What the room is told to do, and what it needs to do it. */
export type LeadAlertCopy = {
  /** "Website enquiry · 2:15 pm" */
  eyebrow: string;
  /** The number, grouped for reading aloud, or what to do instead. */
  call: string;
  /** True when `call` is a number somebody dials, rather than an instruction. */
  dialable: boolean;
  /** Who it is. "Someone" where the form did not ask. */
  who: string;
  /** What they want: the headline, or the first thing we know. */
  what: string;
  /** Where they are — the suburb, or the postcode as a postcode. */
  where: string | null;
  /** The line under it: the email, where that is all there is. */
  also: string | null;
};

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

/**
 * The alert's words.
 *
 * Nothing is printed as a gap. A form that did not ask for a surname gives
 * "Jake", not "Jake ·", and an enquiry with no postcode has no place line at
 * all rather than an empty one — the same rule the other three alerts follow,
 * and the one that is easiest to lose when a field is usually there.
 */
export function leadCopy(lead: NewLead, time: string): LeadAlertCopy {
  const phone = phonePretty(lead.phone);
  const email = clean(lead.email);
  const suburb = clean(lead.suburb);
  const postcode = clean(lead.postcode);

  return {
    eyebrow: `${sourceLabel(lead.source)} · ${time}`,
    // A Facebook message has no number on it: the reply goes back the way it
    // came, and saying so is more use than an empty space where a number was.
    call: phone ?? (isMessage(lead) ? "Reply in Messenger" : email ? "Email them back" : "No number given"),
    dialable: Boolean(phone),
    who: clean(lead.name) ?? "Someone",
    what: clean(lead.headline) ?? clean(lead.service) ?? clean(lead.summary) ?? "New enquiry",
    // The postcode says it is a postcode. Most of this patch's postcodes cover
    // several suburbs — 3977 covers seven — so turning one into a suburb name
    // would be the board guessing, and it would be wrong six times in seven.
    where: suburb ?? (postcode ? `Postcode ${postcode}` : null),
    also: phone && email ? email : null,
  };
}
