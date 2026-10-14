/**
 * Accounts receivable, aged. The boundaries and what lands where.
 *
 * Every figure in this report is money somebody is going to ring about, so an
 * invoice in the wrong column is a call made on the wrong grounds — and the
 * bands are the part of an AR report people argue over, because 30 and 31 are
 * a day apart and a world apart.
 */
import { AR_BANDS, arBand, arOverdue, arReport, emptyTotals } from "../src/lib/portal/ar";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};
const inv = (customer: string, amount: number, daysOver: number) => ({ customer, amount, daysOver });

console.log("-- the bands are ServiceTitan's thirties --");
ok("five bands", AR_BANDS.length === 5, AR_BANDS.map((b) => b.short));
// An invoice due today has not been paid late. This is the one people get
// wrong, and it decides whether $51,276 reads as current or as overdue.
ok("due today is current, not one day late", arBand(0) === "current");
ok("not due for a week is current", arBand(-7) === "current");
ok("one day over opens 1–30", arBand(1) === "d1_30");
ok("thirty is the last day of 1–30", arBand(30) === "d1_30");
ok("thirty-one opens 31–60", arBand(31) === "d31_60");
ok("sixty is the last of it", arBand(60) === "d31_60");
ok("sixty-one opens 61–90", arBand(61) === "d61_90");
ok("ninety is the last of it", arBand(90) === "d61_90");
ok("ninety-one is over 90", arBand(91) === "d90");
ok("a year is over 90", arBand(400) === "d90");

console.log("\n-- a customer with invoices in three ages --");
const r = arReport([
  inv("HMAS Cerberus", 4835, 27),
  inv("HMAS Cerberus", 468, 38),
  inv("HMAS Cerberus", 1200, -3),
  inv("Nick Bridge", 14805, 22),
  inv("Lisa", 15901, 11),
]);
const cerberus = r.rows.find((x) => x.customer === "HMAS Cerberus")!;
ok("one row a customer, not one a invoice", r.rows.length === 3 && r.invoices === 5);
ok("their invoices land in their own columns",
   cerberus.bands.current === 1200 && cerberus.bands.d1_30 === 4835 && cerberus.bands.d31_60 === 468, cerberus.bands);
ok("and the row total is all of it", cerberus.total === 6503);
// The row is marked by the worst column it has anything in, not the biggest:
// $468 at 38 days is a worse sign than $4,835 at 27.
ok("the row is marked by its oldest money", cerberus.worst === "d31_60");
ok("biggest balance first", r.rows.map((x) => x.customer).join(",") === "Lisa,Nick Bridge,HMAS Cerberus", r.rows.map((x) => x.customer));

console.log("\n-- the summary --");
ok("the band totals add to the whole", AR_BANDS.reduce((t, b) => t + r.totals[b.key], 0) === r.total);
ok("the whole is every invoice", r.total === 4835 + 468 + 1200 + 14805 + 15901, r.total);
// Overdue is everything but Current — the figure the page leads with, and the
// one that must never quietly include money nobody owes yet.
ok("overdue is everything but current", arOverdue(r.totals) === r.total - 1200, arOverdue(r.totals));
ok("an empty report has an empty summary", arOverdue(emptyTotals()) === 0);

console.log("\n-- what must not get in --");
const junk = arReport([inv("Paid up", 0, 40), inv("Credit note", -500, 5), inv("", 900, 2)]);
ok("a zero balance is not owed", junk.rows.every((x) => x.customer !== "Paid up"));
ok("nor is a credit", junk.rows.every((x) => x.customer !== "Credit note"));
// Money with no name on it is still money owed, so it gets its own row rather
// than falling into whichever customer happens to sort first.
ok("an unnamed customer keeps its own row", junk.rows.length === 1 && junk.rows[0].customer === "No customer name", junk.rows[0]);

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);
