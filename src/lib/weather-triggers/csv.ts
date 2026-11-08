/**
 * The flags as a location list to paste into an ad platform.
 *
 * One row per suburb per flag, because both platforms target a suburb better
 * than a zone circle: Google Ads' "bulk locations" takes postcodes in the
 * "3810, Victoria, Australia" form, Meta's "Add locations in bulk" takes the
 * bare postcode. Lat/lng and a radius are there for anything that wants a
 * pin-and-radius instead. Several suburbs share a postcode (3977 is seven of
 * them), so a platform that dedupes on paste will show fewer lines than this.
 */

import { SUBURB_RADIUS_KM } from "./zones";
import type { Report } from "./report";

const cell = (v: string | number | boolean) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = [
  "campaign", "service", "trigger", "severity", "from", "to", "zone",
  "suburb", "postcode", "google_ads_location", "latitude", "longitude", "radius_km", "reason",
];

export function reportCsv(r: Report): string {
  const rows: (string | number | boolean)[][] = [CSV_HEADER];
  for (const f of r.flags) {
    for (const s of f.suburbs) {
      rows.push([
        f.campaign, f.service, f.label, f.severity, f.from, f.to, f.zoneName,
        s.name, s.postcode, `${s.postcode}, Victoria, Australia`, s.lat, s.lng, SUBURB_RADIUS_KM, f.reason,
      ]);
    }
  }
  return rows.map((row) => row.map(cell).join(",")).join("\n") + "\n";
}
