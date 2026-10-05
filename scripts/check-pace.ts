/**
 * The Pace arithmetic against the replica's own September: the figures below
 * are what ServiceTitan held for 1 September to 4 October 2026, and the plan
 * they produce for $3.2M is checked by hand beside each assertion.
 *
 *   npx tsx scripts/check-pace.ts
 */
import { buildPace, expectedBy, jobClass, ratesFrom, standingOf, yearPlan, type Measured, type PaceData } from "../src/lib/dashboard/pace";
import { monthTargetsFromYearGoal } from "../src/lib/dashboard/boardSettings";
import { readPaceSettings, readYearGoal } from "../src/lib/portal/yearGoal";

let failed = 0;
const near = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= Math.abs(b) * tol + 1e-9;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "PASS" : "FAIL"} ${what}${cond || got === undefined ? "" : ` — got ${JSON.stringify(got)}`}`);
}

// ---- job classes
ok(jobClass("Quotation") === "quote", "Quotation is a quote visit");
ok(jobClass("Site Assessment") === "quote", "Site Assessment is a quote visit");
ok(jobClass("Install - AIO Heat Pump") === "install", "Install - … is sold work");
ok(jobClass("Installation - Retirement Village") === "install", "Installation - … is sold work");
ok(jobClass("Diagnostics - Heating") === "service", "Diagnostics is service");
ok(jobClass("Commercial – Install") === "service", "commercial work sits in the service lane");
ok(jobClass(null) === "service", "no job type is service, not a quote");

// ---- September, measured
const sept: Measured = {
  from: "2026-09-01", to: "2026-10-04", weeks: 24 / 5,
  leads: 31, quoteVisits: 87, serviceBooked: 94, serviceCompleted: 72, installsCompleted: 28,
  quoted: 122, sold: 22, soldValue: 69017,
  invoiced: 118144, soldWorkInvoiced: 108127, serviceInvoiced: 10017,
};

const none = readPaceSettings(null);
const r = ratesFrom(sept, none);
ok(near(r.closeRate.value, 22 / 122), "close rate is jobs sold over jobs quoted (18%)", r.closeRate.value);
ok(near(r.avgSale.value, 69017 / 22), "average sale $3,137", r.avgSale.value);
ok(near(r.soldShare.value, 108127 / 118144), "91.5% of invoicing came through a quote", r.soldShare.value);
ok(near(r.visitsPerQuote.value, 87 / 122), "0.71 quote visits booked per job quoted", r.visitsPerQuote.value);
ok(near(r.avgService.value, 10017 / 72), "$139 a service job, $0 jobs included", r.avgService.value);
ok(near(r.serviceCompletion.value, 72 / 94), "77% of service bookings get done", r.serviceCompletion.value);
ok(r.bookRate.value === null, "the booking rate is never guessed");

const { plan, lanes } = yearPlan(3_200_000, r);
const soldWork = 3_200_000 * (108127 / 118144);
ok(near(plan.sold.value, soldWork), "sold $ = goal × sold share ($2.93M)", plan.sold.value);
ok(near(plan.sold.count, soldWork / (69017 / 22)), "jobs sold = sold $ ÷ average sale (933)", plan.sold.count);
ok(near(plan.quoted.count, plan.sold.count! / (22 / 122)), "jobs quoted = sold ÷ close rate (5,175)", plan.quoted.count);
const serviceJobs = (3_200_000 - soldWork) / (10017 / 72);
ok(near(lanes.serviceJobs, serviceJobs), "service jobs = the rest ÷ average service job", lanes.serviceJobs);
ok(near(plan.completed.count, plan.sold.count! + serviceJobs), "completed = installs + service jobs");
ok(near(plan.booked.count, plan.quoted.count! * (87 / 122) + serviceJobs / (72 / 94)), "booked = quote visits + service calls, allowing for cancellations");
ok(plan.leads.count === null, "no leads figure until a booking rate is set");
ok(plan.invoiced.value === 3_200_000, "invoiced is the goal");

const withBook = yearPlan(3_200_000, ratesFrom(sept, { bookRate: 0.7, closeRate: null, avgSale: null })).plan;
ok(near(withBook.leads.count, plan.booked.count! / 0.7), "leads = booked ÷ booking rate once set");
const better = yearPlan(3_200_000, ratesFrom(sept, { bookRate: null, closeRate: 0.3, avgSale: null })).plan;
ok(near(better.quoted.count, plan.sold.count! / 0.3), "a 30% close rate asks for fewer quotes, same sales");
ok(near(better.sold.count, plan.sold.count!), "and doesn't change how many have to sell");

// Thin samples don't set a rate.
const thin = ratesFrom({ ...sept, quoted: 5, sold: 1, serviceCompleted: 3, serviceBooked: 4 }, none);
ok(thin.closeRate.value === null && thin.avgSale.value === null, "five quotes don't make a close rate");
ok(thin.avgService.value === null && thin.serviceCompletion.value === null, "three service jobs don't make an average");

// ---- standing
const s1 = standingOf(100, 40, 0.5, 3);
ok(s1.verdict === "behind" && near(s1.gap, -10) && near(s1.perDayLeft, 20), "40 of 100 at half way is 10 behind, 20 a day to catch up", s1);
ok(standingOf(100, 52, 0.5, 3).verdict === "on", "within 5% is on pace");
ok(standingOf(100, 60, 0.5, 3).verdict === "ahead", "60 at half way is ahead");
ok(standingOf(100, 0, 0, 5).verdict === "on", "nothing expected yet and nothing done is on pace");
ok(standingOf(100, 120, 1, 0).perDayLeft === 0, "past the need, nothing a day is owed");

// ---- the year, pro rata
const goal = { basis: "financial" as const, year: 2027, revenue: 3_200_000, shape: null, profitPct: 20 };
ok(near(expectedBy(goal, "2026-07-31", 1), 3_200_000 / 12), "end of July is a twelfth of an even year");
ok(near(expectedBy(goal, "2026-10-05", 0), 3_200_000 * (3 / 12 + (1 / 12) * (4 / 31))), "start of 5 Oct: three months and four days of October");
ok(expectedBy(goal, "2027-07-01", 1) === null, "a date outside the goal's year has no expectation");

// ---- the whole view
const data: PaceData = {
  asOf: "2026-10-05T03:00:00Z",
  today: "2026-10-05",
  calendar: { daysPerWeek: 5, week: { total: 5, elapsed: 0, remaining: 5 }, month: { total: 22, elapsed: 2, remaining: 20 }, dayFraction: 0.5, todayWorking: true },
  periods: {
    today: { leads: 1, booked: 3, quoted: 2, sold: 0, soldValue: 0, completed: 1, invoiced: 0 },
    week: { leads: 1, booked: 3, quoted: 2, sold: 0, soldValue: 0, completed: 1, invoiced: 0 },
    lastWeek: { leads: 9, booked: 40, quoted: 30, sold: 8, soldValue: 25000, completed: 27, invoiced: 48255 },
    month: { leads: 4, booked: 20, quoted: 15, sold: 6, soldValue: 17000, completed: 8, invoiced: 20726 },
  },
  measured: sept,
  year: { ytd: 531636, ytdYesterday: 531636, ytdLastWeek: 483000, last28: 104000 },
  calls: 15,
};
const v = buildPace(goal, none, data)!;
ok(v != null, "builds a view for a goal covering today");
ok(near(v.month.invoiced.value, 3_200_000 / 12), "October's need is a twelfth");
ok(near(v.week.invoiced.value, (3_200_000 / 12 / 22) * 5), "a week is five of October's 22 working days ($60.6K)", v.week.invoiced.value);
ok(v.standing.week.leads.verdict === null, "no verdict on leads — phone calls aren't counted");
ok(v.yearView != null && v.yearView.gap < 0, "the year is behind", v.yearView?.gap);
ok(near(v.yearView!.byNow, expectedBy(goal, "2026-10-05", 0.5)!), "by now allows for half of today");
ok(near(v.yearView!.gapYesterday, 531636 - expectedBy(goal, "2026-10-04", 1)!), "yesterday's gap is at the end of yesterday");
ok(near(v.yearView!.gapLastWeek, 483000 - expectedBy(goal, "2026-09-28", 1)!), "last week's gap is a week ago");
const left = 3_200_000 - 531636;
ok(near(v.yearView!.catchUp, left / (3_200_000 - v.yearView!.byNow)), "catch-up is money left over plan left", v.yearView?.catchUp);
ok(buildPace({ ...goal, year: 2026 }, none, data) === null, "last year's goal paces nothing");

// ---- profit before GST, and the setting round trip
const t = monthTargetsFromYearGoal({ ...goal, mix: [] }, "2026-10", { total: 22 }, 5);
ok(near(t.profit, (3_200_000 / 12 / 1.1) * 0.2), "profit target is 20% of the month before GST ($48.5K)", t.profit);
const g = readYearGoal({ revenue: 3_200_000, profitPct: 20, year: 2027, pace: { bookRate: 7, avgSale: "abc" } }, new Date("2026-10-05"));
ok(g.pace.bookRate === null && g.pace.avgSale === null, "a booking rate stored as 7 (meant 7%) is refused, not read as 700%", g.pace);
const w = readYearGoal({ revenue: 3_200_000, profitPct: 20, year: 2027, winRatePct: 25, pace: { bookRate: 0.7 } }, new Date("2026-10-05"));
ok(w.pace.closeRate === 0.25 && w.winRatePct === 25 && w.pace.bookRate === 0.7, "the planned close rate is the goal's one win rate, winRatePct", w);

console.log(failed ? `\n${failed} failed` : "\nAll pace checks pass");
process.exit(failed ? 1 : 0);
