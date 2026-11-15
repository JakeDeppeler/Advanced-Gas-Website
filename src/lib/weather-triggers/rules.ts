/**
 * The triggers: pure functions from a zone's daily weather to the ad flags it
 * raises. No fetching, no clock — `today` is passed in — so scripts/check-weather.ts
 * can drive every rule with fixture weeks.
 *
 * The thresholds are a starting point, not a finding. They are set where the
 * weather plainly changes what people do (a 35° day, a frost), and none of
 * them has yet been checked against our own ServiceTitan call volume. When
 * there's a season of flags to compare with bookings, tune them here; the
 * portal page and the endpoint both read RULES, so the words can't drift from
 * the numbers.
 */

import type { CampaignKey, DayWeather, Flag, Severity, TriggerId, Zone } from "./types";

export const RULES = {
  /**
   * 35° is where Melbourne calls a day "very hot" and where tired split systems
   * stop keeping up, which is when people ring. Three days of 32°+ is the
   * shape of a Melbourne heatwave (BOM defines one by three days of unusual
   * heat for the location; 32 is well into the top tenth of summer maxima here)
   * and it's the run of nights that won't cool down that sells installs, more
   * than any one day.
   */
  heat: { hotDay: 35, strongDay: 38, spellDay: 32, spellLength: 3, horizon: 5 },
  /**
   * The first 30° day after a month without 28°: everyone switches the aircon
   * on for the first time since March and finds out whether it works. That is
   * the service-and-repair moment, not the install one.
   */
  firstWarm: { day: 30, quietBelow: 28, lookback: 30, horizon: 5 },
  /**
   * A frost (min 2° or under) or a day that doesn't get past 12°. Either one
   * is a day the heater runs flat out all day, and a heater that's been
   * limping fails. 0° / 10° is a properly cold day for here.
   */
  coldSnap: { min: 2, max: 12, strongMin: 0, strongMax: 10, horizon: 5 },
  /**
   * The first cold of autumn — min 5° or under, or max 14° or under, after a
   * month without a day that cold (with a degree of slack) — is when people
   * book a heater service before winter. Only March to June: a cold night in
   * October doesn't make anyone service a heater they're about to switch off.
   */
  firstCold: { min: 5, max: 14, quietMin: 6, quietMax: 15, lookback: 30, months: [3, 4, 5, 6], horizon: 5 },
  /**
   * Two cold mornings running (3° or under). Inlet water is coldest, demand is
   * highest, an air-source heat pump is at the bottom of its capacity, and a
   * storage tank on its last legs gives out. Hot water is the one service where
   * the call is "today, please".
   */
  coldMornings: { min: 3, strongMin: 0, run: 2, horizon: 5 },
  /**
   * Damaging weather for outdoor units and roof-mounted evap coolers. 90 km/h
   * is the gust BOM calls damaging; 80 is a step under it, because a daily max
   * from a model smooths the peak. A thunderstorm code alone isn't enough: the
   * models put one on Melbourne most stormy spring afternoons, and three of the
   * last thirty days at Pakenham carried one without anything coming down. It
   * needs gusts or a downpour beside it.
   *
   * Hail: WMO codes 96 and 99 mean thunderstorm with hail, but Open-Meteo only
   * forecasts hail over central Europe. Here those codes won't appear, so a
   * hailstorm will flag through its wind or rain if at all. The rule still
   * honours them in case that changes.
   *
   * Storm checks run for two days after the storm as well as ahead of it,
   * because like roof repairs, the damage is found the morning after.
   */
  storm: { gust: 80, strongGust: 90, stormGust: 65, stormRain: 20, ahead: 2, behind: 2, tail: 2 },
} as const;

export const TRIGGERS: Record<TriggerId, { label: string; campaign: CampaignKey; service: string }> = {
  heat: { label: "Heat", campaign: "cooling", service: "Aircon install & repair" },
  first_warm: { label: "First warm day", campaign: "aircon_service", service: "Aircon service" },
  cold_snap: { label: "Cold snap", campaign: "heating", service: "Heater repair & ducted heating" },
  first_cold: { label: "First cold of autumn", campaign: "heater_service", service: "Heater service before winter" },
  cold_mornings: { label: "Cold mornings", campaign: "hot_water", service: "Hot water repair & replacement" },
  storm: { label: "Storm", campaign: "storm_check", service: "Storm damage check" },
};

