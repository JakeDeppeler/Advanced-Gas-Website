import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * What Facebook sends us, and what to make of it.
 *
 * Pure in the sense that matters here: it reads a payload and returns what it
 * means, and it never fetches anything or writes anything. Which lets
 * scripts/check-leads.ts run Meta's own documented payload shapes through it
 * without an app, a page or a token — and that is most of what can go wrong.
 * A webhook is a thing nobody can test by hand twice, because the only way to
 * make one fire is to go and enquire on a Facebook page.
 *
 * **Nothing here trusts the body.** A webhook URL is public: anybody who finds
 * it can POST anything to it, and the only thing standing between that and a
 * full-screen alert on the office wall is the signature check below. So the
 * route checks the signature before it looks at the body at all, and every
 * field read out of the body afterwards is read defensively.
 */

/**
 * The Melbourne day an instant falls on. See conversationKey.
 *
 * Melbourne rather than UTC because the thing being grouped is somebody's
 * evening: UTC rolls over at eleven in the morning here, so a conversation
 * that starts before lunch and carries on after it would be two days and two
 * alerts.
 */
export function melbourneDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
}

/**
 * What a message is stored under: the person, and the day they wrote.
 *
 * Doing double duty, on purpose. Facebook retries a delivery it did not get a
 * 200 for, so the row needs a key of Meta's own or the same enquiry lands
 * twice — and separately, Messenger sends one webhook per message, and people
 * type the way they talk: "hi", then "do you do evaporative", then "in
 * Pakenham". Three deliveries, one enquiry, and three full-screen alerts would
 * teach the room to ignore the board by lunchtime.
 *
 * Keyed on the sender and the day rather than on the message id, both are
 * answered by the unique index alone: the retry and the rest of the
 * conversation resolve to a row that already exists and nothing happens. The
 * same person enquiring again next week is a new day and a new alert, which is
 * right — that is a new enquiry.
 */
export const conversationKey = (senderId: string, at: string) => `fb-msg:${senderId}:${melbourneDay(at)}`;

/** The two things worth waking the room for. */
export type MetaEvent =
  | { kind: "leadgen"; id: string; leadgenId: string; formId: string | null; pageId: string | null; at: string }
  | { kind: "message"; id: string; mid: string; senderId: string; pageId: string | null; text: string; at: string };

/**
 * Is this really from Meta?
 *
 * The signature is over the **raw body bytes**, so the route must hand this the
 * text it received rather than a re-serialised object — `JSON.parse` followed
 * by `JSON.stringify` changes key order and whitespace and will not verify.
 *
 * Compared in constant time. The comparison is of two HMACs, so a timing leak
 * is not the end of the world, but a webhook is exactly the kind of endpoint
 * somebody gets to retry a few million times.
 */
