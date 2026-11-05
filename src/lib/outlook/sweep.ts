import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { graph, outlookMailboxes, userPath } from "./graph";
import { handleMessage, type Outcome } from "./handle";
import { ensureSubscriptions, type SubStatus } from "./subscriptions";
import { sweepHandoffs } from "./handoff";
import { MAX_AGE_MS } from "./outlookTypes";

/**
 * The safety net under the webhook, and the office's catch-up.
 *
 * Microsoft drops notifications to an endpoint that answers slowly or fails,
 * a subscription can lapse, and a deploy can land in the middle of one. So
 * every run keeps the subscriptions alive and then looks through each Inbox
 * for the last three days for any email with no record in mail_drafts, or
 * one whose last try failed and is due another. Whatever the webhook missed
 * gets its draft here, late rather than never.
 */

/** The lookup in mail_drafts goes this many ids at a time: they're long, and it's a URL. */
const CHUNK = 40;
/** Inbox pages of this many, and at most this many pages: a week of a busy shared box. */
const PAGE = 50;
const MAX_PAGES = 6;
/** Drafts are a few seconds each; no new one starts after this, so a run ends inside the function's minute. */
const BUDGET_MS = 40_000;
/** Drafted side by side: one at a time, a catch-up of a week's email would take a dozen runs. */
const PARALLEL = 4;
/** The tag check gets what's left after the drafts, up to here: inside the function's minute. */
const TAGS_BUDGET_MS = 52_000;
const STARTED_KEY = "outlook_started";
/**
 * A catch-up the office asked for: { mailbox: ISO time }. While a mailbox has
 * one, the sweep reaches back to that time instead of three days, and drafts
 * whatever in it still needs a reply. It removes the entry itself once
 * everything in the window has been through.
 */
const BACKFILL_KEY = "outlook_backfill";

export type SweepResult = {
  subscriptions: SubStatus[] | { error: string };
  mailboxes: { mailbox: string; seen: number; left: number; backfill?: string; handled: (Outcome & { id: string })[]; error?: string }[];
  handoffs: { mailbox: string; checked: number; cleared: number; error?: string }[];
};

/** Every Inbox id received since `since`, newest first, page by page. */
async function inboxSince(mailbox: string, since: string): Promise<string[]> {
  const f = encodeURIComponent(`receivedDateTime ge ${since}`);
  let next: string | undefined = `${userPath(mailbox)}/mailFolders('Inbox')/messages?$filter=${f}&$orderby=receivedDateTime%20desc&$select=id&$top=${PAGE}`;
  const ids: string[] = [];
  for (let page = 0; next && page < MAX_PAGES; page++) {
    const res: { value: { id: string }[]; "@odata.nextLink"?: string } = await graph(next);
    ids.push(...res.value.map((m) => m.id));
    // nextLink is a full URL; graph() wants the part after the version.
    next = res["@odata.nextLink"]?.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, "");
  }
  return ids;
}

export async function sweep(): Promise<SweepResult> {
  const started = Date.now();
  const subscriptions = await ensureSubscriptions().catch((e: Error) => ({ error: e.message }));
  // When each mailbox was switched on. The sweep never reaches back past it:
  // the first run would otherwise write drafts for three days of email that
  // had already been read and dealt with by phone. A catch-up is the office
  // asking for exactly that, so it overrides this.
  const switchedOn = (await getSettings<Record<string, string>>(STARTED_KEY).catch(() => null)) ?? {};
  const missing = outlookMailboxes().filter((m) => !switchedOn[m]);
  if (missing.length) {
    for (const m of missing) switchedOn[m] = new Date().toISOString();
    await saveSettings(STARTED_KEY, switchedOn);
  }
  const backfill = (await getSettings<Record<string, string>>(BACKFILL_KEY).catch(() => null)) ?? {};
  let backfillChanged = false;
  const mailboxes: SweepResult["mailboxes"] = [];

  for (const mailbox of outlookMailboxes()) {
    const entry: SweepResult["mailboxes"][number] = { mailbox, seen: 0, left: 0, handled: [] };
    mailboxes.push(entry);
    try {
      const catchUp = Date.parse(backfill[mailbox] ?? "");
      const sinceMs = Number.isFinite(catchUp) ? catchUp : Math.max(Date.now() - MAX_AGE_MS, Date.parse(switchedOn[mailbox]) || 0);
      if (Number.isFinite(catchUp)) entry.backfill = backfill[mailbox];
      // An hour's slack so an email right at the edge isn't refused as too old.
      const maxAgeMs = Number.isFinite(catchUp) ? Date.now() - catchUp + 3600_000 : undefined;

      const ids = await inboxSince(mailbox, new Date(sinceMs).toISOString());
      entry.seen = ids.length;

      const rows: { message_id: string; status: string; attempts: number }[] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const part = ids.slice(i, i + CHUNK);
        rows.push(...(await sbSelect<{ message_id: string; status: string; attempts: number }>(
          "mail_drafts",
          [q.select("message_id,status,attempts"), q.eq("mailbox", mailbox), `message_id=in.(${part.map((x) => `"${encodeURIComponent(x)}"`).join(",")})`].join("&"),
        )));
      }
      const byId = new Map(rows.map((r) => [r.message_id, r]));
      // New first, then failed ones still with tries left. handleMessage's
      // claim decides whether a failed one is actually due yet.
      const todo = [
        ...ids.filter((i) => !byId.has(i)),
        ...ids.filter((i) => ["failed", "working"].includes(byId.get(i)?.status ?? "") && (byId.get(i)?.attempts ?? 0) < 3),
      ];

      let at = 0;
      const worker = async () => {
        while (at < todo.length && Date.now() - started < BUDGET_MS) {
          const id = todo[at++];
          const o = await handleMessage(mailbox, id, { maxAgeMs });
          if (o.status !== "taken") entry.handled.push({ id: id.slice(-12), ...o });
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      entry.left = todo.length - at;

      // The catch-up is done when everything in its window has been through
      // and nothing is waiting on a retry.
      const retrying = entry.handled.some((h) => h.status === "failed");
      if (Number.isFinite(catchUp) && entry.left === 0 && !retrying) {
        delete backfill[mailbox];
        backfillChanged = true;
      }
    } catch (e) {
      entry.error = (e as Error).message;
    }
  }
  if (backfillChanged) await saveSettings(BACKFILL_KEY, backfill).catch(() => undefined);

  // Needs a person off any email whose thread has had a reply the Sent Items
  // notification didn't report. After the drafts, which matter more.
  const handoffs: SweepResult["handoffs"] = [];
  for (const mailbox of outlookMailboxes()) {
    handoffs.push({ mailbox, ...(await sweepHandoffs(mailbox, started + TAGS_BUDGET_MS)) });
  }

  return { subscriptions, mailboxes, handoffs };
}
