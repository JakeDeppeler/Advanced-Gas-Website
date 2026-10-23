import { NextResponse } from "next/server";
import { leadFrom, metaConfigured, storeIncoming } from "@/lib/leads/meta";
import { parseMetaBody, signatureOk, verifyChallenge } from "@/lib/leads/metaTypes";
import { parseChatEvents } from "@/lib/chat/chatTypes";
import { receiveMetaMessage } from "@/lib/chat/inbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Facebook's webhook: lead-ad forms, Messenger and Instagram messages.
 *
 * Both become the same `portal_leads` row the website's quote form writes, so
 * the wall board's call-now alert fires on a Facebook enquiry exactly as it
 * does on a website one, and every lead count in the portal already includes
 * them.
 *
 * **This URL is public and it is on the internet.** Anything that reaches the
 * office wall through it has to be proved to have come from Meta first, so the
 * signature is checked before the body is parsed, and the body is never
 * trusted after that either — see metaTypes.ts. With no app secret configured
 * the route refuses everything rather than falling open.
 *
 * To connect it, in Meta: point the page's webhook at /api/leads/meta, use
 * META_VERIFY_TOKEN as the verify token, subscribe the page to `leadgen`,
 * `messages` and `message_echoes` (and the Instagram account to `messages`),
 * and set META_APP_SECRET and META_PAGE_TOKEN in the environment.
 * The portal's Integrations page says which of those are in place.
 */

/** Meta's subscription handshake. */
export async function GET(req: Request) {
  const token = process.env.META_VERIFY_TOKEN?.trim() ?? "";
  const challenge = verifyChallenge(new URL(req.url).searchParams, token);
  if (!challenge) return new NextResponse("Not found", { status: 404 });
  // Plain text, no quotes: Meta compares the body to the challenge verbatim.
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: Request) {
  const secret = process.env.META_APP_SECRET?.trim() ?? "";
  if (!metaConfigured()) {
    // Not an error Meta should retry: nothing here is going to change until
    // somebody sets the two values.
    return new NextResponse("Not configured", { status: 404 });
  }

  // The raw bytes, because the signature is over them. Parsing first and
  // re-serialising changes key order and whitespace and never verifies.
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    // Signed, so it is from Meta, and unreadable, so there is nothing to retry.
    return NextResponse.json({ ok: true, events: 0 });
  }

  const events = parseMetaBody(body);
  let stored = 0;
  for (const event of events) {
    const lead = await leadFrom(event);
    /*
     * A failed write is a 500 on purpose: Meta retries those, and the retry
     * writes nothing extra because `external_id` is unique. A lead lost to a
     * thirty-second database blip is a customer nobody rang.
     *
     * The message never carries the error's own text — a Graph or Supabase
     * failure can quote the request back, and the request has a key in it.
     */
    try {
      await storeIncoming(lead);
      stored += 1;
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  /*
   * The same delivery, read again for the inbox: every message both ways,
   * Instagram as well as Messenger, so the office can answer it from the
   * portal. Separate from the lead pass above because they want different
   * things — the lead pass wants one row per person per day and drops the
   * page's own replies; the inbox wants every message, ours included.
   *
   * Same failure rule: a 500 and Meta retries, and the retry writes nothing
   * twice because each message is keyed on Meta's own id.
   */
  const chats = parseChatEvents(body);
  for (const ev of chats) {
    try {
      await receiveMetaMessage(ev);
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, events: events.length, stored, messages: chats.length });
}
