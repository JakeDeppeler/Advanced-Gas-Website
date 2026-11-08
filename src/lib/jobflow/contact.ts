import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { loadTemplates } from "@/lib/email/templates/store";
import { HOW_LABEL, isHow } from "@/lib/pipeline/types";
import { latest, quietFor, SENT_KIND, waitingOn, type Contact, type Touch } from "./contactTypes";
import type { FlowRow, StageRows } from "./load";
import type { FlowStage } from "./types";

/**
 * Puts the customer's side on every line of the Job tracker (rules in
 * contactTypes.ts): the last time we and they were in touch, the next email
 * going to them by itself, and who the job is waiting on.
 *
 * "In touch" is anything the portal can see happen between us: an email we
 * sent (follow-ups, replies, review and booking emails), an email from them
 * into admin@ or jake@ and our reply in that thread, a button they tapped, a
 * call logged on the Pipeline, and a visit to their place. Matched to the
 * customer by the email addresses ServiceTitan holds for them, never by name.
 * A call made and not logged can't be seen, so a line can read quieter than
 * it was; logging calls on the Pipeline is what keeps it honest.
 */

const DAY = 86_400_000;
const LOOK_BACK_DAYS = 120;
const SKIP: FlowStage[] = ["imported", "enquiry"];
const TAPPED = { yes: "They tapped “Let's go ahead”", question: "They tapped “I've got a question”", no: "They tapped “Not this time”" } as const;

const chunks = <T,>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
async function byIds<T>(table: string, cols: string, col: string, ids: (number | string)[], extra: string[] = []): Promise<T[]> {
  const uniq = [...new Set(ids.map(String))];
  if (!uniq.length) return [];
  const quote = (v: string) => (/^\d+$/.test(v) ? v : `"${v}"`);
  return (await Promise.all(chunks(uniq).map((c) => sbSelect<T>(table, [q.select(cols), `${col}=in.(${c.map(quote).join(",")})`, ...extra, "limit=10000"].join("&"))))).flat();
}

const idFrom = (re: RegExp, s: string | null | undefined) => { const m = s ? re.exec(s) : null; return m ? Number(m[1]) : null; };
const words = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

type Line = { row: FlowRow; stage: FlowStage; customerId: number | null; jobId: number | null; quoteKey: string | null };

