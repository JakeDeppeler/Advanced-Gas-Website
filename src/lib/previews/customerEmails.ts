import "server-only";
import { sendEmail } from "@/lib/email/send";
import { withInlineImages } from "@/lib/email/inline";
import { site } from "@/lib/site";
import { emailContext } from "@/lib/email/context";
import { letterHtml, letterText } from "@/lib/email/premium";
import { SIGNERS } from "@/lib/email/team";
import { followUpEmail, quoteKind, type FollowUpInput } from "@/lib/quotes/followUpContent";
import { reviewEmail, reviewLink } from "@/lib/reviews/requestTypes";
import { loadReviewSettings, sampleJobPhoto } from "@/lib/reviews/requests";

/**
 * Customer emails sent to the owner to look at in a real inbox before they
 * go to anyone else (Jake, 7 Nov: "can we test send these to me via email").
 *
 * Only ever to PREVIEW_TO: nothing here takes an address from a request.
 * The review email is the real one, built by the same code customers get.
 * The quote follow-ups use the real wording (lib/quotes/followUpContent.ts)
 * against a made-up quote, since the sending side isn't built yet.
 */

export const PREVIEW_TO = "jake@advancedgas.com.au";
const REPLY_TO = "admin@advancedgas.com.au";

const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const withBanner = (html: string, note: string) =>
  html.replace(/<body[^>]*>/, (b) => `${b}<div style="max-width:600px;margin:16px auto 0;padding:10px 14px;background:#fff4d6;border-radius:10px;font:13px/1.5 Arial,sans-serif;color:#7a5200">${esc(note)}</div>`);

export function quoteEmailPreviews(): { subject: string; html: string; text: string }[] {
  const ctx = emailContext();
  const base: Omit<FollowUpInput, "options"> = { first: "Sarah", quoter: "Jake", quoterSigns: true, phone: site.phone };
  const hp = ["Reclaim Split SS 315L V2", "IStore 270L - Plug", "Thermann 285L - Plug"];
  const sp = ["Mitsubishi Electric 3.5kW Split System - Back to Back", "Kaden 3.5kW Split System - Back to Back"];
  const runs: { options: string[]; step: 1 | 2 | 3; label: string }[] = [
    { options: hp, step: 1, label: "Heat pump 1 of 3, day 2" },
    { options: hp, step: 2, label: "Heat pump 2 of 3, day 6" },
    { options: hp, step: 3, label: "Heat pump 3 of 3, day 13" },
    { options: sp, step: 1, label: "Split system 1 of 3, day 2" },
    { options: sp, step: 2, label: "Split system 2 of 3, day 6" },
  ];
  const note = "Preview of a quote follow-up, written as a personal check-in for what's on the quote. Sarah and her quote are made up. Nothing has gone to a customer.";
  return runs.map((r) => {
    const e = followUpEmail(quoteKind(r.options), r.step, { ...base, options: r.options });
    const mail = { base: ctx.base, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer: SIGNERS.jake };
    return { subject: `[Preview: ${r.label}] ${e.subject}`, html: withBanner(letterHtml(mail), note), text: `${note}\n\n${letterText(mail)}` };
  });
}

export async function sendCustomerEmailPreviews(): Promise<{ sent: string[]; failed: { subject: string; error: string }[] }> {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const domain = ((raw.match(/<([^>]+)>/)?.[1] ?? raw).split("@")[1] ?? "").toLowerCase();
  const own = /^(?:[a-z0-9-]+\.)*advancedgas\.com\.au$/.test(domain);
  const fromAs = (box: string) => (own ? `${site.name} <${box}@${domain}>` : raw || "Advanced Gas Website <onboarding@resend.dev>");

  const s = await loadReviewSettings();
  const link = reviewLink(s, process.env.GOOGLE_PLACE_ID) ?? site.social.google;
  // Jye has a headshot, so the preview shows the photo version; a tech without one gets their initials.
  const sample = await sampleJobPhoto();
  const review = reviewEmail(s, { customer: "Sarah Jones", techs: [sample?.tech ?? "Jye Stephens"], jobType: sample?.jobType ?? "Service - Split System", suburb: "Berwick", href: link, photo: sample?.photo }, emailContext());
  const reviewNote = `Preview of the Google review email, exactly as customers get it (made-up customer). ${sample ? "The photo is the newest one the tech took on a real recent install; each customer gets their own job's. " : "No recent job had a photo, so this shows the stock one. "}${s.link || process.env.GOOGLE_PLACE_ID ? "The button goes to your review link." : "No review link is saved yet, so the button goes to your Google profile for now."}`;

  const mails = [
    ...quoteEmailPreviews().map((m) => ({ ...m, from: fromAs("quotes"), kind: "other" as const })),
    { subject: `[Preview] ${review.subject}`, html: withBanner(review.html, reviewNote), text: `${reviewNote}\n\n${review.text}`, from: fromAs("reviews"), kind: "review-request" as const },
  ];
  const sent: string[] = [];
  const failed: { subject: string; error: string }[] = [];
  for (const m of mails) {
    const out = await sendEmail(m.kind, await withInlineImages({ from: m.from, to: [PREVIEW_TO], reply_to: REPLY_TO, subject: m.subject, html: m.html, text: m.text }), { preview: true });
    if (out.ok) sent.push(m.subject);
    else failed.push({ subject: m.subject, error: out.error });
  }
  return { sent, failed };
}
