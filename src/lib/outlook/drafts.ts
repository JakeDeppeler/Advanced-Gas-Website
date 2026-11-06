import "server-only";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { graph, GraphError, userPath } from "./graph";
import { untouched } from "./outlookTypes";

/**
 * One draft per thread: when a newer email in a thread gets a draft, the
 * older draft in that thread is out of date and goes.
 *
 * A thread collects drafts because each new email from the customer gets its
 * own, and the earlier one answers a question that has since moved on (Jake,
 * 5 Nov: two in the 5 Golden Green Street thread). Only drafts still exactly
 * as we wrote them are deleted; one somebody has edited stays, and so does
 * anything that isn't ours. Graph's delete is recoverable from the mailbox's
 * Recoverable Items for a while, not gone for good.
 *
 * Deleting one fires the Drafts notification like any other, which takes
 * Needs a person off the older email; the newer email carries the tag if the
 * thread still needs a person.
 */

const TABLE = "mail_drafts";
const LOOK_BACK_DAYS = 21;

type Row = { message_id: string; draft_id: string | null; conversation_id: string | null; received_at: string | null };
export type Retired = "removed" | "kept-edited" | "already-gone";

async function draftsFolder(mailbox: string): Promise<string> {
  return (await graph<{ id: string }>(`${userPath(mailbox)}/mailFolders('Drafts')?$select=id`)).id;
}

async function markSuperseded(mailbox: string, messageId: string) {
  await sbUpdate(TABLE, [q.eq("mailbox", mailbox), q.eq("message_id", messageId)].join("&"), { superseded_at: new Date().toISOString(), updated_at: new Date().toISOString() });
}

async function retire(mailbox: string, row: Row, folder: string): Promise<Retired> {
  let outcome: Retired = "already-gone";
  if (row.draft_id) {
    const path = `${userPath(mailbox)}/messages/${encodeURIComponent(row.draft_id)}`;
    let d: { createdDateTime?: string; lastModifiedDateTime?: string; parentFolderId?: string } | null = null;
    try {
      d = await graph(`${path}?$select=createdDateTime,lastModifiedDateTime,parentFolderId`);
    } catch (e) {
      if (!(e instanceof GraphError && e.status === 404)) throw e;
    }
    if (d && d.parentFolderId === folder) {
      if (untouched(d.createdDateTime, d.lastModifiedDateTime)) {
        await graph(path, { method: "DELETE" });
        outcome = "removed";
      } else {
        outcome = "kept-edited";
      }
    }
  }
  // Recorded whichever way it went, so the sweep doesn't ask again.
  await markSuperseded(mailbox, row.message_id);
  return outcome;
}

const ROW_COLS = "message_id,draft_id,conversation_id,received_at";
const open = (mailbox: string) => [q.eq("mailbox", mailbox), q.eq("status", "drafted"), q.isNull("superseded_at")];

/** A new draft was just made in this thread: retire the others. */
export async function retireOlderDrafts(mailbox: string, conversationId: string, keepMessageId: string): Promise<Retired[]> {
  const rows = await sbSelect<Row>(TABLE, [q.select(ROW_COLS), ...open(mailbox), q.eq("conversation_id", conversationId)].join("&"));
  const older = rows.filter((r) => r.message_id !== keepMessageId);
  if (!older.length) return [];
  const folder = await draftsFolder(mailbox);
  const out: Retired[] = [];
  for (const r of older) out.push(await retire(mailbox, r, folder));
  return out;
}

/** Every thread from the last three weeks with more than one of our drafts: keep the newest. */
export async function dedupeDrafts(mailbox: string, deadline: number): Promise<{ threads: number; removed: number; keptEdited: number; error?: string }> {
  const out = { threads: 0, removed: 0, keptEdited: 0 } as { threads: number; removed: number; keptEdited: number; error?: string };
  try {
    const since = new Date(Date.now() - LOOK_BACK_DAYS * 86_400_000).toISOString();
    const rows = await sbSelect<Row>(TABLE, [q.select(ROW_COLS), ...open(mailbox), q.notNull("conversation_id"), q.gte("received_at", since), q.order("received_at", "desc", "last")].join("&"));
    const threads = new Map<string, Row[]>();
    for (const r of rows) threads.set(r.conversation_id!, [...(threads.get(r.conversation_id!) ?? []), r]);
    const dupes = [...threads.values()].filter((t) => t.length > 1);
    if (!dupes.length) return out;
    const folder = await draftsFolder(mailbox);
    for (const t of dupes) {
      if (Date.now() > deadline) break;
      out.threads++;
      // Newest first, so the first is the one that stays.
      for (const r of t.slice(1)) {
        const o = await retire(mailbox, r, folder);
        if (o === "removed") out.removed++;
        if (o === "kept-edited") out.keptEdited++;
      }
    }
  } catch (e) {
    out.error = (e as Error).message;
  }
  return out;
}
