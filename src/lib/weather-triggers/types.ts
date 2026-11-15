/**
 * Shapes shared by the weather-trigger engine, the endpoint, the portal page
 * and (by contract, not by import) the Google Ads Script in docs/weather-ads/.
 * The script reads the JSON, so renaming a field here breaks it silently:
 * bump SCHEMA_VERSION when the shape changes and the script will refuse a
 * version it doesn't know rather than misread one.
 */

export const SCHEMA_VERSION = 1;

/** One day of forecast (or model-analysed past) for a zone, local Melbourne date. */
export type DayWeather = {
  date: string; // YYYY-MM-DD, Australia/Melbourne
  tmax: number | null; // °C
  tmin: number | null; // °C
  code: number | null; // WMO weather code
  gust: number | null; // km/h, daily max at 10 m
  rain: number | null; // mm, daily sum
};

export type ZoneSuburb = { slug: string; name: string; postcode: string; lat: number; lng: number };

export type Zone = {
  id: string;
  name: string;
  /** Why these suburbs share a forecast point: the weather reason, not the map reason. */
  why: string;
  lat: number;
  lng: number;
  /** Centroid to the furthest member suburb, plus a margin, rounded up to whole km. */
  radiusKm: number;
  suburbs: ZoneSuburb[];
};

/** Which ad campaign a flag feeds. The Ads Script maps each key to a campaign name. */
export type CampaignKey = "cooling" | "aircon_service" | "heating" | "heater_service" | "hot_water" | "storm_check";

export type TriggerId = "heat" | "first_warm" | "cold_snap" | "first_cold" | "cold_mornings" | "storm";

export type Severity = "moderate" | "strong";

export type Flag = {
  id: string;
  trigger: TriggerId;
  label: string;
  campaign: CampaignKey;
  service: string;
  severity: Severity;
  zoneId: string;
  /** First and last day the trigger covers, inclusive, local dates. */
  from: string;
  to: string;
  /** Days from today to `from`; 0 = today, negative = already under way. */
  leadDays: number;
  /** Plain words: what in the forecast set it off. */
  reason: string;
  /** True when it rests on weather that has already happened (storm aftermath). */
  observed: boolean;
};

export type ZoneWeather =
  | { state: "ok"; days: DayWeather[] }
  | { state: "unavailable"; error: string };
