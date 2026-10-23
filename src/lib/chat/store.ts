import "server-only";
import { q, sbCount, sbSelect, sbSelectOne, sbUpdate } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import {
  chatSettingsFrom,
  hashToken,
  newWebToken,
  type ChatAttachment,
  type ChatChannel,
  type ChatMessage,
  type ChatSettings,
  type ChatThread,
} from "./chatTypes";

/**
 * The inbox's reads and writes.
 *
 * Over REST with the service-role key, like the rest of the portal. Two things
 * here can't use the shared helpers: both unique indexes the webhook leans on
 * are partial, and PostgREST's `on_conflict=` cannot name a partial index — it
 * fails with 42P10 on every insert (see 0076_lead_external_id.sql, which found
 * this the hard way). So inserts that can collide are plain POSTs, and a 409
 * is read as "already have it".
 *
 * **Errors never carry a response body out of this file.** The public chat
 * route and the webhook both call in here, and a PostgREST error can quote the
 * row back, with a customer's details in it.
 */

const THREAD_COLS =
  "id,created_at,channel,external_user,page_id,name,phone,email,suburb,topic,status,last_in_at,last_out_at,web_seen_at,draft,draft_at,draft_for,draft_flag";
const MESSAGE_COLS = "id,thread_id,created_at,direction,body,attachments,status,error,sent_by,from_draft,edited";

function conf() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("database not configured");
  return { url, key };
}

/** A POST that reports a duplicate instead of throwing on it. */
async function insertRow<T>(table: string, row: Record<string, unknown>): Promise<T | "duplicate"> {
  const { url, key } = conf();
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (res.status === 409) return "duplicate";
  if (!res.ok) throw new Error(`${table} insert failed (${res.status})`);
  const rows = (await res.json()) as T[];
  if (!rows[0]) throw new Error(`${table} insert returned nothing`);
  return rows[0];
}

/* ------------------------------------------------------------ settings */

export async function getChatSettings(): Promise<ChatSettings> {
  return chatSettingsFrom(await getSettings<unknown>("chat").catch(() => null));
}

export async function saveChatSettings(s: ChatSettings): Promise<{ ok: boolean; error?: string }> {
  return saveSettings("chat", s);
}

/* ------------------------------------------------------------- threads */

export async function getThread(id: string): Promise<ChatThread | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return sbSelectOne<ChatThread>("chat_threads", [q.select(THREAD_COLS), q.eq("id", id)].join("&"));
}

export async function threadByWebToken(token: string): Promise<ChatThread | null> {
  if (!token || token.length > 100) return null;
  return sbSelectOne<ChatThread>("chat_threads", [q.select(THREAD_COLS), q.eq("web_token_hash", hashToken(token))].join("&"));
}

/**
 * The thread for this person on this channel, made if it's their first
 * message. Two messages a second apart can both find nothing; the second
 * insert is refused by the unique index and reads the first one's row.
 */
export async function metaThread(channel: Exclude<ChatChannel, "web">, userId: string, pageId: string | null): Promise<{ thread: ChatThread; created: boolean }> {
  const find = () =>
    sbSelectOne<ChatThread>("chat_threads", [q.select(THREAD_COLS), q.eq("channel", channel), q.eq("external_user", userId)].join("&"));
  const found = await find();
  if (found) return { thread: found, created: false };
  const made = await insertRow<ChatThread>("chat_threads", { channel, external_user: userId, page_id: pageId });
  if (made !== "duplicate") return { thread: made, created: true };
  const again = await find();
  if (!again) throw new Error("thread vanished");
  return { thread: again, created: false };
}

/** A website conversation, and the token the visitor's browser keeps for it. */
export async function createWebThread(p: { name: string; phone: string | null; email: string | null; ipHash: string | null }): Promise<{ thread: ChatThread; token: string }> {
  const token = newWebToken();
  const made = await insertRow<ChatThread>("chat_threads", {
    channel: "web",
    web_token_hash: hashToken(token),
    ip_hash: p.ipHash,
    name: p.name,
    phone: p.phone,
    email: p.email,
    web_seen_at: new Date().toISOString(),
  });
  // 192 random bits colliding is not a thing that happens; if it ever did, the
  // visitor sees an error and tries again.
  if (made === "duplicate") throw new Error("token collision");
  return { thread: made, token };
}

/** Conversations this address has opened recently, for the widget's flood limit. */
export async function recentThreadsFrom(ipHash: string, sinceIso: string): Promise<number> {
  return sbCount("chat_threads", [q.eq("ip_hash", ipHash), q.gte("created_at", sinceIso)].join("&"));
}

