/**
 * Outlook reply drafts: the shapes and rules, with nothing that fetches or
 * writes.
 *
 * Pure for the same reason chatTypes.ts is: the only real input is an email
 * arriving in a live mailbox, so scripts/check-outlook.ts runs these against
 * hand-built messages instead. Whether an email gets a draft at all, and what
 * the draft looks like inside the reply, are both decided here.
 */

export type GraphAddress = { emailAddress?: { name?: string | null; address?: string | null } | null } | null;

/** The fields of a Graph message this feature reads. */
export type GraphMessage = {
  id: string;
  "@odata.type"?: string;
  internetMessageId?: string | null;
  conversationId?: string | null;
  subject?: string | null;
  from?: GraphAddress;
  sender?: GraphAddress;
  toRecipients?: GraphAddress[];
  ccRecipients?: GraphAddress[];
  receivedDateTime?: string | null;
  sentDateTime?: string | null;
  isDraft?: boolean;
  hasAttachments?: boolean;
  internetMessageHeaders?: { name: string; value: string }[] | null;
  uniqueBody?: { contentType?: string; content?: string } | null;
  body?: { contentType?: string; content?: string } | null;
};

export const TEAM_DOMAIN = /@advancedgas\.com\.au$/i;

/** Mailboxes the office shares rather than a person: their drafts sign off as the business. */
const SHARED_BOXES = new Set(["admin", "office", "info", "accounts", "sales", "bookings", "service", "enquiries", "jobs", "orders"]);

/** Older than this, an email is left alone: a draft for last week's question helps nobody. */
export const MAX_AGE_MS = 3 * 24 * 3600 * 1000;

export const addressOf = (a: GraphAddress | undefined) => (a?.emailAddress?.address ?? "").trim().toLowerCase();
export const nameOf = (a: GraphAddress | undefined) => (a?.emailAddress?.name ?? "").trim();

/** The mailboxes to draft for, from OUTLOOK_DRAFT_MAILBOXES. Only our own domain is accepted. */
export function mailboxesFrom(raw: string | undefined): string[] {
  return [...new Set((raw ?? "").split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => TEAM_DOMAIN.test(s)))];
}

/** "jake@…" signs off as Jake; a shared box as the business. */
export function signoffFor(mailbox: string): string {
  const local = mailbox.split("@")[0].toLowerCase();
  if (SHARED_BOXES.has(local) || !/^[a-z]+$/.test(local)) return "The Advanced Gas team";
  return local[0].toUpperCase() + local.slice(1);
}

const header = (m: GraphMessage, name: string) =>
  m.internetMessageHeaders?.find((h) => h.name.toLowerCase() === name)?.value?.trim().toLowerCase() ?? null;

const NO_REPLY_SENDER = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|bounces?|notifications?|alerts?|news(letter)?)([@+._-]|$)/i;

/**
 * Why this email gets no draft, or null if it should get one.
 *
 * These are the cheap, certain cases, decided before anything is sent to the
 * model. Each is a kind of mail nobody answers: our own, a machine's, a
 * mailing list's. The model still gets the final say on the rest (a supplier's
 * invoice, a receipt) and can decline those itself.
 *
 * The headers are the reliable signal. A newsletter carries List-Unsubscribe
 * because the law makes it; an auto-reply carries Auto-Submitted because the
 * RFC asks it to, and replying to one is how two out-of-office messages end
 * up writing to each other all weekend.
 */
export function skipReason(m: GraphMessage, mailbox: string, now = Date.now()): string | null {
  if (m.isDraft) return "a draft";
  const type = m["@odata.type"] ?? "#microsoft.graph.message";
  if (type !== "#microsoft.graph.message") return "a meeting invite or receipt, not an email";
  const from = addressOf(m.from) || addressOf(m.sender);
  if (!from) return "no sender";
  if (from === mailbox) return "sent from this mailbox";
  if (TEAM_DOMAIN.test(from)) return "from the team";
  if (NO_REPLY_SENDER.test(from)) return "from a no-reply address";
  const auto = header(m, "auto-submitted");
  if (auto && auto !== "no") return "an automatic message";
  const precedence = header(m, "precedence");
  if (precedence && /bulk|list|junk|auto_reply/.test(precedence)) return "bulk mail";
  if (header(m, "list-unsubscribe") || header(m, "list-id")) return "a mailing list or newsletter";
  if (header(m, "x-autoreply") || header(m, "x-autorespond") || header(m, "x-auto-response-suppress") === "all") return "an automatic message";
  const at = Date.parse(m.receivedDateTime ?? "");
  if (Number.isFinite(at) && now - at > MAX_AGE_MS) return "older than three days";
  return null;
}

/**
 * Why the thread doesn't need a draft from us, or null if it does: somebody
 * has replied since, or started one. Both are checked against the whole
 * conversation, Sent Items included, so a reply typed on a phone counts.
 */
export function answeredReason(m: GraphMessage, thread: GraphMessage[], mailbox: string): string | null {
  const at = Date.parse(m.receivedDateTime ?? "") || 0;
  for (const t of thread) {
    if (t.id === m.id) continue;
    const when = Date.parse(t.sentDateTime ?? t.receivedDateTime ?? "") || 0;
    if (when < at) continue;
    if (t.isDraft) return "there's already a draft in this thread";
    const from = addressOf(t.from) || addressOf(t.sender);
    if (from === mailbox || TEAM_DOMAIN.test(from)) return "already replied";
  }
  return null;
}

