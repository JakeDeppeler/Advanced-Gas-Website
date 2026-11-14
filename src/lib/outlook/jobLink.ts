import "server-only";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { graph, userPath } from "./graph";
import { addressOf, plainText, type GraphMessage } from "./outlookTypes";
import { jobNumbersIn, namesSite, workAfterQuote } from "./workOrderTypes";
import { getSettings, saveSettings } from "@/lib/portal/db";

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

  // 1. The thread is already tied to a job; once that job's quote is sold
  // and the work made into a job of its own, the thread follows the work.
  if (m.conversationId) {
    const tied = await sbSelectOne<{ job_id: number; job_number: string | null }>("mail_drafts", [q.select("job_id,job_number"), q.eq("mailbox", mailbox), q.eq("conversation_id", m.conversationId), q.notNull("job_id"), q.order("received_at", "desc", "last"), "limit=1"].join("&")).catch(() => null);
    if (tied) {
      const quote = await sbSelectOne<Job>("st_jobs", [q.select(JOB_COLS), q.eq("id", String(tied.job_id))].join("&")).catch(() => null);
      const work = quote?.status === "Completed" ? await soldInto(quote).catch(() => null) : null;
      if (work) return { jobId: work.id, jobNumber: work.job_number, how: `same thread as the quote on job ${tied.job_number ?? tied.job_id}, now job ${work.job_number ?? work.id}` };
      return { jobId: tied.job_id, jobNumber: tied.job_number, how: "same thread as an email already on the job" };
    }
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
  // Waiting = an estimate still open and none sold: once one option is sold
  // (20284's Mitsubishi), the other's open in name only and the quote is done.
  const ests = done.length
    ? await sbSelect<{ job_id: number; status: string | null }>("st_estimates", [q.select("job_id,status"), `job_id=in.(${done.map((j) => j.id).join(",")})`, "status=in.(Open,Sold)", "limit=400"].join("&")).catch(() => [])
    : [];
  const soldOn = new Set(ests.filter((e) => e.status === "Sold").map((e) => Number(e.job_id)));
  const quoted = new Set(ests.filter((e) => e.status === "Open" && !soldOn.has(Number(e.job_id))).map((e) => Number(e.job_id)));
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

/** The open job a completed quote job's quote was sold into, or null (workAfterQuote says when). */
async function soldInto(quote: Job): Promise<Job | null> {
  if (!quote.location_id) return null;
  const [sold, later] = await Promise.all([
    sbSelect<{ sold_on: string | null }>("st_estimates", [q.select("sold_on"), q.eq("job_id", String(quote.id)), "status=eq.Sold", q.order("sold_on", "desc", "last"), "limit=1"].join("&")).catch(() => []),
    sbSelect<Job>("st_jobs", [q.select(JOB_COLS), q.eq("location_id", String(quote.location_id)), `status=in.(${LIVE.join(",")})`, q.gte("created_on", quote.created_on ?? "1970-01-01"), "limit=10"].join("&")).catch(() => []),
  ]);
  if (!later.length) return null;
  const ests = await sbSelect<{ job_id: number; created_on: string | null }>("st_estimates", [q.select("job_id,created_on"), `job_id=in.(${later.map((j) => j.id).join(",")})`, "limit=100"].join("&")).catch(() => []);
  const id = workAfterQuote(
    { id: quote.id, created: quote.created_on, soldOn: sold[0]?.sold_on ?? null },
    later.map((j) => ({ id: j.id, created: j.created_on, estimateBefore: ests.some((e) => Number(e.job_id) === j.id && (Date.parse(e.created_on ?? "") || Infinity) < (Date.parse(j.created_on ?? "") || 0)) })),
  );
  return later.find((j) => j.id === id) ?? null;
}

const CARRIED = "outlook_quote_carried";

type ConvMessage = GraphMessage & { body?: { content?: string } | null };

/**
 * A quote sold and made into a job: the emails about the quote, ours
 * included, go onto that job once, oldest first, so whoever does the work
 * reads what was agreed (Jake, 14 Nov: Dr Govindarajah's install, job 20873,
 * had none of the conversation, which sat on the quote job 20284, the first
 * annual service thrown in among it). Run from the sweep over jobs made in
 * the last fortnight.
 */
export async function carryQuoteEmails(deadline: number): Promise<{ carried: number; error?: string }> {
  const out = { carried: 0 } as { carried: number; error?: string };
  try {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const fresh = await sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `status=in.(${LIVE.join(",")})`, q.gte("created_on", since), "limit=400"].join("&"));
    const locs = [...new Set(fresh.map((j) => j.location_id).filter(Boolean))] as number[];
    if (!locs.length) return out;
    const quotes: Job[] = [];
    for (let i = 0; i < locs.length; i += 100) {
      quotes.push(...await sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `location_id=in.(${locs.slice(i, i + 100).join(",")})`, "status=eq.Completed", "limit=1000"].join("&")));
    }
    if (!quotes.length) return out;
    const linked: { job_id: number; mailbox: string; conversation_id: string | null }[] = [];
    for (let i = 0; i < quotes.length; i += 100) {
      linked.push(...await sbSelect<{ job_id: number; mailbox: string; conversation_id: string | null }>("mail_drafts", [q.select("job_id,mailbox,conversation_id"), `job_id=in.(${quotes.slice(i, i + 100).map((j) => j.id).join(",")})`, q.notNull("conversation_id"), "limit=1000"].join("&")));
    }
    if (!linked.length) return out;
    // Its own record, not the automations' done list: a run of those saving
    // over it would forget a carry, and the conversation would go on twice.
    const made = new Map(Object.entries((await getSettings<{ keys?: Record<string, string> }>(CARRIED).catch(() => null))?.keys ?? {}));
    for (const quote of quotes.filter((k) => linked.some((l) => Number(l.job_id) === k.id))) {
      if (Date.now() > deadline) break;
      const work = await soldInto(quote);
      if (!work) continue;
      const key = `carry:${work.id}:${quote.id}`;
      if (made.has(key)) continue;
      const threads = [...new Map(linked.filter((l) => Number(l.job_id) === quote.id).map((l) => [`${l.mailbox}|${l.conversation_id}`, l])).values()];
      const seen = new Set<string>();
      const msgs: ConvMessage[] = [];
      for (const t of threads) {
        const f = encodeURIComponent(`conversationId eq '${t.conversation_id}'`);
        const got = await graph<{ value: ConvMessage[] }>(`${userPath(t.mailbox)}/messages?$filter=${f}&$select=id,internetMessageId,from,sentDateTime,receivedDateTime,subject,uniqueBody,isDraft&$top=50`, { text: true }).catch(() => ({ value: [] as ConvMessage[] }));
        for (const msg of got.value) {
          // The same email reaches admin@ and jake@: once.
          const k = msg.internetMessageId ?? msg.id;
          if (msg.isDraft || seen.has(k)) continue;
          seen.add(k);
          msgs.push(msg);
        }
      }
      if (!msgs.length) continue;
      const at = (msg: ConvMessage) => Date.parse(msg.sentDateTime ?? msg.receivedDateTime ?? "") || 0;
      msgs.sort((a, b) => at(a) - at(b));
      const fmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" });
      const parts = msgs.map((msg) => `${fmt.format(at(msg) || Date.now())}, ${msg.from?.emailAddress?.name ?? ""} <${addressOf(msg.from)}>:\n${plainText(msg.uniqueBody).trim()}`);
      const head = `EMAILS ABOUT THE QUOTE (job ${quote.job_number ?? quote.id}), now this job. Oldest first, ours included.`;
      // Split across notes as they fill, never mid-email unless one email is longer than a note.
      const notes: string[] = [];
      let cur = head;
      for (const p of parts) {
        const piece = p.length > NOTE_MAX - 200 ? `${p.slice(0, NOTE_MAX - 260)}\n[…the rest is in the email]` : p;
        if (cur.length + piece.length + 8 > NOTE_MAX) { notes.push(cur); cur = `${head} (continued)`; }
        cur += `\n\n———\n\n${piece}`;
      }
      notes.push(cur);
      for (const text of notes) await stSend("POST", stTenantPath("jpm", `jobs/${work.id}/notes`), { text, pinToTop: false });
      made.set(key, new Date().toISOString());
      await saveSettings(CARRIED, { keys: Object.fromEntries(made) });
      out.carried++;
    }
  } catch (e) {
    out.error = (e as Error).message;
  }
  return out;
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
