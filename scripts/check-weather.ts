/**
 * The weather triggers against made-up weeks: each case is a mild month of
 * history and a forecast with one thing changed, and the flag it should (or
 * shouldn't) raise. Also checks the zones cover every published suburb once.
 *
 *   npx tsx scripts/check-weather.ts
 */
import { evaluateZone, addDays, RULES } from "../src/lib/weather-triggers/rules";
import { buildReport, parseForecast, STALE_AFTER_MS } from "../src/lib/weather-triggers/report";
import { reportCsv, CSV_HEADER } from "../src/lib/weather-triggers/csv";
import { ZONES, ZONE_DEFS } from "../src/lib/weather-triggers/zones";
import { publishedSuburbs } from "../src/lib/suburbs";
import type { DayWeather, Flag } from "../src/lib/weather-triggers/types";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "PASS" : "FAIL"} ${what}${cond || got === undefined ? "" : ` — got ${JSON.stringify(got)}`}`);
}

const MILD: Omit<DayWeather, "date"> = { tmax: 20, tmin: 10, code: 3, gust: 30, rain: 0 };

/** 30 days of history, today, and 6 days ahead. `edit[k]` overrides day today+k. */
function week(today: string, edit: Record<number, Partial<DayWeather>> = {}, history: Partial<DayWeather> = {}): DayWeather[] {
  const out: DayWeather[] = [];
  for (let k = -30; k <= 6; k++) {
    out.push({ ...MILD, ...(k < 0 ? history : {}), ...(edit[k] ?? {}), date: addDays(today, k) });
  }
  return out;
}
const T = "2026-11-08";
const run = (days: DayWeather[], today = T) => evaluateZone({ id: "z" }, days, today) ?? [];
const one = (fl: Flag[], trig: string) => fl.filter((f) => f.trigger === trig);

// ---- zones
const zoned = ZONE_DEFS.flatMap((z) => z.slugs);
for (const s of publishedSuburbs) {
  const n = zoned.filter((x) => x === s.slug).length;
  ok(n === 1, `${s.name} is in exactly one zone`, n);
}
ok(zoned.length === new Set(zoned).size, "no suburb listed twice");
ok(ZONES.length <= 12, `${ZONES.length} zones, one forecast point each (≤ 12)`);
ok(ZONES.every((z) => z.suburbs.length === ZONE_DEFS.find((d) => d.id === z.id)!.slugs.length), "every zoned suburb has coordinates and a postcode");
ok(ZONES.every((z) => z.radiusKm >= 4 && z.radiusKm <= 20), "zone radii are suburb-cluster sized", ZONES.map((z) => [z.id, z.radiusKm]));

// ---- a mild week says nothing
ok(run(week(T)).length === 0, "a mild week raises no flags", run(week(T)));
ok(evaluateZone({ id: "z" }, week(T), "2030-01-01") === null, "a forecast without today is unreadable, not empty");

// ---- heat
let f = one(run(week(T, { 2: { tmax: 36 } })), "heat");
ok(f.length === 1 && f[0].severity === "moderate" && f[0].from === addDays(T, 2) && f[0].leadDays === 2, "a lone 36° day in two days: moderate heat, lead 2", f);
ok(f[0]?.campaign === "cooling", "heat feeds the cooling campaign");
f = one(run(week(T, { 3: { tmax: 39 } })), "heat");
ok(f[0]?.severity === "strong", "39° is strong", f);
f = one(run(week(T, { 1: { tmax: 33 }, 2: { tmax: 34 }, 3: { tmax: 33 } })), "heat");
ok(f[0]?.severity === "strong" && f[0].from === addDays(T, 1) && f[0].to === addDays(T, 3), "three 32°+ days running is a hot spell, strong", f);
f = one(run(week(T, { 1: { tmax: 33 }, 2: { tmax: 34 }, 4: { tmax: 33 } })), "heat");
ok(f.length === 0, "three hot days with a break isn't a spell", f);
f = one(run(week(T, { [-2]: { tmax: 33 }, [-1]: { tmax: 33 }, 0: { tmax: 33 } })), "heat");
ok(f[0]?.severity === "strong" && f[0].from === T, "a spell already two days in still flags from today", f);
f = one(run(week(T, { 6: { tmax: 40 } })), "heat");
ok(f.length === 0, `heat beyond ${RULES.heat.horizon} days isn't flagged yet`, f);

