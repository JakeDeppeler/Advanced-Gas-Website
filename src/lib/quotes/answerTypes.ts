import type { LetterBlock } from "@/lib/email/premium";
import { site } from "@/lib/site";
import { builtIn } from "@/lib/email/templates/defaults";
import { optionWords, renderTemplate, type EmailTemplate, type Values } from "@/lib/email/templates/types";

export { optionWords };

/**
 * The one-tap answers at the bottom of a quote follow-up (Jake, 8 Nov: "super
 * clean and simple to click a button to go ahead or decline the job"), and
 * the two emails a tap sends (Jake, 8 Nov: "make them come with an auto email
 * back to me with a pre-written message"):
 *
 *  - to the office, written as the customer's own message: what they chose,
 *    their mobile to ring, and a reply goes straight back to them
 *  - to the customer, from whoever quoted: what happens next, so they know
 *    the ball's with us
 *
 * Pure, so the email and the check script share the wording.
 */
export const ANSWERS = {
  yes: { button: "Let's go ahead", heading: "Great, let's get it booked in.", ask: "Tap below and we'll give you a call to pick a day.", confirm: "Yes, book me in", done: "We'll give you a call shortly to pick a day, and there's an email on its way with what happens next.", note: null },
  question: { button: "I've got a question", heading: "Happy to help.", ask: "Pop your question in below if you like, and we'll give you a call.", confirm: "Call me back", done: "We'll give you a call soon.", note: "Your question (optional)" },
  no: { button: "Not this time", heading: "No worries at all.", ask: "Tap below and we'll close your quote off, so you won't get any more emails about it.", confirm: "Close my quote", done: "Done. Thanks for letting us know, and if anything changes, we're here.", note: "Mind telling us why? (optional)" },
} as const;

export type Answer = keyof typeof ANSWERS;

export const isAnswer = (v: unknown): v is Answer => typeof v === "string" && v in ANSWERS;

/** The quote and the person, as both emails need them. */
export type AnswerContext = {
  customer: string;
  first: string;
  email: string | null;
  /** Their mobile first, else any phone, as ServiceTitan has it. */
  phone: string | null;
  suburb: string | null;
  jobNumber: string | null;
  /** The option the link was in, as ServiceTitan names it ("Reclaim 300L - Plug"). */
  option: string | null;
  /**
   * Every option still open on the quote, with its price. A hot water quote
   * usually has three, and the buttons are for the quote, not one option: with
   * more than one, the office is told them all and to ask which.
   */
  options?: { name: string; total: number | null }[];
  /** The quote's price with GST. */
  total: number | null;
  /** Who quoted it, full name, when ServiceTitan says. */
  quoterName: string | null;
  /** The job in ServiceTitan, for the office's button. */
  jobHref: string | null;
  /** When they tapped, in words ("Sat 8 Nov, 2:14 pm"). */
  when: string;
  note: string | null;
  /** The office number, for the customer's email. */
  officePhone: string;
};

export type AnswerMail = { subject: string; preheader: string; blocks: LetterBlock[] };

const p = (text: string): LetterBlock => ({ kind: "p", text });
const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || null;

/* ------------------------------------------------------------ to the office */

/**
 * The customer's message to the office. Addressed to whoever quoted it, in
 * their words ("Yes please, let's go ahead with the Reclaim 300L"), with the
 * number to ring and a button to the job. A reply goes to them, because the
 * email's reply-to is their address. Signed by the customer, so it reads as
 * what it is: a message from them that the portal wrote down.
 */
