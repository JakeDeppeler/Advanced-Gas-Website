import "server-only";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import { reviewEmail, reviewLink } from "@/lib/reviews/requestTypes";
import { loadReviewSettings } from "@/lib/reviews/requests";

/**
 * Customer emails sent to the owner to look at in a real inbox before they
 * go to anyone else (Jake, 7 Nov: "can we test send these to me via email").
 *
 * Only ever to PREVIEW_TO: nothing here takes an address from a request.
 * The review email is the real one, built by the same code customers get.
 * The quote follow-ups aren't built yet; these are the worked example from
 * the preview, Sarah Jones made up, to judge the tone and layout by.
 */

export const PREVIEW_TO = "jake@advancedgas.com.au";
const REPLY_TO = "admin@advancedgas.com.au";

const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const wrap = (inner: string) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1d;max-width:560px">${inner}</div>`;
const para = (t: string) => `<p style="margin:0 0 14px">${esc(t).replace(/\n/g, "<br>")}</p>`;
const banner = (t: string) => `<p style="margin:0 0 18px;padding:10px 12px;background:#fff4d6;border-radius:8px;font-size:13px;color:#7a5200">${esc(t)}</p>`;
const button = (label: string, href: string, solid: boolean) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:999px;font-weight:bold;font-size:14px;text-decoration:none;${solid ? "background:#1a1a1d;color:#ffffff" : "border:2px solid #1a1a1d;color:#1a1a1d"}">${esc(label)}</a>`;

export function quoteEmails(): { subject: string; html: string; text: string }[] {
  const note = "Preview of a quote follow-up. Sarah Jones is made up; the real ones are written from each quote. Nothing has gone to a customer.";
  const sign = "Kind regards,\nThe Advanced Gas team";
  const one = [
    "Hi Sarah,",
    "Just checking the quote Ray put together for your new ducted heater came through okay. It's the one with three options, from the Brivis Buffalo through to the Rinnai Sensation.",
    `If anything in it isn't clear, or you'd like to talk through which one suits the house, just reply here or ring us on ${site.phone}.`,
    sign,
  ];
  const two = [
    "Hi Sarah,",
    "In case it helps you decide, here's how it goes once you say yes: we order the unit (usually 3 to 5 days), book a day that suits you, and the install is done in a day. The old heater is taken away.",
    "Your quote also qualifies for the Victorian Energy Upgrades discount, which is already taken off the prices in it.",
    "Happy to answer anything. Just hit reply.",
    sign,
  ];
  const three1 = ["Hi Sarah,", "We haven't heard back about your ducted heating quote, so we wanted to check where you're at. One click lets us know:"];
  const three2 = ["If it's not the right time, no problem at all. We'll close it off and you won't hear from us about it again.", sign];
  const btns = `<p style="margin:6px 0 16px">${button("Yes, go ahead", site.url, true)}${button("Not right now", site.url, false)}${button("I have a question", site.url, false)}</p>`;
  return [
    { subject: "[Preview 1 of 3, day 2] Your ducted heating quote", html: wrap(banner(note) + one.map(para).join("")), text: `${note}\n\n${one.join("\n\n")}` },
    { subject: "[Preview 2 of 3, day 6] What happens next with your ducted heater", html: wrap(banner(note) + two.map(para).join("")), text: `${note}\n\n${two.join("\n\n")}` },
    {
      subject: "[Preview 3 of 3, day 13] Should we keep your quote open?",
      html: wrap(banner(`${note} The buttons go to the website in this preview.`) + three1.map(para).join("") + btns + three2.map(para).join("")),
      text: `${note}\n\n${three1.join("\n\n")}\n\n[Yes, go ahead] [Not right now] [I have a question]\n\n${three2.join("\n\n")}`,
    },
  ];
}

export async function sendCustomerEmailPreviews(): Promise<{ sent: string[]; failed: { subject: string; error: string }[] }> {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const domain = ((raw.match(/<([^>]+)>/)?.[1] ?? raw).split("@")[1] ?? "").toLowerCase();
  const own = /^(?:[a-z0-9-]+\.)*advancedgas\.com\.au$/.test(domain);
  const fromAs = (box: string) => (own ? `${site.name} <${box}@${domain}>` : raw || "Advanced Gas Website <onboarding@resend.dev>");

  const s = await loadReviewSettings();
  const link = reviewLink(s, process.env.GOOGLE_PLACE_ID) ?? site.social.google;
  const review = reviewEmail(s, { customer: "Sarah Jones", techs: ["Ray Kennedy"], jobType: "Service - Split System", suburb: "Berwick", href: link });
  const reviewNote = s.link || process.env.GOOGLE_PLACE_ID ? "Preview of the Google review email, exactly as customers get it (made-up name). The button goes to your review link." : "Preview of the Google review email, exactly as customers get it (made-up name). No review link is saved yet, so the button goes to your Google profile for now.";

  const mails = [
    ...quoteEmails().map((m) => ({ ...m, from: fromAs("quotes"), kind: "other" as const })),
    { subject: `[Preview] ${review.subject}`, html: review.html.replace(/^<div([^>]*)>/, `<div$1>${banner(reviewNote)}`), text: `${reviewNote}\n\n${review.text}`, from: fromAs("reviews"), kind: "review-request" as const },
  ];
  const sent: string[] = [];
  const failed: { subject: string; error: string }[] = [];
  for (const m of mails) {
    const out = await sendEmail(m.kind, { from: m.from, to: [PREVIEW_TO], reply_to: REPLY_TO, subject: m.subject, html: m.html, text: m.text }, { preview: true });
    if (out.ok) sent.push(m.subject);
    else failed.push({ subject: m.subject, error: out.error });
  }
  return { sent, failed };
}
