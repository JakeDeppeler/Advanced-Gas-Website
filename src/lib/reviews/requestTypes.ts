/**
 * Asking for a Google review by email (Jake, 7 Nov: "a way to send automated
 * email to get google review"). Pure, for scripts/check-reviews.ts.
 *
 * Who is asked, and when:
 *  - a household's own job: a Domestic business unit. Real estate, retirement
 *    villages, commercial and Warranty & Callbacks are left out: the person
 *    who paid isn't the person who was there, or there was nothing to review.
 *  - finished and paid: the invoice is above $0 and nothing is owing. Quote
 *    visits and site assessments aren't jobs to review.
 *  - the day after at the earliest, and only between 9am and 7pm, Monday to
 *    Saturday, Melbourne time, so it lands at a civil hour.
 *  - once a year per customer at most.
 *
 * Everyone who fits is asked, happy or not (Jake, 8 Nov, asked for "only
 * people who had a good experience"; we can't). Google's review policy bans
 * asking selectively for positive reviews, and the ACCC took Meriton to the
 * Federal Court for keeping review invitations from guests who had
 * complained. So a job with a problem still open is HELD, not dropped: it's
 * asked once the Problem tag comes off or the return visit is done, and at
 * HOLD_MAX_DAYS regardless. What the office controls is fixing it first.
 */

import { personalAddress } from "@/lib/email/ownAddress";
import { letterHtml, letterText, type LetterBlock, type LetterEmail, type PremiumEmail } from "@/lib/email/premium";
import { SIGNERS, signerKey, type SignerKey } from "@/lib/email/team";

export const REVIEW_SETTINGS_KEY = "review_requests";

export type ReviewSettings = {
  on: boolean;
  /** The "Ask for reviews" link from the Google Business Profile. Empty: built from GOOGLE_PLACE_ID. */
  link: string;
  subject: string;
  body: string;
  /** Whose name and photo signs it. */
  signer: SignerKey;
};

export const DEFAULT_REVIEW_SUBJECT = "How did {tech} go, {first}?";
export const DEFAULT_REVIEW_BODY = `Hi {first},

Thank you for having {tech} out for your {job}. We're a family business in Pakenham, and everyone who comes to your door works for us, not a subcontractor.

Would you take a minute to say how it went on Google? Honest reviews are how the next family in {suburb} finds a tradie they can trust, and we read every one.

{button}

And if anything wasn't right, just reply to this email. It comes straight to the office, and we'll make it right.

Thanks again,`;

export const REVIEW_PLACEHOLDERS = ["first", "tech", "job", "suburb", "button"] as const;

export function reviewSettingsFrom(raw: unknown): ReviewSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (v: unknown, d: string, max: number) => (typeof v === "string" && v.trim() ? v.slice(0, max) : d);
  return {
    on: o.on === true,
    link: typeof o.link === "string" ? o.link.trim().slice(0, 500) : "",
    subject: s(o.subject, DEFAULT_REVIEW_SUBJECT, 200),
    body: s(o.body, DEFAULT_REVIEW_BODY, 4000),
    signer: signerKey(o.signer),
  };
}

