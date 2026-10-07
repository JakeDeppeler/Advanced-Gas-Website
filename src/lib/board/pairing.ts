import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { LENGTH, PAIRING_TTL_MS, makeCode, normaliseCode } from "./pairCode";

export { PAIRING_TTL_MS, prettyCode } from "./pairCode";

/**
 * Pairing a screen without typing the token.
 *
 * `SCREEN_TOKEN` is 64 characters because it is the only thing between the
 * public internet and the company's revenue. That is the right length for a
 * secret and the wrong length for a television remote, which is how you end up
 * with somebody reading hex out loud across an office.
 *
 * So the panel asks for a code instead: it is emailed to whoever asked, and
 * typed into the box on /tv. The long token never leaves the server.
 *
 * A short code is only safe because of what bounds it: eight characters from an
 * alphabet of 32 is 2^40, it dies fifteen minutes after it is made, it works
 * exactly once, and it is burnt after a handful of wrong guesses. Take away any
 * one of those four and this is a weak password.
 *
 * Kept in `portal_settings` rather than a table of its own: one office, one
 * pending code, and a migration here would be a file waiting for somebody to
 * remember to run it.
 */

const KEY = "board-pairing";

/** One email a minute. The code is the same one either way, so a second press changes nothing but the postage. */
const RESEND_AFTER_MS = 60_000;

/**
 * Eight wrong guesses and the code is gone.
 *
 * 2^40 does not need this to be safe, but the entry box is on a public page
 * now, and a code that cannot be ground at is one less thing to reason about.
 */
const MAX_ATTEMPTS = 8;

export type Pairing = {
  code: string;
  expiresAt: string;
  usedAt: string | null;
  /** When the code was last emailed, for the throttle. */
  sentAt?: string | null;
  /** Wrong guesses against this code. */
  attempts?: number;
};

const live = (p: Pairing | null): p is Pairing =>
  !!p && !p.usedAt && (p.attempts ?? 0) < MAX_ATTEMPTS && Date.parse(p.expiresAt) > Date.now();

async function store(p: Pairing): Promise<Pairing> {
  const res = await saveSettings(KEY, p);
  // A code the redeem side will never recognise is worse than no code: the
  // screen would take the typing and refuse it with nothing to explain why.
  if (!res.ok) throw new Error(res.error || "could not store a pairing code");
  return p;
}

/**
 * The code to show or send, making one only when there isn't a usable one.
 *
 * The board page refreshes itself every 25 seconds; rotating on every render
 * would hand somebody a different code each time they glanced at the screen
 * they were halfway through typing.
 */
export async function currentPairing(): Promise<Pairing> {
  const stored = await getSettings<Pairing>(KEY).catch(() => null);
  if (live(stored)) return stored;
  return store({
    code: makeCode(),
    expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
    usedAt: null,
    sentAt: null,
    attempts: 0,
  });
}

/**
 * The code to email, or null when one went out less than a minute ago.
 *
 * Throttled on the stored row rather than in memory, because the thing being
 * protected is somebody's inbox and this runs on however many lambdas Vercel
 * feels like.
 */
export async function pairingToSend(): Promise<Pairing | null> {
  const p = await currentPairing();
  if (p.sentAt && Date.now() - Date.parse(p.sentAt) < RESEND_AFTER_MS) return null;
  return store({ ...p, sentAt: new Date().toISOString() });
}

/** Spend the code. True only for a live one, and only the first time. */
export async function redeemPairing(supplied: string): Promise<boolean> {
  const code = normaliseCode(supplied);
  const stored = await getSettings<Pairing>(KEY).catch(() => null);
  if (!live(stored)) return false;

  if (code.length !== LENGTH || stored.code !== code) {
    // Count the miss. Nothing to tell the caller — a wrong code and a burnt one
    // are the same answer from outside.
    await store({ ...stored, attempts: (stored.attempts ?? 0) + 1 }).catch(() => null);
    return false;
  }

  await store({ ...stored, usedAt: new Date().toISOString() }).catch(() => null);
  return true;
}