/** The rules in words, built from RULES so the page can't say one thing while the code does another. */
export function ruleText(): { trigger: TriggerId; when: string; strong: string }[] {
  const h = RULES.heat, w = RULES.firstWarm, c = RULES.coldSnap, f = RULES.firstCold, m = RULES.coldMornings, s = RULES.storm;
  const months = f.months.map((n) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][n - 1]);
  return [
    { trigger: "heat", when: `A day of ${h.hotDay}°+, or ${h.spellLength} days running of ${h.spellDay}°+, in the next ${h.horizon} days`, strong: `${h.strongDay}°+, or the ${h.spellLength}-day run` },
    { trigger: "first_warm", when: `The first ${w.day}° day after ${w.lookback} days without ${w.quietBelow}°`, strong: "Always moderate" },
    { trigger: "cold_snap", when: `A min of ${c.min}° or under, or a max of ${c.max}° or under, in the next ${c.horizon} days`, strong: `Min ${c.strongMin}° or under, or max ${c.strongMax}° or under` },
    { trigger: "first_cold", when: `${months[0]}–${months[months.length - 1]} only: the first min of ${f.min}° or under, or max of ${f.max}° or under, after ${f.lookback} days without one`, strong: "Always moderate" },
    { trigger: "cold_mornings", when: `${m.run} mornings running at ${m.min}° or under`, strong: `${m.run} running at ${m.strongMin}° or under` },
    { trigger: "storm", when: `Gusts of ${s.gust} km/h+, or a thunderstorm with ${s.stormGust} km/h gusts or ${s.stormRain} mm of rain, from ${s.behind} days ago to ${s.ahead} days ahead; runs ${s.tail} days after`, strong: `Gusts of ${s.strongGust} km/h+, or hail` },
  ];
}

/* ------------------------------------------------------------- helpers */

const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;
export const daysBetween = (a: string, b: string) => Math.round(dayNum(b) - dayNum(a));
export const addDays = (d: string, n: number) => new Date((dayNum(d) + n) * 86_400_000).toISOString().slice(0, 10);

