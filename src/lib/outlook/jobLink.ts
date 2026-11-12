import "server-only";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { graph, userPath } from "./graph";
import { addressOf, plainText, type GraphMessage } from "./outlookTypes";
import { jobNumbersIn, namesSite } from "./workOrderTypes";

/**
 * An email about a job goes onto the job (Jake, 5 Nov: "if they are talking
 * about a job in email and it can be found clearly, the email should be
 * uploaded to the job").
 *
 * Only when it's clear. Three ways, in order:
 *  1. The thread is already tied to a job: an earlier email in it went onto
 *     one, or a work order in it made one. A reply belongs to the same job.
 *  2. Our job number is in the subject or the opening of the email, and
 *     something else agrees: the sender is a contact on that job's customer
 *     or site, or the site's address is named (number and street, or street
 *     and its kind). Agencies quote their own job
 *     numbers (Barry Plant's "Job #18943"), which can collide with ours, so a
 *     number alone is never enough.
 *  3. The sender is a contact on exactly one customer or site with exactly
 *     one job in play: open, or completed with a quote still open (the quote
 *     waiting on them). An agency's address has dozens; then only a job whose
 *     address the email names will do.
 * Anything less certain is left alone. The email goes on as a job note (who,
 * when, the subject and its own words), with its files as attachments.
 */

const LIVE = ["Scheduled", "InProgress", "Hold", "Dispatched", "Working"];
const NOTE_MAX = 4800;

type Job = { id: number; job_number: string | null; status: string | null; customer_id: number | null; location_id: number | null; created_on: string | null };
export type JobMatch = { jobId: number; jobNumber: string | null; how: string };

const JOB_COLS = "id,job_number,status,customer_id,location_id,created_on";

async function streetOf(locationId: number | null): Promise<string> {
  if (!locationId) return "";
  const l = await sbSelectOne<{ street: string | null }>("st_locations", [`select=street:raw->address->>street`, q.eq("id", String(locationId))].join("&")).catch(() => null);
  return l?.street ?? "";
}

/** Customer and site ids that have this address as a contact. */
async function contactsOf(email: string): Promise<{ customers: number[]; locations: number[] }> {
  const key = email.trim().toLowerCase();
  if (!key.includes("@")) return { customers: [], locations: [] };
  const [c, l] = await Promise.all([
    sbSelect<{ customer_id: number }>("st_customer_contacts", [q.select("customer_id"), q.eq("match_key", key), "limit=20"].join("&")).catch(() => []),
    sbSelect<{ location_id: number }>("st_location_contacts", [q.select("location_id"), q.eq("match_key", key), "limit=20"].join("&")).catch(() => []),
  ]);
  return { customers: [...new Set(c.map((r) => r.customer_id).filter(Boolean))], locations: [...new Set(l.map((r) => r.location_id).filter(Boolean))] };
}

// The street with its number or its kind, not its name alone: see namesSite.
const mentions = namesSite;

