import { NextResponse } from "next/server";

/**
 * Address suggestions for the quote form, as the customer types.
 *
 * Most people only ever typed a suburb, or half an address. This offers
 * whole street addresses to pick from instead. It asks Photon, a free
 * OpenStreetMap geocoder that is built for type-ahead (Nominatim's terms
 * forbid that use), limited to Victoria, and is called from here rather than
 * the browser so the provider can be swapped (Google Places, Geoscape) by
 * changing this one file, with any key kept on the server.
 *
 * It only ever helps: if the lookup fails or finds nothing, the form still
 * takes whatever the customer typed.
 */

export const runtime = "nodejs";

type Hit = { label: string; suburb: string | null; postcode: string | null };

type PhotonFeature = {
  properties: {
    type?: string; housenumber?: string; street?: string; name?: string;
    district?: string; locality?: string; city?: string; postcode?: string; state?: string;
  };
};

// Victoria, roughly, so Pakenham comes before a Pakenham Street interstate.
const VIC_BBOX = "140.9,-39.2,150.0,-33.9";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 120) return NextResponse.json({ results: [] });

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=${VIC_BBOX}&layer=house&layer=street`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "advancedgas.com.au quote form" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return NextResponse.json({ results: [] });
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
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
