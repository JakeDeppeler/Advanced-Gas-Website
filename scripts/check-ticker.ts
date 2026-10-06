/**
 * The counting figure, against every shape the board actually formats.
 *
 *   npm run check:ticker
 *
 * It reads a formatted string as a template and moves only the number inside
 * it, so the thing that can go wrong is silent and visual: a figure that
 * animates to a different shape than it settles on, or a word with a digit in
 * it getting treated as a number. Both are only visible for 700ms, which is
 * exactly long enough for nobody to catch them.
 */
import { formatLike, parseFigure, planRun } from "../src/components/screen/Ticker";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"}  ${what}${cond || got === undefined ? "" : `  (got ${JSON.stringify(got)})`}`);
}

/** Mid-flight at the target value must equal what the board settles on. */
function roundTrips(text: string) {
  const p = parseFigure(text);
  if (!p) return false;
  return formatLike(p.value, p) === text;
}

console.log("\n-- the shapes the board formats --");
for (const t of ["$14,850", "$1.5M", "$24K", "$0", "34%", "28", "1,234", "$3,573", "4.2", "$285,222", "0%", "100%"]) {
  ok(roundTrips(t), `${t} re-formats to itself`, parseFigure(t) && formatLike(parseFigure(t)!.value, parseFigure(t)!));
}

console.log("\n-- negatives and the board's own minus --");
// The board writes a real minus sign (U+2212), not a hyphen, and it sits in the
// prefix either way — the number itself never goes negative mid-count.
for (const t of ["−$330K", "-$5,385", "▼ $12K"]) ok(roundTrips(t), `${t} re-formats to itself`);

console.log("\n-- things that are not figures --");
ok(parseFigure("—") === null, "an em dash has no number");
ok(parseFigure("no target yet") === null, "nor does a sentence without digits");
ok(parseFigure("") === null, "nor does nothing");

console.log("\n-- counting in between --");
const p = parseFigure("$14,850")!;
ok(formatLike(0, p) === "$0", "starts at $0 in the same shape", formatLike(0, p));
ok(formatLike(7425, p) === "$7,425", "groups halfway too", formatLike(7425, p));
const pm = parseFigure("$1.5M")!;
ok(formatLike(0, pm) === "$0.0M", "a one-decimal figure keeps its decimal", formatLike(0, pm));
ok(formatLike(0.7, pm) === "$0.7M", "and counts through it", formatLike(0.7, pm));
const pp = parseFigure("34%")!;
ok(formatLike(12, pp) === "12%", "a percentage keeps its suffix", formatLike(12, pp));

console.log("\n-- only the first number moves --");
// "7 of 11 jobs" is a sentence, not a figure. Animating the 7 while the 11 sat
// still would read as the denominator changing.
const two = parseFigure("7 of 11 jobs");
ok(two !== null && two.value === 7 && two.suffix === " of 11 jobs", "the rest is suffix, untouched", two);

console.log("\n-- when it counts, and from where --");
const fig = (t: string) => parseFigure(t);
// The page rebuilds every rotation, so "first sight" happens all day long. A
// count on first sight is a count every thirty seconds, which says nothing.
ok(planRun(null, fig("$14,850"), false).animate === false, "first sight of a number does not count");
const again = planRun(14850, fig("$14,850"), false);
ok(again.animate === false, "the same number again does not re-count");
const moved = planRun(14850, fig("$16,000"), false);
ok(moved.animate === true && (moved as { from: number }).from === 14850, "a higher number counts from the old one", moved);
ok(planRun(1, fig("2"), false).animate === true, "one more quote counts");
ok(planRun(16000, fig("$14,850"), false).animate === false, "a lower number does not count");
ok(planRun(14850, fig("$0"), false).animate === false, "nor does a reset to zero");
ok(planRun(14850, fig("\u2014"), false).animate === false, "a dash stops it");
ok(planRun(14850, fig("$16,000"), true).animate === false, "reduced motion stops it");
ok(planRun(0, fig("$0"), false).animate === false, "zero to zero is not a count");

console.log(failed ? `\n${failed} failed\n` : "\nall good\n");
process.exit(failed ? 1 : 0);
