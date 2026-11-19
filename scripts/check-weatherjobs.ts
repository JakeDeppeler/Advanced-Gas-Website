/**
 * Which booked jobs the weather is allowed to flag, and why.
 *
 * The classifier is the dangerous half of this page. It decides from a job
 * type's *name* whether somebody is going on a roof, and it fails in the
 * quiet direction: a type it does not recognise simply never appears on the
 * board, so a wet Tuesday looks clear. Every real job type in the tenant is
 * asserted below for that reason.
 */
import {
  NEXT_DAY_RAIN_MM,
  MORNING_BEFORE_HOUR,
  OVERNIGHT_WET_MM,
  TOO_HOT_C,
  callFor,
  callsForJobs,
  dayBefore,
  needsOf,
  tally,
  weatherMatters,
  type BookedJob,
} from "../src/lib/dashboard/weatherJobsTypes";
import { ROOF_STOP_MM, ROOF_WATCH_MM } from "../src/lib/dashboard/weatherTypes";
import type { Weather, WxDay, WxHour } from "../src/lib/dashboard/weatherTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

const hour = (h: number, tempC: number, humidity: number, rainMm = 0, windKmh = 10): WxHour => ({
  hour: h, tempC, humidity, rainMm, windKmh,
});

const day = (date: string, hours: WxHour[], over: Partial<WxDay> = {}): WxDay => {
  const temps = hours.map((h) => h.tempC);
  const work = hours.filter((h) => h.hour >= 7 && h.hour <= 16);
  return {
    date,
    minC: temps.length ? Math.min(...temps) : 0,
    maxC: temps.length ? Math.max(...temps) : 0,
    peakAt: null,
    rainMm: hours.reduce((a, h) => a + h.rainMm, 0),
    workRainMm: work.reduce((a, h) => a + h.rainMm, 0),
    rainFrom: null,
    rainTo: null,
    windKmh: work.length ? Math.max(...work.map((h) => h.windKmh)) : null,
    hours,
    ...over,
  };
};

const weather = (days: WxDay[], today = days[0]?.date ?? "2026-11-20"): Weather => ({
  place: "Pakenham", at: `${today}T06:00:00Z`, today, now: null, days, credit: "test",
});

const job = (p: Partial<BookedJob> & { type: string }): BookedJob => ({
  jobId: 1, number: "J1", suburb: "Officer", date: "2026-11-20", hour: 8, hours: 3, ...p,
});

console.log("-- every job type in the tenant, classified --");
/*
 * The live list, as booked in the eight days from 19 November 2026. If a name
 * here stops matching, a real job silently drops off the board.
 */
const cases: Array<[string, { roof: boolean; evap: boolean; heat: string | null }]> = [
  ["Installation - Evaporative Cooler",      { roof: true,  evap: true,  heat: null }],
  ["Service - Evaporative Cooler",           { roof: true,  evap: true,  heat: null }],
  ["Repair - Evaporative Cooler",            { roof: true,  evap: true,  heat: null }],
  ["Diagnostics - Evaporative",              { roof: true,  evap: true,  heat: null }],
  ["Installation - Gas Ducted Heater",       { roof: true,  evap: false, heat: "comfort" }],
  ["Installation - Gas Space Heater / Log Fire", { roof: true, evap: false, heat: "comfort" }],
  ["Installation - Ducted Refrigerated",     { roof: true,  evap: false, heat: "cavity" }],
  // Not a type in the tenant today, but the words Jake used. It must classify
  // the day somebody adds it.
  ["Installation - Brivis Dominator",        { roof: true,  evap: false, heat: "comfort" }],
  ["Installation - Ducted Split",            { roof: true,  evap: false, heat: "cavity" }],
  // Indoor work, or a van-level job. These must stay off the page: a hundred
  // split-system services a week would bury the six jobs that matter.
  ["Service - Split System",                 { roof: false, evap: false, heat: null }],
  ["Installation - Split System",            { roof: false, evap: false, heat: null }],
  ["Repair - Split System",                  { roof: false, evap: false, heat: null }],
  ["Quotation",                              { roof: false, evap: false, heat: null }],
  ["Gas Safety Check",                       { roof: false, evap: false, heat: null }],
  ["Repair - Gas Cooktop",                   { roof: false, evap: false, heat: null }],
  ["Service - Add-on Cooling",               { roof: false, evap: false, heat: null }],
  // A diagnostic on a ducted heater is somebody at the controller, not on the
  // roof — so it is not a roof job, and a wet day does not move it.
  ["Diagnostics - Gas Ducted Heater",        { roof: false, evap: false, heat: null }],
];
for (const [name, want] of cases) {
  const got = needsOf(name);
  ok(
    `${name}`,
    got.roof === want.roof && got.evap === want.evap && (got.heat ?? null) === want.heat,
    `roof=${got.roof} evap=${got.evap} heat=${got.heat}`,
  );
}

