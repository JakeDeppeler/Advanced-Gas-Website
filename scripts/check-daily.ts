/**
 * The Daily pace page's arithmetic, and the one thing it must never do: compare
 * a whole day's hours against the quoted hours of part of it.
 */
import { techDay, normaliseStandardHours, type PaceJob } from "../src/lib/dashboard/dailyPaceTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};
const job = (p: Partial<PaceJob> & { jobId: number }): PaceJob => ({
  what: "Job", where: null, taken: 1, quoted: null, quotedFrom: null,
  done: true, billed: 0, onNow: false, crew: 1, ...p,
});

console.log("-- like against like --");
// Ray's real day: two quoted jobs and one that was never quoted.
const ray = techDay("Ray", [
  job({ jobId: 1, taken: 2.1, quoted: 1.5, quotedFrom: "invoice" }),
  job({ jobId: 2, taken: 1.4, quoted: 1.5, quotedFrom: "invoice", billed: 480 }),
  job({ jobId: 3, taken: 0.65 }),
]);
ok("every hour is counted in the day's total", Math.abs(ray.hoursTaken - 4.15) < 0.001, String(ray.hoursTaken));
ok("the quoted total covers only the quoted jobs", ray.hoursQuoted === 3, String(ray.hoursQuoted));
ok("and the taken it is divided by covers the same two", Math.abs(ray.hoursTakenQuoted - 3.5) < 0.001, String(ray.hoursTakenQuoted));
// The bug this file exists for: 3 / 4.15 = 72%, which would have put Ray in the
// red for an unquoted job. 3 / 3.5 = 86%, which is the truth.
ok("so the dial reads 86%, not the 72% the whole day would give",
   Math.round((ray.hoursQuoted! / ray.hoursTakenQuoted) * 100) === 86);
ok("and the card can say how many were not quoted", ray.quotedCover.with === 2 && ray.quotedCover.of === 3);

console.log("\n-- a day with nothing quoted --");
const chaz = techDay("Chaz", [1, 2, 3, 4, 5].map((i) => job({ jobId: i, taken: 1.156 })));
ok("is not scored at all", chaz.hoursQuoted === null);
ok("rather than scored as zero", chaz.hoursTakenQuoted === 0);
ok("but its hours are still counted", Math.abs(chaz.hoursTaken - 5.78) < 0.01, String(chaz.hoursTaken));

console.log("\n-- what is finished, and what is billed --");
const mix = techDay("Jax", [
  job({ jobId: 1, taken: 3.3, quoted: 2, billed: 1180 }),
  job({ jobId: 2, taken: 1.17, quoted: 1, done: false, onNow: true }),
  job({ jobId: 3, taken: 0.5 }),
]);
ok("a job still being worked on is not done", mix.jobsDone === 2 && mix.jobsTotal === 3);
ok("billed counts finished jobs that carry money", mix.billedCount === 1);
ok("waiting to bill is the rest of the finished ones", mix.toBillCount === 1);
ok("and the one in progress is the one shown as Now", mix.onNow?.jobId === 2);
// A job in progress still has its hours counted, or the dial would under-report
// a tech who is three hours into something.
ok("the live job's hours count toward the day", Math.abs(mix.hoursTaken - 4.97) < 0.001, String(mix.hoursTaken));
ok("and toward the quoted comparison, since it was quoted", Math.abs(mix.hoursTakenQuoted - 4.47) < 0.001);

console.log("\n-- nobody with no jobs --");
const none = techDay("Nobody", []);
ok("no quoted hours", none.hoursQuoted === null);
ok("no division by zero", none.hoursTakenQuoted === 0 && none.jobsTotal === 0);
ok("and nothing shown as in progress", none.onNow === null);

console.log("\n-- a forgotten done tap is not a day's work --");
/*
 * The real one: a diagnostic on 13 November stamped arrived at one in the
 * afternoon and done the next morning. The span is 24.8 hours, which put 30.7
 * hours on one tech's card and scored him 60% behind for it.
 */
const forgot = techDay("Chaz", [
  job({ jobId: 1, taken: 5.9, quoted: 5.67, quotedFrom: "invoice", crew: 3 }),
  job({ jobId: 2, taken: null, quoted: 1.5, quotedFrom: "standard" }),
]);
ok("the unmeasured job carries no hours", Math.abs(forgot.hoursTaken - 5.9) < 0.001, String(forgot.hoursTaken));
ok("and is named rather than hidden", forgot.untimed === 1);
ok("it is still on the list and still done", forgot.jobsTotal === 2 && forgot.jobsDone === 2);
ok("and it is out of the comparison, both halves",
   forgot.hoursQuoted === 5.67 && Math.abs(forgot.hoursTakenQuoted - 5.9) < 0.001);
ok("so the dial reads 96%, not the 30% the 24-hour span gave",
   Math.round((forgot.hoursQuoted! / forgot.hoursTakenQuoted) * 100) === 96);

console.log("\n-- a job three men were on is one job's allowance --");
/*
 * The ducted install at Garfield: seventeen hours sold, three men on it. Each
 * man used to be scored against the whole seventeen, so all three read "Ahead ·
 * 204%" off a job the crew was in fact over on. dailyPace divides an invoice's
 * sold hours by the crew; these are the shares it hands out.
 */
const shared = [8.35, 5.9, 8.25].map((t, i) => techDay(`T${i}`, [
  job({ jobId: 301329548, taken: t, quoted: 17 / 3, quotedFrom: "invoice", crew: 3 }),
]));
ok("each man is measured against his share", shared.every((t) => Math.abs(t.hoursQuoted! - 5.667) < 0.01));
ok("so all three read over, where all three used to read 204% ahead",
   shared.every((t) => t.hoursQuoted! < t.hoursTakenQuoted));
ok("and the shares add back to the job's quote",
   Math.abs(shared.reduce((a, t) => a + t.hoursQuoted!, 0) - 17) < 0.001);
ok("against 22.5 hours the crew actually put in",
   Math.abs(shared.reduce((a, t) => a + t.hoursTakenQuoted, 0) - 22.5) < 0.001);

console.log("\n-- the standard times the office sets --");
ok("a sensible number is kept", normaliseStandardHours({ "Service - X": 1.5 })["Service - X"] === 1.5);
ok("zero is 'not set', not 'takes no time'", normaliseStandardHours({ a: 0 }).a === undefined);
ok("so is a negative", normaliseStandardHours({ a: -2 }).a === undefined);
ok("and anything past a day is rejected", normaliseStandardHours({ a: 25 }).a === undefined);
ok("text is rejected rather than becoming NaN", normaliseStandardHours({ a: "about two" }).a === undefined);
ok("a string of digits is read", normaliseStandardHours({ a: "1.25" }).a === 1.25);
ok("nothing at all is an empty map", Object.keys(normaliseStandardHours(null)).length === 0);

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
