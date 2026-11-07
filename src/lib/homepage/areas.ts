import { suburbs } from "@/lib/suburbs";
import { suburbCoords } from "@/lib/suburbCoords";
import type { AreaSuburb } from "@/components/homepage/ServiceArea";

/**
 * The towns drawn on the homepage map, with the prototype's own choice of
 * which ones carry a permanent label (1) or a label on the left so it stays
 * on the map (2). Coordinates come from suburbCoords where it has the town;
 * the handful it doesn't are the prototype's.
 */
const DOTS: [string, number, number, 0 | 1 | 2][] = [
  ["Officer", -38.079, 145.407, 0], ["Beaconsfield", -38.045, 145.371, 0], ["Berwick", -38.031, 145.348, 1], ["Narre Warren", -38.026, 145.302, 0],
  ["Endeavour Hills", -37.977, 145.257, 0], ["Hallam", -38.008, 145.269, 0], ["Hampton Park", -38.03, 145.259, 0], ["Lynbrook", -38.055, 145.257, 0],
  ["Dandenong", -37.988, 145.213, 1], ["Keysborough", -37.998, 145.176, 0], ["Noble Park", -37.97, 145.174, 0], ["Springvale", -37.949, 145.15, 0],
  ["Chelsea", -38.052, 145.117, 0], ["Cranbourne", -38.111, 145.283, 1], ["Cranbourne East", -38.115, 145.311, 0], ["Clyde", -38.13, 145.348, 0],
  ["Clyde North", -38.109, 145.336, 0], ["Botanic Ridge", -38.146, 145.316, 0], ["Pearcedale", -38.208, 145.269, 0], ["Tooradin", -38.226, 145.379, 0],
  ["Nar Nar Goon", -38.036, 145.541, 0], ["Tynong", -38.045, 145.612, 0], ["Garfield", -38.07, 145.679, 0], ["Bunyip", -38.093, 145.716, 0],
  ["Koo Wee Rup", -38.191, 145.484, 1], ["Lang Lang", -38.286, 145.567, 0], ["Longwarry", -38.116, 145.771, 0], ["Drouin", -38.135, 145.858, 1],
  ["Warragul", -38.156, 145.933, 2], ["Emerald", -37.939, 145.446, 1], ["Cockatoo", -37.941, 145.5, 0], ["Gembrook", -37.955, 145.564, 0],
  ["Belgrave", -37.911, 145.353, 0], ["Monbulk", -37.878, 145.421, 0], ["Olinda", -37.849, 145.365, 0], ["Pakenham Upper", -38.005, 145.464, 0],
  ["Upper Beaconsfield", -37.997, 145.415, 0], ["Pakenham", -38.078, 145.487, 0],
];

const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function areaSuburbs(): AreaSuburb[] {
  const byName = new Map(suburbs.map((s) => [s.name.toLowerCase(), s]));
  const out = new Map<string, AreaSuburb>();

  for (const [name, lat, lng, label] of DOTS) {
    // The site calls it Beaconsfield Upper; people type Upper Beaconsfield.
    const s = byName.get(name.toLowerCase()) ?? (name === "Upper Beaconsfield" ? byName.get("beaconsfield upper") : undefined);
    const slug = s?.slug ?? slugify(name);
    const c = suburbCoords[slug];
    out.set(name.toLowerCase(), { name, slug, lat: c?.[0] ?? lat, lng: c?.[1] ?? lng, page: !!s?.published, dot: label });
  }
  // Everything else we have a page or coordinates for is searchable, just not drawn.
  for (const s of suburbs) {
    const c = suburbCoords[s.slug];
    if (!c || out.has(s.name.toLowerCase())) continue;
    out.set(s.name.toLowerCase(), { name: s.name, slug: s.slug, lat: c[0], lng: c[1], page: s.published, dot: null });
  }
  // Nearest first, so a three-letter prefix finds the town people mean.
  const d = (x: AreaSuburb) => Math.hypot(x.lat + 38.078, (x.lng - 145.487) * 0.79);
  return [...out.values()].sort((a, b) => d(a) - d(b));
}
