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
 * So the portal shows a short code instead. Type `advancedgas.com.au/tv/<code>`
 * on the panel once; the route redeems it, sets the board cookie and sends the
 * browser to `/tv`. The long token never leaves the server.
 *
 * A short code is only safe because of what bounds it: eight characters from an
 * alphabet of 32 is 2^40, it dies fifteen minutes after it is made, and it
 * works exactly once. Guessing it means finding one value in a trillion inside
 * a quarter of an hour, against a code that stops existing the moment it is
 * used.
 *
 * Kept in `portal_settings` rather than a table of its own: one office, one
 * pending code, and a migration here would be a file waiting for somebody to
 * remember to run it.
 */

const KEY = "board-pairing";

export type Pairing = { code: string; expiresAt: string; usedAt: string | null };

const live = (p: Pairing | null): p is Pairing =>
  !!p && !p.usedAt && Date.parse(p.expiresAt) > Date.now();

/**
 * The code to show, making one only when there isn't a usable one already.
 *
 * The board page refreshes itself every 25 seconds; rotating on every render
 * would hand somebody a different code each time they glanced at the screen
 * they were halfway through typing.
 */
export async function currentPairing(): Promise<Pairing> {
  const stored = await getSettings<Pairing>(KEY).catch(() => null);
  if (live(stored)) return stored;
  const fresh: Pairing = {
    code: makeCode(),
    expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
    usedAt: null,
  };
  await saveSettings(KEY, fresh).catch(() => {
    // A screen that can't be paired right now is a worse answer than a screen
    // that can't be paired at all, so this throws rather than showing a code
    // the redeem side will never recognise.
    throw new Error("could not store a pairing code");
  });
  return fresh;
}

/** Spend the code. True only for a live one, and only the first time. */
export async function redeemPairing(supplied: string): Promise<boolean> {
  const code = normaliseCode(supplied);
  if (code.length !== LENGTH) return false;
  const stored = await getSettings<Pairing>(KEY).catch(() => null);
  if (!live(stored) || stored.code !== code) return false;
  await saveSettings(KEY, { ...stored, usedAt: new Date().toISOString() }).catch(() => null);
  return true;
}
