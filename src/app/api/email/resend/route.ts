import { NextResponse } from "next/server";
import { recordProviderEvent } from "@/lib/email/send";
import { statusFromResend } from "@/lib/email/eventTypes";
import { svixOk } from "@/lib/email/svix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend's webhook: what happened to an email after we handed it over.
 *
 * A send failing is something we find out at the time, and the shared sender
 * writes it down. A **bounce** is not: Resend accepts the message, tries for a
 * while, and tells us minutes or hours later that nobody will ever read it.
 * Without this route that half is invisible — which is the half that matters,
 * because a refused send gets retried by somebody and a bounced one is a
 * customer sitting there wondering where their quote is.
 *
 * To connect it, in Resend: Webhooks → Add, point it at
 * https://www.advancedgas.com.au/api/email/resend, subscribe to
 * `email.bounced` and `email.complained` (and `email.delivered` if you want
 * the record complete), and put the signing secret in RESEND_WEBHOOK_SECRET.
 *
 * **The URL is public.** Anything arriving here is proved to be Resend's
 * before it is read, and with no secret set the route refuses everything
 * rather than falling open — an unauthenticated POST could otherwise put an
 * alert on the office wall.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) return new NextResponse("Not configured", { status: 404 });

  // The raw bytes: the signature is over them, and a parse-and-restringify
  // changes whitespace and key order and never verifies.
  const raw = await req.text();
  const ok = svixOk(raw, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  }, secret);
  if (!ok) return new NextResponse("Bad signature", { status: 401 });

  let body: { type?: unknown; data?: Record<string, unknown> };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    // Signed, so it is Resend's, and unreadable, so there is nothing to retry.
    return NextResponse.json({ ok: true });
  }

  const status = statusFromResend(body.type);
  // An event we have no use for is a 200 and nothing else: anything else
  // teaches Resend to retry something we are never going to act on.
  if (!status) return NextResponse.json({ ok: true, ignored: true });

  const d = body.data ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean).join(", ") : str(v));
  const bounce = (d.bounce ?? {}) as Record<string, unknown>;

  try {
    await recordProviderEvent({
      providerId: str(d.email_id),
      status,
      to: list(d.to),
      subject: str(d.subject),
      // The provider's own words — "mailbox does not exist" is the whole
      // answer, and inventing a friendlier one would lose it.
      detail: [str(bounce.type), str(bounce.subType), str(bounce.message)].filter(Boolean).join(" · ") || null,
    });
  } catch {
    // Let Resend try again: it retries a 500, and the update is keyed on the
    // message id, so doing it twice changes nothing.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
