import "server-only";
import { q, sbInsertIfAbsent, sbSelect, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { tagIds } from "@/lib/dashboard/onHoldTypes";
import { getSettings } from "@/lib/portal/db";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import { emailContext } from "@/lib/email/context";
import {
  HOLD_MAX_DAYS, LATEST_DAYS, REVIEW_SETTINGS_KEY, holdFor, inSendingHours, reviewEmail, reviewLink, reviewSettingsFrom, whyNot,
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

type JobRow = { id: number; job_number: string | null; job_type: string | null; business_unit: string | null; customer_id: number | null; customer_name: string | null; suburb: string | null; completed_on: string; location_id: number | null; tags: unknown };
type AskedRow = { id: string; job_id: number; customer_id: number | null; email: string | null; status: string; created_at: string };

export type ReviewRun = { on: boolean; sent: number; failed: number; held: number; considered: number; skipped?: string; why?: Record<string, number> };

const RETURN_VISIT = /warrant|callback|call back|recall|return/i;
const JOB_COLS = "id,job_number,job_type,business_unit,customer_id,customer_name,suburb,completed_on,location_id,tags:raw->tagTypeIds";

export async function runReviewRequests(now = new Date()): Promise<ReviewRun> {
  const none = { sent: 0, failed: 0, held: 0, considered: 0 };
  const s = await loadReviewSettings();
  if (!s.on) return { on: false, ...none, skipped: "switched off" };
  if (!inSendingHours(now)) return { on: true, ...none, skipped: "outside 9am–7pm Mon–Sat" };
  if (!reviewLink(s, process.env.GOOGLE_PLACE_ID)) return { on: true, ...none, skipped: "no Google review link set" };
  const from = fromAddress();
  if (!from) return { on: true, ...none, skipped: "RESEND_FROM_EMAIL isn't an advancedgas.com.au address" };

  const asked = await sbSelect<AskedRow>(TABLE, [q.select("id,job_id,customer_id,email,status,created_at"), q.gte("created_at", new Date(now.getTime() - 400 * 86_400_000).toISOString()), "limit=5000"].join("&"));
  const heldRows = new Map(asked.filter((a) => a.status === "held").map((a) => [Number(a.job_id), a]));

  const since = new Date(now.getTime() - LATEST_DAYS * 86_400_000).toISOString();
  const [recent, heldJobs] = await Promise.all([
    sbSelect<JobRow>("st_jobs", [q.select(JOB_COLS), q.eq("status", "Completed"), q.gte("completed_on", since), "business_unit=ilike.Domestic*", "limit=300"].join("&")),
    heldRows.size ? sbSelect<JobRow>("st_jobs", [q.select(JOB_COLS), `id=in.(${[...heldRows.keys()].join(",")})`].join("&")) : Promise.resolve([] as JobRow[]),
  ]);
  const jobs = [...new Map([...recent, ...heldJobs].map((j) => [Number(j.id), j])).values()];
  if (!jobs.length) return { on: true, ...none };
  const ids = jobs.map((j) => Number(j.id));
  const custs = [...new Set(jobs.map((j) => j.customer_id).filter((x): x is number => !!x))];
  const locs = [...new Set(jobs.map((j) => j.location_id).filter((x): x is number => !!x))];
  const oldest = jobs.map((j) => j.completed_on).sort()[0];

  const [invs, contacts, tagRows, asg, later] = await Promise.all([
    sbSelect<{ job_id: number; total: number | null; balance: number | null }>("st_invoices", [q.select("job_id,total,balance"), `job_id=in.(${ids.join(",")})`].join("&")),
    custs.length ? sbSelect<{ customer_id: number; value: string }>("st_customer_contacts", [q.select("customer_id,value"), q.eq("type", "Email"), "active=not.is.false", `customer_id=in.(${custs.join(",")})`].join("&")) : Promise.resolve([]),
    sbSelect<{ id: number; name: string | null }>("st_job_tags", "select=id,name"),
    sbSelect<{ job_id: number; technician_name: string | null }>("st_appointment_assignments", [q.select("job_id,technician_name"), "active=not.is.false", `job_id=in.(${ids.join(",")})`].join("&")),
    // Jobs at the same addresses opened since: a warranty or call-back visit still to happen means it isn't fixed yet.
    locs.length ? sbSelect<{ id: number; location_id: number; created_on: string; status: string | null; job_type: string | null; business_unit: string | null }>("st_jobs", [q.select("id,location_id,created_on,status,job_type,business_unit"), `location_id=in.(${locs.join(",")})`, q.gte("created_on", oldest)].join("&")) : Promise.resolve([]),
  ]);

  const askedJobs = new Set(asked.map((a) => Number(a.job_id)));
  const lastAsked = (custId: number | null, email: string | null) =>
    asked.filter((a) => a.status !== "held" && a.status !== "dropped" && ((custId && a.customer_id === custId) || (email && a.email?.toLowerCase() === email.toLowerCase()))).map((a) => a.created_at).sort().pop() ?? null;
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
  const returnOpen = (j: JobRow) =>
    later.some((l) => l.location_id === j.location_id && Number(l.id) !== Number(j.id) && Date.parse(l.created_on) >= Date.parse(j.completed_on)
      && RETURN_VISIT.test(`${l.job_type ?? ""} ${l.business_unit ?? ""}`) && !/^(completed|canceled|cancelled)$/i.test(l.status ?? ""));

  const why: Record<string, number> = {};
  const count = (k: string) => { why[k] = (why[k] ?? 0) + 1; };
  const go: { job: JobRow; heldId?: string }[] = [];
  let held = 0;
  const seenCustomer = new Set<number>();
  // Newest first, so a customer with two jobs this week is asked about the latest.
  for (const j of [...jobs].sort((a, b) => Date.parse(b.completed_on) - Date.parse(a.completed_on))) {
    const wasHeld = heldRows.get(Number(j.id));
    if (askedJobs.has(Number(j.id)) && !wasHeld) continue;
    const email = j.customer_id ? emailOf.get(j.customer_id) ?? null : null;
    const c: Candidate = {
      jobId: Number(j.id), businessUnit: j.business_unit, jobType: j.job_type, completedOn: j.completed_on,
      invoiced: money.get(Number(j.id))?.invoiced ?? 0, owing: money.get(Number(j.id))?.owing ?? 0, email,
      tags: tagIds(j.tags).map((t) => tagName.get(t) ?? ""), lastAsked: lastAsked(j.customer_id, email), returnVisitOpen: returnOpen(j),
    };
    const heldDays = wasHeld ? (now.getTime() - Date.parse(wasHeld.created_at)) / 86_400_000 : 0;
    const no = whyNot(c, now, wasHeld ? LATEST_DAYS + HOLD_MAX_DAYS + 7 : LATEST_DAYS)
      ?? (j.customer_id && seenCustomer.has(j.customer_id) ? "another job of theirs is being asked about" : null);
    if (no) {
      count(no);
      // A held job that stops qualifying (still unpaid weeks on) is closed off, not held forever.
      if (wasHeld && (heldDays > HOLD_MAX_DAYS + 7 || no !== "not paid yet")) await sbUpdate(TABLE, `id=eq.${wasHeld.id}`, { status: "dropped", error: no });
      continue;
    }
    const hold = holdFor(c);
    if (hold && heldDays < HOLD_MAX_DAYS) {
      count(`held: ${hold}`);
      if (!wasHeld) {
        const ok = await sbInsertIfAbsent(TABLE, {
          job_id: j.id, job_number: j.job_number, customer_id: j.customer_id, customer_name: j.customer_name, email,
          techs: techs.get(Number(j.id)) ?? [], suburb: j.suburb, status: "held", error: hold,
        }, "job_id");
        if (ok) held++;
      }
      continue;
    }
    if (j.customer_id) seenCustomer.add(j.customer_id);
    go.push({ job: j, heldId: wasHeld?.id });
  }

  const ctx = emailContext();
  let sent = 0, failed = 0;
  for (const { job: j, heldId } of go.slice(0, PER_RUN)) {
    const email = emailOf.get(j.customer_id!)!;
    let rowId: string | undefined;
    if (heldId) {
      // Taken off hold: flipped to sending only if it's still held, so two runs can't both send.
      const flipped = await sbUpdateReturning<{ id: string }>(TABLE, `id=eq.${heldId}&status=eq.held`, { status: "sending", error: null, email, techs: techs.get(Number(j.id)) ?? [] });
      if (!flipped.length) continue;
      rowId = heldId;
    } else {
      // Claimed first: the unique job_id means a second run finds it taken.
      const claimed = await sbInsertIfAbsent(TABLE, {
        job_id: j.id, job_number: j.job_number, customer_id: j.customer_id, customer_name: j.customer_name, email,
        techs: techs.get(Number(j.id)) ?? [], suburb: j.suburb, status: "sending",
      }, "job_id");
      if (!claimed) continue;
      rowId = (await sbSelect<{ id: string }>(TABLE, [q.select("id"), q.eq("job_id", String(j.id))].join("&")))[0]?.id;
    }
    if (!rowId) continue;
    const mail = reviewEmail(s, { customer: j.customer_name, techs: techs.get(Number(j.id)) ?? [], jobType: j.job_type, suburb: j.suburb, href: `${site.url}/r/${rowId}` }, ctx);
    const out = await sendEmail("review-request", { from, to: [email], reply_to: reviewReplyTo, subject: mail.subject, text: mail.text, html: mail.html }, { job: j.job_number });
    if (out.ok) {
      sent++;
      await sbUpdate(TABLE, `id=eq.${rowId}`, { status: "sent", sent_at: new Date().toISOString() });
    } else {
      failed++;
      await sbUpdate(TABLE, `id=eq.${rowId}`, { status: "failed", error: (out.error ?? "").slice(0, 300) });
    }
  }
  return { on: true, sent, failed, held, considered: jobs.length, why };
}

/** A test to the person pressing the button, from a real recent job's details, without recording it. */
export async function sendReviewTest(to: string, s: ReviewSettings): Promise<{ ok: boolean; error?: string }> {
  const from = fromAddress();
  if (!from) return { ok: false, error: "RESEND_FROM_EMAIL isn't an advancedgas.com.au address." };
  const link = reviewLink(s, process.env.GOOGLE_PLACE_ID);
  if (!link) return { ok: false, error: "Put in the Google review link first." };
  const mail = reviewEmail(s, { customer: "Sarah Jones", techs: ["Jye Stephens"], jobType: "Service - Split System", suburb: "Berwick", href: link }, emailContext());
  const out = await sendEmail("review-request", { from, to: [to], reply_to: reviewReplyTo, subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html }, { test: true });
  return out.ok ? { ok: true } : { ok: false, error: out.error };
}

export type ReviewRequestRow = { id: string; job_number: string | null; customer_name: string | null; techs: string[]; suburb: string | null; status: string; error: string | null; sent_at: string | null; clicked_at: string | null; clicks: number; created_at: string };

export async function recentReviewRequests(): Promise<ReviewRequestRow[]> {
  return sbSelect<ReviewRequestRow>(TABLE, [q.select("id,job_number,customer_name,techs,suburb,status,error,sent_at,clicked_at,clicks,created_at"), q.order("created_at", "desc"), "limit=40"].join("&")).catch(() => []);
}
