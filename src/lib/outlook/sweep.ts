import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { graph, outlookMailboxes, userPath } from "./graph";
import { handleMessage, type Outcome } from "./handle";
import { ensureSubscriptions, type SubStatus } from "./subscriptions";
import { MAX_AGE_MS } from "./outlookTypes";

/**
 * The safety net under the webhook.
 *
 * Microsoft drops notifications to an endpoint that answers slowly or fails,
 * a subscription can lapse, and a deploy can land in the middle of one. So
 * every run keeps the subscriptions alive and then looks through each Inbox
 * for the last three days for any email with no record in mail_drafts, or
 * one whose last try failed and is due another. Whatever the webhook missed
 * gets its draft here, late rather than never.
 */

/** Ids are long; this many keeps the lookup URL to the database comfortably short. */
const LIST = 40;
/** Drafts are a few seconds each; this keeps a run well inside the function's minute. */
const BUDGET_MS = 40_000;
const STARTED_KEY = "outlook_started";

export type SweepResult = { subscriptions: SubStatus[] | { error: string }; mailboxes: { mailbox: string; seen: number; handled: (Outcome & { id: string })[]; error?: string }[] };

export async function sweep(): Promise<SweepResult> {
  const started = Date.now();
  const subscriptions = await ensureSubscriptions().catch((e: Error) => ({ error: e.message }));
  // When each mailbox was switched on. The sweep never reaches back past it:
  // the first run would otherwise write drafts for three days of email that
  // had already been read and dealt with by phone.
  const switchedOn = (await getSettings<Record<string, string>>(STARTED_KEY).catch(() => null)) ?? {};
  const missing = outlookMailboxes().filter((m) => !switchedOn[m]);
  if (missing.length) {
    for (const m of missing) switchedOn[m] = new Date().toISOString();
    await saveSettings(STARTED_KEY, switchedOn);
  }
  const mailboxes: SweepResult["mailboxes"] = [];

  for (const mailbox of outlookMailboxes()) {
    const entry: SweepResult["mailboxes"][number] = { mailbox, seen: 0, handled: [] };
    mailboxes.push(entry);
    try {
      const since = new Date(Math.max(Date.now() - MAX_AGE_MS, Date.parse(switchedOn[mailbox]) || 0)).toISOString();
      const f = encodeURIComponent(`receivedDateTime ge ${since}`);
      const inbox = await graph<{ value: { id: string }[] }>(
        `${userPath(mailbox)}/mailFolders('Inbox')/messages?$filter=${f}&$orderby=receivedDateTime%20desc&$select=id&$top=${LIST}`,
      );
      entry.seen = inbox.value.length;
      if (!inbox.value.length) continue;

      const ids = inbox.value.map((m) => m.id);
      const rows = await sbSelect<{ message_id: string; status: string; attempts: number }>(
        "mail_drafts",
        [q.select("message_id,status,attempts"), q.eq("mailbox", mailbox), `message_id=in.(${ids.map((i) => `"${encodeURIComponent(i)}"`).join(",")})`].join("&"),
      );
      const byId = new Map(rows.map((r) => [r.message_id, r]));
      // New first, then failed ones still with tries left. handleMessage's
      // claim decides whether a failed one is actually due yet.
      const todo = [
        ...ids.filter((i) => !byId.has(i)),
        ...ids.filter((i) => ["failed", "working"].includes(byId.get(i)?.status ?? "") && (byId.get(i)?.attempts ?? 0) < 3),
      ];
      for (const id of todo) {
        if (Date.now() - started > BUDGET_MS) break;
        const o = await handleMessage(mailbox, id);
        if (o.status !== "taken") entry.handled.push({ id: id.slice(-12), ...o });
      }
    } catch (e) {
      entry.error = (e as Error).message;
    }
  }

  return { subscriptions, mailboxes };
}
