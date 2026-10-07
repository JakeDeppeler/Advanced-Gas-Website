/**
 * How a board event comes out as an alert, especially when ServiceTitan has
 * only half the facts.
 *
 *   npm run check:alerts
 *
 * The alerts take the whole wall. A line that reads "· Officer" with nothing
 * in front of it, or a bonus bar drawn against a target nobody set, is a
 * mistake the room sees at four metres — and neither shows up in a typecheck
 * or in a screenshot of the one case that happens to have every field.
 */
import { alertFrom, ordinal } from "../src/lib/dashboard/alertCopy";
import type { Metrics } from "../src/lib/dashboard/metrics";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"}  ${what}${cond || got === undefined ? "" : `  (got ${JSON.stringify(got)})`}`);
}

type Ev = Metrics["alertEvents"][number];
const ev = (o: Partial<Ev>): Ev => ({
  kind: "sold", id: "e1", at: "2026-10-06T05:55:00Z", amount: 5340,
  jobType: "Heat pump HWS", suburb: "Officer", who: "Jake Deppeler", nth: 3, ...o,
});

/** A board with a weekly sold target, and one without. */
const withPlan = {
  pace: { week: { sold: { value: 60700 } } },
  paceData: { periods: { week: { soldValue: 10140 } } },
} as unknown as Metrics;
const noPlan = {} as unknown as Metrics;

console.log("\n-- sold --");
const sold = alertFrom(ev({}), withPlan);
ok(sold.name === "Jake Deppeler", "leads with who closed it", sold.name);
ok(sold.where === "Heat pump HWS · Officer", "work and place in the slab", sold.where);
ok(sold.note === "3rd sale this month", "and the tally, with no pronoun", sold.note);
ok(sold.bars?.length === 1, "one bar: the team week", sold.bars?.length);
ok(sold.bars?.[0].label === "Team · this week", "labelled", sold.bars?.[0].label);
ok(sold.bars?.[0].detail === "$4,800 → $10,140 of $60,700", "from, to and target", sold.bars?.[0].detail);
ok(Math.abs((sold.bars?.[0].to ?? 0) - 10140 / 60700) < 1e-9, "the bar lands on done ÷ target", sold.bars?.[0].to);

console.log("\n-- the bonus bar has no target --");
// No commission tiers are configured, so the person's month has nothing to be
// measured against. It must be absent, never drawn against a guessed threshold.
ok(!sold.bars?.some((b) => /bonus/i.test(b.detail)), "no bonus bar while no tier is set");
ok(alertFrom(ev({}), noPlan).bars?.length === 0, "no weekly target: no bar at all, not a zero one");

console.log("\n-- a first sale says nothing --");
ok(alertFrom(ev({ nth: 1 }), withPlan).note == null, "1st sale carries no tally", alertFrom(ev({ nth: 1 }), withPlan).note);
ok(alertFrom(ev({ nth: null }), withPlan).note == null, "nor does an unknown one");

console.log("\n-- half the facts --");
const noSuburb = alertFrom(ev({ kind: "quote", suburb: null }), withPlan);
ok(noSuburb.where === "Jake Deppeler", "no suburb: no leading separator", noSuburb.where);
const noWho = alertFrom(ev({ kind: "quote", who: null }), withPlan);
ok(noWho.where === "Officer", "no tech: no trailing separator", noWho.where);
const neither = alertFrom(ev({ kind: "quote", who: null, suburb: null }), withPlan);
ok(neither.where === "Advanced Gas", "neither: a name, not an empty line", neither.where);
const noType = alertFrom(ev({ kind: "done", jobType: null }), withPlan);
ok(noType.name === "Job", "no job type: still says something", noType.name);
const soldBare = alertFrom(ev({ jobType: null, suburb: null, who: null }), withPlan);
ok(soldBare.name === "Advanced Gas" && soldBare.where === "Sold", "a sale with nothing on it still reads", soldBare);

console.log("\n-- what the chip says --");
ok(alertFrom(ev({ kind: "quote" }), withPlan).chip === "Follow up in 2 days if it hasn't closed", "quote");
ok(alertFrom(ev({ kind: "done", amount: 5340 }), withPlan).chip === "Ready to bill", "a priced job is ready");
// Most service work is finished before anybody puts a price on it; the alert
// has to say that rather than show "$0 · ready to bill".
ok(alertFrom(ev({ kind: "done", amount: 0 }), withPlan).chip === "Price it, then bill it", "an unpriced one is not");

console.log("\n-- ordinals --");
ok(["1st", "2nd", "3rd", "4th"].every((x, i) => ordinal(i + 1) === x), "1st 2nd 3rd 4th");
ok(ordinal(11) === "11th" && ordinal(12) === "12th" && ordinal(13) === "13th", "the teens are all th");
ok(ordinal(21) === "21st" && ordinal(22) === "22nd" && ordinal(23) === "23rd", "and 21st 22nd 23rd are not");

/* ── one alert per quote, not per option ───────────────────────────────────── */
/*
 * ServiceTitan writes an estimate row for every option, so a job priced three
 * ways used to fire three alerts back to back — the same quote, three times,
 * each with a different number. Reported from the floor as "it does a double
 * pop up".
 */
console.log("\n-- a quote with options --");
const three = alertFrom(
  ev({ kind: "quote", id: "quote-j991", amount: 7400, options: 3, jobType: "Install - Ducted Refrigerated", suburb: "Officer", who: "Jake", nth: null }),
  noPlan,
);
ok(three.where.includes("avg of 3 options"), "three options say so under the figure", three.where);
ok(three.amount === 7400, "and the figure is the average it was handed", three.amount);

const one = alertFrom(ev({ kind: "quote", id: "quote-j992", amount: 3200, options: 1, nth: null }), noPlan);
ok(!one.where.includes("option"), "a single-option quote says nothing about options", one.where);

const older = alertFrom(ev({ kind: "quote", id: "quote-j993", amount: 3200, nth: null }), noPlan);
ok(!older.where.includes("option"), "nor does one from a snapshot written before options existed", older.where);

console.log(failed ? `\n${failed} failed\n` : "\nall good\n");
process.exit(failed ? 1 : 0);
