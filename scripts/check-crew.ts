/**
 * The Crew page's arithmetic, and the three things it must never do: judge a
 * two-man job by the crew's man-hours, count a defaulted stamp as a
 * measurement, or rate a man off four jobs.
 */
import {
  BREAK_HOURS,
  DAY_HOURS,
  GRACE_HOURS,
  LONGEST_ALLOWED_HOURS,
  MIN_IDLE_DAYS,
  MIN_TIMED,
  MIN_TYPE_TIMED,
  VAN_TECHS,
  crewTeam,
  isVanTech,
  jobTypeKpis,
  normaliseVans,
  rollUpTypes,
  techKpi,
  type CrewVisit,
  type TypedJob,
} from "../src/lib/dashboard/crewTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};
const near = (a: number | null, b: number, eps = 0.001) => a != null && Math.abs(a - b) < eps;

const visit = (p: Partial<CrewVisit> & { jobId: number }): CrewVisit => ({
  sector: "install",
  hours: 1,
  elapsed: 1,
  sold: null,
  allowed: null,
  billed: 0,
  share: 1,
  canFind: false,
  quoted: false,
  ledInstall: false,
  drive: { hours: 0, recorded: false },
  ...p,
});

console.log("-- the time on site, not the crew's man-hours --");
/*
 * The real shape of it: a two-man install sold at 3 hours, both men on site
 * from 8 to 11:30. Six and a half man-hours against three sold reads as more
 * than twice over; three and a half hours on site against three sold is half an
 * hour over, which is what happened. Both men carry the job's verdict, because
 * nothing in the data separates them.
 */
const twoMan = { jobId: 1, sector: "install" as const, elapsed: 3.5, sold: 3, billed: 9000 };
const dean = techKpi("Dean", [visit({ ...twoMan, hours: 3.4, share: 0.5 })]);
const chaz = techKpi("Chaz", [visit({ ...twoMan, hours: 3.1, share: 0.5 })]);
ok("the job is judged once, on its time on site", dean.inTime.of === 1 && chaz.inTime.of === 1);
ok("and both men carry the same verdict", dean.inTime.within === 0 && chaz.inTime.within === 0);
ok("the money splits by the hours, so it is not counted twice",
   dean.billed + chaz.billed === 9000, `${dean.billed} + ${chaz.billed}`);
ok("each man's own hours stay his own", near(dean.hours, 3.4) && near(chaz.hours, 3.1));

console.log("\n-- the grace --");
const onIt = techKpi("A", [visit({ jobId: 1, elapsed: 3 + GRACE_HOURS, sold: 3 })]);
const over = techKpi("B", [visit({ jobId: 1, elapsed: 3 + GRACE_HOURS + 0.01, sold: 3 })]);
ok("a quarter hour over the sold time is on it", onIt.inTime.within === 1);
ok("a minute past that is over it", over.inTime.within === 0);

console.log("\n-- what is not measured is not counted --");
const half = techKpi("C", [
  visit({ jobId: 1, hours: 2, elapsed: 2, sold: 1.5 }),
  // Arrived and done stamped together: a job attended, but no time and no verdict.
  visit({ jobId: 2, hours: null, elapsed: null, sold: 1 }),
  // Clocked, but nothing was sold on it, so there is nothing to judge it against.
  visit({ jobId: 3, hours: 1.25, elapsed: 1.25, sold: null }),
]);
ok("every job attended is counted", half.jobs === 3);
ok("only the clocked ones carry hours", near(half.hours, 3.25), String(half.hours));
ok("and the page can say how many were clocked", half.timed.with === 2 && half.timed.of === 3);
ok("only the job with both halves is judged", half.inTime.of === 1);

console.log("\n-- a rate needs a denominator worth having --");
const few = techKpi("D", Array.from({ length: MIN_TIMED - 1 }, (_, i) =>
  visit({ jobId: i + 1, elapsed: 2, sold: 1 })));
ok(`${MIN_TIMED - 1} judged jobs is no rate at all`, few.inTimeRate === null && few.timeIndex === null);
ok("but the count is still there to show", few.inTime.of === MIN_TIMED - 1);
const enough = techKpi("E", Array.from({ length: MIN_TIMED }, (_, i) =>
  visit({ jobId: i + 1, elapsed: i < 6 ? 1 : 2, sold: 1 })));
