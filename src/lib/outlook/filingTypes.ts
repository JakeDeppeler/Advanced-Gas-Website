/**
 * Filing admin@'s email into its own folders: the rules, with nothing that
 * fetches or writes (filing.ts does that), so scripts/check-outlook.ts can run
 * them against made-up emails.
 *
 * The office already files by hand into about 45 folders under the Inbox, one
 * per agency, client or supplier (Jake's screenshots, 11 Nov). So nothing is
 * invented here: an email goes where that sender's past emails were put, and
 * only an email that needs nothing more from anyone is moved. Everything else
 * stays in the Inbox, which is the point: the Inbox becomes the to-do list.
 *
 * Three things keep an email in the Inbox whatever else is true: a flagged
 * word in it (Jake: "a list of wording that gets flagged that will never be
 * touched"), an Outlook flag or a category somebody added by hand, and a
 * folder on the never list (the people's own folders).
 */

import { personalAddress } from "@/lib/email/ownAddress";

export type FilingMode = "off" | "trial" | "on";

export type FilingSettings = {
  /** off: nothing runs. trial: works out where each email would go, moves nothing. on: moves them. */
  mode: FilingMode;
  /** Once a reply has gone out in its thread, an email that needed one is filed too. */
  fileAfterReply: boolean;
  /** An email with any of these in its subject or its own text is never moved. */
  protectedWords: string[];
  /** Folders nothing is ever filed into, nor learned from (with their subfolders). */
  neverFolders: string[];
  /** Which mailboxes are filed. admin@ first; jake@ once admin@ has run well. */
  mailboxes: string[];
  since: string | null;
  by: string | null;
};

/**
 * Phrases, not single words: every email's own text includes the sender's
 * signature, and agency signatures are full of "legal", "liability" and "damage"
 * in their disclaimers. A lone word like those would keep every agency email
 * in the Inbox and the filing would do nothing.
 */
export const DEFAULT_PROTECTED = [
  "gas leak",
  "smell gas",
  "smell of gas",
  "gas smell",
  "carbon monoxide",
  "complaint",
  "not happy",
  "unhappy",
  "disappointed",
  "refund",
  "dispute",
  "solicitor",
  "lawyer",
  "VCAT",
  "Consumer Affairs",
  "Energy Safe",
  "WorkSafe",
  "WorkCover",
  "injury",
  "injured",
  "insurance claim",
  "warranty claim",
  "urgent",
  "ombudsman",
  "letter of demand",
  "final notice",
  "debt collection",
  // Machine mail that needs doing something about, though nobody replies to it.
  "action required",
  "expired",
  "suspended",
  "payment failed",
  "declined",
  "past due",
  "overdue",
];

/** The people's own folders and the ones that need judgement (Jake's list, 11 Nov). */
export const DEFAULT_NEVER = ["Kellie", "Dean", "Apprentice", "Admin Team", "Important", "Medical / Workcover", "Inactive Folders"];

export const NOTIFICATIONS_FOLDER = "Notifications";
export const DEFAULT_MAILBOXES = ["admin@advancedgas.com.au"];

const words = (raw: unknown, max: number) =>
  Array.isArray(raw)
    ? [...new Set(raw.filter((w): w is string => typeof w === "string").map((w) => w.replace(/\s+/g, " ").trim()).filter((w) => w.length >= 2 && w.length <= 60))].slice(0, max)
    : null;

export function filingSettingsFrom(raw: unknown): FilingSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const mode = o.mode === "trial" || o.mode === "on" ? o.mode : "off";
  return {
    mode,
    fileAfterReply: o.fileAfterReply === true,
    protectedWords: words(o.protectedWords, 200) ?? DEFAULT_PROTECTED,
    neverFolders: words(o.neverFolders, 100) ?? DEFAULT_NEVER,
    mailboxes: (words(o.mailboxes, 4) ?? DEFAULT_MAILBOXES).map((m) => m.toLowerCase()).filter((m) => /@advancedgas\.com\.au$/.test(m)),
    since: typeof o.since === "string" ? o.since : null,
    by: typeof o.by === "string" ? o.by : null,
  };
}

