import "server-only";

import { TZ } from "@/lib/dashboard/dates";
import {
  FORECAST_PLACE,
  ROOF_WET_MM,
  WORK_FROM_HOUR,
  WORK_TO_HOUR,
  type Weather,
  type WxDay,
  type WxHour,
} from "@/lib/dashboard/weatherTypes";

/*
 * The forecast, from the Norwegian Meteorological Institute.
 *
 * Which needs a word, because the obvious answer is the Bureau of Meteorology
 * and the obvious answer is not available. BOM's own data services sell the
 * bulk datasets and give away a coarse text product; the JSON API behind
 * weather.bom.gov.au — the one every hobby project uses — returns this in its
 * own payload, on every request:
 *
 *   "This application programming interface (API) is owned by the Bureau of
 *    Meteorology. You must not use, copy or share it."
 *
 * That is not a licence to build a commercial business's wall board on, so it
 * is not used here. Open-Meteo was the next candidate and its free tier is
 * non-commercial only.
 *
 * MET Norway's Locationforecast is free, needs no key, covers Australia from
 * the global ECMWF run, and is licensed CC BY 4.0 with commercial use
 * permitted. The licence wants two things and both are honoured: an
 * identifying User-Agent with a way to make contact, and the credit carried
 * through to wherever the data is shown — see `credit` on the payload, which
 * the board prints.
 *
 * What it will not give us, for an Australian location, is gust speed or
 * probability of precipitation; those ride on the Nordic-area models only. So
 * neither appears on the board. A "70% chance" we cannot measure is exactly
 * the sort of figure DASHBOARD.md says to leave out.
 */
const ENDPOINT = "https://api.met.no/weatherapi/locationforecast/2.0/complete";

/**
 * Who we are, as the licence requires.
 *
 * A business domain and not anybody's address: MET asks for a way to contact
 * the operator if a client misbehaves, and a public website is that, without
 * putting a person's email into every outbound request.
 */
const USER_AGENT = "AdvancedGasWallBoard/1.0 (+https://advancedgas.com.au)";

export const CREDIT = "Forecast: MET Norway, CC BY 4.0";

/*
 * Half an hour.
 *
 * The underlying run updates roughly hourly and MET explicitly asks clients
 * not to poll harder than the data changes. Half an hour keeps the board no
 * more than one cycle behind while making one request per two board
 * recomputes at worst — the snapshot itself recomputes every thirty seconds.
 */
const REVALIDATE_SECONDS = 30 * 60;

/** How many days the board shows: today and the six after it. */
const DAYS = 7;

/*
 * A backstop against asking MET for the same forecast every thirty seconds.
 *
 * `next: { revalidate }` below is the real cache and it covers the route
 * handler the sync runs in. It is not guaranteed to cover every caller —
 * computeSnapshot is also reached from server actions and from the refresh
 * helper — and a board that recomputes every thirty seconds would, if the
 * extended fetch ever stopped applying, hammer a free service that explicitly
 * asks clients not to poll harder than the data changes. Getting blocked would
 * take the page down silently.
 *
 * Module scope, so it lives as long as a warm instance does, which is exactly
 * the case that would do the hammering.
 */
let lastRead: { at: number; value: Weather } | null = null;

type MetPoint = {
  time: string;
  data?: {
    instant?: {
      details?: {
        air_temperature?: number;
        relative_humidity?: number;
        wind_speed?: number;
      };
    };
    next_1_hours?: { details?: { precipitation_amount?: number } };
    next_6_hours?: {
      details?: {
        precipitation_amount?: number;
        air_temperature_min?: number;
        air_temperature_max?: number;
      };
    };
  };
};

const MS_PER_HOUR = 3_600_000;

/** The Melbourne date and hour a UTC instant falls in. */
function melbourneParts(iso: string): { date: string; hour: number } | null {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  // One formatter call rather than arithmetic on a fixed offset: Melbourne is
  // +11 now and +10 in May, and a board that reads the forecast an hour out
  // every April would be a bug nobody noticed until the clocks moved.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(t);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24;
  return date.length === 10 && Number.isFinite(hour) ? { date, hour } : null;
}

/** A day being built up, before it becomes a WxDay. */
type Draft = {
  date: string;
  temps: number[];
  hours: WxHour[];
  rainMm: number;
  workRainMm: number;
};

/**
 * How much of a six-hour block lands inside the working day.
 *
 * Past the hourly horizon the model gives one precipitation figure per six
 * hours, and the roof verdict asks about 7am to 4pm. Counting the whole block
 * would have a shower at 2am stopping Friday's install; ignoring it would have
 * a wet Friday reading dry. The overlap in hours, as a fraction, is the
 * honest middle — and the day keeps its full total separately, so the board
 * can still say how much rain the day gets.
 */
function workShare(startHour: number): number {
  const from = Math.max(startHour, WORK_FROM_HOUR);
  const to = Math.min(startHour + 6, WORK_TO_HOUR + 1);
  return Math.max(0, to - from) / 6;
}

/**
 * A payload from an earlier snapshot, re-stamped with the day it is now being
 * shown on.
 *
 * Carrying a forecast forward through a failed read is right; carrying it
 * forward through midnight without saying so is not. Re-stamping lets the page
 * see that its first day is yesterday and show the week it actually has.
 */