/** "Sat 14 Nov", from a local date string, without letting a timezone move the day. */
export function dayLabel(d: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${d}T12:00:00Z`));
}
const deg = (n: number) => `${Math.round(n)}°`;

/** Runs of consecutive indices in [lo, hi] where `pred` holds. */
function runs(days: DayWeather[], lo: number, hi: number, pred: (d: DayWeather) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let i = Math.max(0, lo); i <= Math.min(days.length - 1, hi); i++) {
    if (pred(days[i])) { if (start < 0) start = i; }
    else if (start >= 0) { out.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) out.push([start, Math.min(days.length - 1, hi)]);
  return out;
}

/** Enough history to say "first"? A gap in the past days means we can't. */
function hasHistory(days: DayWeather[], i: number, lookback: number, key: "tmax" | "tmin"): boolean {
  if (i - lookback < 0) return false;
  let seen = 0;
  for (let j = i - lookback; j < i; j++) if (days[j][key] != null) seen++;
  return seen >= lookback - 2;
}

/* --------------------------------------------------------------- rules */

type Draft = { trigger: TriggerId; severity: Severity; from: string; to: string; reason: string; observed?: boolean };

function heat(days: DayWeather[], t: number): Draft | null {
  const r = RULES.heat;
  const end = t + r.horizon;
  const hot = new Set<number>();
  for (let i = t; i <= Math.min(end, days.length - 1); i++) if ((days[i].tmax ?? -99) >= r.hotDay) hot.add(i);
  // A run can have started before today; it still counts if it reaches today or later.
  const spells = runs(days, t - (r.spellLength - 1), end, (d) => (d.tmax ?? -99) >= r.spellDay)
    .filter(([a, b]) => b - a + 1 >= r.spellLength && b >= t);
  for (const [a, b] of spells) for (let i = Math.max(a, t); i <= b; i++) hot.add(i);
  if (!hot.size) return null;
  const idx = [...hot].sort((a, b) => a - b);
  const peak = idx.reduce((p, i) => ((days[i].tmax ?? 0) > (days[p].tmax ?? 0) ? i : p), idx[0]);
  const peakT = days[peak].tmax ?? 0;
  const bits = [`${deg(peakT)} forecast ${dayLabel(days[peak].date)}`];
  if (spells.length) {
    const [a, b] = spells[0];
    bits.push(`${b - a + 1} days running of ${r.spellDay}°+ from ${dayLabel(days[a].date)}`);
  }
  return {
    trigger: "heat",
    severity: peakT >= r.strongDay || spells.length ? "strong" : "moderate",
    from: days[idx[0]].date, to: days[idx[idx.length - 1]].date,
    reason: bits.join("; "),
  };
}

function firstWarm(days: DayWeather[], t: number): Draft | null {
  const r = RULES.firstWarm;
  for (let i = t; i <= Math.min(t + r.horizon, days.length - 1); i++) {
    if ((days[i].tmax ?? -99) < r.day) continue;
    // Only the first qualifying day can be "first"; anything after it has it in its lookback.
    if (!hasHistory(days, i, r.lookback, "tmax")) return null;
    for (let j = i - r.lookback; j < i; j++) if ((days[j].tmax ?? -99) >= r.quietBelow) return null;
    return {
      trigger: "first_warm", severity: "moderate", from: days[i].date, to: days[i].date,
      reason: `${deg(days[i].tmax!)} forecast ${dayLabel(days[i].date)}, the first day over ${r.quietBelow}° in ${r.lookback}`,
    };
  }
  return null;
}

function coldSnap(days: DayWeather[], t: number): Draft | null {
  const r = RULES.coldSnap;
  const idx: number[] = [];
  for (let i = t; i <= Math.min(t + r.horizon, days.length - 1); i++) {
    const d = days[i];
    if ((d.tmin != null && d.tmin <= r.min) || (d.tmax != null && d.tmax <= r.max)) idx.push(i);
  }
  if (!idx.length) return null;
  const lowMin = idx.reduce((p, i) => ((days[i].tmin ?? 99) < (days[p].tmin ?? 99) ? i : p), idx[0]);
  const lowMax = idx.reduce((p, i) => ((days[i].tmax ?? 99) < (days[p].tmax ?? 99) ? i : p), idx[0]);
  const strong = idx.some((i) => (days[i].tmin ?? 99) <= r.strongMin || (days[i].tmax ?? 99) <= r.strongMax);
  const bits: string[] = [];
  if ((days[lowMin].tmin ?? 99) <= r.min) bits.push(`low of ${deg(days[lowMin].tmin!)} ${dayLabel(days[lowMin].date)}`);
  if ((days[lowMax].tmax ?? 99) <= r.max) bits.push(`top of only ${deg(days[lowMax].tmax!)} ${dayLabel(days[lowMax].date)}`);
  return {
    trigger: "cold_snap", severity: strong ? "strong" : "moderate",
    from: days[idx[0]].date, to: days[idx[idx.length - 1]].date,
    reason: `Forecast ${bits.join("; ")}`,
  };
}

function firstCold(days: DayWeather[], t: number): Draft | null {
  const r = RULES.firstCold;
  const cold = (d: DayWeather, min: number, max: number) => (d.tmin != null && d.tmin <= min) || (d.tmax != null && d.tmax <= max);
  for (let i = t; i <= Math.min(t + r.horizon, days.length - 1); i++) {
    const month = +days[i].date.slice(5, 7);
    if (!(r.months as readonly number[]).includes(month)) continue;
    if (!cold(days[i], r.min, r.max)) continue;
    if (!hasHistory(days, i, r.lookback, "tmin")) return null;
    for (let j = i - r.lookback; j < i; j++) if (cold(days[j], r.quietMin, r.quietMax)) return null;
    const d = days[i];
    const what = d.tmin != null && d.tmin <= r.min ? `low of ${deg(d.tmin)}` : `top of only ${deg(d.tmax!)}`;
    return {
      trigger: "first_cold", severity: "moderate", from: d.date, to: d.date,
      reason: `${what} forecast ${dayLabel(d.date)}, the first that cold in ${r.lookback} days`,
    };
  }
  return null;
}

function coldMornings(days: DayWeather[], t: number): Draft | null {
  const r = RULES.coldMornings;
  const found = runs(days, t - 1, t + r.horizon, (d) => d.tmin != null && d.tmin <= r.min)
    .filter(([a, b]) => b - a + 1 >= r.run && b >= t);
  if (!found.length) return null;
  const [a, b] = found[0];
  const last = found[found.length - 1][1];
  let low = a;
  for (let i = a; i <= b; i++) if ((days[i].tmin ?? 99) < (days[low].tmin ?? 99)) low = i;
  const strong = found.some(([x, y]) => runs(days, x, y, (d) => (d.tmin ?? 99) <= r.strongMin).some(([p, q]) => q - p + 1 >= r.run));
  return {
    trigger: "cold_mornings", severity: strong ? "strong" : "moderate",
    from: days[Math.max(a, t)].date, to: days[last].date,
    reason: `${b - a + 1} mornings at ${r.min}° or under from ${dayLabel(days[a].date)}, coldest ${deg(days[low].tmin!)}`,
  };
}

function storm(days: DayWeather[], t: number): Draft | null {
  const r = RULES.storm;
  const hits: { i: number; why: string; strong: boolean }[] = [];
  for (let i = Math.max(0, t - r.behind); i <= Math.min(t + r.ahead, days.length - 1); i++) {
    const d = days[i];
    const gust = d.gust ?? 0, rain = d.rain ?? 0, code = d.code ?? 0;
    const hail = code === 96 || code === 99;
    const thunder = code >= 95 && code <= 99;
    const why: string[] = [];
    if (hail) why.push("hail");
    if (gust >= r.gust) why.push(`${Math.round(gust)} km/h gusts`);
    else if (thunder && gust >= r.stormGust) why.push(`thunderstorm, ${Math.round(gust)} km/h gusts`);
    if (thunder && rain >= r.stormRain && !why.length) why.push(`thunderstorm, ${Math.round(rain)} mm`);
    if (why.length) hits.push({ i, why: `${why.join(", ")} ${dayLabel(d.date)}`, strong: hail || gust >= r.strongGust });
  }
  if (!hits.length) return null;
  const to = addDays(days[hits[hits.length - 1].i].date, r.tail);
  const observed = hits.every((h) => h.i < t);
  return {
    trigger: "storm", severity: hits.some((h) => h.strong) ? "strong" : "moderate",
    from: days[hits[0].i].date, to,
    reason: (observed ? "Had " : "Forecast ") + hits.map((h) => h.why).join("; "),
    observed,
  };
}

const RULE_FNS = [heat, firstWarm, coldSnap, firstCold, coldMornings, storm];

/**
 * Every flag one zone raises today. `days` is the zone's history and forecast
 * in date order; `today` must be one of its dates, or nothing can be said and
 * the caller should treat the zone as unavailable.
 */
export function evaluateZone(zone: Pick<Zone, "id">, days: DayWeather[], today: string): Flag[] | null {
  const t = days.findIndex((d) => d.date === today);
  if (t < 0) return null;
  const out: Flag[] = [];
  for (const fn of RULE_FNS) {
    const d = fn(days, t);
    if (!d || d.to < today) continue;
    const meta = TRIGGERS[d.trigger];
    out.push({
      id: `${d.trigger}:${zone.id}:${d.from}`,
      trigger: d.trigger, label: meta.label, campaign: meta.campaign, service: meta.service,
      severity: d.severity, zoneId: zone.id, from: d.from, to: d.to,
      leadDays: daysBetween(today, d.from), reason: d.reason, observed: Boolean(d.observed),
    });
  }
  return out;
}
