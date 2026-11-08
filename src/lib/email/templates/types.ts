import type { LetterBlock } from "@/lib/email/premium";
import { EMAIL_PHOTOS } from "./photos";

/**
 * Customer emails as data the office can edit (Jake, 8 Nov: "can we build in
 * the portal a way to build an email template and then edit the templates we
 * have"). The page is Marketing › Customer emails (/portal/emails).
 *
 * A template is a subject, a preview line, and blocks: paragraphs, lists,
 * photos, figures, and the answer buttons. Words in braces are filled in from
 * the quote when it's sent ({first}, {phone}). The standard wording lives in
 * defaults.ts; an edited one is a row in portal_email_templates, and "back to
 * the standard wording" deletes the row.
 *
 * Pure: the editor's live preview in the browser and the sender on the server
 * render through the same functions, so what the office sees is what goes.
 */

export type QuoteKind = "heat-pump" | "split" | "general";

export const SERIES: { k: QuoteKind; label: string; what: string }[] = [
  { k: "heat-pump", label: "Hot water", what: "a quote with a heat pump on it" },
  { k: "split", label: "Split systems", what: "a split system or multi-head quote" },
  { k: "general", label: "Everything else", what: "any other quote" },
];

export type TplBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  /** `width`: 560 across the email, or narrower for a tall photo so it fits on a screen. */
  | { kind: "photo"; src: string; alt: string; width?: number }
  | { kind: "thumbs"; items: { src: string; alt: string; caption: string }[] }
  | { kind: "stats"; items: { value: string; label: string }[]; note?: string }
  /** The three one-tap answers (Let's go ahead / I've got a question / Not this time), linked to the quote when it's sent. */
  | { kind: "answers" };

export type BlockKind = TplBlock["kind"];

export const BLOCK_KINDS: { k: BlockKind; label: string; what: string }[] = [
  { k: "p", label: "Paragraph", what: "Words. **Two stars** either side makes it bold; a new line starts a new line." },
  { k: "list", label: "Bullet list", what: "One point per line." },
  { k: "photo", label: "Photo", what: "One photo across the email, or narrower for a tall one." },
  { k: "thumbs", label: "Photos side by side", what: "Two or three small photos, each with a name under it." },
  { k: "stats", label: "Figures", what: "Two to four big numbers, each with what it means underneath." },
  { k: "answers", label: "Answer buttons", what: "Let's go ahead · I've got a question · Not this time. Each opens a page to confirm, then you get an email and so do they." },
];

export type TplGroup = "followup" | "reply" | "sold";

export type SignerChoice = "quoter" | "jake" | "dean" | "team";
export const SIGNER_CHOICES: { k: SignerChoice; label: string }[] = [
  { k: "quoter", label: "Whoever quoted it" },
  { k: "jake", label: "Jake Deppeler" },
  { k: "dean", label: "Dean Winbanks" },
  { k: "team", label: "The team (no photo)" },
];

export type EmailTemplate = {
  key: string;
  group: TplGroup;
  /** What the office calls it on the page: "Day 2: checking in". */
  name: string;
  /** A follow-up's series and the day after the quote it goes; null for the rest. */
  series: QuoteKind | null;
  day: number | null;
  /** Off: a follow-up step that's skipped. Replies and the sold email are always on. */
  active: boolean;
  subject: string;
  preheader: string;
  blocks: TplBlock[];
  signer: SignerChoice;
  /** Has a standard version to go back to. False for an email added on the page. */
  builtIn: boolean;
};

export const GROUPS: Record<TplGroup, { label: string; when: string }> = {
  followup: { label: "Quote follow-ups", when: "Days after the quote, until they answer or it sells" },
  reply: { label: "When they tap a button", when: "Straight after they confirm on the page the button opens" },
  sold: { label: "After the sale", when: "When a quote is sold in ServiceTitan without them tapping “Let's go ahead”" },
};

/* -------------------------------------------------------------- the braces */

export type Placeholder = { key: string; what: string; sample: string };

const P = {
  first: { key: "first", what: "their first name", sample: "Sarah" },
  phone: { key: "phone", what: "our phone number", sample: "(03) 5947 8000" },
  option: { key: "option", what: "what was quoted, the first option (“Reclaim 300L”)", sample: "Reclaim 300L" },
  mobile: { key: "mobile", what: "their mobile, else any number we have for them", sample: "0412 345 678" },
};

export const PLACEHOLDERS: Record<TplGroup, Placeholder[]> = {
  followup: [
    P.first,
    { key: "quoter", what: "who quoted it, first name", sample: "Jake" },
    { key: "since_visit", what: "“since I was out”, or “since Jye was out” when someone else quoted and the email is signed by someone else", sample: "since I was out" },
    P.phone,
    P.option,
    { key: "rating", what: "our Google rating, as the website shows it", sample: "4.8" },
    { key: "review_count", what: "how many Google reviews", sample: "26" },
  ],
  reply: [P.first, P.mobile, P.option, { key: "note", what: "what they typed on the page, if anything", sample: "Does the 300 litre fit where the old gas unit is? It's a tight spot beside the meter box." }, P.phone],
  sold: [P.first, P.mobile, P.option, P.phone],
};

