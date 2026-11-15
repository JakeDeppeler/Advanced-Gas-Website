import "server-only";
import { unstable_cache } from "next/cache";
import { ZONES } from "./zones";
import { buildReport, forecastUrl, melbourneToday, parseForecast, type Report } from "./report";

/**
 * The live report: one Open-Meteo request for every zone, held for an hour.
 *
 * Held with unstable_cache rather than fetch's own cache because a failed
 * fetch must not be held: a thrown error isn't stored, so the next request
 * tries again, and until one succeeds the last good forecast keeps being
 * served (it carries its own fetchedAt, and the report turns "stale" past six
 * hours rather than passing an old forecast off as today's). The trigger
 * maths runs per request on the held forecast, so "today" rolls over at
 * Melbourne midnight, not an hour later.
 *
 * Open-Meteo is public and keyless, so nothing here is a secret.
 */

const FETCH_TIMEOUT_MS = 15_000;

const loadForecast = unstable_cache(
  async (url: string): Promise<{ body: unknown; fetchedAt: string }> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(url, { signal: ac.signal, cache: "no-store" });
      if (!r.ok) throw new Error(`Open-Meteo answered ${r.status}`);
      const body: unknown = await r.json();
      // An error body is a 400 with { error: true, reason }, but check anyway:
      // caching one would hold the failure for the hour.
      if (body && typeof body === "object" && !Array.isArray(body) && (body as { error?: unknown }).error) {
        throw new Error(`Open-Meteo: ${String((body as { reason?: unknown }).reason ?? "error")}`);
      }
      return { body, fetchedAt: new Date().toISOString() };
    } finally {
      clearTimeout(timer);
    }
  },
  ["weather-triggers-forecast-v1"],
  { revalidate: 3600 },
);

export async function loadWeatherReport(now = new Date()): Promise<Report> {
  const today = melbourneToday(now);
  try {
    const { body, fetchedAt } = await loadForecast(forecastUrl(ZONES));
    return buildReport({ zones: ZONES, weather: parseForecast(body, ZONES.length), fetchedAt, now, today });
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? `Open-Meteo didn't answer within ${FETCH_TIMEOUT_MS / 1000}s` : e.message) : "Open-Meteo request failed";
    return buildReport({ zones: ZONES, weather: null, fetchError: msg, fetchedAt: null, now, today });
  }
}
