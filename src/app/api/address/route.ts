import { NextResponse } from "next/server";

/**
 * Address suggestions for the quote form, as the customer types.
 *
 * Most people only ever typed a suburb, or half an address. This offers
 * whole street addresses to pick from instead.
 *
 * Google Places is used when GOOGLE_PLACES_API_KEY is set (the same key the
 * reviews use; it needs "Places API (New)" enabled). Its house numbers are
 * far more complete than OpenStreetMap's in the new estates around Pakenham
 * and Officer. Without the key, or if Google fails, it falls back to Photon,
 * a free OpenStreetMap geocoder built for type-ahead.
 *
 * Google's autocomplete gives the street and suburb but not the postcode, so
 * picking a suggestion makes one more call (`?id=`) for the full address.
 * Both calls carry the browser's session token: Google bills a typed-and-
 * picked address as one session rather than per keystroke.
 *
 * It only ever helps: if every lookup fails, the form still takes whatever
 * the customer typed. The key stays on the server.
 */

export const runtime = "nodejs";

type Hit = { label: string; suburb: string | null; postcode: string | null; id?: string };

// Victoria, roughly, so Pakenham comes before a Pakenham Street interstate.
const VIC = { west: 140.9, south: -39.2, east: 150.0, north: -33.9 };

const json = (results: Hit[], cache = true) =>
  NextResponse.json({ results }, cache ? { headers: { "Cache-Control": "public, max-age=3600" } } : undefined);

/** "Pakenham VIC 3810, Australia" → "Pakenham VIC 3810". */
const local = (s: string) => s.replace(/,\s*Australia$/, "");
const SESSION = /^[\w-]{8,64}$/;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const session = params.get("s") ?? "";
  const token = SESSION.test(session) ? session : undefined;

  const id = params.get("id");
  if (id) {
    if (!key || !/^[\w-]{10,300}$/.test(id)) return json([], false);
    const hit = await googleDetails(key, id, token);
    return json(hit ? [hit] : [], false);
  }

  const q = params.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 120) return json([]);
  if (key) {
    const hits = await googleSuggest(key, q, token);
    if (hits) return json(hits);
  }
  return json((await photon(q)) ?? []);
}

/* ------------------------------------------------------------- Google */

type GPrediction = {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
};

async function googleSuggest(key: string, q: string, token?: string): Promise<Hit[] | null> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input: q,
        ...(token ? { sessionToken: token } : {}),
        includedRegionCodes: ["au"],
        // Addresses only: without this a half-typed street brings up shops.
        includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
        locationRestriction: { rectangle: { low: { latitude: VIC.south, longitude: VIC.west }, high: { latitude: VIC.north, longitude: VIC.east } } },
        languageCode: "en-AU",
      }),
      signal: AbortSignal.timeout(4000),
    });
    // Never echo Google's error body: it can name the key's project.
    if (!res.ok) return null;
    const data = (await res.json()) as { suggestions?: { placePrediction?: GPrediction }[] };
    const hits: Hit[] = [];
    for (const s of data.suggestions ?? []) {
      const p = s.placePrediction;
      if (!p?.placeId) continue;
      const main = p.structuredFormat?.mainText?.text;
      const second = p.structuredFormat?.secondaryText?.text;
      const label = main && second ? `${main}, ${local(second)}` : local(p.text?.text ?? "");
      if (!label) continue;
      // "Pakenham VIC" → Pakenham. The postcode comes with the pick.
      const suburb = second ? local(second).replace(/\s+VIC\b.*$/, "").trim() || null : null;
      hits.push({ label, suburb, postcode: null, id: p.placeId });
      if (hits.length === 5) break;
    }
    return hits;
  } catch {
    return null;
  }
}

type GComponent = { longText?: string; shortText?: string; types?: string[] };

async function googleDetails(key: string, id: string, token?: string): Promise<Hit | null> {
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}${token ? `?sessionToken=${encodeURIComponent(token)}` : ""}`;
    const res = await fetch(url, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "formattedAddress,addressComponents" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const p = (await res.json()) as { formattedAddress?: string; addressComponents?: GComponent[] };
    const part = (t: string) => p.addressComponents?.find((c) => c.types?.includes(t));
    const label = p.formattedAddress ? local(p.formattedAddress) : null;
    if (!label) return null;
    return { label, suburb: part("locality")?.longText ?? null, postcode: part("postal_code")?.longText ?? null, id };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- Photon */

type PhotonFeature = {
  properties: {
    type?: string; housenumber?: string; street?: string; name?: string;
    district?: string; locality?: string; city?: string; postcode?: string; state?: string;
  };
};

async function photon(q: string): Promise<Hit[] | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=${VIC.west},${VIC.south},${VIC.east},${VIC.north}&layer=house&layer=street`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "advancedgas.com.au quote form" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    // OpenStreetMap is missing house numbers in a lot of newer estates, so a
    // street-only match keeps the number the customer already typed.
    const typedNo = /^(\d+[a-z]?(?:[-/]\d+[a-z]?)?)\s/i.exec(q)?.[1];
    const seen = new Set<string>();
    const results: Hit[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties;
      if (p.state && p.state !== "Victoria") continue;
      const street = p.street ?? (p.type === "street" ? p.name : undefined);
      if (!street) continue;
      // OSM's "district" is the suburb in Melbourne; "city" is just Melbourne.
      const suburb = p.district ?? p.locality ?? (p.city !== "Melbourne" ? p.city : undefined) ?? null;
      const label = [[p.housenumber ?? typedNo, street].filter(Boolean).join(" "), [suburb, "VIC", p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      if (seen.has(label)) continue;
      seen.add(label);
      results.push({ label, suburb, postcode: p.postcode ?? null });
      if (results.length === 5) break;
    }
    return results;
  } catch {
    return null;
  }
}