/** Only links that go to Google, so a typo can't send customers somewhere else. */
export function reviewLinkOk(link: string): boolean {
  try {
    const u = new URL(link);
    return u.protocol === "https:" && /(^|\.)(google\.com|google\.com\.au|g\.page|goo\.gl|share\.google)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** The link to send people to: the saved one, else Google's write-a-review page for the place. */
export function reviewLink(s: ReviewSettings, placeId: string | undefined): string | null {
  if (s.link && reviewLinkOk(s.link)) return s.link;
  if (placeId && /^[A-Za-z0-9_-]{10,}$/.test(placeId)) return `https://search.google.com/local/writereview?placeid=${placeId}`;
  return null;
}

/* ------------------------------------------------------------ who */

const NOT_A_JOB_TO_REVIEW = /quot|assess|inspection|warrant|callback|call back|recall/i;
const TEAM_OR_PLATFORM = /@(?:[\w.-]+\.)?(advancedgas\.com\.au|tapihq\.com|propertyme\.com|propertytree\.com|servicetitan\.com)$/i;
const EMAIL = /^[^\s@<>()",;]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export type Candidate = {
  jobId: number;
  businessUnit: string | null;
  jobType: string | null;
  completedOn: string;
  invoiced: number;
  owing: number;
  email: string | null;
  tags: string[];
  /** When this customer was last asked, if ever. */
  lastAsked: string | null;
  /** A warranty or call-back job is open at the same address, booked after this one finished. */
  returnVisitOpen?: boolean;
};

export const ASK_EVERY_DAYS = 365;
/** Jobs finished longer ago than this aren't asked: the moment has passed. */
export const LATEST_DAYS = 7;
/** Not the same day: give it a night. */
export const EARLIEST_HOURS = 18;
/** A held job is asked this long after it was held, fixed or not, so holding can't become not asking. */
export const HOLD_MAX_DAYS = 21;

/** Why a job isn't asked, or null when it is. `latestDays` is longer for a job that was held. */
export function whyNot(c: Candidate, now: Date, latestDays = LATEST_DAYS): string | null {
  if (!/^domestic/i.test(c.businessUnit ?? "")) return "not a household job";
  if (NOT_A_JOB_TO_REVIEW.test(c.jobType ?? "")) return "a quote visit or warranty job";
  if (c.invoiced <= 0) return "nothing charged";
  if (c.owing > 0.5) return "not paid yet";
  const age = now.getTime() - Date.parse(c.completedOn);
  if (age < EARLIEST_HOURS * 3600_000) return "finished too recently";
  if (age > latestDays * 86_400_000) return "finished too long ago";
  const email = (c.email ?? "").trim().toLowerCase();
  // A work or agency address too: a Domestic job billed to an agency carries the property manager's (ownAddress.ts).
  if (!EMAIL.test(email) || TEAM_OR_PLATFORM.test(email) || !personalAddress(email)) return "no email of their own";
  if (c.lastAsked && now.getTime() - Date.parse(c.lastAsked) < ASK_EVERY_DAYS * 86_400_000) return "asked in the last year";
  return null;
}

/** Why a job that would be asked waits for now: a problem still being fixed. Null when it can go. */
export function holdFor(c: Candidate): string | null {
  if (c.tags.some((t) => /^problem\b/i.test(t.trim()))) return "tagged Problem: asked once the tag comes off";
  if (c.returnVisitOpen) return "a return visit is booked: asked once it's done";
  return null;
}

/** 9am to 7pm, Monday to Saturday, in Melbourne. */
export function inSendingHours(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
  return day !== "Sun" && hour >= 9 && hour < 19;
}

/* ------------------------------------------------------------ the email */

/** "Ray", "Ray and Dean", "the team". */
export function techWords(names: string[]): string {
  const firsts = [...new Set(names.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean))];
  if (!firsts.length) return "the team";
  return firsts.length === 1 ? firsts[0] : `${firsts.slice(0, -1).join(", ")} and ${firsts[firsts.length - 1]}`;
}

/** "Service - Split System" → "split system service"; "Installation - Gas Ducted Heater" → "gas ducted heater installation". */
export function jobWords(jobType: string | null): string {
  const t = (jobType ?? "").trim();
  const m = /^(service|repair|installation|install|diagnostics|maintenance)\s*-\s*(.+)$/i.exec(t);
  if (m) {
    const kind = m[1].toLowerCase().replace(/^install$/, "installation").replace(/^diagnostics$/, "service call");
    return `${m[2].toLowerCase()} ${kind}`.replace(/\s+/g, " ");
  }
  return t ? t.toLowerCase() : "job";
}

export const firstName = (customer: string | null) => {
  const w = (customer ?? "").trim().split(/[\s,&]+/)[0] ?? "";
  // A company or a site name ("Unit 092") isn't someone to greet.
  return /^[A-Z][a-z'-]{1,}$/.test(w) && !/^(unit|the|mr|mrs|ms|dr)$/i.test(w) ? w : "there";
};

export type ReviewEmailInput = {
  customer: string | null; techs: string[]; jobType: string | null; suburb: string | null; href: string;
  /** A photo the tech took on the job (jobPhoto.ts), used across the top instead of a stock one. */
  photo?: string | null;
};

/** Where the email lives: the site's address and contact line, passed in so this file stays pure. */
export type EmailContext = Pick<PremiumEmail, "base" | "footer" | "proof">;

/** The photo across the top: the kind of thing they had done, else the team. */
export function reviewHero(jobType: string | null): { src: string; alt: string; width: number } {
  // Each shows the whole system (Jake, 8 Nov: "always show a photo of the full system"); the tall ones narrower so it all fits.
  const t = (jobType ?? "").toLowerCase();
  if (/heat pump|hot water|hws|reclaim|istore|thermann/.test(t)) return { src: "/email/hp-aio.jpg", alt: "A heat pump hot water system we installed beside a house", width: 300 };
  if (/gas ducted|ducted heat|heater|furnace|brivis|braemar|rinnai/.test(t)) return { src: "/email/hero-ducted.jpg", alt: "A ducted unit we installed in a roof space", width: 560 };
  if (/split|air ?con|aircon|ducted|cooling|reverse/.test(t)) return { src: "/email/hero-split.jpg", alt: "A split system we installed in a bedroom", width: 560 };
  return { src: "/email/hero-team.jpg", alt: "The Advanced Gas team with the vans outside our Pakenham workshop", width: 560 };
}

const BUTTON_LABEL = "Leave a Google review";

export function reviewEmail(s: ReviewSettings, i: ReviewEmailInput, ctx: EmailContext): { subject: string; text: string; html: string } {
  const values: Record<string, string> = {
    first: firstName(i.customer),
    tech: techWords(i.techs),
    job: jobWords(i.jobType),
    suburb: (i.suburb ?? "").trim() || "your area",
  };
  const fill = (tpl: string) => tpl.replace(/\{(\w+)\}/g, (all, k: string) => (k === "button" ? all : values[k] ?? all));
  const subject = fill(s.subject).replace(/\{button\}/g, "").replace(/\s+/g, " ").trim().slice(0, 200);

  // A plain email from a person (Jake, 8 Nov: "need to look like a real email,
  // not like an automation email"): the words, the photo of their job after
  // the paragraph that names the tech, one button, and a signature.
  const stock = reviewHero(i.jobType);
  // A phone photo from the job could be tall or wide: 420 px fits either on screen whole.
  const photo: LetterBlock = i.photo
    ? { kind: "photo", src: i.photo, alt: `Your ${values.job}, photographed by ${values.tech} on the day`, fallback: stock.src, width: 420 }
    : { kind: "photo", src: stock.src, alt: stock.alt, width: stock.width };
  const blocks: LetterBlock[] = [];
  const paras = fill(s.body).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const named = paras.findIndex((p) => p.includes(values.tech));
  const photoAfter = named >= 0 ? named : Math.min(1, paras.length - 1);
  let buttonDone = false;
  paras.forEach((p, n) => {
    const [before, ...rest] = p.split("{button}");
    if (before.trim()) blocks.push({ kind: "p", text: before.trim() });
    if (rest.length) {
      blocks.push({ kind: "button", label: BUTTON_LABEL, href: i.href });
      buttonDone = true;
      const after = rest.join(" ").trim();
      if (after) blocks.push({ kind: "p", text: after });
    }
    if (n === photoAfter) blocks.push(photo);
  });
  // Someone deleted {button} from the words: the email is pointless without it.
  if (!buttonDone) blocks.push({ kind: "button", label: BUTTON_LABEL, href: i.href });

  const mail: LetterEmail = {
    base: ctx.base, footer: ctx.footer, blocks, signer: SIGNERS[s.signer],
    preheader: `How did ${values.tech} go? A minute on Google helps the next family find us.`,
    // The words end "Thanks again," already.
    signoff: /\n\s*(thanks|cheers|regards|kind regards)[^\n]*,?\s*$/i.test(s.body.trim()) || /^(thanks|cheers)/i.test(paras[paras.length - 1] ?? "") ? null : "Cheers,",
  };
  return { subject, text: letterText(mail), html: letterHtml(mail) };
}