export async function attachContact(stages: Record<FlowStage, StageRows>, nowMs: number): Promise<void> {
  const lines: Line[] = [];
  for (const [k, s] of Object.entries(stages) as [FlowStage, StageRows][]) {
    if (SKIP.includes(k) || !s.rows) continue;
    for (const row of s.rows) {
      const jobId = idFrom(/\/Job\/Index\/(\d+)/, row.stUrl);
      lines.push({
        row, stage: k,
        customerId: idFrom(/\/portal\/customers\/(\d+)/, row.customerUrl),
        jobId,
        quoteKey: row.key.startsWith("quote-") ? row.key.slice(6) : jobId ? `j${jobId}` : null,
      });
    }
  }
  if (!lines.length) return;

  const since = new Date(nowMs - LOOK_BACK_DAYS * DAY).toISOString();
  const custIds = lines.map((l) => l.customerId).filter((c): c is number => c != null);
  const jobIds = lines.map((l) => l.jobId).filter((j): j is number => j != null);
  const keys = lines.map((l) => l.quoteKey).filter((k): k is string => !!k);

  const [contacts, sent, inbound, answers, touches, visits, jobs, tagNames, followups] = await Promise.all([
    byIds<{ customer_id: number; value: string }>("st_customer_contacts", "customer_id,value", "customer_id", custIds, [q.eq("type", "Email"), "active=not.is.false"]),
    sbSelect<{ kind: string; to_email: string | null; subject: string | null; created_at: string; about: Record<string, unknown> | null }>("portal_email_events", [
      q.select("kind,to_email,subject,created_at,about"), q.gte("created_at", since), `kind=in.(${Object.keys(SENT_KIND).map((k) => `"${k}"`).join(",")})`, "status=in.(sent,delivered)", "limit=10000",
    ].join("&")),
    sbSelect<{ from_address: string | null; received_at: string; sent_at: string | null }>("mail_drafts", [q.select("from_address,received_at,sent_at"), q.gte("received_at", since), "limit=10000"].join("&")),
    byIds<{ job_id: number; answer: "yes" | "question" | "no"; created_at: string }>("portal_quote_answers", "job_id,answer,created_at", "job_id", jobIds),
    byIds<{ quote_key: string; how: string; created_at: string }>("portal_quote_touches", "quote_key,how,created_at", "quote_key", keys, [q.gte("created_at", since), "how=neq.note"]),
    byIds<{ job_id: number; start_at: string | null }>("st_appointments", "job_id,start_at", "job_id", jobIds, ["status=neq.Canceled", q.lt("start_at", new Date(nowMs).toISOString()), q.gte("start_at", since)]),
    byIds<{ id: number; tags: unknown }>("st_jobs", "id,tags:raw->tagTypeIds", "id", jobIds),
    sbSelect<{ id: number; name: string | null }>("st_job_tags", "select=id,name"),
    byIds<{ quote_key: string; kind: string | null; started_at: string }>("portal_quote_followups", "quote_key,kind,started_at", "quote_key", keys, ["status=eq.active"]),
  ]);
  const sends = followups.length ? await byIds<{ quote_key: string; template_key: string; status: string }>("portal_quote_followup_sends", "quote_key,template_key,status", "quote_key", followups.map((f) => f.quote_key)) : [];
  const templates = followups.length ? (await loadTemplates()).templates : [];

  // Their addresses, then everything to and from each address, newest kept.
  const emailsOf = new Map<number, Set<string>>();
  for (const c of contacts) {
    const e = c.value?.trim().toLowerCase();
    if (e && e.includes("@")) emailsOf.set(Number(c.customer_id), (emailsOf.get(Number(c.customer_id)) ?? new Set()).add(e));
  }
  const byEmail = new Map<string, Touch[]>();
  const add = (e: string, t: Touch) => byEmail.set(e, [...(byEmail.get(e) ?? []), t]);
  for (const s of sent) {
    if (s.about && (s.about as { preview?: unknown }).preview === true) continue;
    for (const e of (s.to_email ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)) add(e, { at: s.created_at, what: `${SENT_KIND[s.kind] ?? "Email"} sent` });
  }
  for (const m of inbound) {
    const e = (m.from_address ?? "").trim().toLowerCase();
    if (!e) continue;
    add(e, { at: m.received_at, what: "They emailed" });
    if (m.sent_at) add(e, { at: m.sent_at, what: "We replied by email" });
  }
  const lastByJob = new Map<number, Touch>();
  const keep = (m: Map<number | string, Touch>, k: number | string, t: Touch) => { const cur = m.get(k); if (!cur || t.at > cur.at) m.set(k, t); };
  for (const a of answers) keep(lastByJob as Map<number | string, Touch>, Number(a.job_id), { at: a.created_at, what: TAPPED[a.answer] ?? "They answered" });
  for (const v of visits) if (v.start_at) keep(lastByJob as Map<number | string, Touch>, Number(v.job_id), { at: v.start_at, what: "We were there" });
  const lastByKey = new Map<string, Touch>();
  for (const t of touches) if (t.how !== "no_answer") keep(lastByKey as Map<number | string, Touch>, t.quote_key, { at: t.created_at, what: isHow(t.how) ? HOW_LABEL[t.how] : "In touch" });
  const tagName = new Map(tagNames.map((t) => [Number(t.id), t.name ?? ""]));
  const tagsOf = new Map(jobs.map((j) => [Number(j.id), (Array.isArray(j.tags) ? j.tags : []).map((x) => tagName.get(Number(x)) ?? "").filter(Boolean)]));

  for (const l of lines) {
    const mine = l.customerId ? [...(emailsOf.get(l.customerId) ?? [])].flatMap((e) => byEmail.get(e) ?? []) : [];
    // The step itself is a contact: the quote going out, the sale.
    const stepAt = l.stage === "quoted" || l.stage === "sold" ? { at: new Date(nowMs - l.row.days * DAY).toISOString(), what: l.stage === "sold" ? "Sold" : "Quoted" } : null;
    const last = latest([...mine, l.jobId ? lastByJob.get(l.jobId) : null, l.quoteKey ? lastByKey.get(l.quoteKey) : null, stepAt]);

    let next: Contact["next"] = null;
    const f = l.quoteKey ? followups.find((x) => x.quote_key === l.quoteKey) : undefined;
    if (f) {
      const done = new Set(sends.filter((s) => s.quote_key === f.quote_key && s.status !== "failed").map((s) => s.template_key));
      const t = templates.filter((x) => x.series === f.kind && x.active && x.day != null).sort((a, b) => (a.day ?? 0) - (b.day ?? 0)).find((x) => !done.has(x.key));
      if (t) next = { what: `Follow-up: ${t.name}`, on: new Date(Date.parse(f.started_at) + (t.day ?? 0) * DAY).toISOString() };
    }
    const tags = l.jobId ? tagsOf.get(l.jobId) ?? [] : [];
    l.row.contact = {
      last,
      next,
      waiting: waitingOn(tags.filter((t) => words(t) !== "awaiting quote approval"), l.stage),
      quietDays: quietFor(last, l.stage, nowMs),
    };
  }
}
