import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Server-side address autocomplete for Australian addresses.
 *
 * Order of preference:
 *   1. Mapbox Geocoding — best AU street-level coverage. Requires
 *      MAPBOX_ACCESS_TOKEN env var (paid tier, but 100k/month free).
 *   2. Nominatim (OpenStreetMap) — free, no key required, but coverage
 *      of suburban AU addresses is patchy and their usage policy
 *      requires a valid User-Agent identifying the app. We proxy from
 *      the server so we can set the header correctly.
 *
 * Response shape (normalised for the frontend):
 *   { suggestions: Array<{ display_name: string; postcode?: string }> }
 */

const PAKENHAM_LAT = -38.078;
const PAKENHAM_LON = 145.487;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    const suggestions = await mapboxLookup(q, mapboxToken).catch((e) => {
      console.error("Mapbox lookup failed", e);
      return [] as Suggestion[];
    });
    if (suggestions.length) return NextResponse.json({ suggestions });
    // fall through to Nominatim if Mapbox returned nothing
  }

  const suggestions = await nominatimLookup(q).catch((e) => {
    console.error("Nominatim lookup failed", e);
    return [] as Suggestion[];
  });
  return NextResponse.json({ suggestions });
}

type Suggestion = { display_name: string; postcode?: string };

async function mapboxLookup(q: string, token: string): Promise<Suggestion[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}` +
    `&country=AU` +
    `&proximity=${PAKENHAM_LON},${PAKENHAM_LAT}` +
    `&types=address,poi,place,locality,postcode` +
    `&limit=6` +
    `&autocomplete=true`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const feats: Array<{ place_name: string; context?: Array<{ id: string; text: string }> }> = data.features || [];
  return feats.map((f) => ({
    display_name: f.place_name,
    postcode: f.context?.find((c) => c.id.startsWith("postcode"))?.text,
  }));
}

async function nominatimLookup(q: string): Promise<Suggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(q)}` +
    `&format=json` +
    `&countrycodes=au` +
    `&addressdetails=1` +
    `&limit=6` +
    // bias the search box to SE Melbourne so home addresses rank first
    `&viewbox=144.6,-38.7,146.4,-37.4` +
    `&bounded=0`;

  const res = await fetch(url, {
    headers: {
      // Nominatim requires a User-Agent identifying the app.
      "User-Agent": "AdvancedGasWebsite/1.0 (jake@advancedgas.com.au)",
      "Accept-Language": "en-AU,en",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  const arr: Array<{ display_name: string; address?: { postcode?: string } }> = Array.isArray(data) ? data : [];
  return arr.map((r) => ({
    display_name: r.display_name,
    postcode: r.address?.postcode,
  }));
}
