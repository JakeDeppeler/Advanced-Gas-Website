import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Proving a webhook came from Resend.
 *
 * Its own module, away from eventTypes, for one reason: the wall board is a
 * client component and reads the alert's wording from there, and a single
 * `node:crypto` import at the top of a module the browser bundle touches
 * fails the build outright. Nothing here is reached by anything but the
 * webhook route.
 */

/**
 * Is this really from Resend?
 *
 * Resend signs with Svix: the signature is a base64 HMAC-SHA256 of
 * `id.timestamp.body` over the raw body, keyed on the secret with its
 * `whsec_` prefix stripped and the rest base64-decoded. The header can carry
 * several space-separated `v1,<sig>` values — a secret being rotated — and any
 * one of them matching is a pass.
 */
export function svixOk(
  raw: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  // A replay of yesterday's delivery is not news. Five minutes each way, which
  // is Svix's own tolerance.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const mine = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`, "utf8").digest();

  for (const part of signature.split(" ")) {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) continue;
    const sent = Buffer.from(value, "base64");
    if (sent.length === mine.length && timingSafeEqual(sent, mine)) return true;
  }
  return false;
}
