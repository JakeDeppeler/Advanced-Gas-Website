/**
 * The margin on what was sold, and the three ways it could lie.
 */
import { summariseSold } from "../src/lib/dashboard/soldMarginTypes";
import { isVeu, normaliseRebate } from "../src/lib/dashboard/soldMarginTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};
const est = (subtotal: number, costs: number[], opts: { name?: string; unit?: string } = {}) => ({
  id: Math.random(), status: "Sold", sold_on: "2026-10-05T00:00:00Z",
  subtotal, total: subtotal * 1.1, business_unit: opts.unit ?? "Domestic - Installation",
  raw: { name: opts.name ?? "Ducted heater", items: costs.map((c) => ({ totalCost: c })) },
});

console.log("-- the plain case --");
const plain = summariseSold([est(1000, [600]), est(2000, [1200])], null);
ok("margin is price less cost over price", plain?.marginPct === 40, String(plain?.marginPct));
ok("ex-GST throughout", plain?.soldExGst === 3000 && plain?.cost === 1800);
ok("two jobs", plain?.jobs === 2);

console.log("\n-- the pre-go-live import --");
// 140 imported estimates carry no line costs and compute as 99.3% margin.
const withImport = summariseSold(
  [est(1000, [600]), est(50000, [], { unit: "Imported Default Businessunit" })],
  null,
);
ok("is left out entirely, not counted as free money", withImport?.jobs === 1 && withImport?.marginPct === 40);
ok("and not in the coverage either", Math.round(withImport!.coveragePct!) === 100);

console.log("\n-- a sold job with no costed lines --");
const uncosted = summariseSold([est(1000, [600]), est(1000, [])], null);
ok("is not booked at 100% margin", uncosted?.marginPct === 40, String(uncosted?.marginPct));
ok("but is counted in the coverage, so the gap is visible", uncosted?.uncosted === 1);
ok("and the coverage says half the month's value", Math.round(uncosted!.coveragePct!) === 50);

console.log("\n-- VEU, the reason this needed asking --");
const veuJob = est(8310, [10665], { name: "Energy Efficient Upgrades - Ducted Split System" });
const noRebate = summariseSold([veuJob], null);
ok("without a rebate the job really is sold under cost", noRebate!.marginPct! < 0, `${Math.round(noRebate!.marginPct!)}%`);
ok("and it is flagged as VEU so the board can say why", noRebate?.veuJobs === 1);
ok("with no rebate counted", noRebate?.rebateIncome === 0 && noRebate?.rebatePerJob === null);

const withRebate = summariseSold([veuJob], 650);
ok("a set rebate is added as income", withRebate?.rebateIncome === 650);
ok("which lifts the margin", withRebate!.marginPct! > noRebate!.marginPct!, `${Math.round(withRebate!.marginPct!)}%`);
// (8310 + 650 - 10665) / (8310 + 650) = -19.0%
ok("by the right amount", Math.round(withRebate!.marginPct!) === -19, String(Math.round(withRebate!.marginPct!)));

console.log("\n-- spotting a VEU job --");
ok("by the words the office uses", isVeu("Energy Efficient Upgrades - Ducted"));
ok("and the acronym", isVeu("VEU ducted changeover"));
ok("and the word rebate", isVeu("Heat pump with rebate"));
ok("an ordinary job is not one", !isVeu("Brivis Wombat 15kW Ducted Gas Heater"));
ok("nor is a word that merely contains it", !isVeu("Revue of the site"));
ok("nothing at all is not one", !isVeu(null));

console.log("\n-- the rebate the office sets --");
ok("a sensible amount is kept", normaliseRebate(650) === 650);
ok("zero is 'not set', not 'worth nothing'", normaliseRebate(0) === null);
ok("negative is rejected", normaliseRebate(-100) === null);
ok("and so is an implausible one", normaliseRebate(50000) === null);
ok("text is rejected rather than becoming NaN", normaliseRebate("lots") === null);
ok("nothing stored reads as unset", normaliseRebate(null) === null);

console.log("\n-- nothing sold yet --");
ok("is null, not 0%", summariseSold([], null) === null);
ok("and so is a month of uncosted sales", summariseSold([est(1000, [])], null) === null);

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
