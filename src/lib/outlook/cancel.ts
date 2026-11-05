import "server-only";
import { q, sbSelect, sbSelectOne, sbUpdate } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { addressOf, type GraphMessage } from "./outlookTypes";
import { dedupeKey, siteKey, type WorkOrder } from "./workOrderTypes";

/**
 * An agency cancelling a work order cancels the job (Jake, 5 Nov: "make
 * cancellations cancel the job automatically"; 19 Celestine Drive was
 * cancelled two minutes after it was accepted).
 *
 * Narrow on purpose, because a wrong cancellation pulls a booked job off
 * somebody's day:
 *  - only a job the portal itself made from an emailed work order, found
 *    by the thread, the work order number, or the address (work_orders);
 *    never a job the office booked by hand
 *  - only while ServiceTitan says the job is still Scheduled, read live, not
 *    from the replica: a job a tech is on, or has done, is left alone
 *  - a Booking (from before jobs were made directly) isn't touched
 * Anything it won't do is handed to a person, saying which job and why.
 */

const TABLE = "work_orders";

type Target = { rowId: string; jobId: number | null; jobNumber: string | null; bookingId: string | null; address: string | null };
export type CancelOutcome = { done: boolean; line: string };

async function findTarget(mailbox: string, m: GraphMessage, w: WorkOrder): Promise<Target | null> {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const cols = "id,st_job_id,st_job_number,st_booking_id,address,dedupe_key,details,mailbox";
  // The thread first: the cancellation is a reply to the work order.
  if (m.conversationId) {
    const tied = await sbSelectOne<{ job_id: number }>("mail_drafts", [q.select("job_id"), q.eq("mailbox", mailbox), q.eq("conversation_id", m.conversationId), q.notNull("job_id"), "limit=1"].join("&")).catch(() => null);
    if (tied) {
      const row = await sbSelectOne<{ id: string; st_job_number: string | null; address: string | null }>(TABLE, [q.select("id,st_job_number,address"), q.eq("st_job_id", String(tied.job_id)), "limit=1"].join("&")).catch(() => null);
      if (row) return { rowId: row.id, jobId: tied.job_id, jobNumber: row.st_job_number, bookingId: null, address: row.address };
    }
  }
  const rows = await sbSelect<{ id: string; st_job_id: number | null; st_job_number: string | null; st_booking_id: string | null; address: string | null; dedupe_key: string | null; details: Partial<WorkOrder> | null }>(
    TABLE, [q.select(cols), q.eq("status", "booked"), q.isNull("cancelled_at"), q.gte("created_at", since), q.order("created_at", "desc"), "limit=200"].join("&"),
  );
  const keys = (["work_order", "quote_request", "quote_accepted"] as const).map((k) => dedupeKey(k, w.number, w.street, w.suburb));
  const site = siteKey(w.street, w.suburb);
  const hit =
    (w.number && rows.find((r) => r.dedupe_key && keys.includes(r.dedupe_key as string))) ||
    rows.find((r) => r.details?.street && siteKey(r.details.street, r.details.suburb ?? "") === site);
  return hit ? { rowId: hit.id, jobId: hit.st_job_id, jobNumber: hit.st_job_number, bookingId: hit.st_booking_id, address: hit.address } : null;
}

let reasonId: number | null | undefined;
async function cancelReason(): Promise<number | null> {
  if (reasonId !== undefined) return reasonId;
  const reasons = await stList<{ id: number; name: string; active?: boolean }>("jpm", "job-cancel-reasons", {}, 2).catch(() => []);
  const live = reasons.filter((r) => r.active !== false);
  reasonId = (live.find((r) => /agent|real estate|customer|client|tenant|owner/i.test(r.name)) ?? live.find((r) => /cancel/i.test(r.name)) ?? live[0])?.id ?? null;
  return reasonId;
}

export async function cancelFromEmail(mailbox: string, m: GraphMessage, w: WorkOrder): Promise<CancelOutcome> {
  const t = await findTarget(mailbox, m, w);
  const where = [w.street, w.suburb].filter(Boolean).join(", ") || "the property";
  if (!t) return { done: false, line: `cancellation for ${where}, but no job the portal made from a work order matches it; check by hand` };
  if (!t.jobId) return { done: false, line: `cancellation for ${t.address ?? where}: it's ServiceTitan booking ${t.bookingId ?? ""}, dismiss it there`.replace(" ,", ",") };

  const job = await stFetch<{ jobStatus?: string }>(stTenantPath("jpm", `jobs/${t.jobId}`));
  if (job.jobStatus !== "Scheduled") {
    return { done: false, line: `cancellation for job ${t.jobNumber ?? t.jobId}, which is ${job.jobStatus ?? "not scheduled"}, so it was left alone` };
  }
  const reason = await cancelReason();
  if (!reason) return { done: false, line: `cancellation for job ${t.jobNumber ?? t.jobId}: ServiceTitan has no cancel reason to use, cancel it by hand` };

  const when = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" }).format(Date.parse(m.receivedDateTime ?? "") || Date.now());
  const memo = `Cancelled by ${w.agency || addressOf(m.from)} by email, ${when}: "${(m.subject ?? "").slice(0, 120)}"`;
  await stSend("POST", stTenantPath("jpm", `jobs/${t.jobId}/cancel`), { reasonId: reason, memo });
  await stSend("POST", stTenantPath("jpm", `jobs/${t.jobId}/notes`), { text: `${memo}\n\nCancelled automatically by the portal from the email.`, pinToTop: false }).catch(() => undefined);
  await sbUpdate(TABLE, `id=eq.${t.rowId}`, { cancelled_at: new Date().toISOString(), cancel_note: memo.slice(0, 300), updated_at: new Date().toISOString() });
  return { done: true, line: `cancelled job ${t.jobNumber ?? t.jobId} at ${t.address ?? where}` };
}
