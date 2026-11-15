/**
 * The Crew page's arithmetic, and the three things it must never do: judge a
 * two-man job by the crew's man-hours, count a defaulted stamp as a
 * measurement, or rate a man off four jobs.
 */
import {
  GRACE_HOURS,
  MIN_TIMED,
  crewTeam,
  isMainTech,
  techKpi,
  type CrewVisit,
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
  billed: 0,
  share: 1,
  nonBillable: false,
  quoteVisit: false,
  canFind: false,
  quoted: false,
  ledInstall: false,
  drive: { hours: 0, trips: 0, of: 1 },
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

console.log("\n-- drive time is the average over the trips that recorded one --");
const drove = techKpi("F", [
  visit({ jobId: 1, drive: { hours: 0.5, trips: 1, of: 1 } }),
  // Arrival stamped at the dispatch moment: a trip that happened, not a trip of
  // no minutes. It belongs in the denominator of "recorded", not in the average.
  visit({ jobId: 2, drive: { hours: 0, trips: 0, of: 1 } }),
  visit({ jobId: 3, drive: { hours: 0.25, trips: 1, of: 1 } }),
]);
ok("the hours are what was recorded", near(drove.drive.hours, 0.75));
ok("the average is over those trips only", near(drove.drive.avgMins, 22.5), String(drove.drive.avgMins));
ok("and the page can say how many said nothing", drove.drive.trips === 2 && drove.drive.of === 3);
const noDrive = techKpi("G", [visit({ jobId: 1, drive: { hours: 0, trips: 0, of: 2 } })]);
ok("no recorded trip is no average, not zero minutes", noDrive.drive.avgMins === null);

console.log("\n-- billable and not --");
const mix = techKpi("H", [
  visit({ jobId: 1, hours: 2, billed: 800 }),
  visit({ jobId: 2, hours: 1, nonBillable: true, quoteVisit: true }),
  visit({ jobId: 3, hours: 1, nonBillable: true }),
]);
ok("the clock is every measured hour", near(mix.hours, 4));
ok("the unbillable ones are named", near(mix.nonBillableHours, 2));
ok("quoting is called out inside that", near(mix.quoteHours, 1));
ok("and the share is of the clock", near(mix.nonBillableShare, 0.5));
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
ok("twenty hours and ten jobs is a tech on the tools",
   isMainTech(techKpi("K", Array.from({ length: 10 }, (_, i) => visit({ jobId: i + 1, hours: 2 })))));
ok("the same hours over nine jobs is not",
   !isMainTech(techKpi("L", Array.from({ length: 9 }, (_, i) => visit({ jobId: i + 1, hours: 2.3 })))));
ok("nor are sixty jobs with two hours on the clock between them",
   !isMainTech(techKpi("M", Array.from({ length: 60 }, (_, i) =>
     visit({ jobId: i + 1, hours: i < 2 ? 1 : null })))));

console.log("\n-- the team line --");
const team = crewTeam([dean, chaz, half]);
ok("adds the jobs", team.jobs === 5);
ok("adds the hours", near(team.hours, 3.4 + 3.1 + 3.25));
ok("adds both halves of the rate", team.inTime.of === 3 && team.inTime.within === 0);
ok("and rates the team on the whole of it, below MIN_TIMED", team.inTimeRate === null);

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
