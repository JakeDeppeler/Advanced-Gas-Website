/**
 * The Service manager scorecard's arithmetic (src/lib/portal/service/scoreTypes.ts):
 * shared jobs split, techs with too few jobs not rated, call-backs only for
 * unquoted returns to the same site soon after.
 */
import { addRework, byJobType, reworkFrom, scoreTechs, type DoneJob, type LaterJob } from "../src/lib/portal/service/scoreTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra !== "" ? `  ${typeof extra === "string" ? extra : JSON.stringify(extra)}` : ""}`);
  if (!pass) bad++;
};
const job = (techs: string[], price: number, profit: number | null, hours: number | null, allowed: number | null = null, actual: number | null = null) =>
  ({ techs, price, profit, hours, allowedHours: allowed, actualHours: actual });

console.log("-- the scorecard --");
const rows = [
  ...Array.from({ length: 4 }, () => job(["Ray"], 1000, 300, 3, 3, 3)),
  job(["Ray", "Dean"], 2000, 400, 4),
  ...Array.from({ length: 4 }, () => job(["Dean"], 800, 100, 4, 3, 4)),
  job(["Dean"], 500, -200, 5),
  job(["Sam"], 900, 200, 2),
  job(["Sam"], 400, null, null),
];
const s = scoreTechs(rows);
const ray = s.find((x) => x.name === "Ray")!, dean = s.find((x) => x.name === "Dean")!, sam = s.find((x) => x.name === "Sam")!;
ok("shared job split evenly", ray.revenue === 5000 && dean.revenue === 4700, [ray.revenue, dean.revenue]);
ok("profit per hour: Ray", Math.abs(ray.profitPerHour! - 1400 / 14) < 1e-9, ray.profitPerHour);
ok("Ray most efficient, first", s[0].name === "Ray");
ok("Dean's losing job counted", dean.losing === 1);
ok("on time: Dean 4 of 4 over", dean.timeJobs === 4 && dean.timeOver === 4 && dean.timeActual === 16 && dean.timeAllowed === 12);
ok("Sam: too few costed to rate", sam.profitPerHour === null && sam.margin === null && sam.costed === 1);
ok("Sam rated last", s[s.length - 1].name === "Sam");
ok("margin on costed revenue only", Math.abs(dean.margin! - (200 + 400 - 200) / (1000 + 3200 + 500)) < 1e-9, dean.margin);
ok("names merge across spacing and case", scoreTechs([job(["Ray  Smith"], 100, 10, 1), job(["ray smith"], 100, 10, 1)]).length === 1);

console.log("-- call-backs --");
const d = (id: number, loc: number, type: string, on: string, techs: string[]): DoneJob => ({ id, jobNumber: String(id), jobType: type, locationId: loc, completedOn: on, techs });
const l = (id: number, loc: number, type: string, on: string, fromEstimate = false, status = "Scheduled"): LaterJob => ({ id, jobNumber: String(id), jobType: type, locationId: loc, createdOn: on, status, fromEstimate });
const done = [
  d(1, 10, "Installation - Split System", "2026-10-01T03:00:00Z", ["Ray"]),
  d(2, 20, "Diagnostics - Gas Ducted Heater", "2026-10-02T03:00:00Z", ["Dean"]),
  d(3, 30, "Service - Split System", "2026-09-01T03:00:00Z", ["Sam"]),
  d(4, 40, "Quotation", "2026-10-03T03:00:00Z", ["Ray"]),
];
const later = [
  l(11, 10, "Warranty - Workmanship", "2026-10-10T03:00:00Z"),             // Ray's install, 9 days: call-back
  l(12, 20, "Repair - Gas Ducted Heater", "2026-10-05T03:00:00Z", true),    // booked from the quote: a sale
  l(13, 30, "Diagnostics - Split System", "2026-10-20T03:00:00Z"),          // 49 days: too long ago
  l(14, 40, "Diagnostics - Split System", "2026-10-06T03:00:00Z"),          // after a quote visit: not rework
  l(15, 10, "Repair - Split System", "2026-10-12T03:00:00Z", false, "Canceled"),
  l(16, 10, "Installation - Split System", "2026-10-12T03:00:00Z"),        // not a fix
];
const rw = reworkFrom(done, later);
ok("one call-back, on Ray's install", rw.length === 1 && rw[0].back.id === 11 && rw[0].first.id === 1 && rw[0].days === 9, rw.map((r) => [r.back.id, r.first.id, r.days]));
const withRw = addRework(scoreTechs([]), done, rw);
ok("call-back against Ray, finished counts", withRw.find((x) => x.name === "Ray")?.callBacks === 1 && withRw.find((x) => x.name === "Ray")?.finished === 1);
ok("the quote visit isn't a finished job", withRw.find((x) => x.name === "Ray")?.finished === 1);

console.log("-- by kind of job --");
const t = byJobType([
  { jobType: "Installation - Split System", price: 5000, profit: 1500 },
  { jobType: "Installation - Split System", price: 5000, profit: 1000 },
  { jobType: "Installation - Split System", price: 5000, profit: -100 },
  { jobType: "Repair - Gas Heater", price: 300, profit: -50 },
  { jobType: null, price: 100, profit: null },
]);
ok("most profit first", t[0].jobType === "Installation - Split System" && t[0].profit === 2400 && t[0].losing === 1);
ok("margin needs 3 costed", t.find((x) => x.jobType === "Repair - Gas Heater")?.margin === null);
ok("no job type named", t.some((x) => x.jobType === "No job type" && x.costed === 0));

if (bad) { console.log(`\n${bad} failed`); process.exit(1); }
console.log("\nall passed");