console.log("\n-- only the jobs the weather bears on reach the page --");
ok("an evap install does", weatherMatters(needsOf("Installation - Evaporative Cooler")));
ok("a split system service does not", !weatherMatters(needsOf("Service - Split System")));
ok("nor does a quotation", !weatherMatters(needsOf("Quotation")));

console.log("\n-- rain while they are on the roof --");
/*
 * A service rather than an install throughout this section: a service carries
 * the roof rules and not the handover one, so a cold wet fixture tests the
 * rain thresholds rather than tripping over "can't demo it" first. The first
 * version of these tests used installs and failed for that reason.
 */
const wetMorning = weather([
  day("2026-11-20", [hour(7, 17, 80), hour(8, 18, 82, 1.2), hour(9, 19, 84, 0.8), hour(10, 20, 80), hour(14, 22, 70)]),
]);
const evapService = job({ type: "Service - Evaporative Cooler", hour: 8, hours: 3 });
ok("2mm across the working day no longer stops anything",
   callFor(evapService, wetMorning).status === "go", callFor(evapService, wetMorning).word);
ok("because a roof dries", callFor(evapService, wetMorning).why.length > 0);

/*
 * Jake's own example, 19 November, and the reason the thresholds moved:
 *
 *   "for saturday is 0.3 mil from 9am, so that is a very very low chance of it
 *    not going ahead — if the job is booked before that they could be done, or
 *    later in the day the roof could dry up."
 *
 * The board had flagged exactly that. It must not any more.
 */
const sprinkleDay = weather([
  day("2026-11-20", [hour(7, 17, 80), hour(9, 19, 78, 0.3), hour(12, 26, 50), hour(15, 28, 45)]),
]);
const spotted = callFor(job({ type: "Service - Evaporative Cooler", hour: 8, hours: 2 }), sprinkleDay);
ok("0.3mm in a day is not flagged at all", spotted.status === "go", `${spotted.word} — ${spotted.why}`);
ok("nor is a job booked right through it",
   callFor(job({ type: "Service - Evaporative Cooler", hour: 9, hours: 2 }), sprinkleDay).status === "go");

console.log("\n-- Jake's two numbers: 5mm is gold, 10mm is red --");
/** A working day carrying `mmTotal`, spread across 7am to 3pm. */
const wetWorkDay = (mmTotal: number) =>
  weather([
    day("2026-11-20", [7, 9, 11, 13, 15].map((h) => hour(h, 18, 85, mmTotal / 5))),
  ]);
const roofJob = { type: "Service - Evaporative Cooler", hour: 8, hours: 3 };
ok(`${ROOF_WATCH_MM}mm exactly is still fine`, callFor(job({ ...roofJob }), wetWorkDay(5)).status === "go",
   callFor(job({ ...roofJob }), wetWorkDay(5)).word);
ok("6mm is gold — a chance, not a verdict", callFor(job({ ...roofJob }), wetWorkDay(6)).status === "watch",
   callFor(job({ ...roofJob }), wetWorkDay(6)).word);
