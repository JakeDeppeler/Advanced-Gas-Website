/**
 * The quote follow-up emails, by what was quoted. The words are templates
 * now (lib/email/templates): the standard wording is in defaults.ts, and the
 * office edits it on Marketing › Customer emails. This picks the series for
 * a quote and fills a template in for one customer.
 *
 * Pure, for the check script and the previews.
 */

import { RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import { site } from "@/lib/site";
import { ANSWERS } from "./answerTypes";
import { builtIn, followUpKey, STANDARD_DAYS } from "@/lib/email/templates/defaults";
import { optionWords, renderTemplate, type AnswerButton, type EmailTemplate, type QuoteKind, type Rendered, type Values } from "@/lib/email/templates/types";

export type { QuoteKind } from "@/lib/email/templates/types";

export type FollowUpInput = {
  first: string;
  /** Who quoted it, first name. */
  quoter: string;
  /** True when the person signing is the one who quoted: "since I was out". */
  quoterSigns: boolean;
  /** The option names on the quote, as ServiceTitan has them ("Reclaim 300L - Plug"). */
  options: string[];
  phone: string;
  /** The one-tap answer links (answers.ts), signed for this quote. */
  answers: { yes: string; question: string; no: string };
};

export type FollowUpEmail = Rendered;

/** Days after the quote each standard email goes. Its length is how many there are as standard; the page can add more. */
export const SERIES_DAYS: Record<QuoteKind, number[]> = STANDARD_DAYS;

export function quoteKind(options: string[]): QuoteKind {
  const t = options.join(" ").toLowerCase();
  if (/heat ?pump|hot water|reclaim|istore|thermann|panasonic split|\b\d{3} ?l\b/.test(t)) return "heat-pump";
  if (/split system|multi ?head|back to back|wall split|cassette|floor console/.test(t)) return "split";
  return "general";
}

/** What the braces in a follow-up are filled with, for this customer. */
export function followUpValues(i: FollowUpInput): Values {
  return {
    first: i.first,
    quoter: i.quoter,
    since_visit: i.quoterSigns ? "since I was out" : `since ${i.quoter} was out`,
    phone: i.phone,
    option: optionWords(i.options[0]),
    rating: RATING_TEXT,
    review_count: String(RATING_SUMMARY.count),
  };
}

/** The three buttons, with this quote's links. */
export const answerButtons = (links: FollowUpInput["answers"]): AnswerButton[] => [
  { label: ANSWERS.yes.button, href: links.yes, primary: true },
  { label: ANSWERS.question.button, href: links.question },
  { label: ANSWERS.no.button, href: links.no },
];

/** One follow-up for one customer: `tpl` as edited on the page, else the standard wording for that step. */
export function followUpEmail(kind: QuoteKind, step: number, i: FollowUpInput, tpl?: EmailTemplate, base: string = site.url): FollowUpEmail {
  const t = tpl ?? builtIn(followUpKey(kind, step));
  if (!t) throw new Error(`No standard follow-up ${kind} ${step}`);
  return renderTemplate(t, followUpValues(i), { base, answers: answerButtons(i.answers) });
}
