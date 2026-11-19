/**
 * The weather page's arithmetic: whether an evap can be handed over, whether
 * anybody can be on a roof, and whether the verdicts say so in words.
 *
 * The one thing this file exists to hold still is the wet-bulb calculation.
 * Every evap verdict on the wall rests on it, it is a seven-term polynomial
 * fit that cannot be eyeballed, and getting it wrong would tell the office to
 * book a handover on a day the unit cannot cool.
 */
import {
  CHECK_OPEN_SECONDS,
  CHECK_SHUT_SECONDS,
  EVAP_DEMO_MIN_TEMP,
  PAD_EFFICIENCY,
  ROOF_WIND_KMH,
  ROOF_STOP_MM,
  ROOF_WATCH_MM,
  callsFor,
  checkEverySeconds,
  skyFrom,
  worstSky,
  clock,
  deliveredC,
  evapCall,
  headlineCall,
  heaterCall,
  judgedHour,
  mm,
  roofCall,
  wetBulbC,
  type WxDay,
  type WxHour,
} from "../src/lib/dashboard/weatherTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

const hour = (h: number, tempC: number, humidity: number, rainMm = 0, windKmh = 10): WxHour => ({
  hour: h,
  tempC,
  humidity,
  rainMm,
  windKmh,
});

/** A day built from its working hours, with the day figures derived like the real reader does. */
const day = (p: Partial<WxDay> & { hours: WxHour[] }): WxDay => {
  const work = p.hours.filter((h) => h.hour >= 7 && h.hour <= 16);
  const wet = work.filter((h) => h.rainMm >= 0.2);
  const temps = p.hours.map((h) => h.tempC);
  const hottest = p.hours.length ? p.hours.reduce((a, b) => (b.tempC > a.tempC ? b : a)).hour : null;
  return {
    date: "2026-11-19",
    minC: temps.length ? Math.min(...temps) : 0,
    maxC: temps.length ? Math.max(...temps) : 0,
    peakAt: hottest,
    rainMm: p.hours.reduce((a, h) => a + h.rainMm, 0),
    workRainMm: work.reduce((a, h) => a + h.rainMm, 0),
    rainFrom: wet.length ? wet[0].hour : null,
    rainTo: wet.length ? wet[wet.length - 1].hour : null,
    windKmh: work.length ? Math.max(...work.map((h) => h.windKmh)) : 0,
    ...p,
  };
};

/*
 * The reference the shipped formula is held against: a bisection solve of the
 * psychrometric equation, e = es(Tw) − A·P·(T − Tw), with Magnus for the
 * saturation vapour pressure.
 *
 * Written out here rather than quoted as a table of expected values, because a
 * table is only as good as whoever typed it — the first version of this file
 * tested against seven numbers recalled from the paper and two of them were
 * out by half a degree, so the test failed while the code was right. First
 * principles cannot be misremembered.
 */
