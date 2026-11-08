import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dashboardDbConfigured, q, sbInsertIfAbsent, sbSelect } from "@/lib/dashboard/db";
import { quoteKey } from "@/lib/dashboard/metrics";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { emailContext } from "@/lib/email/context";
import { fromBox, OWNER_EMAIL } from "@/lib/email/from";
import { withInlineImages } from "@/lib/email/inline";
import { letterHtml, letterText } from "@/lib/email/premium";
import { sendEmail, type ResendMessage } from "@/lib/email/send";
import { resolveSigner } from "@/lib/email/templates/signer";
import { liveTemplate } from "@/lib/email/templates/store";
import type { EmailTemplate } from "@/lib/email/templates/types";
import { closeOffInServiceTitan, noteFollowUp } from "@/lib/pipeline/stLost";
import { logTouch, setFollow } from "@/lib/pipeline/store";
import { site } from "@/lib/site";
import { ANSWERS, customerReply, officeMessage, type Answer, type AnswerContext } from "./answerTypes";

/**
 * The links behind the one-tap answers. Each is signed for its quote and its
 * answer, so a link can't be edited into someone else's quote or into a
 * different answer. Estimate 0 is the preview: it shows the pages, records
 * nothing, and sends both emails to the owner instead of the office and the
 * customer.
 *
 * Opening the link only shows a page with one button. The answer is recorded
 * when that's pressed, because Outlook and Gmail open every link in an email
 * to check it, and a "yes" recorded on GET would be a scanner's.
 *
 * A pressed button does four things (Jake, 8 Nov: "an auto email back to me
 * with a pre-written message"):
 *  1. the office gets the customer's message, in their words, with a reply-to
 *     that goes back to them (answerTypes.ts › officeMessage)
 *  2. the customer gets what happens next, from whoever quoted them
 *  3. the Pipeline gets a touch, and a "no" marks the quote lost there and
 *     dismisses it in ServiceTitan, as the office would
 *  4. the answer is kept, so the follow-up emails for that quote stop
 */

const TABLE = "portal_quote_answers";
const NOTIFY = ["admin@advancedgas.com.au", OWNER_EMAIL];
const REPLY_TO = "admin@advancedgas.com.au";
/** Who the Pipeline shows made the touch. */
const BY = "the customer";

const secret = () => process.env.PORTAL_AUTH_SECRET ?? "";
const sig = (estimate: number, a: Answer) => createHmac("sha256", secret()).update(`quote-answer:${estimate}:${a}`).digest("hex").slice(0, 32);

export function answerUrl(estimate: number, a: Answer): string {
  return `${site.url.replace(/\/$/, "")}/q/${estimate}/${a}?s=${sig(estimate, a)}`;
}

export function answerSigOk(estimate: number, a: Answer, s: string): boolean {
  if (!secret() || !/^[0-9a-f]{32}$/.test(s)) return false;
  return timingSafeEqual(Buffer.from(sig(estimate, a)), Buffer.from(s));
}

/* ------------------------------------------------------------- the quote */

export type Quote = Omit<AnswerContext, "when" | "note"> & {
  jobId: number | null;
  /** The Pipeline's key for it (quoteKey), null when the quote isn't in the replica. */
  key: string | null;
};

/** A made-up quote for the preview pages and emails: nothing in ServiceTitan is touched, and the emails go to the owner. */
export const SAMPLE_QUOTE: Quote = {
  customer: "Sarah Jones", first: "Sarah", email: OWNER_EMAIL, phone: "0412 345 678", suburb: "Berwick", jobNumber: "20999",
  option: "Reclaim 300L - Plug", total: 3060.5, quoterName: "Jake Deppeler", jobHref: null, officePhone: site.phone, jobId: null, key: null,
};

const none = (): Quote => ({ customer: "A customer", first: "there", email: null, phone: null, suburb: null, jobNumber: null, option: null, total: null, quoterName: null, jobHref: null, officePhone: site.phone, jobId: null, key: null });