export async function patchThread(id: string, patch: Partial<Omit<ChatThread, "id" | "created_at" | "channel">>): Promise<void> {
  await sbUpdate("chat_threads", q.eq("id", id), patch as Record<string, unknown>);
}

export type InboxFilter = "waiting" | "open" | "closed";

/**
 * The inbox: newest activity first. "Waiting" is worked out from the two
 * timestamps rather than stored, so it can't drift from the messages — see
 * isWaiting — which means it's filtered here after the read. A hundred open
 * threads is a big month for a trade business; the read stays small.
 */
export async function listThreads(filter: InboxFilter): Promise<ChatThread[]> {
  const status = filter === "closed" ? "closed" : "open";
  return sbSelect<ChatThread>(
    "chat_threads",
    [q.select(THREAD_COLS), q.eq("status", status), q.order("last_in_at", "desc", "last"), "limit=200"].join("&"),
  );
}

/** How many are waiting on a reply, for the badge on the nav. */
export async function waitingCount(): Promise<number> {
  const rows = await sbSelect<Pick<ChatThread, "last_in_at" | "last_out_at">>(
    "chat_threads",
    [q.select("last_in_at,last_out_at"), q.eq("status", "open"), q.notNull("last_in_at"), "limit=500"].join("&"),
  );
  return rows.filter((t) => !t.last_out_at || Date.parse(t.last_in_at as string) > Date.parse(t.last_out_at)).length;
}

/* ------------------------------------------------------------ messages */

export async function threadMessages(threadId: string): Promise<ChatMessage[]> {
  return sbSelect<ChatMessage>(
    "chat_messages",
    [q.select(MESSAGE_COLS), q.eq("thread_id", threadId), q.order("created_at", "asc"), q.order("id", "asc"), "limit=500"].join("&"),
  );
}

/** The latest message in each of these threads, for the inbox's one-line preview. */
export async function lastMessages(threadIds: string[]): Promise<Map<string, ChatMessage>> {
  const out = new Map<string, ChatMessage>();
  if (!threadIds.length) return out;
  const rows = await sbSelect<ChatMessage>(
    "chat_messages",
    [q.select(MESSAGE_COLS), `thread_id=in.(${threadIds.join(",")})`, q.order("created_at", "desc"), "limit=1000"].join("&"),
  );
  for (const m of rows) if (!out.has(m.thread_id)) out.set(m.thread_id, m);
  return out;
}

export type NewMessage = {
  direction: "in" | "out";
  body: string;
  attachments?: ChatAttachment[];
  externalId?: string | null;
  at?: string;
  status?: "sent" | "failed";
  error?: string | null;
  sentBy?: string | null;
  fromDraft?: boolean;
  edited?: boolean;
};

/**
 * Add a message and move the thread's clock. Null when Meta has sent it
 * before — a retry, or the echo of a reply we sent ourselves.
 *
 * A customer message reopens a closed thread: they've said something new, and
 * a thread marked done is a thread nobody looks at.
 */
export async function addMessage(thread: ChatThread, m: NewMessage): Promise<ChatMessage | null> {
  const at = m.at ?? new Date().toISOString();
  const made = await insertRow<ChatMessage>("chat_messages", {
    thread_id: thread.id,
    created_at: at,
    direction: m.direction,
    body: m.body,
    attachments: m.attachments ?? [],
    external_id: m.externalId ?? null,
    status: m.status ?? "sent",
    error: m.error ?? null,
    sent_by: m.sentBy ?? null,
    from_draft: m.fromDraft ?? false,
    edited: m.edited ?? false,
  });
  if (made === "duplicate") return null;

  // Never wind a clock backwards: Meta can deliver an older message late.
  const later = (a: string | null) => !a || Date.parse(at) > Date.parse(a);
  if (m.direction === "in" && later(thread.last_in_at)) {
    await patchThread(thread.id, { last_in_at: at, status: "open" });
  } else if (m.direction === "out" && m.status !== "failed" && later(thread.last_out_at)) {
    await patchThread(thread.id, { last_out_at: at });
  }
  return made;
}

/**
 * Our send's echo can beat our own write: Meta delivers the echo to the
 * webhook while the send call is still returning. Then the echo's row holds
 * the message id, our insert is refused as a duplicate, and the row says it
 * came from Business Suite. This puts the right name back on it.
 */
export async function claimEcho(externalId: string, patch: { sent_by: string; from_draft: boolean; edited: boolean }): Promise<void> {
  await sbUpdate("chat_messages", q.eq("external_id", externalId), patch).catch(() => {});
}

/** What the website widget may show its visitor: the conversation, minus anything that failed or is internal. */
export function forVisitor(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.status === "sent")
    .map((m) => ({ id: m.id, at: m.created_at, from: m.direction === "in" ? "you" : "us", body: m.body }));
}