export function stampToday(w: Weather | null, now: Date): Weather | null {
  if (!w) return null;
  const today = melbourneParts(now.toISOString())?.date;
  if (!today) return w;
  return {
    ...w,
    today,
    // A reading taken yesterday is not "right now". The rest of the payload
    // degrades gracefully into a forecast that has partly run out; this one
    // field would simply have lied, under a card headed "Right now".
    now: today === w.today ? w.now : null,
  };
}

/**
 * The forecast for the yard, as days the board can ask questions of.
 *
 * Returns null rather than throwing: a wall board does not go blank because a
 * weather service had a moment, and the caller reports the source as `error`
 * so the footer's dot says so.
 */
export async function readWeather(now: Date = new Date()): Promise<Weather | null> {
  // Re-stamped on the way out, so a cached payload still knows what day it is
  // being shown on. See Weather.today.
  if (lastRead && now.getTime() - lastRead.at < REVALIDATE_SECONDS * 1000) {
    return { ...lastRead.value, today: melbourneParts(now.toISOString())?.date ?? lastRead.value.today };
  }

  let points: MetPoint[];
  try {
    const res = await fetch(`${ENDPOINT}?lat=-38.078&lon=145.487`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { properties?: { timeseries?: MetPoint[] } };
    points = body.properties?.timeseries ?? [];
  } catch {
    return null;
  }
  if (points.length === 0) return null;

  const today = melbourneParts(now.toISOString())?.date;
  if (!today) return null;

  const drafts = new Map<string, Draft>();
  const draft = (date: string): Draft => {
    const found = drafts.get(date);
    if (found) return found;
    const made: Draft = { date, temps: [], hours: [], rainMm: 0, workRainMm: 0 };
    drafts.set(date, made);
    return made;
  };

  for (const p of points) {
    const at = melbourneParts(p.time);
    if (!at || at.date < today) continue;
    const d = draft(at.date);
    const inst = p.data?.instant?.details ?? {};
    const hourly = p.data?.next_1_hours?.details;
    const sixly = p.data?.next_6_hours?.details;

    if (typeof inst.air_temperature === "number") d.temps.push(inst.air_temperature);

    if (hourly) {
      // Hourly resolution: a real hour, with its own humidity and wind, which
      // is what the evap verdict needs and what the strip across the page
      // draws.
      const rain = hourly.precipitation_amount ?? 0;
      d.hours.push({
        hour: at.hour,
        tempC: inst.air_temperature ?? 0,
        humidity: inst.relative_humidity ?? 0,
        rainMm: rain,
        windKmh: (inst.wind_speed ?? 0) * 3.6,
      });
      d.rainMm += rain;
      if (at.hour >= WORK_FROM_HOUR && at.hour <= WORK_TO_HOUR) d.workRainMm += rain;
    } else if (sixly) {
      // Six-hourly: no hour to speak of, but the block carries its own min and
      // max, which are the only honest source for the back half of the week's
      // temperatures — four instants a day would miss both ends.
      const rain = sixly.precipitation_amount ?? 0;
      d.rainMm += rain;
      d.workRainMm += rain * workShare(at.hour);
      for (const t of [sixly.air_temperature_min, sixly.air_temperature_max]) {
        if (typeof t === "number") d.temps.push(t);
      }
    }
  }

  const days: WxDay[] = [...drafts.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, DAYS)
    .filter((d) => d.temps.length > 0)
    .map((d) => {
      const hours = [...d.hours].sort((a, b) => a.hour - b.hour);
      const work = hours.filter((h) => h.hour >= WORK_FROM_HOUR && h.hour <= WORK_TO_HOUR);
      const wet = work.filter((h) => h.rainMm >= ROOF_WET_MM);
      const peak = hours.length > 0 ? hours.reduce((a, b) => (b.tempC > a.tempC ? b : a)) : null;
      return {
        date: d.date,
        minC: Math.min(...d.temps),
        maxC: Math.max(...d.temps),
        peakAt: peak ? peak.hour : null,
        rainMm: d.rainMm,
        workRainMm: d.workRainMm,
        rainFrom: wet.length > 0 ? wet[0].hour : null,
        rainTo: wet.length > 0 ? wet[wet.length - 1].hour : null,
        // Null, not zero, where there is no hourly wind to take a maximum of.
        windKmh: work.length > 0 ? Math.max(...work.map((h) => h.windKmh)) : null,
        hours,
      };
    });

  if (days.length === 0) return null;

  // "Now" is the forecast point nearest the clock, and only if one is within
  // the hour — a cached payload that has gone stale should blank the current
  // conditions rather than present an old hour as the present one.
  const first = points
    .map((p) => ({ p, gap: Math.abs(new Date(p.time).getTime() - now.getTime()) }))
    .filter((x) => Number.isFinite(x.gap))
    .sort((a, b) => a.gap - b.gap)[0];
  const inst = first && first.gap <= MS_PER_HOUR ? first.p.data?.instant?.details : undefined;

  const weather: Weather = {
    place: FORECAST_PLACE,
    at: now.toISOString(),
    today,
    now:
      inst && typeof inst.air_temperature === "number"
        ? {
            tempC: inst.air_temperature,
            humidity: inst.relative_humidity ?? 0,
            windKmh: (inst.wind_speed ?? 0) * 3.6,
          }
        : null,
    days,
    credit: CREDIT,
  };
  lastRead = { at: now.getTime(), value: weather };
  return weather;
}
