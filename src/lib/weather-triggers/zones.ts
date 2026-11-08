/**
 * The service area cut into forecast zones: one Open-Meteo point per zone.
 *
 * Why not one point per suburb: eighty-odd points for weather that is the
 * same across a few kilometres of flat ground buys nothing, and the request
 * gets slow. Why not one point for the whole area: the area spans ~0 m on the
 * Koo Wee Rup swamp to ~600 m on the top of the Dandenongs, and that height is
 * the whole story on a cold morning — Olinda routinely sits 4–5 °C under
 * Pakenham. So the cut follows the terrain and the bay first, and the map
 * second. Twelve zones, one request.
 *
 * Membership is explicit rather than nearest-centroid so a reader can see why
 * Belgrave is a "hills" suburb and not a Knox one. scripts/check-weather.ts
 * fails if a published suburb is in no zone or two, so adding a suburb to
 * suburbs.ts without placing it here is caught rather than silently untargeted.
 *
 * Source of truth for names and postcodes is suburbs.ts; coordinates are
 * suburbCoords.ts. Suburbs that are in suburbCoords only (the wall board's
 * Chelsea, Tootgarook…) have no postcode or page, so they are not targeted.
 */

import { suburbs } from "../suburbs";
import { suburbCoords, distanceKm } from "../suburbCoords";
import type { Zone, ZoneSuburb } from "./types";

type ZoneDef = { id: string; name: string; why: string; slugs: string[] };

export const ZONE_DEFS: ZoneDef[] = [
  {
    id: "pakenham", name: "Pakenham & Officer",
    why: "Home base on the flat at the foot of the hills.",
    slugs: ["pakenham", "pakenham-upper", "officer", "officer-south", "cardinia-town", "nar-nar-goon", "beaconsfield", "beaconsfield-upper"],
  },
  {
    id: "berwick", name: "Berwick & Narre Warren",
    why: "The growth corridor west of Pakenham, all low and suburban.",
    slugs: ["berwick", "narre-warren", "narre-warren-north", "narre-warren-south", "endeavour-hills", "hallam", "hampton-park"],
  },
  {
    id: "cranbourne", name: "Cranbourne & Clyde",
    why: "The southern estates down to Pearcedale. Flat, new housing, hot on a northerly.",
    slugs: ["pearcedale", "cranbourne", "cranbourne-east", "cranbourne-north", "cranbourne-south", "cranbourne-west", "clyde", "clyde-north", "botanic-ridge", "devon-meadows", "lynbrook", "lyndhurst"],
  },
  {
    id: "dandenong", name: "Dandenong & Springvale",
    why: "The inner south-east, closest to the bay and the city's heat island.",
    slugs: ["dandenong", "doveton", "keysborough", "noble-park", "springvale"],
  },
  {
    id: "westernport", name: "Western Port & Koo Wee Rup",
    why: "Bay-side and swamp country: milder heat, but the first to see a storm off the water.",
    slugs: ["tooradin", "koo-wee-rup", "lang-lang", "bayles", "yannathan"],
  },
  {
    id: "bunyip", name: "Garfield & Bunyip",
    why: "The Princes Freeway towns east of Pakenham, before Gippsland proper.",
    slugs: ["tynong", "garfield", "bunyip", "longwarry"],
  },
  {
    id: "gippsland", name: "Drouin & Warragul",
    why: "West Gippsland: a different airmass on a cold night, frosts more often than Pakenham.",
    slugs: ["drouin", "warragul"],
  },
  {
    id: "belgrave", name: "Belgrave & Upwey",
    why: "The south-western hills, 200–350 m up: colder than the flat, not as cold as the ridge.",
    slugs: ["belgrave", "tecoma", "upwey", "selby", "menzies-creek"],
  },
  {
    id: "emerald", name: "Emerald & Gembrook",
    why: "Puffing Billy country to the east, 250–350 m up, and wetter than the flat.",
    slugs: ["emerald", "cockatoo", "gembrook"],
  },
  {
    id: "ranges", name: "Dandenong Ranges",
    why: "The ridge, 400–600 m up. Coldest part of the area by a distance: first to flag a cold snap.",
    slugs: ["olinda", "sassafras", "mount-dandenong", "kallista", "sherbrooke", "monbulk", "silvan", "the-patch"],
  },
  {
    id: "knox", name: "Ferntree Gully & Rowville",
    why: "Knox, at the western foot of the Dandenongs.",
    slugs: ["ferntree-gully", "upper-ferntree-gully", "boronia", "lysterfield", "rowville"],
  },
  {
    id: "east", name: "Ringwood & Glen Waverley",
    why: "The outer-ring eastern suburbs: booked work, further from the workshop.",
    slugs: ["ringwood", "ringwood-east", "ringwood-north", "croydon", "wantirna-south", "vermont-south", "glen-waverley", "wheelers-hill", "mount-waverley"],
  },
];

/**
 * Margin added to the furthest member: a suburb's coordinate is its township
 * centre, and the suburb runs a couple of km past it.
 */
const RADIUS_MARGIN_KM = 3;

/** Per-suburb proximity radius for the CSV: roughly a suburb's half-width. */
export const SUBURB_RADIUS_KM = 3;

export function buildZones(): Zone[] {
  const bySlug = new Map(suburbs.filter((s) => s.published).map((s) => [s.slug, s]));
  return ZONE_DEFS.map((d) => {
    const members: ZoneSuburb[] = [];
    for (const slug of d.slugs) {
      const s = bySlug.get(slug);
      const c = suburbCoords[slug];
      if (!s || !c) continue; // check-weather.ts reports these; the zone still works without them.
      members.push({ slug, name: s.name, postcode: s.postcode, lat: c[0], lng: c[1] });
    }
    const lat = members.reduce((a, m) => a + m.lat, 0) / Math.max(1, members.length);
    const lng = members.reduce((a, m) => a + m.lng, 0) / Math.max(1, members.length);
    const far = members.reduce((a, m) => Math.max(a, distanceKm([lat, lng], [m.lat, m.lng])), 0);
    return {
      id: d.id, name: d.name, why: d.why,
      // Three decimals is ~100 m: plenty for a forecast point, and stable, which
      // the Ads Script relies on to find the proximity target it made last hour.
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      radiusKm: Math.ceil(far + RADIUS_MARGIN_KM),
      suburbs: members,
    };
  });
}

export const ZONES: Zone[] = buildZones();
