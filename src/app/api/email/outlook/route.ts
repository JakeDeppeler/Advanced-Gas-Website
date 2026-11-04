import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { outlookConfigured } from "@/lib/outlook/graph";
import { knownSubscriptions } from "@/lib/outlook/subscriptions";
import { handleMessage } from "@/lib/outlook/handle";
import { afterResponse } from "@/lib/outlook/waitUntil";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The drafts run after the response, inside this function's time.
export const maxDuration = 60;

/**
 * Microsoft Graph's change notifications: an email has arrived in admin@'s
 * or jake@'s Inbox. The reply is drafted and saved into Outlook as an unsent
 * draft (lib/outlook/handle.ts). Setup is in docs/outlook-drafts.md.
 *
 * **The URL is public.** A notification only names a message id; it is acted
 * on when its clientState matches the secret stored for that subscription.
 * A forged one is answered 202 and dropped. Even a forged one that got through
 * could only make us draft a reply to an email really in the mailbox, because
 * the message is read back from Graph by id, never taken from the request.
 */
export async function POST(req: Request) {
  // Subscription handshake: Graph sends a token and wants it straight back,
  // as plain text, before it will create the subscription.
  const token = new URL(req.url).searchParams.get("validationToken");
  if (token !== null) {
    return new NextResponse(token.slice(0, 1024), { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  }
  if (!outlookConfigured()) return new NextResponse("Not configured", { status: 404 });

  let body: { value?: { subscriptionId?: string; clientState?: string; changeType?: string; resourceData?: { id?: string } }[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 202 });
  }

  let known: Awaited<ReturnType<typeof knownSubscriptions>>;
  try {
    known = await knownSubscriptions();
  } catch {
    // Graph retries a 5xx for hours; the secrets will be readable by then.
    return new NextResponse(null, { status: 503 });
  }

  const work: Promise<unknown>[] = [];
  for (const n of body.value ?? []) {
    const sub = n.subscriptionId ? known[n.subscriptionId] : undefined;
    const id = n.resourceData?.id;
    if (!sub || !id || n.changeType !== "created" || !same(n.clientState ?? "", sub.clientState)) continue;
    work.push(handleMessage(sub.mailbox, id));
  }
  if (work.length) await afterResponse(Promise.allSettled(work));
  return new NextResponse(null, { status: 202 });
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
