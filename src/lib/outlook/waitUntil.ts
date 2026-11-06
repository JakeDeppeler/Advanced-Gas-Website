import "server-only";

/**
 * Keep work running after the response has gone, on Vercel.
 *
 * Microsoft wants a notification answered within three seconds and a draft
 * takes longer than that, so the webhook answers first and drafts after.
 * Without this, Vercel freezes the function the moment the response is sent.
 *
 * This is what @vercel/functions' waitUntil does, read from the same
 * request-context symbol the platform sets. The package itself would bring
 * nineteen others (an OIDC client, execa, zod) for these few lines. Off
 * Vercel there is no context, and the work is simply awaited: slower to
 * answer, never lost.
 */
type Ctx = { waitUntil?: (p: Promise<unknown>) => void };

export async function afterResponse(work: Promise<unknown>): Promise<void> {
  const holder = (globalThis as Record<symbol, { get?: () => Ctx | undefined } | undefined>)[Symbol.for("@vercel/request-context")];
  const ctx = holder?.get?.();
  if (ctx?.waitUntil) {
    ctx.waitUntil(work.catch(() => undefined));
    return;
  }
  await work.catch(() => undefined);
}