ok(`${MIN_TIMED} is a rate`, near(enough.inTimeRate, 6 / MIN_TIMED));
ok("and the index is sold over time on site", near(enough.timeIndex, MIN_TIMED / (6 * 1 + 2 * 2)));

console.log("\n-- drive time is per job, over the jobs that recorded one --");
const drove = techKpi("F", [
  visit({ jobId: 1, drive: { hours: 0.5, recorded: true } }),
  // Arrival stamped at the dispatch moment: a trip that happened, not a trip of
  // no minutes. It belongs in the denominator of "recorded", not in the average.
  visit({ jobId: 2, drive: { hours: 0, recorded: false } }),
  visit({ jobId: 3, drive: { hours: 0.25, recorded: true } }),
]);
ok("the hours are what was recorded", near(drove.drive.hours, 0.75));
ok("the average is over those jobs only", near(drove.drive.avgMins, 22.5), String(drove.drive.avgMins));
ok("and the page can say how many said nothing", drove.drive.jobs === 2 && drove.drive.of === 3);
const noDrive = techKpi("G", [visit({ jobId: 1, drive: { hours: 0, recorded: false } })]);
ok("no recorded drive is no average, not zero minutes", noDrive.drive.avgMins === null);

console.log("\n-- what the day was paid for, and what it did --");
/*
 * Jake's definition (15 Nov): non-billable is any time between 7:00 and 15:30
 * not on a job and not driving to one. Two days, 8.5 hours each: six and a
 * half busy on the first, four on the second.
 */
const mix = techKpi(
  "H",
  [visit({ jobId: 1, hours: 2, billed: 800 }), visit({ jobId: 2, hours: 2 })],
  [
    { day: "2026-11-13", busy: 6.5, full: true },
    { day: "2026-11-14", busy: 4, full: true },
    // Somebody forgot to tap done on one job: this day cannot say what the rest
    // of it was, so it is left out rather than counted as four hours idle.
    { day: "2026-11-12", busy: 4.5, full: false },
  ],
  2,
);
ok("the paid day is 8.5 hours", DAY_HOURS === 8.5);
ok("half an hour a day is a break, not idleness", BREAK_HOURS === 0.5);
ok("what is left over, after the break, is the non-billable time",
   near(mix.idle.hours, 2 * (DAY_HOURS - BREAK_HOURS) - 10.5), `${mix.idle.hours}`);
ok("counted over the days every job was stamped", mix.idle.days === 2);
// The denominator stays the whole paid day: the break is an allowance against
// what was idle, not an hour the business stopped paying for.
ok("and the share is of what the business paid for on those days", near(mix.idle.share, 5.5 / 17));
/*
 * The break is per day and cannot be banked. Two days half an hour short of
 * full are nothing idle; one day an hour short is half an hour idle. Taking an
 * hour off the window total instead would score the first pair at nought and
 * the second at nought too, and they are not the same day.
 */
const banked = techKpi("Br", [],
  [{ day: "1", busy: DAY_HOURS - 0.5, full: true }, { day: "2", busy: DAY_HOURS - 0.5, full: true }], 1);
ok("a half-hour gap on each of two days is the break, twice over", banked.idle.hours === 0);
ok("an hour short on one day is half an hour over the break",
   near(techKpi("Br2", [], [{ day: "1", busy: DAY_HOURS - 1, full: true }], 1).idle.hours, 0.5));
ok("a day with a job unstamped is left out of both halves",
   !near(mix.idle.hours, 3 * DAY_HOURS - 15));
ok("a day worked past knock-off never goes negative",
   techKpi("X", [], [{ day: "d", busy: 11, full: true }], 1).idle.hours === 0);
ok("no days worked is no share, not nought per cent", techKpi("Y", []).idle.share === null);
ok(`fewer than ${MIN_IDLE_DAYS} days that can answer is no share either`,
   techKpi("Z", [], [{ day: "d", busy: 4, full: true }]).idle.share === null);
ok("but the days it has are still counted, so the page can say how few",
   techKpi("Z", [], [{ day: "d", busy: 4, full: true }]).idle.days === 1);