// ---- first warm day
f = one(run(week(T, { 1: { tmax: 31 } }, { tmax: 24 })), "first_warm");
ok(f.length === 1 && f[0].campaign === "aircon_service", "first 31° after a cool month: aircon service", f);
f = one(run(week(T, { 1: { tmax: 31 }, [-10]: { tmax: 29 } }, { tmax: 24 })), "first_warm");
ok(f.length === 0, "not 'first' when there was a 29° day ten days ago", f);
{
  const d = week(T, { 1: { tmax: 31 } }).slice(20); // ten days of history only
  ok(one(evaluateZone({ id: "z" }, d, T) ?? [], "first_warm").length === 0, "without a month of history it won't claim 'first'");
}

// ---- cold snap
f = one(run(week(T, { 2: { tmin: 1 } })), "cold_snap");
ok(f[0]?.severity === "moderate" && f[0].campaign === "heating", "a 1° morning: moderate cold snap for heating", f);
f = one(run(week(T, { 2: { tmin: -1 } })), "cold_snap");
ok(f[0]?.severity === "strong", "a −1° frost is strong", f);
f = one(run(week(T, { 4: { tmax: 11 } })), "cold_snap");
ok(f.length === 1 && f[0].severity === "moderate", "an 11° top is a cold snap", f);

// ---- first cold of autumn
const MAY = "2026-05-10";
f = one(run(week(MAY, { 1: { tmin: 4 } }, { tmin: 9, tmax: 19 }), MAY), "first_cold");
ok(f.length === 1 && f[0].campaign === "heater_service", "first 4° night in May: heater service", f);
f = one(run(week(T, { 1: { tmin: 4 } }, { tmin: 9, tmax: 19 })), "first_cold");
ok(f.length === 0, "the same night in November isn't 'first cold of autumn'", f);
f = one(run(week(MAY, { 1: { tmin: 4 }, [-5]: { tmax: 15 } }, { tmin: 9, tmax: 19 }), MAY), "first_cold");
ok(f.length === 0, "not 'first' after a 15° day last week", f);

// ---- cold mornings, hot water
f = one(run(week(T, { 1: { tmin: 2.5 }, 2: { tmin: 3 } })), "cold_mornings");
ok(f.length === 1 && f[0].campaign === "hot_water" && f[0].severity === "moderate", "two 3° mornings running: hot water", f);
f = one(run(week(T, { 1: { tmin: 2.5 }, 3: { tmin: 3 } })), "cold_mornings");
ok(f.length === 0, "two cold mornings apart don't count", f);
f = one(run(week(T, { 1: { tmin: -1 }, 2: { tmin: -0.5 } })), "cold_mornings");
ok(f[0]?.severity === "strong", "two frosts running is strong", f);

// ---- storms
f = one(run(week(T, { 1: { gust: 85 } })), "storm");
ok(f[0]?.severity === "moderate" && f[0].to === addDays(T, 3) && !f[0].observed, "85 km/h tomorrow: moderate, runs two days after", f);
f = one(run(week(T, { 1: { gust: 95 } })), "storm");
ok(f[0]?.severity === "strong", "95 km/h gusts are strong", f);
f = one(run(week(T, { 1: { code: 95, gust: 50, rain: 8 } })), "storm");
ok(f.length === 0, "a thunderstorm code with ordinary wind and rain isn't a storm flag", f);
f = one(run(week(T, { 1: { code: 95, rain: 25 } })), "storm");
ok(f.length === 1 && f[0].severity === "moderate", "a thunderstorm with 25 mm is", f);
f = one(run(week(T, { 1: { code: 96 } })), "storm");
ok(f[0]?.severity === "strong", "hail (if Open-Meteo ever forecasts it here) is strong", f);
f = one(run(week(T, { [-1]: { gust: 85 } })), "storm");
ok(f.length === 1 && f[0].observed && f[0].leadDays === -1, "a storm yesterday still flags, as observed", f);
f = one(run(week(T, { [-2]: { gust: 85 } })), "storm");
ok(f.length === 1 && f[0].to === T, "a storm two days ago runs through today", f);
f = one(run(week(T, { [-3]: { gust: 85 } })), "storm");
ok(f.length === 0, "three days ago is over", f);