export function officeMessage(a: Answer, c: AnswerContext): AnswerMail & { signer: { name: string; role: string; photo: null; contact: { text: string; href: string }[] } } {
  const several = (c.options?.length ?? 0) > 1;
  const what = several ? "quote" : optionWords(c.option) ?? "quote";
  const label = several ? `their quote${c.jobNumber ? ` (job ${c.jobNumber})` : ""}` : `${what}${c.jobNumber ? ` (job ${c.jobNumber})` : ""}`;
  const price = !several && c.total != null ? ` (${money(c.total)})` : "";
  const onIt: LetterBlock[] = several ? [{ kind: "list", items: c.options!.map((o) => `${optionWords(o.name) ?? o.name}${o.total != null ? ` (${money(o.total)})` : ""}`) }] : [];
  const where = c.suburb ? ` at ${c.suburb}` : "";
  const ring = c.phone ? `give me a call on **${c.phone}**` : null;
  const reply = c.email ? "reply to this email" : null;
  const ways = [ring, reply].filter(Boolean).join(", or ");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const said = c.note ? [p(`"${c.note}"`)] : [];
  const subject = a === "yes" ? `${c.customer} wants to go ahead: ${label}` : a === "question" ? `${c.customer} has a question about ${label}` : `${c.customer} isn't going ahead with ${label}`;
  const body: LetterBlock[] =
    a === "yes" ? [
      p(several ? `Yes please, let's go ahead with my quote${where}. The options on it:` : `Yes please, let's go ahead with the **${what}**${price}${where}.`),
      ...onIt,
      ...said,
      p(ways ? `${cap(ways)} to pick a day.` : "I'm ready to pick a day."),
    ] : a === "question" ? [
      p(several ? `I've got a question about my quote${where}${c.note ? ":" : "."}` : `I've got a question about the **${what}**${where}${c.note ? ":" : "."}`),
      ...said,
      p(ways ? `Could you ${ways}?` : "Could you get in touch?"),
    ] : [
      p(several ? `Thanks for the quote${where}, but I'm not going ahead this time.` : `Thanks for the quote on the **${what}**${where}, but I'm not going ahead this time.`),
      ...said,
    ];
  const todo = a === "yes" ? (several ? "Ring them, ask which option, and book it in." : "Ring them and book it in.") : a === "question" ? "Ring them back." : "Their follow-up emails have stopped and the quote is marked lost on the Pipeline. Nothing else to do.";
  return {
    subject,
    preheader: a === "yes" ? `${c.first} tapped "Let's go ahead". ${todo}` : a === "question" ? `${c.first} tapped "I've got a question". ${todo}` : `${c.first} tapped "Not this time".`,
    blocks: [
      p(`Hi ${firstName(c.quoterName) ?? "team"},`),
      ...body,
      ...(c.jobHref && c.jobNumber ? [{ kind: "button", label: `Open job ${c.jobNumber} in ServiceTitan`, href: c.jobHref } as LetterBlock] : []),
      { kind: "note", text: `${todo} Written by the portal when ${c.first} tapped "${ANSWERS[a].button}" in a quote follow-up email, ${c.when}.${c.email ? " Replying to this email replies to them." : ""}` },
    ],
    signer: {
      name: c.customer,
      role: [c.suburb, c.jobNumber ? `job ${c.jobNumber}` : null].filter(Boolean).join(" · ") || "Customer",
      photo: null,
      contact: [...(c.phone ? [{ text: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` }] : []), ...(c.email ? [{ text: c.email, href: `mailto:${c.email}` }] : [])],
    },
  };
}

/* ---------------------------------------------------------- to the customer */

/** What the braces in a reply are filled with. */
export function replyValues(c: AnswerContext): Values {
  // With several options on the quote, the reply doesn't guess which one: "We order your system".
  return { first: c.first, mobile: c.phone, option: (c.options?.length ?? 0) > 1 ? null : optionWords(c.option), note: c.note, phone: c.officePhone };
}

/**
 * What the customer gets back, from whoever quoted them: `tpl` as edited on
 * Marketing › Customer emails, else the standard wording (templates/defaults.ts).
 * "Yes" is the start of the taken-care-of process Jake asked for (8 Nov):
 * what happens from here, step by step, and that there's nothing they need to
 * do. The other two close the loop so a tap never goes into silence.
 */
export function customerReply(a: Answer, c: AnswerContext, tpl?: EmailTemplate): AnswerMail {
  const t = tpl ?? builtIn(`reply.${a}`);
  if (!t) throw new Error(`No standard reply for ${a}`);
  return renderTemplate(t, replyValues(c), { base: site.url });
}
