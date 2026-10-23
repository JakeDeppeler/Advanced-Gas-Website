import { NextResponse } from "next/server";
import { cleanText, hashIp, parseContact } from "@/lib/chat/chatTypes";
import { addMessage, createWebThread, forVisitor, getChatSettings, patchThread, recentThreadsFrom, threadByWebToken, threadMessages } from "@/lib/chat/store";
import { webLead } from "@/lib/chat/inbound";
import { dashboardDbConfigured, q, sbCount } from "@/lib/dashboard/db";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The website chat's server.
 *
 * **Public, unauthenticated, and it writes to the database and rings the
 * office wall.** So: a visitor proves nothing about who they are, but they
 * can only ever read the one conversation whose token they hold (192 random
 * bits, stored hashed), a conversation can only be opened with a way to reach
 * the person, a hidden field catches the form-filling bots, and one address
 * can open three conversations an hour and send twenty messages in ten
 * minutes. Every error is generic: nothing from the database ever goes back
 * down this route.
 */

const noStore = { "Cache-Control": "no-store" };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || "unknown";
}

/** Only to count. Salted with a server secret so the stored hash can't be walked back over the IPv4 space. */
const ipKey = (req: Request) => hashIp(clientIp(req), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "chat");

/** The visitor's conversation, polled every few seconds while the chat is open. */
export async function GET(req: Request) {
  if (!dashboardDbConfigured()) return bad("unavailable", 503);
  const token = new URL(req.url).searchParams.get("t") ?? "";
  try {
    const thread = await threadByWebToken(token);
    if (!thread) return bad("gone", 404);
    // Marks them as still here, so a reply isn't also emailed to somebody
    // who is looking at it. At most every 30 seconds: the poll is every few,
    // and a write per poll is a write nobody needs.
    const seen = thread.web_seen_at ? Date.parse(thread.web_seen_at) : 0;
    if (Date.now() - seen > 30_000) await patchThread(thread.id, { web_seen_at: new Date().toISOString() });
    const messages = forVisitor(await threadMessages(thread.id));
    return NextResponse.json({ messages, name: thread.name }, { headers: noStore });
  } catch {
    return bad("unavailable", 503);
  }
}

export async function POST(req: Request) {
  if (!dashboardDbConfigured()) return bad("unavailable", 503);

  const raw = await req.text();
  if (raw.length > 8000) return bad("too long", 413);
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return bad("bad request");
    body = parsed as Record<string, unknown>;
  } catch {
    return bad("bad request");
  }

  const text = cleanText(body.text, 1500);
  if (!text) return bad("Type a message first.");

  try {
    /* An existing conversation. */
    if (typeof body.t === "string" && body.t) {
      const thread = await threadByWebToken(body.t);
      if (!thread) return bad("gone", 404);
      const recent = await sbCount(
        "chat_messages",
        [q.eq("thread_id", thread.id), q.eq("direction", "in"), q.gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())].join("&"),
      );
      if (recent >= 20) return bad("That's a lot of messages at once. Give the team a moment to catch up.", 429);
      const at = new Date().toISOString();
      await addMessage(thread, { direction: "in", body: text, at });
      await patchThread(thread.id, { web_seen_at: at });
      // Once a day per conversation; later messages that day are refused by
      // the lead's own key, so the wall rings for a returning visitor and not
      // for every line they type.
      await webLead(thread, text, at).catch(() => {});
      return NextResponse.json({ messages: forVisitor(await threadMessages(thread.id)) }, { headers: noStore });
    }

    /* A new one. */
    // The hidden field. A person never sees it; a bot fills in everything.
    // Answered as though it worked, so the bot learns nothing.
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ token: "", messages: [] }, { headers: noStore });
    }

    const settings = await getChatSettings();
    if (!settings.widget) return bad(`Chat is closed right now. Call us on ${site.phone}.`, 404);

    const name = cleanText(body.name, 80);
    if (!name) return bad("Your name, please.");
    const contact = parseContact(cleanText(body.contact, 120));
    if (!contact) return bad("A mobile number or email we can reply to, please.");

    const ip = ipKey(req);
    if ((await recentThreadsFrom(ip, new Date(Date.now() - 3_600_000).toISOString())) >= 3) {
      return bad(`You've started a few chats already. Call us on ${site.phone} and we'll sort it out.`, 429);
    }

    const { thread, token } = await createWebThread({ name, phone: contact.phone, email: contact.email, ipHash: ip });
    const at = new Date().toISOString();
    await addMessage(thread, { direction: "in", body: text, at });
    await webLead(thread, text, at).catch(() => {});
    return NextResponse.json({ token, messages: forVisitor(await threadMessages(thread.id)) }, { headers: noStore });
  } catch {
    return bad("Something went wrong sending that. Try again, or call us.", 503);
  }
}
