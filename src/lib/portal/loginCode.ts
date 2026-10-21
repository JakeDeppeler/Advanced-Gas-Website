import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getSettings, saveSettings } from "./db";
import { sbUpdateReturning } from "@/lib/dashboard/db";

/**
 * Signing in with a code typed on the login page, instead of a link.
 *
 * A link signs in whichever browser opens it, which on a phone is usually
 * the mail app's own, so the person ends up signed in somewhere they're not
 * and back at the login page where they started. A code is typed where they
 * asked for it.
 *
 * Six digits is a million, which is only safe because of what bounds it: a
 * code lasts ten minutes, takes five tries, and works once; an address gets
 * twelve codes a day. That's at most sixty guesses a day at anyone's account,
 * each one landing a code in their inbox. Take any of those away and this is
 * a weak password.
 *
 * Kept in portal_settings, one row per address, as the wall board's pairing
 * code is. Only a keyed hash of the code is stored.
 */

const TTL_MS = 10 * 60_000;
const TRIES = 5;
const PER_DAY = 12;
/** A second press inside this doesn't send another email; the first code still works. */
const RESEND_AFTER_MS = 30_000;

type Pending = {
  hash: string;
  exp: number;
  sentAt: number;
  /** Guesses spent on this code, wrong or right. */
  attempts: number;
  used: boolean;
  /** When each code in the last day was made, for the daily cap. */
  issued: number[];
};

const keyFor = (email: string) => `login-code:${email.trim().toLowerCase()}`;

function hashOf(email: string, code: string): string {
  const secret = process.env.PORTAL_AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${code}`).digest("hex");
}

/**
 * A new code for this address, or null when one went out seconds ago or the
 * day's allowance is spent. Only called for someone on the team.
 */
export async function issueLoginCode(email: string): Promise<string | null> {
  if (!process.env.PORTAL_AUTH_SECRET) return null;
  const now = Date.now();
  const cur = await getSettings<Pending>(keyFor(email)).catch(() => null);
  if (cur && !cur.used && cur.attempts < TRIES && cur.exp > now && now - cur.sentAt < RESEND_AFTER_MS) return null;
  const issued = (cur?.issued ?? []).filter((t) => now - t < 86_400_000);
  if (issued.length >= PER_DAY) return null;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const rec: Pending = { hash: hashOf(email, code), exp: now + TTL_MS, sentAt: now, attempts: 0, used: false, issued: [...issued, now] };
  const r = await saveSettings(keyFor(email), rec);
  return r.ok ? code : null;
}

export type CodeCheck = "ok" | "wrong" | "expired";

/**
 * Spend a guess against the address's code. Each guess is taken with a
 * compare-and-swap on the attempt count before the code is looked at, so
 * fifty requests fired at once get one comparison between them, not fifty.
 */
export async function checkLoginCode(email: string, supplied: string): Promise<CodeCheck> {
  const code = supplied.replace(/\D/g, "");
  const key = keyFor(email);
  const cur = await getSettings<Pending>(key).catch(() => null);
  if (!cur || cur.used || cur.exp < Date.now() || cur.attempts >= TRIES) return "expired";
  // The whole record is written each time, so every write is conditional on
  // the code still being this one, unused, at the count it was read at:
  // otherwise a request that read it before another spent it writes
  // "unused" straight back, and one code signs in several browsers.
  const still = (n: number) => `key=eq.${encodeURIComponent(key)}&value->>hash=eq.${cur.hash}&value->>used=eq.false&value->>attempts=eq.${n}`;
  const taken = await sbUpdateReturning("portal_settings", still(cur.attempts), {
    value: { ...cur, attempts: cur.attempts + 1 }, updated_at: new Date().toISOString(),
  }).catch(() => []);
  if (!taken.length) return "wrong";
  const a = Buffer.from(hashOf(email, code), "hex");
  const b = Buffer.from(cur.hash, "hex");
  if (code.length !== 6 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return cur.attempts + 1 >= TRIES ? "expired" : "wrong";
  }
  // Once: only the request that spent this attempt can mark it used.
  const spent = await sbUpdateReturning("portal_settings", still(cur.attempts + 1), {
    value: { ...cur, attempts: cur.attempts + 1, used: true }, updated_at: new Date().toISOString(),
  }).catch(() => []);
  return spent.length ? "ok" : "expired";
}