export type Values = Record<string, string | null | undefined>;

export const sampleValues = (g: TplGroup): Values => Object.fromEntries(PLACEHOLDERS[g].map((p) => [p.key, p.sample]));

/** {first}, or {mobile|the number we have}: the words after the bar are used when we don't have it. */
const TOKEN = /\{([a-z_]+)(?:\|([^{}]*))?\}/g;

/** Spaces left behind by an empty brace, and a space before punctuation. */
const tidy = (s: string) => s.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([,.;:!?])/g, "$1").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim();

/**
 * The words with the braces filled in. `empty` when the words had braces and
 * every one of them came out blank with nothing after a bar: a paragraph that
 * is only `"{note}"` is left out when they didn't type anything, rather than
 * going as a pair of quote marks.
 */
export function fill(text: string, v: Values): { text: string; empty: boolean } {
  let any = false, got = false;
  const out = text.replace(TOKEN, (_m, k: string, fb: string | undefined) => {
    any = true;
    const val = (v[k] ?? "").toString().trim();
    if (val) { got = true; return val; }
    if (fb !== undefined && fb.trim()) { got = true; return fb.trim(); }
    return "";
  });
  return { text: tidy(out), empty: any && !got };
}

/** Every word in braces the template uses that this kind of email can't fill. */
export function unknownPlaceholders(t: Pick<EmailTemplate, "group" | "subject" | "preheader" | "blocks">): string[] {
  const known = new Set(PLACEHOLDERS[t.group].map((p) => p.key));
  const bad = new Set<string>();
  for (const s of textsOf(t)) for (const m of s.matchAll(TOKEN)) if (!known.has(m[1])) bad.add(m[1]);
  // A brace that isn't a placeholder at all ("{ first }", "{First}") would go out as it's typed.
  for (const s of textsOf(t)) for (const m of s.matchAll(/\{[^{}]*\}/g)) if (!/^\{[a-z_]+(\|[^{}]*)?\}$/.test(m[0])) bad.add(m[0].replace(/^\{|\}$/g, ""));
  return [...bad];
}

function textsOf(t: Pick<EmailTemplate, "subject" | "preheader" | "blocks">): string[] {
  const out = [t.subject, t.preheader];
  for (const b of t.blocks) {
    if (b.kind === "p") out.push(b.text);
    else if (b.kind === "list") out.push(...b.items);
    else if (b.kind === "photo") out.push(b.alt);
    else if (b.kind === "thumbs") out.push(...b.items.flatMap((i) => [i.alt, i.caption]));
    else if (b.kind === "stats") out.push(...b.items.flatMap((i) => [i.value, i.label]), b.note ?? "");
  }
  return out;
}

/* ------------------------------------------------------------- the photos */

/** A photo uploaded on the page, served by /api/email-image from the email-images bucket. */
export const UPLOADED = /^\/api\/email-image\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/**
 * Where an email's photo is fetched from. The stock ones are JPGs in
 * public/email already; an uploaded one goes through Next's image optimiser,
 * so a 6MB phone photo goes out as a JPG the width of the email, and the
 * inline-image step (lib/email/inline.ts) can attach it.
 */
export function photoUrl(src: string, base: string, width = 560): string {
  if (!UPLOADED.test(src)) return src;
  return `${base.replace(/\/$/, "")}/_next/image?url=${encodeURIComponent(src)}&w=${width <= 420 ? 640 : 1200}&q=72`;
}

const photoOk = (src: unknown): src is string => typeof src === "string" && (UPLOADED.test(src) || EMAIL_PHOTOS.some((p) => p.src === src));

/* ------------------------------------------------------------- rendering */

export type AnswerButton = { label: string; href: string; primary?: boolean };
export type Rendered = { subject: string; preheader: string; blocks: LetterBlock[] };

/**
 * The template as the letter layout's blocks, with the braces filled in.
 * `answers` are the three buttons with their links for this quote; without
 * them (a reply, the sold email) the answer block is left out.
 */
