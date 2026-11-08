import "server-only";
import { sendEmail, type ResendMessage } from "@/lib/email/send";
import { withInlineImages } from "@/lib/email/inline";
import { site } from "@/lib/site";
import { emailContext } from "@/lib/email/context";
import { fromBox, OWNER_EMAIL } from "@/lib/email/from";
import { letterHtml, letterText } from "@/lib/email/premium";
import { SIGNERS } from "@/lib/email/team";
import { SERIES_DAYS, followUpEmail, quoteKind, type FollowUpInput } from "@/lib/quotes/followUpContent";
import { ANSWERS, optionWords, type Answer } from "@/lib/quotes/answerTypes";
import { soldEmail } from "@/lib/quotes/journeyContent";
import { reviewEmail, reviewLink } from "@/lib/reviews/requestTypes";
import { loadReviewSettings, sampleJobPhoto } from "@/lib/reviews/requests";
import { answerEmails, answerUrl, SAMPLE_QUOTE } from "@/lib/quotes/answers";

/**
 * Customer emails sent to the owner to look at in a real inbox before they
 * go to anyone else (Jake, 7 Nov: "can we test send these to me via email").
 *
 * Only ever to PREVIEW_TO: nothing here takes an address from a request.
 * The review email is the real one, built by the same code customers get.
 * The quote follow-ups use the real wording (lib/quotes/followUpContent.ts)
 * against a made-up quote, since the sending side isn't built yet; so do the
 * two emails a tapped button sends, and the "what happens next" email for a
 * sale made on the phone (lib/quotes/journeyContent.ts).
 */

export const PREVIEW_TO = OWNER_EMAIL;
const REPLY_TO = "admin@advancedgas.com.au";

/** The groups a preview run can be limited to (?only=answers,journey). */
export const PREVIEW_SETS = ["follow-ups", "answers", "journey", "review"] as const;
export type PreviewSet = (typeof PREVIEW_SETS)[number];

const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const withBanner = (html: string, note: string) =>
  html.replace(/<body[^>]*>/, (b) => `${b}<div style="margin:16px 18px 0;padding:10px 14px;background:#fff4d6;border-radius:10px;font:13px/1.5 Arial,sans-serif;color:#7a5200">${esc(note)}</div>`);

type Mail = { subject: string; html: string; text: string };

export function quoteEmailPreviews(): Mail[] {
  const ctx = emailContext();
  // Estimate 0: the buttons open the real answer pages, which record nothing for it.
  const base: Omit<FollowUpInput, "options"> = {
    first: "Sarah", quoter: "Jake", quoterSigns: true, phone: site.phone,
    answers: { yes: answerUrl(0, "yes"), question: answerUrl(0, "question"), no: answerUrl(0, "no") },
  };
  const hp = ["Reclaim 300L - Plug", "Reclaim Split SS 315L V2", "IStore 270L - Plug"];
  const sp = ["Mitsubishi Electric 3.5kW Split System - Back to Back", "Kaden 3.5kW Split System - Back to Back"];
  const topics = { "heat-pump": ["check-in", "savings", "brands and work", "the closer"], split: ["check-in", "brands and work", "running costs", "the closer"] } as const;
  const runs = (["heat-pump", "split"] as const).flatMap((kind) =>
    SERIES_DAYS[kind].map((day, n) => ({ options: kind === "heat-pump" ? hp : sp, step: n + 1, label: `${kind === "heat-pump" ? "Heat pump" : "Split system"} ${n + 1} of ${SERIES_DAYS[kind].length}, day ${day}, ${topics[kind][n]}` })));
  const note = "Preview of a quote follow-up. Sarah and her quote are made up, nothing has gone to a customer, and the buttons at the bottom open the real pages: tapping one sends you both emails a customer's tap would send.";
  return runs.map((r) => {
    const e = followUpEmail(quoteKind(r.options), r.step, { ...base, options: r.options });
    const mail = { base: ctx.base, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer: SIGNERS.jake };
    return { subject: `[Preview: ${r.label}] ${e.subject}`, html: withBanner(letterHtml(mail), note), text: `${note}\n\n${letterText(mail)}` };
  });
}

