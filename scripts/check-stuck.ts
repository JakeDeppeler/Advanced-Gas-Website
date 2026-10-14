/**
 * Where the money's stuck: the banding, and the four things that must never be
 * counted as work we failed to bill.
 *
 * Every figure on that page is a count of jobs or invoices somebody will go and
 * chase, so a job in the wrong band is somebody's afternoon wasted and a job
 * wrongly in the list is an argument with a customer who owes nothing.
 */
import {
  AGE_BANDS, addTo, bandOf, billable, classOf, emptyBanded, oldOf, totalOf,
} from "../src/lib/portal/stuckTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

console.log("-- the bands --");
ok("the five bands cover everything with no gap", AGE_BANDS.map((b) => b.upTo).join(",") === "7,14,30,60,Infinity");
ok("today is this week", bandOf(0) === "d0_7");
ok("seven days is still this week", bandOf(7) === "d0_7");
ok("eight is not", bandOf(8) === "d8_14");
ok("a fortnight exactly", bandOf(14) === "d8_14");
ok("fifteen crosses", bandOf(15) === "d15_30");
ok("thirty is the last of the month", bandOf(30) === "d15_30");
ok("thirty-one is over a month", bandOf(31) === "d31_60");
ok("sixty is the last of it", bandOf(60) === "d31_60");
ok("sixty-one is the long grass", bandOf(61) === "d60plus");
ok("a year is the long grass", bandOf(365) === "d60plus");
// An invoice not yet due has a negative age. It must not land in the oldest
// band through a sign error, which is the sort of thing that puts $51K of
// money nobody owes yet into "over 60 days".
ok("not due yet bands as this week, never as the oldest", bandOf(-9) === "d0_7");

console.log("\n-- what is past a month --");
const b = emptyBanded();
addTo(b, 2, 100);
addTo(b, 20, 200);
addTo(b, 45, 400);
addTo(b, 400, 800);
ok("the total is everything", totalOf(b).count === 4 && totalOf(b).value === 1500, totalOf(b));
ok("and over-a-month is the last two bands only", oldOf(b).count === 2 && oldOf(b).value === 1200, oldOf(b));

console.log("\n-- what counts as work we failed to bill --");
// Measured over 180 days: 19 quote visits invoice at $0 and every one of them
// is correct. Counting them would have put a fifth of the list on the page as
// money we had let go.
ok("a quote visit is not unbilled work", classOf("Quotation") === "quote" && !billable("quote"));
ok("nor is a site assessment", classOf("Site Assessment — Ducted") === "quote");
ok("an install is", classOf("Install - AIO Heat Pump") === "install" && billable("install"));
ok("so is a service job", classOf("Service - Gas Ducted Heater") === "service" && billable("service"));
ok("so is a repair", classOf("Repair - Hot Water") === "service");
ok("and a diagnostic", classOf("Diagnostics - Heating") === "service");
// 126 finished jobs carry no type at all, every one over thirty days old —
// the shape of the import, not of a billing problem. They are named on the
// page and left out of the count.
ok("a job with no type is unknown, not service", classOf(null) === "unknown" && !billable("unknown"));
ok("and neither is an empty string", classOf("   ") === "unknown");
// The one that would read as service if the test were "does it start with
// Install": commercial work is service here, and is billable either way.
ok("commercial work is billable", billable(classOf("Commercial – Install")));

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);
