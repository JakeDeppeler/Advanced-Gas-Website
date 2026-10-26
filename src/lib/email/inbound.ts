import "server-only";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { serviceTitanConfigured, stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { createAutoTodo } from "@/lib/todos/store";
import { listLike, officePerson } from "@/lib/todos/officeTo";

/**
 * Email forwarded (or copied) to the jobs address goes onto the job in
 * ServiceTitan: a note with who, when, the subject and the message, and the
 * email's own files attached to the job. The job is the number in the subject
 * ("20294 switchboard"), or "job 20294" in the message.
 *
 * Who can put something on a job this way: anyone at advancedgas.com.au or on
 * the team list, or the job's own customer replying with the address copied
 * in. Anyone else would be a stranger writing on our jobs, so theirs, and
 * anything without a job it can find, become a card for the office instead of
 * vanishing.
 *
 * Resend's webhook only says an email arrived; the message and its files are
 * read back from Resend's API by the email's id.
 */

const API = "https://api.resend.com";
const SEEN = "inbound_seen";
const TEAM_DOMAIN = /@advancedgas\.com\.au$/i;
/** Long enough for an ordinary chain; longer goes on as a text file beside the note. */
const NOTE_MAX = 3500;
const FILE_MAX = 10 * 1048576;
const FILES_MAX = 10;

type Received = { from?: string; to?: string[] | string; subject?: string | null; text?: string | null; html?: string | null; created_at?: string };
type ResendFile = { id: string; filename?: string | null; content_type?: string | null; content_disposition?: string | null; size?: number | null; download_url?: string | null };

export type InboundResult = { ok: true; job?: string; said: string } | { ok: false; retry: boolean; said: string };

const addressOf = (v: string | undefined | null) => (v?.match(/<([^>]+)>/)?.[1] ?? v ?? "").trim().toLowerCase();

async function resendGet<T>(path: string): Promise<T> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY isn't set");
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Resend ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

/** Plain text from the HTML part, for an email that came with no text part. */
const fromHtml = (html: string) =>
  html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');

const tidy = (t: string) => t.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

/** The job an email is about: a job number in the subject, else "job 20294" in the message. */
async function findJob(subject: string, text: string) {
  const nums = [
    ...[...subject.matchAll(/(?<![\d$.,])(\d{5,6})(?![\d,.])/g)].map((m) => m[1]),
    ...[...text.slice(0, 4000).matchAll(/\bjob\s*(?:no\.?|number)?\s*#?\s*(\d{5,6})\b/gi)].map((m) => m[1]),
  ];
  for (const n of [...new Set(nums)]) {
    const job = await sbSelectOne<{ id: number; job_number: string; customer_id: number | null; location_id: number | null; customer_name: string | null; suburb: string | null }>(
      "st_jobs", [q.select("id,job_number,customer_id,location_id,customer_name,suburb"), q.eq("job_number", n)].join("&"),
    ).catch(() => null);
    if (job) return job;
  }
  return null;
}

async function isTeam(from: string): Promise<boolean> {
  if (TEAM_DOMAIN.test(from)) return true;
  const u = await sbSelectOne<{ id: string }>("portal_users", [q.select("id"), `email=ilike.${encodeURIComponent(from)}`, "active=is.true"].join("&")).catch(() => null);
  return !!u;
}

async function isTheCustomer(from: string, job: { customer_id: number | null; location_id: number | null }): Promise<boolean> {
  const [cust, loc] = await Promise.all([
    job.customer_id ? sbSelect<{ id: number }>("st_customer_contacts", [q.select("id"), q.eq("customer_id", String(job.customer_id)), `value=ilike.${encodeURIComponent(from)}`].join("&")).catch(() => []) : [],
    job.location_id ? sbSelect<{ id: number }>("st_location_contacts", [q.select("id"), q.eq("location_id", String(job.location_id)), `value=ilike.${encodeURIComponent(from)}`].join("&")).catch(() => []) : [],
  ]);
  return cust.length > 0 || loc.length > 0;
}

async function tellOffice(title: string, notes: string) {
  const to = await officePerson("office");
  if (!to) return;
  await createAutoTodo({ title, notes, assigneeId: to.id, dueOn: isoDateMelbourne(new Date()), list: await listLike(/service\s*titan/i) }).catch(() => undefined);
}

export async function handleInbound(d: Record<string, unknown>): Promise<InboundResult> {
  const emailId = typeof d.email_id === "string" ? d.email_id : null;
  if (!emailId) return { ok: true, said: "no email id" };
  // Resend retries a webhook it didn't get a 200 for; an email already put on
  // a job mustn't go on twice.
  const seen = (await getSettings<string[]>(SEEN).catch(() => null)) ?? [];
  if (seen.includes(emailId)) return { ok: true, said: "already done" };
  const markSeen = () => saveSettings(SEEN, [...seen, emailId].slice(-300)).catch(() => undefined);

  let mail: Received;
  try {
    mail = await resendGet<Received>(`/emails/receiving/${encodeURIComponent(emailId)}`);
  } catch (e) {
    return { ok: false, retry: true, said: (e as Error).message };
  }
  const from = addressOf(mail.from ?? (typeof d.from === "string" ? d.from : ""));
  const subject = (mail.subject ?? "").trim();
  const text = tidy(mail.text?.trim() ? mail.text : mail.html ? fromHtml(mail.html) : "");
  const what = `“${subject || "(no subject)"}” from ${from || "an unknown sender"}`;

  const job = await findJob(subject, text);
  if (!job) {
    await tellOffice(`Email to the jobs address with no job on it: ${subject || "(no subject)"}`.slice(0, 280),
      `${what}. No job number in the subject (e.g. "20294 switchboard"), or the number isn't a job in ServiceTitan's copy here. Forward it again with the job number at the front of the subject.`);
    await markSeen();
    return { ok: true, said: "no job found" };
  }
  if (!(await isTeam(from)) && !(await isTheCustomer(from, job))) {
    await tellOffice(`Email about job ${job.job_number} not added: from outside the team`,
      `${what}. Only the team, or the job's own customer, can put an email on a job this way. If it belongs there, forward it from your own email.`);
    await markSeen();
    return { ok: true, job: job.job_number, said: "sender not allowed" };
  }
  if (!serviceTitanConfigured()) return { ok: false, retry: false, said: "ServiceTitan isn't connected" };

  // The files first, so the note can say what came with it.
  let files: ResendFile[] = [];
  try {
    files = (await resendGet<{ data?: ResendFile[] }>(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`)).data ?? [];
  } catch {
    files = [];
  }
  // Inline images are signatures and logos, not the job's.
  const real = files.filter((f) => f.content_disposition !== "inline" && f.download_url && (f.size ?? 0) <= FILE_MAX).slice(0, FILES_MAX);
  const put: string[] = [];
  for (const f of real) {
    try {
      const res = await fetch(f.download_url!, { cache: "no-store" });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const name = (f.filename || `attachment-${f.id}`).replace(/[\\/]/g, "_").slice(0, 120);
      await stUpload(stTenantPath("forms", `jobs/${job.id}/attachments`), name, bytes, f.content_type || "application/octet-stream");
      put.push(name);
    } catch {
      // Left off; the note says how many went on.
    }
  }

  const when = new Date(mail.created_at ?? Date.now()).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const long = text.length > NOTE_MAX;
  if (long) {
    // The whole chain as a text file on the job, so nothing past the note's cut is lost.
    const stamp = isoDateMelbourne(new Date(mail.created_at ?? Date.now()));
    await stUpload(stTenantPath("forms", `jobs/${job.id}/attachments`), `email-${stamp}-${emailId.slice(0, 8)}.txt`,
      new TextEncoder().encode(`From: ${mail.from ?? from}\nSubject: ${subject}\nDate: ${when}\n\n${text}`), "text/plain").catch(() => undefined);
  }
  const note = [
    `Email from ${mail.from ?? from}, ${when}\nSubject: ${subject || "(none)"}`,
    long ? `${text.slice(0, NOTE_MAX).trimEnd()}…\n(The whole email is attached to the job as a text file.)` : text || "(no message text)",
    [
      put.length ? `Attached to the job: ${put.join(", ")}` : null,
      real.length > put.length ? `${real.length - put.length} of the email's files couldn't be attached.` : null,
      "— added from the jobs email address",
    ].filter(Boolean).join("\n"),
  ].join("\n\n");
  try {
    await stSend("POST", stTenantPath("jpm", `jobs/${job.id}/notes`), { text: note.slice(0, 4900), pinToTop: false });
  } catch (e) {
    await tellOffice(`Email couldn't go on job ${job.job_number} in ServiceTitan`, `${what}. ServiceTitan refused the note: ${(e as Error).message.slice(0, 200)}. ${put.length ? `Its files did go on the job (${put.length}).` : ""}`);
    await markSeen();
    return { ok: true, job: job.job_number, said: "note refused" };
  }
  await markSeen();
  return { ok: true, job: job.job_number, said: `noted${put.length ? ` with ${put.length} files` : ""}` };
}
