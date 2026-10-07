/**
 * The pairing code itself: making one, tidying one up, and showing one.
 *
 * Its own module with no `server-only` and no database in its import graph, so
 * scripts/check-pairing.ts can exercise it directly — the same split as
 * lib/dashboard/paging.ts. The rules here are short, easy to get subtly wrong,
 * and the thing they protect is the board's token.
 */

/** Fifteen minutes: long enough to walk to the television, short enough. */
export const PAIRING_TTL_MS = 15 * 60_000;

/**
 * No I, O, 0 or 1. The code is read off a laptop and typed on a remote, and the
 * pairs that look alike cost more in mistyped codes than the four extra letters
 * buy in entropy.
 */
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LENGTH = 8;

/**
 * Eight characters of 32 is 2^40. That is only safe alongside the other two
 * bounds — fifteen minutes, and one use — and all three are the reason a short
 * code can stand in for a 64-character token at all.
 */
export function makeCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  // 256 is a multiple of 32, so every byte maps to one letter with no bias and
  // no rejection loop.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * What the panel typed, as the code we stored.
 *
 * Case and punctuation go: it is shown as "K7M2-QX8P" and a television's soft
 * keyboard is usually stuck in lower case, so refusing either spelling would
 * fail the one person using it for the one reason they could not help.
 */
export function normaliseCode(supplied: string): string {
  return supplied.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "K7M2-QX8P" — two halves are easier to hold in your head than eight letters. */
export const prettyCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