/** The quote and the person, from the replica: the option the link was in, the job, and how to reach them. */
export async function quoteFor(estimate: number): Promise<Quote> {
  if (!estimate) return SAMPLE_QUOTE;
  if (!dashboardDbConfigured()) return none();
  type Est = { id: number; job_id: number | null; customer_id: number | null; created_on: string | null; total_inc: number | string | null; created_by: string | null; sold_by: string | null; name: string | null };
  const est = (await sbSelect<Est>("st_estimates", [q.select("id,job_id,customer_id,created_on,total_inc,created_by,sold_by,name:raw->>name"), q.eq("id", String(estimate))].join("&")).catch(() => []))[0];
  if (!est) return none();
  type Job = { job_number: string | null; customer_name: string | null; suburb: string | null; customer_id: number | null };
  const job = est.job_id ? (await sbSelect<Job>("st_jobs", [q.select("job_number,customer_name,suburb,customer_id"), q.eq("id", String(est.job_id))].join("&")).catch(() => []))[0] : undefined;
  const customerId = est.customer_id ?? job?.customer_id ?? null;
  const contacts = customerId
    ? await sbSelect<{ type: string; value: string }>("st_customer_contacts", [q.select("type,value"), q.eq("customer_id", String(customerId)), "active=not.is.false", "order=modified_on.desc.nullslast"].join("&")).catch(() => [])
    : [];
  const pick = (re: RegExp) => contacts.find((c) => re.test(c.type) && c.value?.trim())?.value.trim() ?? null;
  const email = contacts.find((c) => c.type === "Email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value?.trim() ?? ""))?.value.trim().toLowerCase() ?? null;
  const who = job?.customer_name?.trim() || "A customer";
  return {
    customer: who,
    first: who.split(/[\s,&]+/)[0] || "there",
    email,
    phone: pick(/^MobilePhone$/) ?? pick(/^Phone$/),
    suburb: job?.suburb?.trim() || null,
    jobNumber: job?.job_number ?? null,
    option: est.name?.trim() || null,
    total: est.total_inc != null && Number.isFinite(Number(est.total_inc)) ? Number(est.total_inc) : null,
    quoterName: est.created_by?.trim() || est.sold_by?.trim() || null,
    jobHref: est.job_id ? stJobUrl(est.job_id) : null,
    officePhone: site.phone,
    jobId: est.job_id,
    key: quoteKey({ id: est.id, job_id: est.job_id, customer_id: est.customer_id, created_on: est.created_on }),
  };
}

/* ------------------------------------------------------------ the emails */

const whenWords = (d = new Date()) => d.toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export type AnswerEmails = { office: ResendMessage; customer: ResendMessage | null };

/**
 * Both emails for a tap, ready to send. `preview` sends them to the owner
 * with a subject saying which is which, in place of the office and the
 * customer. The customer's is the reply as edited on Marketing › Customer
 * emails (`tpl`), else the standard wording; the office's is fixed.
 */
export function answerEmails(a: Answer, qt: Quote, note: string | null, opts: { preview?: boolean; when?: Date; tpl?: EmailTemplate | null } = {}): AnswerEmails {
  const ctx = emailContext();
  const c: AnswerContext = { ...qt, when: whenWords(opts.when), note: note?.trim().slice(0, 1000) || null };
  const o = officeMessage(a, c);
  const office: ResendMessage = {
    from: fromBox("quotes", `${c.customer} via ${site.name}`),
    to: opts.preview ? [OWNER_EMAIL] : NOTIFY,
    reply_to: c.email ?? undefined,
    subject: opts.preview ? `[Preview: what you get] ${o.subject}` : o.subject,
    html: letterHtml({ base: ctx.base, footer: ctx.footer, preheader: o.preheader, blocks: o.blocks, signer: o.signer }),
    text: letterText({ base: ctx.base, footer: ctx.footer, preheader: o.preheader, blocks: o.blocks, signer: o.signer }),
  };
  if (!c.email) return { office, customer: null };
  const r = customerReply(a, c, opts.tpl ?? undefined);
  const signer = resolveSigner(opts.tpl?.signer ?? "quoter", c.quoterName);
  const customer: ResendMessage = {
    from: fromBox("quotes"),
    to: [opts.preview ? OWNER_EMAIL : c.email],
    reply_to: REPLY_TO,
    subject: opts.preview ? `[Preview: what the customer gets] ${r.subject}` : r.subject,
    html: letterHtml({ base: ctx.base, footer: ctx.footer, preheader: r.preheader, blocks: r.blocks, signer }),
    text: letterText({ base: ctx.base, footer: ctx.footer, preheader: r.preheader, blocks: r.blocks, signer }),
  };
  return { office, customer };
}

async function sendBoth(a: Answer, qt: Quote, note: string | null, preview: boolean, estimate: number): Promise<void> {
  const m = answerEmails(a, qt, note, { preview, tpl: await liveTemplate(`reply.${a}`) });
  await sendEmail("quote-answer", await withInlineImages(m.office), { estimate, answer: a, preview });
  if (m.customer) await sendEmail("quote-answer-reply", await withInlineImages(m.customer), { estimate, answer: a, preview });
}

/* ------------------------------------------------------------ recording */

export async function recordAnswer(estimate: number, a: Answer, note: string | null): Promise<void> {
  if (!estimate) {
    // The preview: the owner sees exactly what each side would get.
    await sendBoth(a, SAMPLE_QUOTE, note, true, 0);
    return;
  }
  const qt = await quoteFor(estimate);
  // One answer per quote and answer: pressing twice doesn't email the office twice.
  const fresh = await sbInsertIfAbsent(TABLE, { estimate_id: estimate, job_id: qt.jobId, customer_name: qt.customer, answer: a, note: note?.slice(0, 1000) || null }, "estimate_id,answer").catch(() => false);
  if (!fresh) return;
  await sendBoth(a, qt, note, false, estimate);
  // The Pipeline and ServiceTitan hear about it too, as if the office had
  // logged the call. Neither failing is a reason the emails shouldn't have gone.
  if (qt.key) await onPipeline(qt.key, a, note?.trim() || null).catch(() => undefined);
}

async function onPipeline(key: string, a: Answer, note: string | null): Promise<void> {
  const tapped = `Tapped "${ANSWERS[a].button}" in the follow-up email`;
  if (a === "no") {
    const reason = "Not going ahead";
    await setFollow(key, { lost: { reason }, nextOn: null }, BY);
    // The same words the Pipeline's own Mark lost writes, so the Lost page reads the reason the same way.
    await logTouch(key, "note", `Marked lost: ${reason} — ${tapped}${note ? `: "${note}"` : ""}`, BY);
    await closeOffInServiceTitan(key, reason, note ? `${tapped}: "${note}"` : tapped, BY).catch(() => undefined);
    return;
  }
  await logTouch(key, "email", `${tapped}${note ? `: "${note}"` : ""}. ${a === "yes" ? "Ring them and book it in." : "Ring them back."}`, BY);
  await noteFollowUp(key, `${tapped} (portal). ${a === "yes" ? "Ring them and book it in." : "Ring them back."}${note ? ` They wrote: "${note}"` : ""}`).catch(() => undefined);
}