export function signatureOk(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const sent = header.startsWith("sha256=") ? header.slice(7) : header;
  if (!/^[0-9a-f]+$/i.test(sent)) return false;
  const mine = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(mine, "hex");
  const b = Buffer.from(sent.toLowerCase(), "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

/**
 * The subscription handshake: Meta calls the URL with a challenge and expects
 * it echoed back, but only if the token it was given matches the one set here.
 * Returns the string to answer with, or null to refuse.
 */
export function verifyChallenge(params: URLSearchParams, expected: string): string | null {
  if (!expected) return null;
  if (params.get("hub.mode") !== "subscribe") return null;
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (!token || !challenge || token !== expected) return null;
  return challenge;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Meta's seconds since the epoch, as an ISO string.
 *
 * `entry.time` and `messaging.timestamp` are milliseconds; `value.created_time`
 * on a lead is seconds. Both arrive as bare numbers with nothing to tell them
 * apart but their size, so this reads anything smaller than a year 2100 in
 * seconds as seconds. A time that cannot be read falls back to now, because the
 * time is decoration on this alert and the enquiry is not.
 */
export function metaTime(v: unknown, now = Date.now()): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return new Date(now).toISOString();
  const ms = n < 4_102_444_800 ? n * 1000 : n;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? new Date(now).toISOString() : d.toISOString();
}

/**
 * Everything in one delivery worth acting on, in the order it arrived.
 *
 * Meta batches: one POST can carry several entries, each with several changes
 * or several messages, and it can carry kinds nobody here asked for. Anything
 * unrecognised is dropped silently rather than guessed at.
 *
 * Three sorts of message are dropped on purpose:
 *  - `is_echo` — the page's own replies, coming back as events. Alerting on
 *    those would ring the office every time the office answered somebody.
 *  - deliveries and read receipts, which carry no message at all.
 *  - a message from the page's own id, which is the same thing by another
 *    route.
 */
export function parseMetaBody(body: unknown, now = Date.now()): MetaEvent[] {
  const root = obj(body);
  if (!root || root.object !== "page") return [];
  const out: MetaEvent[] = [];

  for (const e of arr(root.entry)) {
    const entry = obj(e);
    if (!entry) continue;
    const pageId = str(entry.id);
    const entryAt = metaTime(entry.time, now);

    for (const c of arr(entry.changes)) {
      const change = obj(c);
      if (!change || change.field !== "leadgen") continue;
      const value = obj(change.value);
      const leadgenId = value ? str(value.leadgen_id) : null;
      if (!leadgenId) continue;
      out.push({
        kind: "leadgen",
        // Meta retries a delivery it did not get a 200 for, so every event
        // carries the id the row will be keyed on and a repeat writes nothing.
        id: `fb-lead:${leadgenId}`,
        leadgenId,
        formId: value ? str(value.form_id) : null,
        pageId: (value ? str(value.page_id) : null) ?? pageId,
        at: value && value.created_time != null ? metaTime(value.created_time, now) : entryAt,
      });
    }

    for (const m of arr(entry.messaging)) {
      const msg = obj(m);
      if (!msg) continue;
      const message = obj(msg.message);
      if (!message || message.is_echo === true) continue;
      const mid = str(message.mid);
      const senderId = str(obj(msg.sender)?.id);
      if (!mid || !senderId || senderId === pageId) continue;
      const at = metaTime(msg.timestamp, now);
      out.push({
        kind: "message",
        // The conversation, not the message. See conversationKey.
        id: conversationKey(senderId, at),
        mid,
        senderId,
        pageId,
        // An attachment with no words is still somebody starting a
        // conversation — a photo of a rusted heater is an enquiry.
        text: str(message.text) ?? (arr(message.attachments).length ? "(sent a photo or attachment)" : ""),
        at,
      });
    }
  }

  return out;
}

/** One answer on a lead form, as the Graph API returns it. */
export type MetaField = { name?: unknown; values?: unknown };

/** The parts of a lead form we know what to do with. */
export type MetaLeadFields = {
  name: string | null;
  phone: string | null;
  email: string | null;
  suburb: string | null;
  postcode: string | null;
  /** Everything else they answered, as one line. */
  summary: string | null;
};

const FIRST = new Set(["first_name", "given_name"]);
const LAST = new Set(["last_name", "family_name", "surname"]);

/**
 * A lead form's answers, sorted into the columns a lead has.
 *
 * Meta's field names are only standard for the questions Meta wrote. Anything
 * the office added to the form comes back under whatever it was called, which
 * is why the leftovers are kept rather than dropped: "which brand are you
 * after" is the most useful thing on some of these forms and it will never
 * have a column of its own.
 *
 * The label is kept with the answer in that line, because an answer on its own
 * is unreadable — "Within a week" means nothing without the question.
 */
export function leadFromFields(fields: unknown): MetaLeadFields {
  let first: string | null = null;
  let last: string | null = null;
  const out: MetaLeadFields = { name: null, phone: null, email: null, suburb: null, postcode: null, summary: null };
  const extra: string[] = [];

  for (const f of arr(fields)) {
    const field = obj(f);
    if (!field) continue;
    const name = (str(field.name) ?? "").toLowerCase();
    const value = arr(field.values).map((v) => str(v)).filter(Boolean).join(", ");
    if (!name || !value) continue;

    if (name === "full_name") out.name = value;
    else if (FIRST.has(name)) first = value;
    else if (LAST.has(name)) last = value;
    else if (name === "phone_number" || name === "phone") out.phone = value;
    else if (name === "email") out.email = value;
    else if (name === "city" || name === "suburb") out.suburb = value;
    else if (name === "post_code" || name === "postcode" || name === "zip_code") out.postcode = value;
    else extra.push(`${label(name)}: ${value}`);
  }

  out.name = out.name ?? (str([first, last].filter(Boolean).join(" ")));
  out.summary = extra.length ? extra.join(" · ") : null;
  return out;
}

/** "which_brand?" → "Which brand" — a question as a person wrote it, roughly. */
function label(name: string): string {
  const words = name.replace(/[_?]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name;
}
