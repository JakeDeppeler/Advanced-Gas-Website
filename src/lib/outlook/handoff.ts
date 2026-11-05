import "server-only";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { graph, GraphError, userPath } from "./graph";
import { HANDOFF_CATEGORY } from "./handle";
import { repliedSince, type GraphMessage } from "./outlookTypes";

/**
 * Taking Needs a person off once somebody has replied.
 *
 * The tag is a to-do on the email: a person has to deal with this one. Once a
 * reply has gone out in the thread it's been dealt with, and a tag left on
 * would have the inbox saying otherwise.
 *
 * Two ways in. Sent Items is watched like the Inbox, so a reply sent from
 * Outlook, a phone or the web clears the tag within seconds (clearForSent).
 * The sweep then goes over every tag still on and checks its thread for a
 * reply (sweepHandoffs), for a notification Microsoft dropped.
 *
 * Only the tags this feature put on are touched. One the office added by hand
 * has no row here, and stays.
 */

const TABLE = "mail_drafts";
/** A tag older than this is left alone: the thread went quiet without a reply, which is the office's to judge. */
const LOOK_BACK_DAYS = 21;
const SWEEP_MAX = 15;

type Tagged = { message_id: string; conversation_id: string | null; received_at: string | null };

const open = (mailbox: string) => [
  q.eq("mailbox", mailbox),
  q.eq("status", "drafted"),
  q.notNull("handoff"),
  q.isNull("handoff_cleared_at"),
];

/** Take the tag off one email. True when it's off, or the email is gone. */
async function untag(mailbox: string, id: string): Promise<boolean> {
  const path = `${userPath(mailbox)}/messages/${encodeURIComponent(id)}`;
  let cats: string[];
  try {
    cats = (await graph<{ categories?: string[] }>(`${path}?$select=categories`)).categories ?? [];
  } catch (e) {
    // Deleted since: nothing left to take the tag off.
    if (e instanceof GraphError && e.status === 404) return true;
    throw e;
  }
  if (cats.includes(HANDOFF_CATEGORY)) {
    await graph(path, { method: "PATCH", body: { categories: cats.filter((c) => c !== HANDOFF_CATEGORY) } });
  }
  return true;
}

async function markCleared(mailbox: string, id: string) {
  await sbUpdate(TABLE, [q.eq("mailbox", mailbox), q.eq("message_id", id)].join("&"), { handoff_cleared_at: new Date().toISOString(), updated_at: new Date().toISOString() });
}

/** A message just landed in Sent Items: clear the tag on what it answered. */
export async function clearForSent(mailbox: string, sentId: string): Promise<number> {
  let sent: GraphMessage;
  try {
    sent = await graph<GraphMessage>(`${userPath(mailbox)}/messages/${encodeURIComponent(sentId)}?$select=id,conversationId,sentDateTime,isDraft,from,sender`);
  } catch (e) {
    if (e instanceof GraphError && e.status === 404) return 0;
    throw e;
  }
  if (sent.isDraft || !sent.conversationId) return 0;

  const rows = await sbSelect<Tagged>(TABLE, [q.select("message_id,conversation_id,received_at"), ...open(mailbox), q.eq("conversation_id", sent.conversationId)].join("&"));
  let cleared = 0;
  for (const r of rows) {
    // Only what arrived before this reply: a reply can't have answered an
    // email that came in after it.
    if (!repliedSince([sent], mailbox, r.received_at)) continue;
    if (await untag(mailbox, r.message_id)) {
      await markCleared(mailbox, r.message_id);
      cleared++;
    }
  }
  return cleared;
}

/** Every tag still on in the last three weeks: has its thread had a reply? */
export async function sweepHandoffs(mailbox: string, deadline: number): Promise<{ checked: number; cleared: number; error?: string }> {
  const since = new Date(Date.now() - LOOK_BACK_DAYS * 86_400_000).toISOString();
  const out = { checked: 0, cleared: 0 } as { checked: number; cleared: number; error?: string };
  try {
    const rows = await sbSelect<Tagged>(TABLE, [q.select("message_id,conversation_id,received_at"), ...open(mailbox), q.gte("received_at", since), q.order("received_at", "asc"), `limit=${SWEEP_MAX}`].join("&"));
    for (const r of rows) {
      if (Date.now() > deadline) break;
      if (!r.conversation_id) continue;
      out.checked++;
      const f = encodeURIComponent(`conversationId eq '${r.conversation_id.replace(/'/g, "''")}'`);
      const thread = await graph<{ value: GraphMessage[] }>(`${userPath(mailbox)}/messages?$filter=${f}&$select=id,from,sender,sentDateTime,receivedDateTime,isDraft&$top=30`);
      if (!repliedSince(thread.value.filter((t) => t.id !== r.message_id), mailbox, r.received_at)) continue;
      if (await untag(mailbox, r.message_id)) {
        await markCleared(mailbox, r.message_id);
        out.cleared++;
      }
    }
  } catch (e) {
    out.error = (e as Error).message;
  }
  return out;
}
