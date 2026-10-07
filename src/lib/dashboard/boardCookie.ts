/**
 * The wall board's "this panel is signed in" cookie.
 *
 * No `node:crypto` and nothing from next/headers, because the Edge middleware
 * imports this — the same reason lib/portal/constants.ts exists.
 *
 * The board is a television. It cannot complete a login, so the only thing
 * between the public internet and the company's revenue is a shared token in
 * the URL. That token stays exactly as long as it was; what changes is that the
 * panel no longer has to carry it in the address bar all day. It is handed over
 * once, kept in an httpOnly cookie, and the board lives at /tv from then on.
 */
export const BOARD_COOKIE = "ag_board";

/** A year: the panel is switched on and left alone. */
export const BOARD_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Constant-time string compare, for the Edge where `timingSafeEqual` is not.
 *
 * Compares every character whatever happens, so the time it takes says nothing
 * about how much of the token was right. Length is leaked, as it is by the
 * `node:crypto` version in screenAuth.ts, and a 64-character token's length is
 * not the secret.
 */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
