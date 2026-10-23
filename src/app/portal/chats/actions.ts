"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can, type PortalUser } from "@/lib/portal/caps";
import { addMessage, claimEcho, getChatSettings, getThread, patchThread, saveChatSettings, threadMessages } from "@/lib/chat/store";
import { DraftError, writeDraft } from "@/lib/chat/draft";
import { deliver } from "@/lib/chat/send";
import { cleanText, safeUrl, type ChatSettings, type ChatThread } from "@/lib/chat/chatTypes";

/**
 * Answering customers is office work rather than management: whoever runs the
 * quote pipeline answers the chats too. Settings — what the assistant may say,
 * whether the website shows the chat — stay with managers.
 */
const canChat = (u: PortalUser) => can(u, "overhead") || can(u, "quotes");

export type DraftOutcome = { ok: true; draft: string; flag: string | null } | { ok: false; error: string };

export async function draftReply(threadId: string, instruction?: string): Promise<DraftOutcome> {
  const me = await getPortalUser();
  if (!me || !canChat(me)) return { ok: false, error: "Not allowed." };
  const thread = await getThread(threadId);
  if (!thread) return { ok: false, error: "That conversation has gone." };

  try {
    const [messages, settings] = await Promise.all([threadMessages(thread.id), getChatSettings()]);
    if (!messages.length) return { ok: false, error: "Nothing to reply to yet." };
    const d = await writeDraft(thread, messages, settings, cleanText(instruction, 400) || undefined);

    // What it noticed fills gaps and never overwrites: a name somebody typed
    // into the website form beats a name the model read out of a sentence.
    const fill: Partial<ChatThread> = {};
    if (!thread.name && d.details.name) fill.name = d.details.name;
    if (!thread.phone && d.details.phone) fill.phone = d.details.phone;
    if (!thread.email && d.details.email) fill.email = d.details.email;
    if (!thread.suburb && d.details.suburb) fill.suburb = d.details.suburb;
    if (d.details.topic) fill.topic = d.details.topic;

    await patchThread(thread.id, {
      ...fill,
      draft: d.reply,
      draft_at: new Date().toISOString(),
      draft_for: thread.last_in_at,
      draft_flag: d.handoff || null,
    });
    revalidatePath("/portal/chats");
    return { ok: true, draft: d.reply, flag: d.handoff || null };
  } catch (e) {
    return { ok: false, error: e instanceof DraftError ? e.message : "The draft couldn't be written. Write this one yourself." };
  }
}

export type SendOutcome = { ok: true; note: string | null } | { ok: false; error: string };

export async function sendReply(threadId: string, rawText: string, fromDraft: boolean): Promise<SendOutcome> {
  const me = await getPortalUser();
  if (!me || !canChat(me)) return { ok: false, error: "Not allowed." };
  const text = cleanText(rawText, 2000);
  if (!text) return { ok: false, error: "Nothing to send." };
  const thread = await getThread(threadId);
  if (!thread) return { ok: false, error: "That conversation has gone." };

  const result = await deliver(thread, text);
  const edited = fromDraft && text !== (thread.draft ?? "").trim();
  const by = me.name || me.email;

  try {
    if (result.ok) {
      const added = await addMessage(thread, {
        direction: "out",
        body: text,
        externalId: result.externalId,
        sentBy: by,
        fromDraft,
        edited,
      });
      // Meta's echo beat us to it; put our name on the row it wrote.
      if (!added && result.externalId) await claimEcho(result.externalId, { sent_by: by, from_draft: fromDraft, edited });
      await patchThread(thread.id, { draft: null, draft_at: null, draft_for: null, draft_flag: null });
    } else {
      // Kept, so the thread shows what was tried and why it didn't go,
      // rather than the reply silently vanishing.
      await addMessage(thread, { direction: "out", body: text, status: "failed", error: result.error, sentBy: by, fromDraft, edited });
    }
  } catch {
    // The customer has it but the record didn't save. Saying so beats
    // pretending, and beats a second send when they press the button again.
    if (result.ok) return { ok: true, note: "Sent, but it didn't save to the thread. Refresh to check." };
  }

  revalidatePath("/portal/chats");
  revalidatePath(`/portal/chats/${thread.id}`);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, note: result.emailed ? "They'd left the page, so it was emailed to them too." : null };
}

export async function discardDraft(threadId: string): Promise<void> {
  const me = await getPortalUser();
  if (!me || !canChat(me)) return;
  await patchThread(threadId, { draft: null, draft_at: null, draft_for: null, draft_flag: null });
  revalidatePath(`/portal/chats/${threadId}`);
}

export async function setThreadStatus(threadId: string, status: "open" | "closed"): Promise<void> {
  const me = await getPortalUser();
  if (!me || !canChat(me)) return;
  await patchThread(threadId, { status });
  revalidatePath("/portal/chats");
  revalidatePath(`/portal/chats/${threadId}`);
}

export async function saveSettingsAction(s: ChatSettings): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Only managers can change chat settings." };
  const url = s.bookingUrl.trim();
  const booking = safeUrl(url);
  if (url && !booking) return { ok: false, error: "The booking link has to be a full https:// address." };
  const res = await saveChatSettings({
    widget: Boolean(s.widget),
    bookingUrl: booking,
    notes: cleanText(s.notes, 6000),
    neverSay: cleanText(s.neverSay, 3000),
  });
  revalidatePath("/portal/chats", "layout");
  return res.ok ? { ok: true } : { ok: false, error: "Couldn't save. Try again." };
}
