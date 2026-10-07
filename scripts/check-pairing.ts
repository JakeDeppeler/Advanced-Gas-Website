/**
 * The pairing code: is it actually hard to guess, and does it accept what a
 * television's keyboard will send?
 *
 *   npm run check:pairing
 *
 * A short code standing in for a 64-character token is only safe because of
 * three bounds together — the alphabet, fifteen minutes, and one use. Two of
 * those live in pairing.ts against the database; the shape of the code itself
 * is here, where it can be checked.
 */
import { ALPHABET, LENGTH, PAIRING_TTL_MS, makeCode, normaliseCode, prettyCode } from "../src/lib/board/pairCode";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"}  ${what}${cond || got === undefined ? "" : `  (got ${JSON.stringify(got)})`}`);
}

console.log("\n-- the alphabet --");
ok(ALPHABET.length === 32, "32 letters, so a byte maps on with no bias", ALPHABET.length);
ok(256 % ALPHABET.length === 0, "and 256 divides by it, so there is no rejection loop");
for (const bad of ["I", "O", "0", "1"]) {
  ok(!ALPHABET.includes(bad), `no ${bad} — it is read off a laptop and typed on a remote`);
}
ok(new Set(ALPHABET).size === ALPHABET.length, "no letter twice, which would skew the draw");

console.log("\n-- how hard to guess --");
const space = Math.pow(ALPHABET.length, LENGTH);
ok(space >= 2 ** 40, `${LENGTH} characters is ${space.toExponential(2)} — a trillion, not a million`, space);
ok(PAIRING_TTL_MS <= 15 * 60_000, "and it dies within fifteen minutes", PAIRING_TTL_MS);

console.log("\n-- the codes themselves --");
const many = Array.from({ length: 2000 }, makeCode);
ok(many.every((c) => c.length === LENGTH), "every code is the right length");
ok(many.every((c) => [...c].every((ch) => ALPHABET.includes(ch))), "and uses only the alphabet");
ok(new Set(many).size === many.length, "2,000 codes, no collision", new Set(many).size);
/*
 * A generator that lost its randomness would still pass every check above while
 * emitting the same letter over and over. Across 16,000 characters each of the
 * 32 should appear about 500 times; anything outside 300-750 is not a draw.
 */
const counts = new Map<string, number>();
for (const ch of many.join("")) counts.set(ch, (counts.get(ch) ?? 0) + 1);
const lo = Math.min(...counts.values());
const hi = Math.max(...counts.values());
ok(counts.size === ALPHABET.length, "every letter turns up at least once", counts.size);
ok(lo > 300 && hi < 750, "and no letter is favoured or starved", { lo, hi });

console.log("\n-- what the panel types --");
const code = "K7M2QX8P";
ok(normaliseCode(prettyCode(code)) === code, "the dash we print comes back off", normaliseCode(prettyCode(code)));
ok(normaliseCode("k7m2-qx8p") === code, "lower case, which is what a TV keyboard sends");
ok(normaliseCode(" K7M2 QX8P ") === code, "spaces from a copy and paste");
ok(normaliseCode("k7m2qx8p") === code, "and no punctuation at all");
ok(normaliseCode("K7M2-QX8") !== code, "but a short code is not the code", normaliseCode("K7M2-QX8"));

console.log(failed ? `\n${failed} failed\n` : "\nall good\n");
process.exit(failed ? 1 : 0);
