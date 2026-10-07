/**
 * No SVG paint may depend on a variable the dark theme redefines.
 *
 * This is here because of a bug that cannot be reproduced on any browser in
 * this repository's reach. `.gauge__fig` is `fill: var(--navy)`, and
 * `.screen--dark` redefines --navy from navy to near-white. In Chromium that
 * override reaches inside the SVG and the figure comes out pale. On the
 * television on the office wall it does not: every dial's figure rendered
 * #050a30, navy on a near-black card, while the words around it were correctly
 * pale. The :root value reaches the SVG there and the .screen--dark one does
 * not.
 *
 * It was reported twice — "the number in the middle is blue" — and missed
 * twice, because looking at it here shows nothing wrong. A rendering check
 * cannot catch it either, for the same reason. What can be checked is the thing
 * that made it possible: SVG paint taking a themed variable instead of a colour
 * written out. So that is what this checks.
 *
 * A fill or stroke may use a variable the dark theme leaves alone — the status
 * palette is the same in both themes on purpose — or it may use one that is
 * overridden *provided* there is an explicit `.screen--dark` rule giving that
 * same selector a literal colour.
 */
import { readFileSync } from "node:fs";

const css = readFileSync("src/app/screen/screen.css", "utf8");

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

/** The variables .screen--dark gives a different value to. */
const darkBlock = css.match(/\.screen--dark\s*\{([\s\S]*?)\n\}/);
if (!darkBlock) {
  console.log("FAIL  could not find the .screen--dark block");
  process.exit(1);
}
const overridden = new Set(
  [...darkBlock[1].matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
);
console.log(`-- the dark theme redefines ${overridden.size} variables --`);

/** Every rule that paints an SVG, with the selector it paints. */
const paints: Array<{ selector: string; prop: string; v: string; line: number }> = [];
const lines = css.split("\n");
lines.forEach((line, i) => {
  const m = line.match(/^(\.[^{]+?)\s*\{[^}]*?\b(fill|stroke)\s*:\s*var\((--[a-z0-9-]+)\)/i);
  if (m) paints.push({ selector: m[1].trim(), prop: m[2], v: m[3], line: i + 1 });
});
console.log(`-- ${paints.length} SVG paints take a variable --\n`);

for (const p of paints) {
  if (!overridden.has(p.v)) {
    ok(`${p.selector} ${p.prop}: ${p.v} — same in both themes`, true);
    continue;
  }
  // Overridden: there must be a .screen--dark rule for this selector giving the
  // same property a literal colour.
  const bare = p.selector.replace(/^\./, "");
  const re = new RegExp(`\\.screen--dark\\s+\\.${bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*\\b${p.prop}\\s*:\\s*#`, "i");
  ok(
    `${p.selector} ${p.prop}: ${p.v} is themed — needs a literal dark rule`,
    re.test(css),
    re.test(css) ? "" : `line ${p.line}: add \`.screen--dark ${p.selector} { ${p.prop}: #...; }\``,
  );
}

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
