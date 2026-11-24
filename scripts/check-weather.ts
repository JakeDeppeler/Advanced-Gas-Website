/**
 * The Weather page's arithmetic: whether work can go ahead, what the sky is
 * doing, and how often the board goes and looks.
 *
 * This file used to be mostly physics. An evaporative unit's output was
 * modelled from wet-bulb depression, with a seven-term polynomial fit measured
 * against a bisection solve of the psychrometric equation on every run. It was
 * carefully made and it answered a question nobody had asked: "tell if the day
 * is bad to book an evap" turned out to mean *can the job happen*, not *will
 * the unit impress*. Jake cut it on 20 November — "we just need if the install
 * or service is able to go ahead" — and this file lost about a hundred lines
 * with it. They are in the history if the question ever becomes real.
 */
import {
  CHECK_OPEN_SECONDS,
  CHECK_SHUT_SECONDS,
  ROOF_STOP_MM,
  ROOF_WATCH_MM,
  ROOF_WIND_KMH,
  checkEverySeconds,
  clock,
  mm,
  roofCall,
  skyFrom,
  worstSky,
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
    windKmh: work.length ? Math.max(...work.map((h) => h.windKmh)) : null,
    ...p,
  };
};

console.log("-- Jake's roof numbers --");
/*
 * "The main time I would make it off the roof is if it's more than 5 mil for
 * the day and from 7 to 4, and no roof if it's more than 10 mil for the day."
 */
/** A working day carrying `total` mm, spread 7am to 3pm. */
const rainyDay = (total: number) => day({ hours: [7, 9, 11, 13, 15].map((h) => hour(h, 18, 85, total / 5)) });
ok(`${ROOF_WATCH_MM}mm across the working day is still clear`, roofCall(rainyDay(5)).rating === "good",
   roofCall(rainyDay(5)).word);
ok("6mm is a watch", roofCall(rainyDay(6)).rating === "poor", roofCall(rainyDay(6)).word);
ok(`${ROOF_STOP_MM}mm is still only a watch`, roofCall(rainyDay(10)).rating === "poor");
ok("12mm takes the roof off the table", roofCall(rainyDay(12)).rating === "no", roofCall(rainyDay(12)).word);
/*
 * And Jake's counter-example, which is why these numbers replaced a pair an
 * order of magnitude smaller: "0.3 mil from 9am — that is a very very low
 * chance of it not going ahead." The old rule flagged it.
 */
ok("0.3mm in a day says nothing at all", roofCall(rainyDay(0.3)).rating === "good", roofCall(rainyDay(0.3)).why);

console.log("\n-- the roof --");
const wetDay = day({ hours: [hour(8, 18, 80), hour(11, 20, 85, 3.5), hour(13, 21, 85, 4.5), hour(16, 19, 88)] });
ok("8mm through the working day is a watch", roofCall(wetDay).rating === "poor", roofCall(wetDay).word);
ok("and it says how much and when", roofCall(wetDay).why.includes("mm") && /\d(am|pm|noon)/.test(roofCall(wetDay).why),
   roofCall(wetDay).why);

const wetNight = day({ hours: [hour(3, 14, 95, 9), hour(8, 17, 70), hour(13, 24, 45), hour(16, 23, 48)] });
ok("rain that falls around the working day is not", roofCall(wetNight).rating === "fair", roofCall(wetNight).word);
ok("and it says the day itself is dry", roofCall(wetNight).why.includes("dry 7am–4pm"), roofCall(wetNight).why);

const windy = day({ hours: [8, 11, 14, 16].map((h) => hour(h, 22, 50, 0, 44)) });
ok(`${ROOF_WIND_KMH} km/h and over is off the roof`, roofCall(windy).rating === "no", roofCall(windy).why);

const scorcher = day({ hours: [hour(8, 28, 20), hour(13, 40, 14), hour(16, 38, 15)] });
ok("a 40° day is a start-early day, not a stop day", roofCall(scorcher).rating === "poor", roofCall(scorcher).word);

/*
 * A coarse day past the hourly horizon carries one rain figure per six hours,
 * apportioned to the working window. It is judged on the same two numbers as
 * everything else.
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
ok("while a day that has one still prints it",
   roofCall({ ...sprinkle, rainMm: 0, workRainMm: 0, windKmh: 14 }).why === "dry, 14 km/h");

console.log("\n-- every verdict is about the roof now --");
/*
 * The page carried three kinds of verdict: how well an evap would cool,
 * whether anybody could get on the roof, and whether a heater was worth
 * running up. Two of them are gone. These assertions exist so the page cannot
 * quietly grow a second opinion again.
 */
for (const d of [rainyDay(12), wetDay, windy, scorcher, sprinkle]) {
  ok(`"${roofCall(d).word}" is a roof verdict`, roofCall(d).kind === "roof");
}
ok("and none of them is about cooling",
   [rainyDay(12), wetDay, scorcher].every((d) => !/cool|humid|blow/i.test(roofCall(d).why)));

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
 * boundaries are the part worth pinning.
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