export async function findJob(mailbox: string, m: GraphMessage, from: string, body: string): Promise<JobMatch | null> {
  const subject = m.subject ?? "";
  const text = `${subject}\n${body.slice(0, 4000)}`;

  // 1. The thread is already tied to a job.
  if (m.conversationId) {
    const tied = await sbSelectOne<{ job_id: number; job_number: string | null }>("mail_drafts", [q.select("job_id,job_number"), q.eq("mailbox", mailbox), q.eq("conversation_id", m.conversationId), q.notNull("job_id"), q.order("received_at", "desc", "last"), "limit=1"].join("&")).catch(() => null);
    if (tied) return { jobId: tied.job_id, jobNumber: tied.job_number, how: "same thread as an email already on the job" };
  }

  const who = await contactsOf(from);

  // 2. Our job number, with something to back it up.
  const nums = jobNumbersIn(text);
  if (nums.length) {
    const jobs = await sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `job_number=in.(${nums.join(",")})`].join("&")).catch(() => []);
    for (const j of jobs) {
      const theirs = (j.customer_id && who.customers.includes(j.customer_id)) || (j.location_id && who.locations.includes(j.location_id));
      if (theirs || mentions(text, await streetOf(j.location_id))) return { jobId: j.id, jobNumber: j.job_number, how: `job ${j.job_number} named${theirs ? " by its customer" : " with its street"}` };
    }
  }

  // 3. The sender's one live job.
  if (!who.customers.length && !who.locations.length) return null;
  const since = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const filters = [
    who.customers.length ? `customer_id.in.(${who.customers.join(",")})` : null,
    who.locations.length ? `location_id.in.(${who.locations.join(",")})` : null,
  ].filter(Boolean);
  const [open, done] = await Promise.all([
    sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `or=(${filters.join(",")})`, `status=in.(${LIVE.join(",")})`, q.gte("created_on", since), "limit=60"].join("&")).catch(() => []),
    sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `or=(${filters.join(",")})`, "status=eq.Completed", q.gte("created_on", since), "limit=60"].join("&")).catch(() => []),
  ]);
  // A quote visit is completed the day it's done, and the quote then waits on
  // the customer: that job is still theirs to write about. Every email from Dr
  // Govindarajah about his ducted quote (job 20284, both estimates open) went
  // on nothing (12 Nov).
  const quoted = done.length
    ? new Set((await sbSelect<{ job_id: number }>("st_estimates", [q.select("job_id"), `job_id=in.(${done.map((j) => j.id).join(",")})`, "status=eq.Open", "limit=200"].join("&")).catch(() => [])).map((e) => Number(e.job_id)))
    : new Set<number>();
  const waiting = done.filter((j) => quoted.has(Number(j.id)));
  // A reply to the quote email ("Your quote from Advanced Gas & Aircon") is
  // about the quote, even with one other job of theirs open. Not an agency's:
  // with dozens open, only the address will do.
  if (waiting.length === 1 && (!open.length || (open.length === 1 && /\bquote\b/i.test(subject)))) return { jobId: waiting[0].id, jobNumber: waiting[0].job_number, how: "the sender's quote, waiting on them" };
  const live = [...open, ...waiting];
  if (open.length === 1) return { jobId: open[0].id, jobNumber: open[0].job_number, how: "the sender's only open job" };
  if (live.length > 1) {
    const named = [];
    for (const j of live) if (mentions(text, await streetOf(j.location_id))) named.push(j);
    if (named.length === 1) return { jobId: named[0].id, jobNumber: named[0].job_number, how: "the sender's open job at the street the email names" };
  }
  return null;
}

/**
 * The email onto the job: a note with its words, and its files. `heading`
 * opens the note (a work order follow-up says what it is), and `pin` puts it
 * at the top of the job's notes where the office will see it.
 */
export async function putOnJob(mailbox: string, m: GraphMessage, jobId: number, opts: { heading?: string; pin?: boolean } = {}): Promise<void> {
  const when = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" }).format(Date.parse(m.receivedDateTime ?? "") || Date.now());
  const words = plainText(m.uniqueBody ?? m.body);
  const note = [...(opts.heading ? [opts.heading, ""] : []), `Email from ${m.from?.emailAddress?.name ?? ""} <${addressOf(m.from)}>, ${when}`, `Subject: ${m.subject ?? ""}`, "", words].join("\n");
  await stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text: note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX)}\n[…the rest is in the email]` : note, pinToTop: Boolean(opts.pin) });
  if (!m.hasAttachments) return;
  type Att = { "@odata.type"?: string; name?: string; contentType?: string; size?: number; isInline?: boolean; contentBytes?: string };
  const atts = await graph<{ value: Att[] }>(`${userPath(mailbox)}/messages/${encodeURIComponent(m.id)}/attachments`).catch(() => ({ value: [] as Att[] }));
  for (const a of atts.value.filter((x) => x["@odata.type"] === "#microsoft.graph.fileAttachment" && !x.isInline && x.contentBytes && (x.size ?? 0) <= 10 * 1048576).slice(0, 8)) {
    await stUpload(stTenantPath("forms", `jobs/${jobId}/attachments`), a.name || "attachment", new Uint8Array(Buffer.from(a.contentBytes!, "base64")), a.contentType || "application/octet-stream");
  }
}