ok("the clock is every measured hour", near(mix.hours, 4));
ok("what was billed is the share of the job", near(mix.billed, 800));
ok("per hour is over every hour on the clock", near(mix.perHour, 200));
const blink = techKpi("I", [visit({ jobId: 1, hours: 0.2, billed: 800 })]);
ok("twelve minutes on the clock buys no hourly rate", blink.perHour === null);

console.log("\n-- work found --");
const found = techKpi("J", [
  visit({ jobId: 1, sector: "breakdown", canFind: true, quoted: true, ledInstall: true }),
  visit({ jobId: 2, sector: "maintenance", canFind: true }),
  visit({ jobId: 3, sector: "install" }),
]);
ok("only the visits that could find work are the denominator", found.found.visits === 2);
ok("quotes off those visits are counted", found.found.quoted === 1);
ok("and so are the installs that followed", found.found.install === 1);
ok("the mix counts every job by its kind",
   found.mix.breakdown === 1 && found.mix.maintenance === 1 && found.mix.install === 1);

console.log("\n-- who the page is about --");
/*
 * The vans, and nobody else: a passenger's hours are already inside a van's
 * day, so a row of their own would count the same work twice.
 */
ok("a van is on the page", isVanTech("Dean Winbanks"));
ok("however it was typed", isVanTech("  dean winbanks "));
ok("and a passenger is not", !isVanTech("Ray Kennedy"));
ok("the stored list wins where there is one", isVanTech("Someone Else", ["Someone Else"]));
ok("an empty stored list falls back rather than emptying the page",
   normaliseVans([]).length === VAN_TECHS.length);
ok("and so does anything that is not a list", normaliseVans("Dean").length === VAN_TECHS.length);

console.log("\n-- the team line --");
const team = crewTeam([dean, chaz, half]);
ok("adds the jobs", team.jobs === 5);
ok("adds the hours", near(team.hours, 3.4 + 3.1 + 3.25));
ok("and the non-billable share is over the team's days, not an average of averages",
   crewTeam([
     techKpi("A", [], [{ day: "1", busy: 8.5, full: true }], 1),
     techKpi("B", [], [{ day: "1", busy: 0, full: true }, { day: "2", busy: 0, full: true }], 1),
   ]).idle.share === 2 * (DAY_HOURS - BREAK_HOURS) / (3 * DAY_HOURS));
ok("adds both halves of the rate", team.inTime.of === 3 && team.inTime.within === 0);
ok("and rates the team on the whole of it, below MIN_TIMED", team.inTimeRate === null);



console.log("\n-- the time allowed: the slot, not the invoice --");
/*
 * The slot is the job's, like the sold time: a four-hour install done by two
 * men in three and a half hours came in on it, and both men carry that. The
 * point of it is coverage — it exists on the morning of the job, where the sold
 * hours arrive days later and only on what was billed by the hour.
 */
const slot = techKpi("S", [
  visit({ jobId: 1, elapsed: 3.5, allowed: 4 }),
  visit({ jobId: 2, elapsed: 2.0, allowed: 1.5 }),
  // Sold nothing, so the invoice half cannot judge it. The slot still can.
  visit({ jobId: 3, elapsed: 1.0, allowed: 1.5 }),
]);
ok("every job with a slot and a clock is judged", slot.allow.of === 3);
ok("and the ones that came in are counted", slot.allow.within === 2, `${slot.allow.within}`);
ok("the hours allowed and the hours used are both there",
   near(slot.allow.allowed, 7) && near(slot.allow.taken, 6.5));
ok("none of it needs an invoice", slot.inTime.of === 0);
ok("the grace is the same quarter hour",
   techKpi("S2", [visit({ jobId: 1, elapsed: 1.5 + GRACE_HOURS, allowed: 1.5 })]).allow.within === 1);
/*
 * A ducted install is booked for twenty hours and done over two or three days.
 * Time on site is one continuous stretch, so a slot that long can only ever
 * come in under. Left out of the rate rather than counted as a win.
 */