const satVapourHpa = (t: number) => 6.112 * Math.exp((17.67 * t) / (t + 243.5));
function wetBulbSolved(tempC: number, rh: number, pressureHpa = 1013.25): number {
  const e = (rh / 100) * satVapourHpa(tempC);
  const A = 6.62e-4; // psychrometer constant, per °C
  let lo = -30;
  let hi = tempC;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (satVapourHpa(mid) - A * pressureHpa * (tempC - mid) - e > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

console.log("-- wet bulb, against a psychrometric solve --");
let worst = 0;
let worstAt = "";
for (const t of [20, 25, 30, 34, 36, 40]) {
  for (const rh of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
    const diff = Math.abs(wetBulbC(t, rh) - wetBulbSolved(t, rh));
    if (diff > worst) {
      worst = diff;
      worstAt = `${t}° at ${rh}%`;
    }
  }
}
ok("the fit tracks the solve to within 0.85° everywhere", worst < 0.85, `worst ${worst.toFixed(2)}° at ${worstAt}`);
/*
 * And where the thresholds are: 5° to 11° of depression is 30–70% humidity on
 * a warm day. The fit is good to 0.65° through there, so a day sitting within
 * two-thirds of a degree of a boundary could be called either way.
 *
 * That is worth stating rather than waving away, and it is also smaller than
 * the boundary itself is arbitrary — 11° of depression is a round number
 * somebody chose, not a cliff the physics has. A day the fit moves across a
 * threshold is a day either verdict describes honestly.
 */
let nearThresholds = 0;
for (const t of [28, 30, 32, 34, 36, 38]) {
  for (const rh of [30, 40, 50, 60, 70]) {
    nearThresholds = Math.max(nearThresholds, Math.abs(wetBulbC(t, rh) - wetBulbSolved(t, rh)));
  }
}
ok("and to within 0.65° where the thresholds are", nearThresholds < 0.65, `worst ${nearThresholds.toFixed(2)}°`);
/*
 * The error in the figure the board actually prints is smaller again, because
 * the pad only claims 80% of the depression: 0.62° of wet bulb is half a
 * degree of delivered air, and the board rounds to whole degrees.
 */
ok("which is under half a degree on the temperature shown", nearThresholds * PAD_EFFICIENCY < 0.5,
   `${(nearThresholds * PAD_EFFICIENCY).toFixed(2)}°`);
ok("wet bulb never exceeds dry bulb", [0, 10, 20, 30, 40].every((t) => wetBulbC(t, 99) <= t + 0.2));
ok("at 100% humidity the two meet", Math.abs(wetBulbC(25, 100) - 25) < 0.6, wetBulbC(25, 100).toFixed(1));
ok("drier air always gives a lower wet bulb", wetBulbC(35, 20) < wetBulbC(35, 40) && wetBulbC(35, 40) < wetBulbC(35, 70));

console.log("\n-- what an evap would actually blow --");
ok(
  "a hot dry day: 36° at 20% comes out near 23°",
  Math.abs(deliveredC(36, 20) - 23) < 1.5,
  deliveredC(36, 20).toFixed(1),
);
ok(
  "a hot humid day: 36° at 70% barely moves",
  deliveredC(36, 70) - wetBulbC(36, 70) > 0 && 36 - deliveredC(36, 70) < 5,
  `${(36 - deliveredC(36, 70)).toFixed(1)}° of cooling`,
);
ok("it can never beat the wet bulb", [20, 40, 60, 80].every((rh) => deliveredC(34, rh) >= wetBulbC(34, rh) - 0.001));
ok(`and it only ever claims ${Math.round(PAD_EFFICIENCY * 100)}% of the depression`,
   Math.abs((34 - deliveredC(34, 30)) / (34 - wetBulbC(34, 30)) - PAD_EFFICIENCY) < 0.001);

console.log("\n-- the evap verdict --");
const hotDry = day({ hours: [8, 10, 12, 14, 15, 16].map((h) => hour(h, h < 12 ? 26 : 36, 18)) });
ok("a hot dry day is a good day", evapCall(hotDry).rating === "good", evapCall(hotDry).word);
ok("and it says what the unit would do", /would blow \d+°/.test(evapCall(hotDry).why), evapCall(hotDry).why);

const hotHumid = day({ hours: [8, 10, 12, 14, 15, 16].map((h) => hour(h, h < 12 ? 26 : 34, 72)) });
ok("a hot humid day is not", evapCall(hotHumid).rating === "no", evapCall(hotHumid).word);
ok("and it says why in the figures", evapCall(hotHumid).why.includes("too humid"), evapCall(hotHumid).why);

/*
 * The case the thresholds exist for: same 34°, two humidities, opposite
 * answers. A board that read humidity alone, or temperature alone, would call
 * these the same day.
 */
ok("the same temperature at two humidities gives opposite answers",
   evapCall(hotDry).rating === "good" && evapCall(hotHumid).rating === "no");

console.log("\n-- judged on the hottest hour, not the average --");
const muggyAfternoon = day({
  hours: [hour(8, 22, 40), hour(10, 27, 38), hour(13, 33, 66), hour(15, 34, 70), hour(16, 32, 72)],
});
ok("the 34° hour is the one judged", judgedHour(muggyAfternoon)?.tempC === 34);
ok("so a dry morning does not rescue a muggy handover", evapCall(muggyAfternoon).rating !== "good",
   evapCall(muggyAfternoon).word);

console.log("\n-- a day too mild to demonstrate --");
const mild = day({ hours: [8, 11, 14, 16].map((h) => hour(h, 19, 25)) });
ok(`under ${EVAP_DEMO_MIN_TEMP}° there is nothing to show`, evapCall(mild).rating === "no", evapCall(mild).word);
ok("and the reason is the temperature, not the humidity", evapCall(mild).why.includes("install it"), evapCall(mild).why);
ok("even though the air is bone dry", wetBulbC(19, 25) < 12, wetBulbC(19, 25).toFixed(1));

console.log("\n-- past the hourly forecast --");
const far = day({ hours: [], minC: 14, maxC: 31, peakAt: null, rainMm: 0, workRainMm: 0, rainFrom: null, rainTo: null, windKmh: 12 });
ok("no hourly means no evap verdict", evapCall(far).word === "Too far out", evapCall(far).word);
ok("rather than a verdict invented from the daily maximum", !evapCall(far).why.includes("would blow"));
ok("but the roof and heater calls still work off the daily figures", roofCall(far).rating === "good" && heaterCall(far).rating === "poor");

/*
 * And today, after four o'clock, is a different absence from next Tuesday.
 * The forecast only carries hours still to come, so from late afternoon today
 * has evening hours and no working ones — which the first version reported as
 * "Too far out", about today, every day from about four.
 */
const evening = day({ hours: [hour(18, 24, 60), hour(20, 21, 68), hour(22, 19, 72)] });
ok("today after the working day says the day is done", evapCall(evening).word === "Day’s done", evapCall(evening).word);
ok("and not that today is too far away", evapCall(evening).word !== "Too far out");

console.log("\n-- the roof --");
/*
 * The thresholds here moved once, and the move is the point: see "Jake's roof
 * numbers" above. What was tested before — 0.2mm in any single hour taking a
 * crew off a roof, 2mm across a day — was measuring whether a roof got wet.
 * What matters is whether a day is lost.
 */
const wetDay = day({ hours: [hour(8, 18, 80), hour(11, 20, 85, 3.5), hour(13, 21, 85, 4.5), hour(16, 19, 88)] });
ok("8mm through the working day is a watch", roofCall(wetDay).rating === "poor", roofCall(wetDay).word);
ok("and it says how much and when", roofCall(wetDay).why.includes("mm") && /\d(am|pm|noon)/.test(roofCall(wetDay).why),
   roofCall(wetDay).why);

const wetNight = day({ hours: [hour(3, 14, 95, 9), hour(8, 17, 70), hour(13, 24, 45), hour(16, 23, 48)] });
ok("rain that falls around the working day is not", roofCall(wetNight).rating === "fair", roofCall(wetNight).word);
ok("and it says the day itself is dry", roofCall(wetNight).why.includes("dry 7am–4pm"), roofCall(wetNight).why);

const windy = day({ hours: [8, 11, 14, 16].map((h) => hour(h, 22, 50, 0, 44)) });
ok(`${ROOF_WIND_KMH} km/h and over is off the roof`, roofCall(windy).rating === "no", roofCall(windy).why);

/*
 * A coarse day past the hourly horizon carries one rain figure per six hours,
 * apportioned to the working window. It is judged on the same two numbers as
 * everything else — there is no separate, twitchier rule for it any more.
 */
const sprinkle = day({
  hours: [],
  minC: 10, maxC: 20, peakAt: null, rainMm: 0.9, workRainMm: 0.6, rainFrom: null, rainTo: null, windKmh: null,
});
ok("a sprinkle on a coarse day says nothing", roofCall(sprinkle).rating === "good",
   `${roofCall(sprinkle).word} — ${roofCall(sprinkle).why}`);
ok("a real fall on one is a watch", roofCall({ ...sprinkle, rainMm: 9, workRainMm: 7 }).rating === "poor");
ok("and a downpour takes the roof off the table", roofCall({ ...sprinkle, rainMm: 20, workRainMm: 14 }).rating === "no");

console.log("\n-- a wind figure we do not have --");
ok("is not reported as a calm", !roofCall(sprinkle).why.includes("0 km/h"), roofCall(sprinkle).why);
ok("and the good-day line simply says dry", roofCall({ ...sprinkle, rainMm: 0, workRainMm: 0 }).why === "dry");
ok("while a day that has one still prints it", roofCall({ ...sprinkle, rainMm: 0, workRainMm: 0, windKmh: 14 }).why === "dry, 14 km/h");

const scorcher = day({ hours: [hour(8, 28, 20), hour(13, 40, 14), hour(16, 38, 15)] });
ok("a 40° day is a start-early day, not a stop day", roofCall(scorcher).rating === "poor", roofCall(scorcher).word);
ok("and the evap call on it is still good", evapCall(scorcher).rating === "good", evapCall(scorcher).word);

console.log("\n-- the heater --");
ok("a 33° day is no day to run one up", heaterCall(hotHumid).rating === "poor", heaterCall(hotHumid).why);
const cold = day({ hours: [hour(8, 8, 85), hour(13, 14, 70), hour(16, 12, 75)] });
ok("a cold day is a day to expect calls", heaterCall(cold).rating === "good", heaterCall(cold).why);
ok("and a mild one is simply fine", heaterCall(day({ hours: [hour(13, 22, 55)] })).rating === "fair");

console.log("\n-- the headline: the call that changes a booking --");
ok("a wet day leads on the roof", headlineCall(wetDay).kind === "roof", headlineCall(wetDay).word);
ok("a muggy day leads on the evap", headlineCall(hotHumid).kind === "evap", headlineCall(hotHumid).word);
/*
 * The two this list exists for. Sorting the three calls worst-first headlined
 * a 36° dry day with its heater verdict — "nobody wants it run up to temp" —
 * which is true of every hot day and is not what anybody needs to know on the
 * one day of the week an evap would blow 23°.
 */
ok("a hot dry day leads on the good evap news", headlineCall(hotDry).kind === "evap" && headlineCall(hotDry).rating === "good",
   headlineCall(hotDry).word);
ok("and not on its heater verdict", headlineCall(hotDry).kind !== "heater");
ok("a 40° day leads on the roof being brutal", headlineCall(scorcher).kind === "roof", headlineCall(scorcher).word);
ok("a cold day leads on the heater calls coming", headlineCall(cold).kind === "heater", headlineCall(cold).word);
/*
 * And winter does not read as a season of evap problems. "Too mild to
 * demonstrate" is true every day from May to September; headlining it would
 * make the page useless for half the year.
 */
const mildDry = day({ hours: [hour(8, 15, 60), hour(13, 22, 48), hour(16, 21, 50)] });
ok("a mild dry day does not lead on 'can’t show it'", headlineCall(mildDry).kind !== "evap", headlineCall(mildDry).word);
/*
 * And a day past the hourly horizon leads on what is still knowable. "Too far
 * out" headed a Wednesday that sat directly above two booked jobs marked good
 * to go — the page appearing to argue with itself, when rain and temperature
 * are forecast that far and only humidity is not.
 */
ok("a day with no hourly forecast leads on the roof", headlineCall(far).kind === "roof", headlineCall(far).word);
ok("rather than on the evap verdict it cannot make", headlineCall(far).word !== "Too far out");
ok("and its evap call still says so when asked directly", evapCall(far).word === "Too far out");

ok("every day gets all three calls", callsFor(hotDry).length === 3);
ok("and every call carries a word and a reason",
   callsFor(wetDay).every((c) => c.word.length > 0 && c.why.length > 0));

console.log("\n-- Jake's roof numbers --");
/** A working day carrying `total` mm, spread 7am to 3pm. */
const rainyDay = (total: number) => day({ hours: [7, 9, 11, 13, 15].map((h) => hour(h, 18, 85, total / 5)) });
ok(`${ROOF_WATCH_MM}mm across the working day is still clear`, roofCall(rainyDay(5)).rating === "good",
   roofCall(rainyDay(5)).word);
ok("6mm is a watch", roofCall(rainyDay(6)).rating === "poor", roofCall(rainyDay(6)).word);
ok(`${ROOF_STOP_MM}mm is still only a watch`, roofCall(rainyDay(10)).rating === "poor");
ok("12mm takes the roof off the table", roofCall(rainyDay(12)).rating === "no", roofCall(rainyDay(12)).word);
/*
 * And Jake's own counter-example: 0.3mm from 9am. The board flagged it, he
 * said "that is a very very low chance of it not going ahead", and the old
 * thresholds — 0.2mm in an hour, 2mm across a day — were measuring whether a
 * roof got wet rather than whether a day was lost.
 */
ok("0.3mm in a day says nothing at all", roofCall(rainyDay(0.3)).rating === "good", roofCall(rainyDay(0.3)).why);

console.log("\n-- the sky, from MET's symbol codes --");
ok("clearsky_day is clear", skyFrom("clearsky_day") === "clear");
ok("fair_night is fair", skyFrom("fair_night") === "fair");
ok("partlycloudy_day is partly", skyFrom("partlycloudy_day") === "partly");
ok("cloudy is cloudy", skyFrom("cloudy") === "cloudy");
ok("lightrainshowers_day is light rain", skyFrom("lightrainshowers_day") === "lightrain");
ok("rainshowers_day is rain", skyFrom("rainshowers_day") === "rain");
ok("heavyrain is heavy rain", skyFrom("heavyrain") === "heavyrain");
// A code can say several things; the worse one has to win.
ok("heavyrainandthunder is thunder, not rain", skyFrom("heavyrainandthunder") === "thunder");
ok("lightsleetshowers is sleet", skyFrom("lightsleetshowers") === "sleet");
ok("fog is fog", skyFrom("fog") === "fog");
// No icon beats a wrong icon on a wall.
ok("something unrecognised draws nothing", skyFrom("martian_dust_storm") === null);
ok("and so does an absent code", skyFrom(null) === null && skyFrom("") === null);

ok("a day takes the worst of its hours", worstSky(["clear", "cloudy", "heavyrain", "fair"]) === "heavyrain");
ok("not the commonest", worstSky(["clear", "clear", "clear", "thunder"]) === "thunder");
ok("nulls are ignored", worstSky([null, "partly", null]) === "partly");
ok("and all nulls draw nothing", worstSky([null, null]) === null);

console.log("\n-- how often to go and look --");
/*
 * Jake: every 30 minutes from 6:30am to 5pm, every 4 hours after that. The
 * boundaries are the part worth pinning: 6:30 exactly is inside the window,
 * and 5pm exactly is the last minute of it.
 */
const half = CHECK_OPEN_SECONDS;
const four = CHECK_SHUT_SECONDS;
ok("6:29am is still the overnight rate", checkEverySeconds(6 * 60 + 29) === four);
ok("6:30am starts the half-hourly check", checkEverySeconds(6 * 60 + 30) === half);
ok("noon is half-hourly", checkEverySeconds(12 * 60) === half);
ok("5:00pm is the last half-hourly minute", checkEverySeconds(17 * 60) === half);
ok("5:01pm drops back to four-hourly", checkEverySeconds(17 * 60 + 1) === four);
ok("midnight is four-hourly", checkEverySeconds(0) === four);
ok("and the two rates are 30 minutes and 4 hours", half === 1800 && four === 14400);
// A minute outside the day is a bug upstream, not a reason to hammer MET.
ok("a negative minute does not fall through to the fast rate", checkEverySeconds(-30) === four);
ok("nor does one past midnight", checkEverySeconds(1500) === four, String(checkEverySeconds(1500)));
/*
 * And the whole point: the overnight hours stop making calls nobody reads.
 * A flat half hour was 48 a night.
 */
let overnight = 0;
for (let m = 0; m < 1440; m++) if (checkEverySeconds(m) === four) overnight++;
ok("the slow rate covers the hours the office is shut", overnight === 1440 - (17 * 60 - (6 * 60 + 30) + 1),
   `${overnight} minutes of the day`);

console.log("\n-- the words on the wall --");
ok("7 is 7am", clock(7) === "7am");
ok("12 is noon, not 12pm", clock(12) === "noon");
ok("13 is 1pm", clock(13) === "1pm");
ok("0 is midnight", clock(0) === "midnight");
ok("17 is 5pm", clock(17) === "5pm");
ok("no rain says none, not 0mm", mm(0) === "none");
ok("a light fall keeps its decimal", mm(0.4) === "0.4mm");
ok("a real fall loses it", mm(12.4) === "12mm");

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
