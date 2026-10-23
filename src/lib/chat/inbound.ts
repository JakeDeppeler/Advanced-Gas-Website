import "server-only";
import { storeIncoming } from "@/lib/leads/meta";
import { melbourneDay } from "@/lib/leads/metaTypes";
import { bodyOrAttachment, type ChatEvent, type ChatThread } from "./chatTypes";
import { addMessage, metaThread, patchThread } from "./store";
import { metaProfileName } from "./send";

/**
 * A message arriving from Meta, into the inbox.
 *
 * Messenger's first message of the day already becomes a lead through the
 * lead parser, which has done that since before there was an inbox. Instagram
 * never did — parseMetaBody only reads `object: "page"` — so an Instagram
 * conversation's lead is written here, keyed the same way: the person and the
 * Melbourne day, so the second and third messages resolve to the first one's
 * row and the wall rings once.
 *
 * Throws on a failed write, so the webhook answers 500 and Meta retries; the
 * retry adds nothing twice because every message is keyed on Meta's own id.
 */
export async function receiveMetaMessage(ev: ChatEvent): Promise<void> {
  const { thread, created } = await metaThread(ev.channel, ev.userId, ev.pageId);

  let current: ChatThread = thread;
  if (created || !thread.name) {
    const name = await metaProfileName(ev.channel, ev.userId);
    if (name) {
      await patchThread(thread.id, { name });
      current = { ...thread, name };
    }
  }

  const added = await addMessage(current, {
    direction: ev.direction,
    body: bodyOrAttachment(ev.text, ev.attachments),
    attachments: ev.attachments,
    externalId: ev.mid,
    at: ev.at,
    // An echo we didn't send from the portal was typed in Business Suite or
    // the Instagram app. Our own sends are recorded before their echo lands.
    sentBy: ev.direction === "out" ? "Meta Business Suite" : null,
  });

  if (added && ev.direction === "in" && ev.channel === "instagram") {
    await storeIncoming({
      externalId: `ig-msg:${ev.userId}:${melbourneDay(ev.at)}`,
      source: "instagram-message",
      at: ev.at,
      name: current.name,
      phone: null,
      email: null,
      headline: "Instagram message",
      suburb: null,
      postcode: null,
      summary: `“${bodyOrAttachment(ev.text, ev.attachments).slice(0, 300)}”`,
      details: { threadId: thread.id, mid: ev.mid, accountId: ev.pageId },
    });
  }
}

/**
 * A website visitor's message, as a lead.
 *
 * Once a day per conversation, like Messenger: the first message of the day
 * takes the wall, the rest of the conversation doesn't. The website chat asks
 * for a number or an email before it opens, so this lead has a way to answer
 * it from the first message — the wall says "ring them", not "go and look".
 */
export async function webLead(thread: ChatThread, text: string, at: string): Promise<void> {
  await storeIncoming({
    externalId: `web-chat:${thread.id}:${melbourneDay(at)}`,
    source: "website-chat",
    at,
    name: thread.name,
    phone: thread.phone,
    email: thread.email,
    headline: "Website chat",
    suburb: thread.suburb,
    postcode: null,
    summary: `“${text.slice(0, 300)}”`,
    details: { threadId: thread.id },
  });
}