/** One word or phrase per line, as the page's box holds them. */
export const wordsFromText = (text: string) => [...new Set(text.split(/[\n,;]+/).map((w) => w.replace(/\s+/g, " ").trim()).filter((w) => w.length >= 2 && w.length <= 60))].slice(0, 200);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The first flagged word in the subject or the email's own text, or null.
 * Matched from the start of a word, in any case, so "complain" also catches
 * "complained" and "refund" catches "refunds", but "gas" isn't found inside
 * "Vegas". A phrase matches across any run of spaces or line breaks.
 */
export function flaggedWord(subject: string, text: string, list: string[]): string | null {
  const hay = `${subject}\n${text}`;
  for (const w of list) {
    const re = new RegExp(`(^|[^a-z0-9])${escape(w.toLowerCase()).replace(/ /g, "\\s+")}`, "i");
    if (re.test(hay)) return w;
  }
  return null;
}

/* ------------------------------------------------------------- the email */

/** The categories the portal puts on email itself. Any other one was added by a person. */
export const OUR_CATEGORIES = new Set([
  "Needs a person", "On a job", "Booking confirmed", "New lead", "Call back", "In ServiceTitan", "Tenant emailed", "Job cancelled", "Work order", "Agency told",
  "For Kellie", "For quotes", "For booking", "For Jake", "Reply ready",
]);

export type DraftRecord = {
  status: string;
  reason: string | null;
  handoff: string | null;
  handoff_cleared_at: string | null;
  sent_at: string | null;
  callback_at: string | null;
  callback_done_at: string | null;
};

export type FilingFacts = {
  from: string;
  subject: string;
  categories: string[];
  flagged: boolean;
  /** What the drafts made of it (mail_drafts). Null: they haven't read it. */
  draft: DraftRecord | null;
  /** The agency on the work order it was booked from, when it was one. */
  agency: string | null;
};

const MACHINE = new Set(["from a no-reply address", "a mailing list or newsletter", "bulk mail", "an automatic message"]);

export type Kind = "machine" | "no-reply-needed" | "work-order-done" | "booking-confirmed" | "replied" | "waiting";

/**
 * What the drafts' outcome means for filing: done with (it needs nothing, or
 * the portal has dealt with it), replied to, or still waiting on a person.
 * The reason words are the ones handle.ts and skipReason() write.
 */
export function kindOf(d: DraftRecord): { kind: Kind; why: string } {
  const r = d.reason ?? "";
  if (d.status === "working") return { kind: "waiting", why: "still being read" };
  if (d.status === "failed") return { kind: "waiting", why: "the draft failed, so a person should see it" };
  if (d.callback_at && !d.callback_done_at) return { kind: "waiting", why: "they asked us to ring them" };
  if (d.status === "drafted") return d.sent_at || d.handoff_cleared_at ? { kind: "replied", why: "replied to" } : { kind: "waiting", why: d.handoff ? "needs a person" : "a reply is drafted, waiting to be sent" };
  // An invite somebody has to accept or decline (Jeremy Yates's ServiceTitan calls, 11 Nov).
  if (r === "a meeting invite or receipt, not an email") return { kind: "waiting", why: "a meeting invite" };
  if (MACHINE.has(r)) return { kind: "machine", why: r };
  if (r.startsWith("no reply needed")) return { kind: "no-reply-needed", why: r };
  if (r.startsWith("booking confirmation:")) return { kind: "booking-confirmed", why: "a booking confirmation, applied to its job" };
  if (r.startsWith("work order:")) {
    return /^work order: booking /.test(r) ? { kind: "waiting", why: "a work order that didn't book" } : { kind: "work-order-done", why: "a work order, in ServiceTitan" };
  }
  if (r === "already replied") return { kind: "replied", why: "replied to" };
  if (r === "from the team" || r.startsWith("forwarded by the team") || r === "sent from this mailbox") return { kind: "waiting", why: "from the team" };
  return { kind: "waiting", why: r ? `not read by the drafts (${r})` : "not read by the drafts" };
}

/**
 * Why it stays in the Inbox for now, or null when it's done with and can be
 * filed. Not final: a flag comes off, a reply goes out, and the next run
 * looks again.
 */