const ducted = techKpi("S3", [visit({ jobId: 1, elapsed: 7.5, allowed: 20 })]);
ok("a slot longer than the paid day is not judged against one visit", ducted.allow.of === 0);
ok("and the paid day is where that line is drawn", LONGEST_ALLOWED_HOURS === DAY_HOURS);
ok("a job type with no slot set is not judged either",
   techKpi("S4", [visit({ jobId: 1, elapsed: 2, allowed: null })]).allow.of === 0);
ok("nor is one nobody clocked",
   techKpi("S5", [visit({ jobId: 1, elapsed: null, allowed: 1.5 })]).allow.of === 0);
ok(`below ${MIN_TIMED} judged jobs there is no rate`, slot.inAllowedRate === null);

console.log("\n-- the job types --");
const tj = (p: Partial<TypedJob> & { jobId: number; type: string }): TypedJob => ({
  sector: "maintenance",
  allowed: 1.5,
  elapsed: 1,
  billed: 0,
  outcome: "none",
  ledBilled: 0,
  ...p,
});
const types = jobTypeKpis([
  tj({ jobId: 1, type: "Service - Split System", billed: 300 }),
  tj({ jobId: 2, type: "Service - Split System", elapsed: 2, billed: 500 }),
  // Billed nothing: a quote visit or a warranty call. It is a job of this type
  // and counts as one, but it must not drag the average price down.
  tj({ jobId: 3, type: "Service - Split System", billed: 0 }),
  tj({ jobId: 4, type: "Installation - Split System", sector: "install", allowed: 4, elapsed: 3.5, billed: 9000 }),
]);
ok("one row per job type, most jobs first", types.length === 2 && types[0].jobs === 3);
ok("the slot is the type's own", types[0].allowed === 1.5 && types[1].allowed === 4);
ok("the average is over the jobs that were timed", near(types[0].avgTaken, (1 + 2 + 1) / 3));
ok("two of the three came in on the slot", types[0].inTime.of === 3 && types[0].inTime.within === 2);
ok("the money is the whole job's", near(types[0].billed, 800));
ok("and the average price is over the jobs that billed, not over all of them",
   near(types[0].avgBilled, 400), `${types[0].avgBilled}`);
ok(`below ${MIN_TYPE_TIMED} judged jobs a type shows no rate`, types[0].rate === null);
ok("the sector comes with the row", types[1].sector === "install");

const rest = rollUpTypes(types, "Everything else");
ok("a rolled-up row adds the jobs", rest.jobs === 4);
ok("and has no slot of its own, because several slots are not a slot", rest.allowed === null);
ok("its average is weighted by the jobs behind each row",
   near(rest.avgTaken, (1 + 2 + 1 + 3.5) / 4), `${rest.avgTaken}`);
ok("and its price is over what actually billed", near(rest.avgBilled, 9800 / 3));

console.log("\n-- what each kind of work turns into --");
/*
 * Jake, 16 Nov: "how many problem turn into a repair, install or just a
 * problem". Three buckets that add to the row, so a bar drawn from them is a
 * whole bar.
 */
const outcomes = jobTypeKpis([
  tj({ jobId: 1, type: "Diagnostics - Split System", sector: "breakdown", outcome: "install", ledBilled: 9000 }),
  tj({ jobId: 2, type: "Diagnostics - Split System", sector: "breakdown", outcome: "repair", ledBilled: 400 }),
  tj({ jobId: 3, type: "Diagnostics - Split System", sector: "breakdown" }),
  tj({ jobId: 4, type: "Diagnostics - Split System", sector: "breakdown" }),
])[0];
ok("the installs it led to are counted", outcomes.led.install === 1);
ok("so are the repairs", outcomes.led.repair === 1);
ok("and the ones that were just the job", outcomes.led.none === 2);
ok("the three add up to the row, so the bar is a whole bar",
   outcomes.led.install + outcomes.led.repair + outcomes.led.none === outcomes.jobs);
ok("what the follow-on work billed comes with it", near(outcomes.led.billed, 9400));
const rolled = rollUpTypes([outcomes, types[1]], "all");
ok("a rolled-up row adds the outcomes too",
   rolled.led.install === 1 + types[1].led.install && rolled.led.none === 2 + types[1].led.none);
ok("and a rolled-up row still adds to its own jobs",
   rolled.led.install + rolled.led.repair + rolled.led.none === rolled.jobs);

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
