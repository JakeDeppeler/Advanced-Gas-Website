import "server-only";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import { replyWindow, type ChatThread } from "./chatTypes";
import { metaSendError } from "./sendErrors";

/**
 * Getting a reply to the customer, on whichever channel they used.
 *
 * Messenger and Instagram go through Meta's Send API with the page token. The
 * website needs no sending at all — the widget polls and the reply appears —
 * but a visitor who has closed the tab will never see it there, so a reply to
 * somebody who has gone is emailed to them too, where they left an address.
 *
 * **Nothing from Meta's response reaches a person verbatim.** A Graph error can
 * quote the request back, and the request carries the page token in its query
 * string. Errors are read for their numeric code only and turned into words.
 */

const GRAPH = "https://graph.facebook.com/v23.0";

export type SendResult = { ok: true; externalId: string | null; emailed?: boolean } | { ok: false; error: string };

async function sendMeta(thread: ChatThread, text: string, now = Date.now()): Promise<SendResult> {
  const token = process.env.META_PAGE_TOKEN?.trim();
  if (!token) return { ok: false, error: "No page token on the server (META_PAGE_TOKEN), so replies can't be sent from here." };
  if (!thread.external_user) return { ok: false, error: "This conversation has no Meta recipient." };

  const win = replyWindow(thread.channel, thread.last_in_at, now);
  if (win.kind === "closed") return { ok: false, error: "It's been over 7 days since they last wrote, so Meta won't deliver a reply. Ring them instead." };

  const body: Record<string, unknown> = { recipient: { id: thread.external_user }, message: { text } };
  if (win.kind === "open") {
    body.messaging_type = "RESPONSE";
  } else {
    // Past 24 hours Meta only takes a reply a person wrote, marked as such —
    // which every reply from this inbox is. It needs the Human Agent feature
    // approved on the app; without it Meta answers with code 10 and the error
    // above says what to do.
    body.messaging_type = "MESSAGE_TAG";
    body.tag = "HUMAN_AGENT";
  }

  try {
    const url = new URL(`${GRAPH}/me/messages`);
    url.searchParams.set("access_token", token);
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { message_id?: unknown; error?: { code?: unknown; error_subcode?: unknown } } | null;
    if (!res.ok || !json || json.error) {
      const code = typeof json?.error?.code === "number" ? json.error.code : null;
      const sub = typeof json?.error?.error_subcode === "number" ? json.error.error_subcode : null;
      return { ok: false, error: metaSendError(code, sub) };
    }
    return { ok: true, externalId: typeof json.message_id === "string" ? json.message_id : null };
  } catch {
    // Never the exception's message: it can carry the URL, token and all.
    return { ok: false, error: "Couldn't reach Meta. Try again." };
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The website reply, by email, to a visitor who has left.
 *
 * "Left" is two minutes without the widget polling. The widget asks every few
 * seconds while it is open, so two minutes of silence is a closed tab, not a
 * slow connection, and somebody who is still there gets the reply on the page
 * without a duplicate in their inbox.
 */
async function emailWebReply(thread: ChatThread, text: string, now = Date.now()): Promise<boolean> {
  if (!thread.email) return false;
  const seen = thread.web_seen_at ? Date.parse(thread.web_seen_at) : 0;
  if (now - seen < 2 * 60_000) return false;
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>";
  const first = (thread.name ?? "").trim().split(/\s+/)[0];
  const out = await sendEmail(
    "chat-reply",
    {
      from,
      to: [thread.email],
      reply_to: site.email,
      subject: `Re: your message to ${site.shortName}`,
      text: `${first ? `Hi ${first},\n\n` : ""}${text}\n\n${site.name}\n${site.phone}\n\nYou can reply to this email, or carry on the chat at ${site.url}.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1d">${first ? `<p>Hi ${esc(first)},</p>` : ""}<p style="white-space:pre-wrap">${esc(text)}</p><p style="color:#4a4a52">${esc(site.name)}<br>${esc(site.phone)}</p><p style="color:#7a7a82;font-size:13px">You can reply to this email, or carry on the chat at <a href="${esc(site.url)}">${esc(site.url.replace(/^https?:\/\//, ""))}</a>.</p></div>`,
    },
    { threadId: thread.id },
  );
  return out.ok;
}

export async function deliver(thread: ChatThread, text: string): Promise<SendResult> {
  if (thread.channel === "web") {
    const emailed = await emailWebReply(thread, text).catch(() => false);
    return { ok: true, externalId: null, emailed };
  }
  return sendMeta(thread, text);
}

/** Who wrote to us, by name, where the page's permissions allow it. */
export async function metaProfileName(channel: "messenger" | "instagram", userId: string): Promise<string | null> {
  const token = process.env.META_PAGE_TOKEN?.trim();
  if (!token) return null;
  try {
    const url = new URL(`${GRAPH}/${encodeURIComponent(userId)}`);
    url.searchParams.set("fields", channel === "instagram" ? "name,username" : "first_name,last_name");
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { first_name?: string; last_name?: string; name?: string; username?: string };
    const name = channel === "instagram" ? j.name || (j.username ? `@${j.username}` : "") : [j.first_name, j.last_name].filter(Boolean).join(" ");
    return name.trim() || null;
  } catch {
    return null;
  }
}