export function waitReason(f: FilingFacts, s: FilingSettings): string | null {
  if (f.flagged) return "flagged in Outlook";
  const hand = f.categories.find((c) => !OUR_CATEGORIES.has(c));
  if (hand) return `has the category “${hand}”, added by hand`;
  if (!f.draft) return "not read by the drafts yet";
  const k = kindOf(f.draft);
  if (k.kind === "waiting") return k.why;
  if (k.kind === "replied" && !s.fileAfterReply) return "replied to; filing after a reply is off";
  // "No reply needed" isn't "nothing to do": an invoice still has to be entered,
  // so it stays for whoever enters it, and they file it as now.
  if (k.kind !== "replied" && moneyPaperwork(f)) return "supplier paperwork, still to be entered";
  // Tapi has to be told what's happening by hand, in Tapi (Jake, 11 Nov): a
  // job booked, "Please confirm work at…", a quote to enter. So nothing from
  // Tapi is filed until somebody has done that and files it themselves.
  if (/@tapihq\.com$/i.test(f.from)) return "from Tapi: Tapi is updated by hand";
  return null;
}

/** An invoice, statement, remittance, bill or receipt from someone we pay: work for whoever enters them. */
export function moneyPaperwork(f: Pick<FilingFacts, "subject" | "draft">): boolean {
  const words = `${f.subject} ${f.draft?.reason ?? ""}`;
  return /\b(invoices?|tax invoice|statements?|remittance|credit notes?|bills?|receipts?)\b/i.test(words);
}

/* ------------------------------------------------------------ the folder */

export type Folder = { id: string; name: string; path: string };
/** Where a sender's (or a domain's) past email was filed: n of their total in this folder. */
export type Home = { folderId: string; n: number; total: number };

/** A sender counts once at least this many of their filed emails are in one folder, and this share of them. */
export const SENDER_MIN = 2;
export const SENDER_SHARE = 0.75;
/** A whole domain needs more to go on: two branches of one agency share a domain. */
export const DOMAIN_MIN = 4;
export const DOMAIN_SHARE = 0.85;

/** Platform and mail-provider domains: everyone's at them, so they say nothing about the folder. */
const SHARED_DOMAIN = /(^|\.)(propertyme\.com|tapihq\.com|ailo\.io|propertytree\.com|rockend\.com|consolecloud\.com\.au|sharepoint\.com|onmicrosoft\.com|xero\.com|servicetitan\.com|google\.com|microsoft\.com)$/;

export const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";
/** Whether a domain's history can stand for its senders: not a mail provider or a platform. */
export const learnableDomain = (email: string) => !!domainOf(email) && !personalAddress(email) && !SHARED_DOMAIN.test(domainOf(email));

export const strongHome = (h: Home | null | undefined, min: number, share: number) => !!h && h.n >= min && h.n / Math.max(1, h.total) >= share;

/** The folder or any folder above it is on the never list. */
export function isNever(path: string, never: string[]): boolean {
  const parts = path.split("/").map((p) => p.trim().toLowerCase());
  const set = new Set(never.map((n) => n.trim().toLowerCase()));
  return parts.some((p) => set.has(p));
}