/**
 * Whether we've sent a reply in the thread since the email that was tagged
 * Needs a person arrived. A draft doesn't count: the tag is there until
 * somebody has actually answered, and saving a draft isn't answering.
 */
export function repliedSince(thread: GraphMessage[], mailbox: string, receivedAt: string | null | undefined): boolean {
  const at = Date.parse(receivedAt ?? "") || 0;
  return thread.some((t) => {
    if (t.isDraft) return false;
    const from = addressOf(t.from) || addressOf(t.sender);
    if (from !== mailbox && !TEAM_DOMAIN.test(from)) return false;
    return (Date.parse(t.sentDateTime ?? t.receivedDateTime ?? "") || 0) >= at;
  });
}

/** Plain text from a message part, whichever kind it came as. */
export function plainText(part: GraphMessage["uniqueBody"]): string {
  const raw = part?.content ?? "";
  const text = part?.contentType?.toLowerCase() === "html"
    ? raw.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    : raw;
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const PER_MESSAGE = 4000;
const THREAD_MESSAGES = 10;

const melbourne = (iso: string | null | undefined) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t)
    ? new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(t)
    : "unknown time";
};

/**
 * The thread as the model reads it, oldest first, each message marked with
 * who wrote it. uniqueBody is used rather than body: it is only the new text
 * in each message, so a ten-email chain isn't ten copies of the first one.
 */
export function threadText(thread: GraphMessage[], mailbox: string): string {
  const sorted = [...thread]
    .filter((t) => !t.isDraft)
    .sort((a, b) => (Date.parse(a.sentDateTime ?? a.receivedDateTime ?? "") || 0) - (Date.parse(b.sentDateTime ?? b.receivedDateTime ?? "") || 0))
    .slice(-THREAD_MESSAGES);
  return sorted
    .map((t) => {
      const from = addressOf(t.from) || addressOf(t.sender);
      const ours = from === mailbox || TEAM_DOMAIN.test(from);
      const who = ours ? `us (${nameOf(t.from) || from})` : `${nameOf(t.from) || "sender"} <${from}>`;
      let body = plainText(t.uniqueBody ?? t.body);
      if (body.length > PER_MESSAGE) body = `${body.slice(0, PER_MESSAGE)}\n[…cut]`;
      const head = [`From: ${who}`, `Sent: ${melbourne(t.sentDateTime ?? t.receivedDateTime)}`, `Subject: ${t.subject ?? ""}`];
      if (t.hasAttachments) head.push("(has attachments)");
      return [`<email from="${ours ? "us" : "them"}">`, ...head, "", body || "(no text)", `</email>`].join("\n");
    })
    .join("\n\n");
}

export type MailDraft = { replyNeeded: boolean; whyNot: string; reply: string; handoff: string };

export const MAIL_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply_needed", "why_not", "reply", "handoff"],
  properties: {
    reply_needed: { type: "boolean", description: "False when nobody would answer this email: a receipt, an invoice or statement from a supplier, a notification, marketing, spam." },
    why_not: { type: "string", description: "When reply_needed is false, at most eight words on what it is, e.g. 'Supplier invoice'. Otherwise empty." },
    reply: { type: "string", description: "The reply email's text, from the greeting to the sign-off, exactly as it should be sent. Empty when reply_needed is false." },
    handoff: { type: "string", description: "Empty if the reply fully handles it. Otherwise one short sentence telling the office why a person needs to deal with this one." },
  },
} as const;

/** The model's JSON, checked. Throws on anything that isn't the shape above. */
export function parseMailDraft(text: string): MailDraft {
  const o = JSON.parse(text) as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || typeof o.reply_needed !== "boolean") throw new Error("draft had no decision in it");
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const out: MailDraft = { replyNeeded: o.reply_needed, whyNot: s(o.why_not, 120), reply: s(o.reply, 6000), handoff: s(o.handoff, 300) };
  if (out.replyNeeded && !out.reply) throw new Error("draft said to reply but had no reply in it");
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The reply's text as the HTML Outlook shows: a paragraph per blank-line
 * block, line breaks kept, in Outlook's own default font so it doesn't look
 * pasted in above the quoted message.
 */
export function replyHtml(text: string): string {
  const paras = text.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 11pt 0">${esc(p).replace(/\n/g, "<br>")}</p>`);
  return `<div style="font-family:Aptos,Calibri,Arial,Helvetica,sans-serif;font-size:11pt;color:#000000">${paras.join("")}</div>`;
}

/**
 * The reply put at the top of the draft Outlook made, above the quoted
 * message, as if typed there. createReply gives back the full HTML with the
 * original quoted underneath; replacing it would lose the quote.
 */
export function insertIntoBody(draftHtml: string, reply: string): string {
  const m = /<body[^>]*>/i.exec(draftHtml);
  if (!m) return `${reply}${draftHtml}`;
  const at = m.index + m[0].length;
  return `${draftHtml.slice(0, at)}${reply}${draftHtml.slice(at)}`;
}
