import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dashboardDbConfigured, q, sbInsertIfAbsent, sbSelect } from "@/lib/dashboard/db";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import { answerNotice, type Answer } from "./answerTypes";

/**
 * The links behind the one-tap answers. Each is signed for its quote and its
 * answer, so a link can't be edited into someone else's quote or into a
 * different answer. Estimate 0 is the preview: it shows the pages and records
 * nothing.
 *
 * Opening the link only shows a page with one button. The answer is recorded
 * when that's pressed, because Outlook and Gmail open every link in an email
 * to check it, and a "yes" recorded on GET would be a scanner's.
 */

const TABLE = "portal_quote_answers";
const NOTIFY = ["admin@advancedgas.com.au", "jake@advancedgas.com.au"];

const secret = () => process.env.PORTAL_AUTH_SECRET ?? "";
const sig = (estimate: number, a: Answer) => createHmac("sha256", secret()).update(`quote-answer:${estimate}:${a}`).digest("hex").slice(0, 32);

export function answerUrl(estimate: number, a: Answer): string {
  return `${site.url.replace(/\/$/, "")}/q/${estimate}/${a}?s=${sig(estimate, a)}`;
}

export function answerSigOk(estimate: number, a: Answer, s: string): boolean {
  if (!secret() || !/^[0-9a-f]{32}$/.test(s)) return false;
  return timingSafeEqual(Buffer.from(sig(estimate, a)), Buffer.from(s));
}

/** Who and what, for the page and the notice: the customer's first name and the quote's first option. */
export async function quoteFor(estimate: number): Promise<{ first: string | null; who: string; what: string; jobId: number | null; jobNumber: string | null }> {
  const none = { first: null, who: "A customer", what: "quote", jobId: null, jobNumber: null };
  if (!estimate || !dashboardDbConfigured()) return none;
  const est = (await sbSelect<{ job_id: number | null; name: string | null }>("st_estimates", [q.select("job_id,name:raw->>name"), q.eq("id", String(estimate))].join("&")).catch(() => []))[0];
  if (!est?.job_id) return none;
  const job = (await sbSelect<{ job_number: string | null; customer_name: string | null }>("st_jobs", [q.select("job_number,customer_name"), q.eq("id", String(est.job_id))].join("&")).catch(() => []))[0];
  const who = job?.customer_name?.trim() || "A customer";
  return { first: who.split(/[\s,&]+/)[0] ?? null, who, what: `quote${job?.job_number ? ` on job #${job.job_number}` : ""}${est.name ? ` (${est.name.trim()})` : ""}`, jobId: est.job_id, jobNumber: job?.job_number ?? null };
}

export async function recordAnswer(estimate: number, a: Answer, note: string | null): Promise<void> {
  if (!estimate) return; // the preview
  const qt = await quoteFor(estimate);
  // One answer per quote and answer: pressing twice doesn't email the office twice.
  const fresh = await sbInsertIfAbsent(TABLE, { estimate_id: estimate, job_id: qt.jobId, customer_name: qt.who, answer: a, note: note?.slice(0, 1000) || null }, "estimate_id,answer").catch(() => false);
  if (!fresh) return;
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const n = answerNotice(a, qt.who, qt.what, note);
  await sendEmail("quote-answer", { from: raw || "Advanced Gas Website <onboarding@resend.dev>", to: NOTIFY, subject: n.subject, text: n.text }, { estimate, answer: a });
}