ok(`${ROOF_STOP_MM}mm exactly is still gold`, callFor(job({ ...roofJob }), wetWorkDay(10)).status === "watch");
ok("12mm is red — it won't go ahead", callFor(job({ ...roofJob }), wetWorkDay(12)).status === "risk",
   callFor(job({ ...roofJob }), wetWorkDay(12)).word);
ok("and red says how much and when", callFor(job({ ...roofJob }), wetWorkDay(12)).why.includes("working day"));
/*
 * And the point of judging the day rather than the job's own hours: a job
 * booked into a dry gap on a day that gets 12mm is still a day nobody wants
 * to be on a roof.
 */
ok("a dry gap in a 12mm day does not rescue it",
   callFor(job({ ...roofJob, hour: 11, hours: 1 }), weather([
     day("2026-11-20", [hour(7, 17, 90, 6), hour(9, 18, 88, 6), hour(11, 19, 70), hour(13, 20, 75)]),
   ])).status === "risk");

console.log("\n-- the day after, for a job that opens a ceiling --");
/*
 * Jake's ducted-split case: "we would have opened the roof for the Monday and
 * gotten everything in the roof the first day, so it would more be flagging to
 * get everything in the roof for the first day." It is a plan, not a warning,
 * and no other rule on the board looks at the day after a job.
 */
const dryThenWet = weather([
  day("2026-11-20", [hour(7, 18, 60), hour(10, 24, 50), hour(14, 28, 45)]),
  day("2026-11-21", [7, 9, 11, 13, 15].map((h) => hour(h, 17, 88, 1.6))),
], "2026-11-20");
const ducted = job({ type: "Installation - Ducted Refrigerated", date: "2026-11-20", hour: 7, hours: 10, multiDay: true });
const plan = callFor(ducted, dryThenWet);
ok("a multi-day install on a dry day before a wet one is flagged", plan.status === "watch", plan.word);
ok("and told to close the roof on day one", plan.word === "Close the roof today", plan.why);
ok("with tomorrow's figure in it", plan.why.includes("tomorrow"), plan.why);
ok("a single-day job on the same day is not flagged",
   callFor(job({ type: "Installation - Evaporative Cooler", date: "2026-11-20", hour: 8 }), dryThenWet).status === "go");
ok("nor is a multi-day job when tomorrow is dry",
   callFor({ ...ducted, date: "2026-11-21" }, weather([
     day("2026-11-21", [hour(8, 20, 55), hour(13, 26, 45)]),
     day("2026-11-22", [hour(8, 21, 50), hour(13, 27, 42)]),
   ], "2026-11-21")).status === "go");
ok(`and the bar for tomorrow is ${NEXT_DAY_RAIN_MM}mm, lower than a day that stops work`,
   NEXT_DAY_RAIN_MM < ROOF_WATCH_MM);

console.log("\n-- a service is not a handover --");
/*
 * Evaps get serviced through the cold months as a matter of course. Judging a
 * spring service on whether a customer could be impressed put "can't demo it"
 * against four of the nine jobs in the real diary — true, unactionable, and
 * most of the page.
 */
const coldDay = weather([day("2026-11-20", [hour(8, 12, 80), hour(10, 15, 70), hour(13, 17, 60), hour(15, 16, 65)])]);
ok("a 17° day does not flag an evap service",
   callFor(job({ type: "Service - Evaporative Cooler", hour: 10, hours: 2 }), coldDay).status === "go",
   callFor(job({ type: "Service - Evaporative Cooler", hour: 10 }), coldDay).word);
ok("nor a repair", callFor(job({ type: "Repair - Evaporative Cooler", hour: 10 }), coldDay).status === "go");
ok("and neither does an install on the same day, now the handover rule is gone",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 10 }), coldDay).status === "go");

console.log("\n-- Jake's rule: wet overnight, roof job in the morning --");
/*
 * The job this page was asked for. No rain falls during the job at all; the
 * roof is simply still wet from the night before.
 */
