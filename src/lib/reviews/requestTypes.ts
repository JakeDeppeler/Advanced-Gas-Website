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
 *  - once a year per customer at most, and never for a job tagged Problem.
 *
 * Everyone who fits is asked, happy or not. Google's rules don't allow
 * asking only the customers expected to be happy, so the email offers the
 * review to everyone and, separately, a reply for anything that wasn't right.
 */

export const REVIEW_SETTINGS_KEY = "review_requests";

export type ReviewSettings = {
  on: boolean;
  /** The "Ask for reviews" link from the Google Business Profile. Empty: built from GOOGLE_PLACE_ID. */
  link: string;
  subject: string;
  body: string;
};

export const DEFAULT_REVIEW_SUBJECT = "How did {tech} go, {first}?";
export const DEFAULT_REVIEW_BODY = `Hi {first},

Thanks for having {tech} out for your {job}. We're a small local team, and a Google review from you helps the next family in {suburb} find us.

It takes about a minute:

{button}

If anything wasn't right, just reply to this email and it comes straight to the office. We'll sort it.

Thanks again,
The Advanced Gas team`;

export const REVIEW_PLACEHOLDERS = ["first", "tech", "job", "suburb", "button"] as const;

export function reviewSettingsFrom(raw: unknown): ReviewSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (v: unknown, d: string, max: number) => (typeof v === "string" && v.trim() ? v.slice(0, max) : d);
  return {
    on: o.on === true,
    link: typeof o.link === "string" ? o.link.trim().slice(0, 500) : "",
    subject: s(o.subject, DEFAULT_REVIEW_SUBJECT, 200),
    body: s(o.body, DEFAULT_REVIEW_BODY, 4000),
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
};

export const ASK_EVERY_DAYS = 365;
/** Jobs finished longer ago than this aren't asked: the moment has passed. */
export const LATEST_DAYS = 7;
/** Not the same day: give it a night. */
export const EARLIEST_HOURS = 18;

/** Why a job isn't asked, or null when it is. */
export function whyNot(c: Candidate, now: Date): string | null {
  if (!/^domestic/i.test(c.businessUnit ?? "")) return "not a household job";
  if (NOT_A_JOB_TO_REVIEW.test(c.jobType ?? "")) return "a quote visit or warranty job";
  if (c.invoiced <= 0) return "nothing charged";
  if (c.owing > 0.5) return "not paid yet";
  if (c.tags.some((t) => /^problem\b/i.test(t.trim()))) return "tagged Problem";
  const age = now.getTime() - Date.parse(c.completedOn);
  if (age < EARLIEST_HOURS * 3600_000) return "finished too recently";
  if (age > LATEST_DAYS * 86_400_000) return "finished too long ago";
  const email = (c.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || TEAM_OR_PLATFORM.test(email)) return "no email of their own";
  if (c.lastAsked && now.getTime() - Date.parse(c.lastAsked) < ASK_EVERY_DAYS * 86_400_000) return "asked in the last year";
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

const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ReviewEmailInput = { customer: string | null; techs: string[]; jobType: string | null; suburb: string | null; href: string };

export function reviewEmail(s: ReviewSettings, i: ReviewEmailInput): { subject: string; text: string; html: string } {
  const values: Record<string, string> = {
    first: firstName(i.customer),
    tech: techWords(i.techs),
    job: jobWords(i.jobType),
    suburb: (i.suburb ?? "").trim() || "your area",
  };
  const fill = (tpl: string, button: (href: string) => string) =>
    tpl.replace(/\{(\w+)\}/g, (all, k: string) => (k === "button" ? button(i.href) : values[k] ?? all));
  const subject = fill(s.subject, () => "").replace(/\s+/g, " ").trim().slice(0, 200);
  const text = fill(s.body, (h) => `Leave a Google review: ${h}`);
  const BUTTON = "\u0000BUTTON\u0000";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1d;max-width:560px">${fill(s.body, () => BUTTON)
    .split(/\n{2,}/)
    .map((p) =>
      p.trim() === BUTTON
        ? `<p style="margin:22px 0"><a href="${esc(i.href)}" style="display:inline-block;background:#1a1a1d;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px">Leave a Google review ★★★★★</a></p>`
        : `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>").replace(BUTTON, `<a href="${esc(i.href)}">Leave a Google review</a>`)}</p>`,
    )
    .join("")}</div>`;
  return { subject, text, html };
}