/** The two emails each button sends, for the made-up quote: six in all, each saying which side gets it. */
export function answerEmailPreviews(): ResendMessage[] {
  const notes: Record<Answer, string> = { yes: "They tapped \"Let's go ahead\".", question: "They tapped \"I've got a question\" and typed one.", no: "They tapped \"Not this time\" and gave a reason." };
  const typed: Record<Answer, string | null> = { yes: null, question: "Does the 300 litre fit where the old gas unit is? It's a tight spot beside the meter box.", no: "We've decided to repair the old one for now." };
  return (Object.keys(ANSWERS) as Answer[]).flatMap((a) => {
    const m = answerEmails(a, SAMPLE_QUOTE, typed[a], { preview: true });
    const office = `Preview of the message you get when a customer taps a button in a follow-up. ${notes[a]} Sarah is made up. On a real one, Reply goes to the customer.`;
    const cust = `Preview of what the customer gets back after tapping. ${notes[a]} On a real one it goes to their email address, from whoever quoted them.`;
    return [
      { ...m.office, html: withBanner(m.office.html ?? "", office), text: `${office}\n\n${m.office.text ?? ""}` },
      ...(m.customer ? [{ ...m.customer, html: withBanner(m.customer.html ?? "", cust), text: `${cust}\n\n${m.customer.text ?? ""}` }] : []),
    ];
  });
}

/** Thanks for going ahead, for a sale made on the phone: wording only, until the trigger that sends it is built. */
export function journeyEmailPreviews(): Mail[] {
  const ctx = emailContext();
  const what = optionWords(SAMPLE_QUOTE.option);
  const sold = soldEmail({ first: "Sarah", what, phone: SAMPLE_QUOTE.phone, officePhone: site.phone });
  const build = (e: { subject: string; preheader: string; blocks: typeof sold.blocks }, label: string, note: string): Mail => {
    const mail = { base: ctx.base, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer: SIGNERS.jake };
    return { subject: `[Preview: ${label}] ${e.subject}`, html: withBanner(letterHtml(mail), note), text: `${note}\n\n${letterText(mail)}` };
  };
  return [
    build(sold, "sold over the phone", "Preview of the email a customer would get when their quote is marked sold in ServiceTitan without tapping a button (sold on the phone or in person). Not sending yet: it needs the sold trigger, which comes once the words are right."),
  ];
}

export async function sendCustomerEmailPreviews(only: PreviewSet[] = [...PREVIEW_SETS]): Promise<{ sent: string[]; failed: { subject: string; error: string }[] }> {
  const want = (s: PreviewSet) => only.includes(s);
  const mails: Array<ResendMessage & { kind: "other" | "review-request" | "quote-answer" | "quote-answer-reply" }> = [];
  const plain = (m: Mail, box: string, kind: "other" | "review-request") => ({ from: fromBox(box), to: [PREVIEW_TO], reply_to: REPLY_TO, subject: m.subject, html: m.html, text: m.text, kind });

  if (want("follow-ups")) mails.push(...quoteEmailPreviews().map((m) => plain(m, "quotes", "other")));
  if (want("answers")) mails.push(...answerEmailPreviews().map((m) => ({ ...m, kind: m.subject.includes("what you get") ? "quote-answer" as const : "quote-answer-reply" as const })));
  if (want("journey")) mails.push(...journeyEmailPreviews().map((m) => plain(m, "quotes", "other")));
  if (want("review")) {
    const s = await loadReviewSettings();
    const link = reviewLink(s, process.env.GOOGLE_PLACE_ID) ?? site.social.google;
    // Jye has a headshot, so the preview shows the photo version; a tech without one gets their initials.
    const sample = await sampleJobPhoto();
    const review = reviewEmail(s, { customer: "Sarah Jones", techs: [sample?.tech ?? "Jye Stephens"], jobType: sample?.jobType ?? "Service - Split System", suburb: "Berwick", href: link, photo: sample?.photo }, emailContext());
    const reviewNote = `Preview of the Google review email, exactly as customers get it (made-up customer). ${sample ? "The photo is from a real recent install, picked because it shows the whole system; each customer gets their own job's. " : "None of the recent jobs had a photo of the whole system, so this shows the stock one, as a customer would get. "}${s.link || process.env.GOOGLE_PLACE_ID ? "The button goes to your review link." : "No review link is saved yet, so the button goes to your Google profile for now."}`;
    mails.push(plain({ subject: `[Preview] ${review.subject}`, html: withBanner(review.html, reviewNote), text: `${reviewNote}\n\n${review.text}` }, "reviews", "review-request"));
  }

  const sent: string[] = [];
  const failed: { subject: string; error: string }[] = [];
  for (const { kind, ...m } of mails) {
    // Only ever to the owner, whatever a preview builder put in `to`.
    const out = await sendEmail(kind, await withInlineImages({ ...m, to: [PREVIEW_TO] }), { preview: true });
    if (out.ok) sent.push(m.subject);
    else failed.push({ subject: m.subject, error: out.error });
  }
  return { sent, failed };
}