const dryDayWetNight = weather([
  day("2026-11-19", [hour(19, 18, 85, 3.4), hour(21, 16, 90, 2.8), hour(23, 15, 92, 0.6)]),
  day("2026-11-20", [hour(6, 14, 92), hour(7, 15, 90), hour(8, 17, 85), hour(9, 19, 80), hour(12, 24, 60), hour(15, 26, 55)]),
], "2026-11-19");
const morningEvap = job({ type: "Installation - Evaporative Cooler", date: "2026-11-20", hour: 7, hours: 4 });
const c = callFor(morningEvap, dryDayWetNight);
/*
 * Gold, not red: "later in the day the roof could dry up" (Jake, 19 Nov). An
 * overnight shower is a chance the start slips an hour, not a lost day.
 */
ok("is flagged even though no rain falls during the job", c.status === "watch", c.word);
ok("and the reason is the roof, not the rain", c.why.includes("overnight") && c.why.includes("start"), c.why);
ok("but gold, because a roof dries", c.status !== "risk");
ok("the same job in the afternoon is not flagged",
   callFor({ ...morningEvap, hour: 12 }, dryDayWetNight).status !== "risk",
   callFor({ ...morningEvap, hour: 12 }, dryDayWetNight).word);
ok(`and the morning cut-off is ${MORNING_BEFORE_HOUR}`, MORNING_BEFORE_HOUR === 10);
ok("a flue job gets the same treatment, internal unit or not",
   callFor(job({ type: "Installation - Gas Ducted Heater", date: "2026-11-20", hour: 7 }), dryDayWetNight).status === "watch");
ok("a split system service does not, because nobody goes up",
   callFor(job({ type: "Service - Split System", date: "2026-11-20", hour: 7 }), dryDayWetNight).status === "go");

console.log("\n-- a light sprinkle overnight is not a wet roof --");
const dampNight = weather([
  day("2026-11-19", [hour(20, 16, 88, 1.2)]),
  day("2026-11-20", [hour(7, 15, 80), hour(8, 18, 70), hour(12, 25, 55)]),
], "2026-11-19");
ok(`under ${OVERNIGHT_WET_MM}mm does not stop a morning`,
   callFor(morningEvap, dampNight).status !== "risk", callFor(morningEvap, dampNight).why);

console.log("\n-- an early start is judged on the day, not on the dawn --");
/*
 * The flaw this rule exists to avoid. Mornings are humid everywhere, so
 * judging a 7:30 evap install against 7:30 air put "Too humid" on days that
 * were ideal by noon — and disagreed with the Weather page about the very
 * same day.
 */
const humidDawnDryDay = weather([
  day("2026-11-20", [hour(7, 16, 92), hour(8, 19, 85), hour(11, 28, 40), hour(14, 34, 22), hour(16, 33, 24)]),
]);
const earlyEvap = callFor(job({ type: "Installation - Evaporative Cooler", hour: 7, hours: 4 }), humidDawnDryDay);
ok("a 7am evap install on a hot dry day is good to go", earlyEvap.status === "go", `${earlyEvap.word} — ${earlyEvap.why}`);
ok("rather than judged on 92% dawn humidity", !earlyEvap.why.includes("92"));

console.log("\n-- over thirty, and the two different reasons for it --");
const scorcher = weather([day("2026-11-20", [hour(8, 24, 40), hour(12, 33, 25), hour(15, 34, 22)])]);
const heaterIn = callFor(job({ type: "Installation - Gas Ducted Heater", hour: 8 }), scorcher);
ok("a heater install is off", heaterIn.status === "risk", heaterIn.word);
ok("because a heater cannot be run up in it", heaterIn.why.includes("run a heater up"), heaterIn.why);
const ductedIn = callFor(job({ type: "Installation - Ducted Refrigerated", hour: 8 }), scorcher);
ok("a ducted refrigerated install is off too", ductedIn.status === "risk", ductedIn.word);
/*
 * And for its own reason. Both are "over 30", and putting the heater's
 * sentence on a ducted install would tell a crew the customer is uncomfortable
 * when the actual problem is twenty hours in a 50° roof cavity.
 */