export function renderTemplate(t: EmailTemplate, v: Values, o: { base: string; answers?: AnswerButton[] }): Rendered {
  const line = (s: string) => fill(s, v).text.replace(/\s+/g, " ").trim();
  const blocks: LetterBlock[] = [];
  for (const b of t.blocks) {
    if (b.kind === "p") {
      const f = fill(b.text, v);
      if (!f.empty && f.text) blocks.push({ kind: "p", text: f.text });
    } else if (b.kind === "list") {
      const items = b.items.map((i) => fill(i, v)).filter((f) => !f.empty && f.text).map((f) => f.text);
      if (items.length) blocks.push({ kind: "list", items });
    } else if (b.kind === "photo") {
      if (photoOk(b.src)) blocks.push({ kind: "photo", src: photoUrl(b.src, o.base, b.width), alt: line(b.alt), ...(b.width ? { width: b.width } : {}) });
    } else if (b.kind === "thumbs") {
      const items = b.items.filter((i) => photoOk(i.src)).map((i) => ({ src: photoUrl(i.src, o.base, 300), alt: line(i.alt), caption: line(i.caption) }));
      if (items.length) blocks.push({ kind: "thumbs", items });
    } else if (b.kind === "stats") {
      const items = b.items.map((i) => ({ value: line(i.value), label: line(i.label) })).filter((i) => i.value);
      const note = b.note ? fill(b.note, v) : null;
      if (items.length) blocks.push({ kind: "stats", items, ...(note && !note.empty && note.text ? { note: note.text } : {}) });
    } else if (b.kind === "answers") {
      if (o.answers?.length) blocks.push({ kind: "choices", items: o.answers });
    }
  }
  return { subject: line(t.subject), preheader: line(t.preheader), blocks };
}

/* ----------------------------------------------------- what's allowed in */

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").slice(0, max) : "");
const LIMITS = { name: 80, subject: 200, preheader: 200, p: 4000, item: 1000, items: 20, blocks: 40, alt: 200, caption: 60, value: 24, label: 140, note: 300 };

function blockFrom(raw: unknown): TplBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  switch (b.kind) {
    case "p": {
      const text = str(b.text, LIMITS.p);
      return text.trim() ? { kind: "p", text } : null;
    }
    case "list": {
      const items = (Array.isArray(b.items) ? b.items : []).map((i) => str(i, LIMITS.item)).filter((i) => i.trim()).slice(0, LIMITS.items);
      return items.length ? { kind: "list", items } : null;
    }
    case "photo": {
      if (!photoOk(b.src)) return null;
      const width = Number(b.width);
      return { kind: "photo", src: b.src, alt: str(b.alt, LIMITS.alt), ...(Number.isFinite(width) && width >= 200 && width < 560 ? { width: Math.round(width) } : {}) };
    }
    case "thumbs": {
      const items = (Array.isArray(b.items) ? b.items : []).filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && photoOk((i as Record<string, unknown>).src))
        .slice(0, 3).map((i) => ({ src: i.src as string, alt: str(i.alt, LIMITS.alt), caption: str(i.caption, LIMITS.caption) }));
      return items.length ? { kind: "thumbs", items } : null;
    }
    case "stats": {
      const items = (Array.isArray(b.items) ? b.items : []).filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
        .map((i) => ({ value: str(i.value, LIMITS.value), label: str(i.label, LIMITS.label) })).filter((i) => i.value.trim()).slice(0, 4);
      const note = str(b.note, LIMITS.note);
      return items.length ? { kind: "stats", items, ...(note.trim() ? { note } : {}) } : null;
    }
    case "answers":
      return { kind: "answers" };
    default:
      return null;
  }
}

/**
 * A template from a database row or from the page, made safe: known blocks
 * only, every string clipped, a photo only from our own set or our uploads.
 * What it is (its key, kind and whether it's built in) comes from `base`,
 * never from what was sent.
 */
export function templateFrom(raw: unknown, base: EmailTemplate): EmailTemplate {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const blocks = (Array.isArray(o.blocks) ? o.blocks : []).map(blockFrom).filter((b): b is TplBlock => !!b).slice(0, LIMITS.blocks);
  const day = Number(o.day);
  const signer = SIGNER_CHOICES.some((s) => s.k === o.signer) ? (o.signer as SignerChoice) : base.signer;
  return {
    ...base,
    name: str(o.name, LIMITS.name).trim() || base.name,
    subject: str(o.subject, LIMITS.subject),
    preheader: str(o.preheader, LIMITS.preheader),
    blocks,
    signer,
    day: base.group === "followup" ? (Number.isInteger(day) && day >= 1 && day <= 60 ? day : base.day) : null,
    active: base.group === "followup" ? o.active !== false : true,
  };
}

/** What stops a template being saved, in words. Empty when it can be. */
export function problems(t: EmailTemplate, siblings: EmailTemplate[] = []): string[] {
  const out: string[] = [];
  if (!t.subject.trim()) out.push("It needs a subject.");
  if (!t.blocks.some((b) => b.kind === "p")) out.push("It needs at least one paragraph.");
  const bad = unknownPlaceholders(t);
  if (bad.length) out.push(`These aren't words we can fill in: ${bad.map((b) => `{${b}}`).join(", ")}. The ones this email can use are listed beside it.`);
  if (t.group === "followup" && t.day != null && siblings.some((s) => s.key !== t.key && s.series === t.series && s.active && t.active && s.day === t.day)) out.push(`Another email in this series already goes on day ${t.day}.`);
  return out;
}

/** "Reclaim 300L - Plug" → "Reclaim 300L": the option, without the fitting code the office puts after it. */
export const optionWords = (o: string | null | undefined) => (o ?? "").replace(/\s+-\s+(plug|elec|electric|hardwired|standard|b2b|back to back).*$/i, "").trim() || null;