// ---- reports: failure is never "no flags"
const NOW = new Date("2026-11-08T01:00:00Z");
const good = ZONES.map(() => ({ state: "ok" as const, days: week(T) }));
let r = buildReport({ zones: ZONES, weather: null, fetchError: "Open-Meteo answered 502", fetchedAt: null, now: NOW, today: T });
ok(r.status === "unavailable" && r.flags.length === 0 && /not "no flags"/.test(r.message), "a failed fetch reports unavailable, and says it isn't 'no flags'", r.message);
ok(r.zones.every((z) => z.weather === "unavailable"), "every zone is marked unavailable");
r = buildReport({ zones: ZONES, weather: good, fetchedAt: NOW.toISOString(), now: NOW, today: T });
ok(r.status === "ok" && r.flags.length === 0 && /nothing in the forecast/.test(r.message), "all zones fine and nothing tripped: ok, explicitly", r.message);
const mixed = good.map((g, i) => (i === 3 ? { state: "unavailable" as const, error: "Missing from the response" } : i === 0 ? { state: "ok" as const, days: week(T, { 1: { tmax: 37 } }) } : g));
r = buildReport({ zones: ZONES, weather: mixed, fetchedAt: NOW.toISOString(), now: NOW, today: T });
// 37° after a month of 20s is both a heat day and the season's first warm day.
ok(r.status === "partial" && r.flags.length === 2 && r.flags.every((x) => x.zoneId === ZONES[0].id), "one zone down, one hot: partial, with that zone's flags", r.flags.map((x) => x.trigger));
ok(r.flags[0]?.suburbs.length === ZONES[0].suburbs.length && r.flags[0].postcodes.length > 0, "a flag carries its suburbs and postcodes");
const old = new Date(NOW.getTime() - STALE_AFTER_MS - 60_000).toISOString();
r = buildReport({ zones: ZONES, weather: mixed, fetchedAt: old, now: NOW, today: T });
ok(r.status === "stale" && r.zones[0].weather === "stale", "a forecast over six hours old is stale", r.status);

// ---- parsing
let p = parseForecast({ error: true, reason: "Latitude must be in range" }, 3);
ok(p.length === 3 && p.every((z) => z.state === "unavailable"), "an Open-Meteo error body marks every zone unavailable", p);
p = parseForecast([{ daily: { time: ["2026-11-08"], temperature_2m_max: [20], temperature_2m_min: [9], weather_code: [3], wind_gusts_10m_max: [30], precipitation_sum: [0] } }], 2);
ok(p[0].state === "ok" && p[1].state === "unavailable", "a short array leaves the missing zone unavailable", p.map((x) => x.state));
p = parseForecast([{ daily: { time: ["2026-11-08"], temperature_2m_max: [null] } }], 1);
ok(p[0].state === "unavailable", "all-null temperatures are unavailable, not mild", p);

// ---- csv
r = buildReport({ zones: ZONES, weather: mixed, fetchedAt: NOW.toISOString(), now: NOW, today: T });
const csv = reportCsv(r).trim().split("\n");
ok(csv[0] === CSV_HEADER.join(","), "CSV header");
ok(csv.length - 1 === 2 * ZONES[0].suburbs.length, "one CSV row per flagged suburb per flag", csv.length - 1);
ok(/3810, Victoria, Australia/.test(csv.join("\n")), "rows carry the Google Ads postcode form");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
