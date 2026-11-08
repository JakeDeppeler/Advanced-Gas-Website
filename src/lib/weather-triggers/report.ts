/**
 * From Open-Meteo's answer to the report the endpoint, the page and the Ads
 * Script all read. Pure: the fetch and the clock live in ./load.
 *
 * The one rule this file exists to keep: "no flags" and "couldn't look" are
 * different answers and must never look alike. A zone whose forecast didn't
 * arrive is listed as unavailable, the report's status says so, and the Ads
 * Script is told to leave that zone exactly as it was rather than read the
 * silence as "weather's fine, switch the ads off".
 */

import { evaluateZone } from "./rules";
import { SCHEMA_VERSION, type DayWeather, type Flag, type Zone, type ZoneSuburb, type ZoneWeather } from "./types";

export const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/** 30 days back is what "first warm day / first cold of autumn" need to say "first". */
export const PAST_DAYS = 30;
export const FORECAST_DAYS = 7;
const DAILY = ["temperature_2m_max", "temperature_2m_min", "weather_code", "wind_gusts_10m_max", "precipitation_sum"] as const;

/**
 * One request for every zone: Open-Meteo takes comma-separated coordinates and
 * answers with an array in the same order. Daily values only: hourly CAPE was
 * tried for storms and made the request take over a minute for no rule that
 * needed it.
 */
export function forecastUrl(zones: Pick<Zone, "lat" | "lng">[]): string {
  const q = new URLSearchParams({
    latitude: zones.map((z) => z.lat).join(","),
    longitude: zones.map((z) => z.lng).join(","),
    daily: DAILY.join(","),
    timezone: "Australia/Melbourne",
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    wind_speed_unit: "kmh",
  });
  return `${OPEN_METEO_URL}?${q}`;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** One location's block of the response, or why it couldn't be read. */
function parseOne(raw: unknown): ZoneWeather {
  const daily = (raw as { daily?: Record<string, unknown> } | null)?.daily;
  const time = daily?.time;
  if (!daily || !Array.isArray(time) || !time.length) return { state: "unavailable", error: "No daily forecast in the response" };
  const col = (k: string) => (Array.isArray(daily[k]) ? (daily[k] as unknown[]) : []);
  const [tx, tn, wc, wg, pr] = DAILY.map(col);
  const days: DayWeather[] = time.map((d, i) => ({
    date: String(d), tmax: num(tx[i]), tmin: num(tn[i]), code: num(wc[i]), gust: num(wg[i]), rain: num(pr[i]),
  }));
  if (!days.some((d) => d.tmax != null)) return { state: "unavailable", error: "Forecast came back empty" };
  return { state: "ok", days };
}

/** Open-Meteo's body, matched back to the zones by position. */
export function parseForecast(body: unknown, zoneCount: number): ZoneWeather[] {
  // A single location comes back as an object, several as an array.
  const list = Array.isArray(body) ? body : zoneCount === 1 ? [body] : null;
  if (!list) {
    const reason = (body as { reason?: unknown } | null)?.reason;
    const err = typeof reason === "string" ? `Open-Meteo: ${reason}` : "Unexpected response from Open-Meteo";
    return Array.from({ length: zoneCount }, () => ({ state: "unavailable", error: err }));
  }
  return Array.from({ length: zoneCount }, (_, i) =>
    i < list.length ? parseOne(list[i]) : { state: "unavailable", error: "Missing from the response" },
  );
}

export type ReportZone = Omit<Zone, "suburbs"> & {
  suburbs: ZoneSuburb[];
  weather: "ok" | "stale" | "unavailable";
  error?: string;
  /** Today and the days ahead, for showing the numbers behind a flag. */
  outlook: DayWeather[];
};

export type ReportFlag = Flag & {
  zoneName: string;
  lat: number; lng: number; radiusKm: number;
  suburbs: ZoneSuburb[];
  postcodes: string[];
};

export type ReportStatus = "ok" | "partial" | "stale" | "unavailable";

export type Report = {
  schema: typeof SCHEMA_VERSION;
  status: ReportStatus;
  message: string;
  today: string;
  generatedAt: string;
  forecastFetchedAt: string | null;
  source: string;
  zones: ReportZone[];
  flags: ReportFlag[];
};

/**
 * Past this, a forecast is treated as stale: still shown, but the Ads Script
 * is told not to act on it. Six hours is two model runs, and long enough that
 * a missed hourly refresh or two doesn't flap the ads.
 */
export const STALE_AFTER_MS = 6 * 3_600_000;

export function buildReport(input: {
  zones: Zone[];
  weather: ZoneWeather[] | null; // null: the request itself failed
  fetchError?: string;
  fetchedAt: string | null;
  now: Date;
  today: string;
}): Report {
  const { zones, now, today } = input;
  const stale = input.fetchedAt != null && now.getTime() - Date.parse(input.fetchedAt) > STALE_AFTER_MS;
  const flags: ReportFlag[] = [];
  const out: ReportZone[] = zones.map((z, i) => {
    const w: ZoneWeather = input.weather?.[i] ?? { state: "unavailable", error: input.fetchError ?? "Forecast not fetched" };
    const base = { id: z.id, name: z.name, why: z.why, lat: z.lat, lng: z.lng, radiusKm: z.radiusKm, suburbs: z.suburbs };
    if (w.state !== "ok") return { ...base, weather: "unavailable", error: w.error, outlook: [] };
    const found = evaluateZone(z, w.days, today);
    if (!found) return { ...base, weather: "unavailable", error: `The forecast doesn't include today (${today})`, outlook: [] };
    for (const f of found) {
      flags.push({
        ...f, zoneName: z.name, lat: z.lat, lng: z.lng, radiusKm: z.radiusKm,
        suburbs: z.suburbs, postcodes: [...new Set(z.suburbs.map((s) => s.postcode))].sort(),
      });
    }
    return { ...base, weather: stale ? "stale" : "ok", outlook: w.days.filter((d) => d.date >= today) };
  });

  const okCount = out.filter((z) => z.weather === "ok").length;
  const down = out.filter((z) => z.weather === "unavailable").length;
  let status: ReportStatus;
  let message: string;
  if (down === out.length) {
    status = "unavailable";
    message = `No forecast: ${input.fetchError ?? out[0]?.error ?? "Open-Meteo didn't answer"}. This is not "no flags" — nothing could be checked.`;
  } else if (stale) {
    status = "stale";
    message = `The forecast is from ${input.fetchedAt}, over ${STALE_AFTER_MS / 3_600_000} hours old. Shown, but not to be acted on.`;
  } else if (down) {
    status = "partial";
    message = `${okCount} of ${out.length} zones checked; ${down} had no forecast and say nothing either way.`;
  } else {
    status = "ok";
    message = flags.length ? `${flags.length} flag${flags.length === 1 ? "" : "s"} across ${new Set(flags.map((f) => f.zoneId)).size} zones.` : "Every zone checked; nothing in the forecast trips a trigger.";
  }

  const sev = { strong: 0, moderate: 1 } as const;
  flags.sort((a, b) => sev[a.severity] - sev[b.severity] || a.from.localeCompare(b.from) || a.zoneName.localeCompare(b.zoneName));

  return {
    schema: SCHEMA_VERSION, status, message, today,
    generatedAt: now.toISOString(), forecastFetchedAt: input.fetchedAt,
    source: "Open-Meteo forecast API (open-meteo.com), daily values, Australia/Melbourne dates",
    zones: out, flags,
  };
}

/** Today's date in Melbourne, YYYY-MM-DD. The server runs in UTC (and Tokyo). */
export function melbourneToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
