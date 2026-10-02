import { timingSafeEqual } from "node:crypto";

// The wall display can't complete a login flow, so /screen is gated by a shared
// token in the query string instead. That token is the only thing standing
// between the public internet and the company's revenue figures — it belongs in
// SCREEN_TOKEN as a long random string, and the page is noindex'd.

export function screenTokenValid(supplied: string | undefined | null): boolean {
  const expected = process.env.SCREEN_TOKEN;
  if (!expected || !supplied) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!supplied) return false;

  const a = Buffer.from(secret);
  const b = Buffer.from(supplied);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