const GENERIC = new Set(["real", "estate", "re", "the", "and", "pty", "ltd", "group", "property", "properties", "private", "commercial", "general", "jobs", "odd", "co"]);
const tokens = (s: string) => s.toLowerCase().replace(/['’]/g, "").replace(/&/g, " ").split(/[^a-z0-9]+/).filter(Boolean);
const tokenHit = (t: string, among: string[]) => among.some((a) => a === t || (t.length >= 3 && a.startsWith(t)));

/**
 * The folder named for an agency, when exactly one fits. "Barry Plant
 * Pakenham" fits "Barry Plant Ber, Pak, Drouin" (three of its words, "Pak"
 * standing for Pakenham) better than "Barry Plant Bayside" (two). A folder
 * whose name starts with a generic word ("Real Estate Odd Jobs") is never
 * picked by name: it's a catch-all, and catch-alls are learned from senders.
 */
export function folderForAgency(agency: string, folders: Folder[]): Folder | null {
  const a = tokens(agency);
  if (!a.length) return null;
  const scored = folders
    .map((f) => {
      const t = tokens(f.name);
      if (!t.length || GENERIC.has(t[0])) return { f, score: 0 };
      // Its first word names the agency, or every word that isn't generic is in the agency's name.
      const named = tokenHit(t[0], a) || t.filter((x) => !GENERIC.has(x)).every((x) => tokenHit(x, a));
      return { f, score: named ? t.filter((x) => tokenHit(x, a)).length : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);
  if (!scored.length) return null;
  if (scored[1] && scored[1].score === scored[0].score) return null;
  return scored[0].f;
}

const byName = (folders: Folder[], name: string) => folders.find((f) => f.name.trim().toLowerCase() === name.toLowerCase()) ?? null;

export type FolderPick = { folder: Folder | null; create?: string; why: string };

/**
 * Where an email that needs nothing goes, in this order: its own lead folder,
 * where this sender's email has always gone, the agency's folder for a work
 * order, where this company's people's email goes, then, for machine mail
 * only, Notifications. Null folder: it stays, because there's no folder for
 * it yet that we can be sure of.
 */
export function pickFolder(f: FilingFacts, ctx: { folders: Folder[]; never: string[]; sender: Home | null; domain: Home | null }): FolderPick {
  const usable = ctx.folders.filter((x) => !isNever(x.path, ctx.never));
  const byId = (id: string) => usable.find((x) => x.id === id) ?? null;

  if (f.categories.includes("New lead")) {
    const leads = byName(usable, "New Leads");
    if (leads) return { folder: leads, why: "an email enquiry, made into a lead" };
  }
  if (strongHome(ctx.sender, SENDER_MIN, SENDER_SHARE)) {
    const home = byId(ctx.sender!.folderId);
    if (home) return { folder: home, why: `where ${ctx.sender!.n} of this sender's ${ctx.sender!.total} filed emails are` };
  }
  // The agency's folder only for a work order that's booked: an email the
  // work-order reading looked at and turned down may still need doing.
  if (f.agency && f.draft && kindOf(f.draft).kind === "work-order-done") {
    const home = folderForAgency(f.agency, usable);
    if (home) return { folder: home, why: `the folder for ${f.agency}` };
  }
  const k = f.draft ? kindOf(f.draft).kind : null;
  const machine = k === "machine" || k === "booking-confirmed";
  // A company's people file alike; its machines don't: Rinnai's delivery
  // advices aren't warranty claims because Rinnai's warranty team writes from
  // the same domain.
  if (!machine && strongHome(ctx.domain, DOMAIN_MIN, DOMAIN_SHARE)) {
    const home = byId(ctx.domain!.folderId);
    if (home) return { folder: home, why: `where ${ctx.domain!.n} of ${ctx.domain!.total} filed emails from @${domainOf(f.from)} are` };
  }
  // Only mail from a machine goes to Notifications. A person's email that
  // needed no reply ("Please confirm work at…", a customer's thanks) may still
  // need doing, so with no folder of its own it stays.
  if (machine) {
    const note = byName(usable, NOTIFICATIONS_FOLDER);
    return note ? { folder: note, why: "a notification nobody answers" } : { folder: null, create: NOTIFICATIONS_FOLDER, why: "a notification nobody answers" };
  }
  return { folder: null, why: "no folder this sender's email has gone to before" };
}

/* --------------------------------------------------------------- learning */

/**
 * Where each sender's (and each domain's) filed email sits, from a sample of
 * every folder: the most-used folder and its count against their total.
 * Never-list folders aren't read, and our own messages aren't counted.
 */
export function learnHomes(samples: { folderId: string; from: string }[], ownDomain = "advancedgas.com.au"): { senders: Map<string, Home>; domains: Map<string, Home> } {
  const tally = (key: (from: string) => string | null) => {
    const counts = new Map<string, Map<string, number>>();
    for (const s of samples) {
      const from = s.from.trim().toLowerCase();
      if (!from || domainOf(from) === ownDomain) continue;
      const k = key(from);
      if (!k) continue;
      const m = counts.get(k) ?? new Map<string, number>();
      m.set(s.folderId, (m.get(s.folderId) ?? 0) + 1);
      counts.set(k, m);
    }
    const out = new Map<string, Home>();
    for (const [k, m] of counts) {
      const total = [...m.values()].reduce((a, b) => a + b, 0);
      const [folderId, n] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      out.set(k, { folderId, n, total });
    }
    return out;
  };
  return { senders: tally((f) => f), domains: tally((f) => (learnableDomain(f) ? domainOf(f) : null)) };
}
