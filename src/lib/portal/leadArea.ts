import { suburbs } from "@/lib/suburbs";

/**
 * Where an enquiry came from, in drive time rather than kilometres.
 *
 * A radius is a circle and Melbourne is not. Thirty-six kilometres south-east
 * is Lang Lang, half an hour down the highway; thirty-six kilometres
 * north-west is the other side of the city and an hour in traffic. The site
 * advertises "within 75 km", which is why enquiries turn up from places that
 * feel a long way away and technically are not — so this sorts them by how
 * long the van is actually in the car, which is the number that decides
 * whether a job is worth taking.
 *
 * Runs on the server. The suburb list is a large module and there is no reason
 * for it to reach the browser.
 */

export type Band = "core" | "edge" | "haul" | "unknown";

export const BANDS: { key: Band; label: string; note: string }[] = [
  { key: "core", label: "Half an hour or less", note: "The patch. A callout here costs almost nothing to attend." },
  { key: "edge", label: "Thirty to forty-five minutes", note: "Worth a booked install. Not worth a callout." },
  { key: "haul", label: "Over forty-five minutes", note: "Most of a morning gone before anyone picks up a tool." },
  { key: "unknown", label: "Not a suburb we cover", note: "No page, no drive time. Outside the list entirely." },
];

export type AreaRow = {
  name: string;
  postcode: string | null;
  km: number | null;
  driveMax: number | null;
  band: Band;
  n: number;
  quotes: number;
  calls: number;
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Drive time first, because that is the cost. Falls back to distance. */
function bandFor(driveMax: number | null, km: number | null): Band {
  if (driveMax != null) {
    if (driveMax <= 30) return "core";
    if (driveMax <= 45) return "edge";
    return "haul";
  }
  if (km != null) {
    if (km <= 20) return "core";
    if (km <= 35) return "edge";
    return "haul";
  }
  return "unknown";
}

/**
 * Group leads by where they came from. Matches on suburb name first and
 * postcode second: a postcode can hold more than one suburb, and the name is
 * what the person actually typed.
 */
export function groupByArea(
  leads: { suburb: string | null; postcode: string | null; kind: "quote" | "call" }[],
): { rows: AreaRow[]; byBand: Record<Band, number>; total: number } {
  const byName = new Map(suburbs.map((s) => [norm(s.name), s]));
  const byPostcode = new Map<string, (typeof suburbs)[number]>();
  for (const s of suburbs) if (!byPostcode.has(s.postcode)) byPostcode.set(s.postcode, s);

  const acc = new Map<string, AreaRow>();
  const byBand: Record<Band, number> = { core: 0, edge: 0, haul: 0, unknown: 0 };

  for (const l of leads) {
    const hit =
      (l.suburb ? byName.get(norm(l.suburb)) : undefined) ??
      (l.postcode ? byPostcode.get(l.postcode.trim()) : undefined);

    const name = hit?.name ?? (l.suburb?.trim() || (l.postcode ? `Postcode ${l.postcode.trim()}` : "Not given"));
    const km = hit?.distanceKm ?? null;
    const driveMax = hit?.driveMin?.[1] ?? null;
    const band = hit ? bandFor(driveMax, km) : "unknown";

    const key = `${name}|${band}`;
    const row = acc.get(key) ?? {
      name, postcode: hit?.postcode ?? l.postcode?.trim() ?? null,
      km, driveMax, band, n: 0, quotes: 0, calls: 0,
    };
    row.n += 1;
    if (l.kind === "quote") row.quotes += 1; else row.calls += 1;
    acc.set(key, row);
    byBand[band] += 1;
  }

  const rows = [...acc.values()].sort((a, b) => b.n - a.n || (b.driveMax ?? 0) - (a.driveMax ?? 0));
  return { rows, byBand, total: leads.length };
}
