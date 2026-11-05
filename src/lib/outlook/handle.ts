import "server-only";
import { dashboardDbConfigured, q, sbInsertIfAbsent, sbSelect, sbSelectOne, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { getChatSettings } from "@/lib/chat/store";
import { chatSettingsFrom } from "@/lib/chat/chatTypes";
import { graph, GraphError, userPath } from "./graph";
import { customerContext } from "./customer";
import { MailDraftError, writeMailDraft } from "./draft";
import { retireOlderDrafts } from "./drafts";
import { draftNote, handleWorkOrder, isManualIn } from "./workOrders";
import { findJob, putOnJob, type JobMatch } from "./jobLink";
import { isTeamForward } from "./workOrderTypes";
import { MAX_AGE_MS, TEAM_DOMAIN, addressOf, answeredReason, plainText, insertIntoBody, replyHtml, signoffFor, skipReason, threadText, type GraphMessage } from "./outlookTypes";

/**
 * One incoming email, from notification to a draft reply waiting in Outlook.
 *
 * The webhook and the sweep both call this, sometimes for the same email at
 * the same moment, so every email is claimed in mail_drafts first and only the
 * caller that wins the claim goes on. That row is also the record of what
 * happened to each email, which is the only way to answer "why didn't this
 * one get a draft?" after the fact.
 */

const TABLE = "mail_drafts";
const MAX_ATTEMPTS = 3;
/** A claim this old with no outcome is a run that died part way; take it over. */
const STALE_WORKING_MS = 10 * 60 * 1000;
/** Before trying a failed one again, so a sweep straight after a failure doesn't hammer a struggling service. */
const RETRY_AFTER_MS = 5 * 60 * 1000;
/** Put on the original email when the draft says a person should handle it, so it stands out in the inbox. */
export const HANDOFF_CATEGORY = "Needs a person";
/** Put on an email once it's gone onto its job in ServiceTitan. */
export const ON_JOB_CATEGORY = "On a job";

const MESSAGE_FIELDS = "id,internetMessageId,conversationId,subject,from,sender,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isDraft,hasAttachments,internetMessageHeaders,uniqueBody,categories";
const THREAD_FIELDS = "id,subject,from,sender,receivedDateTime,sentDateTime,isDraft,hasAttachments,uniqueBody";

type Row = { status: "working" | "drafted" | "skipped" | "failed"; attempts: number; updated_at: string };
export type Outcome = { status: "drafted" | "skipped" | "failed" | "taken"; reason?: string };

const filter = (mailbox: string, id: string) => [q.eq("mailbox", mailbox), q.eq("message_id", id)];

async function claim(mailbox: string, id: string, now: number): Promise<boolean> {
  if (await sbInsertIfAbsent(TABLE, { mailbox, message_id: id, status: "working" }, "mailbox,message_id")) return true;
  const row = await sbSelectOne<Row>(TABLE, [q.select("status,attempts,updated_at"), ...filter(mailbox, id)].join("&"));
  if (!row) return false;
  const age = now - Date.parse(row.updated_at);
  const again = (row.status === "failed" && row.attempts < MAX_ATTEMPTS && age > RETRY_AFTER_MS) || (row.status === "working" && age > STALE_WORKING_MS);
  if (!again) return false;
  // Filtered on the values just read, so of two callers racing to take it
  // over, the second one's PATCH matches nothing.
  const got = await sbUpdateReturning(TABLE, [...filter(mailbox, id), q.eq("status", row.status), q.eq("attempts", String(row.attempts))].join("&"), {
    status: "working",
    attempts: row.attempts + 1,
    updated_at: new Date(now).toISOString(),
  });
  return got.length > 0;
}

async function finish(mailbox: string, id: string, patch: Record<string, unknown>) {
  await sbUpdate(TABLE, filter(mailbox, id).join("&"), { ...patch, updated_at: new Date().toISOString() });
}

const retryable = (e: unknown) =>
  e instanceof MailDraftError ? e.retry : e instanceof GraphError ? e.status === 429 || e.status >= 500 : true;

/**
 * maxAgeMs: how old an email may be and still get a draft. Three days unless
 * the sweep is working through a catch-up the office asked for.
 */
export async function handleMessage(mailbox: string, id: string, opts: { maxAgeMs?: number } = {}): Promise<Outcome> {
  if (!dashboardDbConfigured()) return { status: "failed", reason: "database not configured" };
  if (!(await claim(mailbox, id, Date.now()))) return { status: "taken" };

  const done = async (o: Outcome, extra: Record<string, unknown> = {}) => {
    await finish(mailbox, id, { status: o.status, reason: o.reason ?? null, ...extra });
    return o;
  };

  try {
    const box = userPath(mailbox);
    let m: GraphMessage & { categories?: string[] };
    try {
      m = await graph(`${box}/messages/${encodeURIComponent(id)}?$select=${MESSAGE_FIELDS}`, { text: true });
    } catch (e) {
      if (e instanceof GraphError && e.status === 404) return done({ status: "skipped", reason: "deleted before it could be read" });
      throw e;
    }

    const from = addressOf(m.from) || addressOf(m.sender);
    await finish(mailbox, id, {
      internet_message_id: m.internetMessageId ?? null,
      conversation_id: m.conversationId ?? null,
      received_at: m.receivedDateTime ?? null,
      from_address: from || null,
      subject: (m.subject ?? "").slice(0, 300),
    });

    // Work orders before anything else. A forward from the team is the office
    // sending one in, and is only that: no draft. One that arrived by itself
    // (or already carries the Work order category) is booked, and then
    // drafted as usual, the draft told it's in ServiceTitan.
    let workOrder: string | undefined;
    const recent = Date.now() - (Date.parse(m.receivedDateTime ?? "") || 0) < (opts.maxAgeMs ?? MAX_AGE_MS);
    const external = !TEAM_DOMAIN.test(from);
    const words = plainText(m.uniqueBody);

    // A reply in a thread that's already on a job is about that job: it goes
    // on the job, and isn't read as a new work order (24 Melzak Way, 5 Nov:
    // a "Re:" from Tapi became a second job).
    let onJob: JobMatch | null = null;
    if (!m.isDraft && external && m.conversationId) onJob = await findJob(mailbox, { ...m, subject: "", uniqueBody: null }, "", "").catch(() => null);

    if (!m.isDraft && recent && !onJob) {
      const forward = isTeamForward(m);
      if (forward || isManualIn(m) || external) {
        const wo = await handleWorkOrder(mailbox, m, forward ? "forward" : isManualIn(m) ? "category" : "auto")
          .catch((e: Error) => ({ status: "failed" as const, reason: e.message }));
        const tie = "jobId" in wo && wo.jobId ? { job_id: wo.jobId, job_number: wo.jobNumber ?? null, job_how: wo.status === "booked" ? "made from this work order" : "a reply about this job", job_linked_at: new Date().toISOString() } : {};
        if (forward) return done({ status: "skipped", reason: `forwarded by the team: work order ${wo.status}${wo.reason ? ` (${wo.reason})` : ""}`.slice(0, 300) }, tie);
        // A work order gets booked, and the tenant emailed; no reply draft
        // (Jake, 5 Nov: "not reply to work orders and just upload them").
        if ("isWorkOrder" in wo && wo.isWorkOrder) return done({ status: "skipped", reason: `work order: ${wo.status === "booked" ? "booked into ServiceTitan" : wo.status === "duplicate" ? (wo.reason ?? "already booked from an earlier email") : `booking ${wo.status}${wo.reason ? ` (${wo.reason})` : ""}`}`.slice(0, 300) }, tie);
        workOrder = draftNote(wo);
      }
    }

    // An email about a job goes on the job, whatever then happens with the
    // draft. Not mail from us, or from machines (the skip rules below).
    if (!m.isDraft && external && !skipReason(m, mailbox, Date.now(), opts.maxAgeMs)) {
      onJob ??= await findJob(mailbox, m, from, words).catch(() => null);
      if (onJob) {
        const match = onJob;
        await putOnJob(mailbox, m, match.jobId)
          .then(async () => {
            await finish(mailbox, id, { job_id: match.jobId, job_number: match.jobNumber, job_how: match.how, job_linked_at: new Date().toISOString() });
            // So the inbox shows it's on the job without opening ServiceTitan.
            const cats = m.categories ?? [];
            if (!cats.includes(ON_JOB_CATEGORY)) await graph(`${box}/messages/${encodeURIComponent(id)}`, { method: "PATCH", body: { categories: [...cats, ON_JOB_CATEGORY] } }).catch(() => undefined);
          })
          .catch((e: Error) => finish(mailbox, id, { job_how: `couldn't go on job ${match.jobNumber ?? match.jobId}: ${e.message}`.slice(0, 300) }));
      }
    }

    const skip = skipReason(m, mailbox, Date.now(), opts.maxAgeMs);
    if (skip) return done({ status: "skipped", reason: skip });

    // The whole conversation, every folder, so Sent Items show whether it has
    // been answered. Filtered only: Graph refuses a conversationId filter
    // combined with an order on another field, so the sort happens here.
    let thread: GraphMessage[] = [m];
    if (m.conversationId) {
      const f = encodeURIComponent(`conversationId eq '${m.conversationId.replace(/'/g, "''")}'`);
      const got = await graph<{ value: GraphMessage[] }>(`${box}/messages?$filter=${f}&$select=${THREAD_FIELDS}&$top=30`, { text: true }).catch(() => null);
      if (got?.value?.length) thread = got.value.some((t) => t.id === m.id) ? got.value : [...got.value, m];
    }
    const answered = answeredReason(m, thread, mailbox);
    if (answered) return done({ status: "skipped", reason: answered });

    const [customer, settings] = await Promise.all([
      customerContext(from, m.subject ?? "").catch(() => ""),
      getChatSettings().catch(() => chatSettingsFrom(null)),
    ]);

    // The office's own recent replies, each beside the draft it started from:
    // how the drafts learn what this office actually sends.
    const examples = await sbSelect<{ draft_text: string; sent_text: string }>(TABLE, [q.select("draft_text,sent_text"), q.eq("mailbox", mailbox), q.notNull("sent_text"), q.notNull("draft_text"), q.order("sent_at", "desc", "last"), "limit=8"].join("&")).catch(() => []);
    const draft = await writeMailDraft({ thread: threadText(thread, mailbox), customer, signoff: signoffFor(mailbox), settings, workOrder, examples: examples.map((e) => ({ draft: e.draft_text, sent: e.sent_text })) });
    if (!draft.replyNeeded) return done({ status: "skipped", reason: `no reply needed: ${draft.whyNot || "not something we'd answer"}` });

    // createReply makes the draft the way Outlook's Reply button does —
    // addressed, threaded, the original quoted underneath — and the reply goes
    // in above the quote. Only Mail.ReadWrite is needed; nothing here sends.
    const reply = await graph<GraphMessage>(`${box}/messages/${encodeURIComponent(id)}/createReply`, { method: "POST", body: {} });
    try {
      const current = reply.body?.content
        ? reply.body
        : (await graph<GraphMessage>(`${box}/messages/${encodeURIComponent(reply.id)}?$select=body`)).body;
      const html = current?.contentType?.toLowerCase() === "html" ? current.content ?? "" : "";
      await graph(`${box}/messages/${encodeURIComponent(reply.id)}`, {
        method: "PATCH",
        body: { body: { contentType: "HTML", content: insertIntoBody(html || "<html><body></body></html>", replyHtml(draft.reply)) } },
      });
    } catch (e) {
      // An empty reply left in the thread would read as "already a draft" on
      // the retry and the email would never get one.
      await graph(`${box}/messages/${encodeURIComponent(reply.id)}`, { method: "DELETE" }).catch(() => undefined);
      throw e;
    }

    if (draft.handoff) {
      const cats = m.categories ?? [];
      if (!cats.includes(HANDOFF_CATEGORY)) {
        await graph(`${box}/messages/${encodeURIComponent(id)}`, { method: "PATCH", body: { categories: [...cats, HANDOFF_CATEGORY] } }).catch(() => undefined);
      }
    }

    const result = await done({ status: "drafted" }, { draft_id: reply.id, handoff: draft.handoff || null, draft_text: draft.reply });
    // This thread's earlier drafts are out of date now. Recorded first, so a
    // failure here never costs the email its own draft.
    if (m.conversationId) await retireOlderDrafts(mailbox, m.conversationId, id).catch(() => undefined);
    return result;
  } catch (e) {
    const reason = (e as Error).message.slice(0, 300);
    // Out of retries, or not the kind that a retry fixes: it stays failed
    // and the sweep leaves it alone.
    await finish(mailbox, id, { status: "failed", reason, ...(retryable(e) ? {} : { attempts: MAX_ATTEMPTS }) }).catch(() => undefined);
    return { status: "failed", reason };
  }
}