ok("but because the roof cavity is dangerous, not because of comfort",
   ductedIn.why.includes("cavity") && !ductedIn.why.includes("heater"), ductedIn.why);
ok(`the threshold is ${TOO_HOT_C}`, TOO_HOT_C === 30);
const warm = weather([day("2026-11-20", [hour(8, 20, 50), hour(14, 29, 40)])]);
ok("29° is fine", callFor(job({ type: "Installation - Gas Ducted Heater", hour: 8 }), warm).status === "go");
ok("and an evap install on a hot dry day is good to go",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 8 }), scorcher).status === "go",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 8 }), scorcher).why);

console.log("\n-- no job is flagged for humidity or for being mild --");
/*
 * There was an evap-handover verdict here, and Jake's question killed it:
 * "why does it say can't demo it, what are we demo?" It flagged installs that
 * were going ahead regardless, and gold on this page means a chance the job
 * does NOT go ahead. These assertions exist so it cannot creep back.
 */
const muggy = weather([day("2026-11-20", [hour(8, 24, 75), hour(12, 31, 72), hour(14, 32, 70)])]);
ok("a muggy day does not flag an evap install",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 12, hours: 2 }), muggy).status === "go",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 12, hours: 2 }), muggy).word);
const mild = weather([day("2026-11-20", [hour(8, 14, 70), hour(12, 19, 60), hour(15, 20, 58)])]);
ok("nor does a mild one", callFor(job({ type: "Installation - Evaporative Cooler", hour: 12 }), mild).status === "go",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 12 }), mild).word);
ok("and no job verdict mentions demonstrating anything",
   !callFor(job({ type: "Installation - Evaporative Cooler", hour: 12 }), mild).word.toLowerCase().includes("demo"));
/*
 * The day's own evap verdict is untouched — "is this a good day for
 * evaporative work" was the original ask and is still worth answering. It is
 * simply not a reason to move a booking.
 */

console.log("\n-- windy --");
const windy = weather([day("2026-11-20", [hour(8, 20, 50, 0, 48), hour(12, 24, 45, 0, 52)])]);
ok("takes everybody off the roof",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 8 }), windy).status === "risk",
   callFor(job({ type: "Installation - Evaporative Cooler", hour: 8 }), windy).why);

console.log("\n-- past the forecast --");
const near = weather([day("2026-11-20", [hour(8, 20, 50)])]);
const far = callFor(job({ type: "Installation - Evaporative Cooler", date: "2026-12-20" }), near);
ok("says so rather than guessing", far.status === "watch" && far.word === "No forecast", far.why);

console.log("\n-- the list, and what it is ordered by --");
const list = callsForJobs(
  [
    job({ jobId: 1, type: "Service - Split System", hour: 7 }),
    job({ jobId: 2, type: "Installation - Gas Ducted Heater", date: "2026-11-20", hour: 13 }),
    job({ jobId: 3, type: "Installation - Evaporative Cooler", date: "2026-11-20", hour: 8 }),
    job({ jobId: 4, type: "Quotation", hour: 9 }),
  ],
  scorcher,
);
ok("drops the jobs the weather has nothing to say about", list.length === 2, `${list.length} of 4`);
ok("and puts what is in trouble first", list[0].status === "risk" && list[0].jobId === 2, list[0].word);
const t = tally(list);
ok("the tally adds up", t.go + t.watch + t.risk === list.length, JSON.stringify(t));

console.log("\n-- dates --");
ok("the day before the 1st is the last of the month before", dayBefore("2026-12-01") === "2026-11-30");
ok("and across a year", dayBefore("2027-01-01") === "2026-12-31");
ok("and a leap day is handled", dayBefore("2028-03-01") === "2028-02-29");

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
