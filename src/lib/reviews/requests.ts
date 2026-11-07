import "server-only";
import { q, sbInsertIfAbsent, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { tagIds } from "@/lib/dashboard/onHoldTypes";
import { getSettings } from "@/lib/portal/db";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import {
  LATEST_DAYS, REVIEW_SETTINGS_KEY, inSendingHours, reviewEmail, reviewLink, reviewSettingsFrom, whyNot,
  type Candidate, type ReviewSettings,
} from "./requestTypes";

/**
 * Sends the review emails (rules in requestTypes.ts), a few each run, from the
 * scheduled sync. Each job is claimed in portal_review_requests before its
 * email goes, so two runs can't both send it.
 *
 * The button goes through /r/<id> on our own site, which counts the click and
 * sends them on to Google. Google doesn't say who left a review, so "opened
 * the review link" is the most this can honestly report against a tech.
 */

const TABLE = "portal_review_requests";
const PER_RUN = 8;

export const reviewReplyTo = "admin@advancedgas.com.au";

export async function loadReviewSettings(): Promise<ReviewSettings> {
  return reviewSettingsFrom(await getSettings<unknown>(REVIEW_SETTINGS_KEY).catch(() => null));
}

/** Where the button sends people, read at click time so a corrected link applies to emails already out. */
export async function currentReviewLink(): Promise<string> {
  return reviewLink(await loadReviewSettings(), process.env.GOOGLE_PLACE_ID) ?? site.social.google;
}

/** From our own domain, the one Resend has verified, as the tenant emails are. */
function fromAddress(): string | null {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const domain = ((raw.match(/<([^>]+)>/)?.[1] ?? raw).split("@")[1] ?? "").toLowerCase();
  return /^(?:[a-z0-9-]+\.)*advancedgas\.com\.au$/.test(domain) ? `${site.name} <reviews@${domain}>` : null;
}

type JobRow = { id: number; job_number: string | null; job_type: string | null; business_unit: string | null; customer_id: number | null; customer_name: string | null; suburb: string | null; completed_on: string; tags: unknown };

export type ReviewRun = { on: boolean; sent: number; failed: number; considered: number; skipped?: string; why?: Record<string, number> };

export async function runReviewRequests(now = new Date()): Promise<ReviewRun> {
  const s = await loadReviewSettings();
  if (!s.on) return { on: false, sent: 0, failed: 0, considered: 0, skipped: "switched off" };
  if (!inSendingHours(now)) return { on: true, sent: 0, failed: 0, considered: 0, skipped: "outside 9am–7pm Mon–Sat" };
  if (!reviewLink(s, process.env.GOOGLE_PLACE_ID)) return { on: true, sent: 0, failed: 0, considered: 0, skipped: "no Google review link set" };
  const from = fromAddress();
  if (!from) return { on: true, sent: 0, failed: 0, considered: 0, skipped: "RESEND_FROM_EMAIL isn't an advancedgas.com.au address" };

  const since = new Date(now.getTime() - LATEST_DAYS * 86_400_000).toISOString();
  const jobs = await sbSelect<JobRow>("st_jobs", [
    q.select("id,job_number,job_type,business_unit,customer_id,customer_name,suburb,completed_on,tags:raw->tagTypeIds"),
    q.eq("status", "Completed"), q.gte("completed_on", since), "business_unit=ilike.Domestic*", "limit=300",
  ].join("&"));
  if (!jobs.length) return { on: true, sent: 0, failed: 0, considered: 0 };
  const ids = jobs.map((j) => Number(j.id));
  const custs = [...new Set(jobs.map((j) => j.customer_id).filter((x): x is number => !!x))];

  const [asked, invs, contacts, tagRows, asg] = await Promise.all([
    sbSelect<{ job_id: number; customer_id: number | null; email: string | null; created_at: string }>(TABLE, [q.select("job_id,customer_id,email,created_at"), q.gte("created_at", new Date(now.getTime() - 400 * 86_400_000).toISOString()), "limit=5000"].join("&")),
    sbSelect<{ job_id: number; total: number | null; balance: number | null }>("st_invoices", [q.select("job_id,total,balance"), `job_id=in.(${ids.join(",")})`].join("&")),
    custs.length ? sbSelect<{ customer_id: number; value: string }>("st_customer_contacts", [q.select("customer_id,value"), q.eq("type", "Email"), "active=not.is.false", `customer_id=in.(${custs.join(",")})`].join("&")) : Promise.resolve([]),
    sbSelect<{ id: number; name: string | null }>("st_job_tags", "select=id,name"),
    sbSelect<{ job_id: number; technician_name: string | null }>("st_appointment_assignments", [q.select("job_id,technician_name"), "active=not.is.false", `job_id=in.(${ids.join(",")})`].join("&")),
  ]);

  const askedJobs = new Set(asked.map((a) => Number(a.job_id)));
  const lastAsked = (custId: number | null, email: string | null) =>
    asked.filter((a) => (custId && a.customer_id === custId) || (email && a.email?.toLowerCase() === email.toLowerCase())).map((a) => a.created_at).sort().pop() ?? null;
  const money = new Map<number, { invoiced: number; owing: number }>();
  for (const i of invs) {
    const m = money.get(Number(i.job_id)) ?? { invoiced: 0, owing: 0 };
    m.invoiced += Number(i.total ?? 0);
    m.owing += Number(i.balance ?? 0);
    money.set(Number(i.job_id), m);
  }
  const emailOf = new Map<number, string>();
  for (const c of contacts) if (!emailOf.has(Number(c.customer_id))) emailOf.set(Number(c.customer_id), c.value.trim());
  const tagName = new Map(tagRows.map((t) => [Number(t.id), (t.name ?? "").trim()]));
  const techs = new Map<number, string[]>();
  for (const a of asg) if (a.technician_name) techs.set(Number(a.job_id), [...new Set([...(techs.get(Number(a.job_id)) ?? []), a.technician_name.trim()])]);

  const why: Record<string, number> = {};
  const go: JobRow[] = [];
  // One email per customer even when they had two jobs this week: the newest job.
  const seenCustomer = new Set<number>();
  for (const j of [...jobs].sort((a, b) => Date.parse(b.completed_on) - Date.parse(a.completed_on))) {
    if (askedJobs.has(Number(j.id))) continue;
    const email = j.customer_id ? emailOf.get(j.customer_id) ?? null : null;
    const c: Candidate = {
      jobId: Number(j.id), businessUnit: j.business_unit, jobType: j.job_type, completedOn: j.completed_on,
      invoiced: money.get(Number(j.id))?.invoiced ?? 0, owing: money.get(Number(j.id))?.owing ?? 0, email,
      tags: tagIds(j.tags).map((t) => tagName.get(t) ?? ""), lastAsked: lastAsked(j.customer_id, email),
    };
    const no = whyNot(c, now) ?? (j.customer_id && seenCustomer.has(j.customer_id) ? "another job of theirs is being asked about" : null);
    if (no) { why[no] = (why[no] ?? 0) + 1; continue; }
    if (j.customer_id) seenCustomer.add(j.customer_id);
    go.push(j);
  }

  let sent = 0, failed = 0;
  for (const j of go.slice(0, PER_RUN)) {
    const email = emailOf.get(j.customer_id!)!;
    // Claimed first: the unique job_id means a second run finds it taken.
    const claimed = await sbInsertIfAbsent(TABLE, {
      job_id: j.id, job_number: j.job_number, customer_id: j.customer_id, customer_name: j.customer_name, email,
      techs: techs.get(Number(j.id)) ?? [], suburb: j.suburb, status: "sending",
    }, "job_id");
    if (!claimed) continue;
    const row = (await sbSelect<{ id: string }>(TABLE, [q.select("id"), q.eq("job_id", String(j.id))].join("&")))[0];
    if (!row) continue;
    const mail = reviewEmail(s, { customer: j.customer_name, techs: techs.get(Number(j.id)) ?? [], jobType: j.job_type, suburb: j.suburb, href: `${site.url}/r/${row.id}` });
    const out = await sendEmail("review-request", { from, to: [email], reply_to: reviewReplyTo, subject: mail.subject, text: mail.text, html: mail.html }, { job: j.job_number });
    if (out.ok) {
      sent++;
      await sbUpdate(TABLE, `id=eq.${row.id}`, { status: "sent", sent_at: new Date().toISOString() });
    } else {
      failed++;
      await sbUpdate(TABLE, `id=eq.${row.id}`, { status: "failed", error: (out.error ?? "").slice(0, 300) });
    }
  }
  return { on: true, sent, failed, considered: jobs.length, why };
}

/** A test to the person pressing the button, from a real recent job's details, without recording it. */
export async function sendReviewTest(to: string, s: ReviewSettings): Promise<{ ok: boolean; error?: string }> {
  const from = fromAddress();
  if (!from) return { ok: false, error: "RESEND_FROM_EMAIL isn't an advancedgas.com.au address." };
  const link = reviewLink(s, process.env.GOOGLE_PLACE_ID);
  if (!link) return { ok: false, error: "Put in the Google review link first." };
  const mail = reviewEmail(s, { customer: "Sarah Jones", techs: ["Ray Kennedy"], jobType: "Service - Split System", suburb: "Berwick", href: link });
  const out = await sendEmail("review-request", { from, to: [to], reply_to: reviewReplyTo, subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html }, { test: true });
  return out.ok ? { ok: true } : { ok: false, error: out.error };
}

export type ReviewRequestRow = { id: string; job_number: string | null; customer_name: string | null; techs: string[]; suburb: string | null; status: string; error: string | null; sent_at: string | null; clicked_at: string | null; clicks: number; created_at: string };

export async function recentReviewRequests(): Promise<ReviewRequestRow[]> {
  return sbSelect<ReviewRequestRow>(TABLE, [q.select("id,job_number,customer_name,techs,suburb,status,error,sent_at,clicked_at,clicks,created_at"), q.order("created_at", "desc"), "limit=40"].join("&")).catch(() => []);
}
