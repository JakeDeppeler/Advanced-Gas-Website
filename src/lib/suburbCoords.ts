/**
 * Approximate lat/lng for every suburb in suburbs.ts. Used by <SuburbMap>
 * to render an inline SVG showing the suburb's location within our 50 km
 * service radius from Pakenham. Coordinates are rough township-centre —
 * accurate to ~500m, which is well within the visual resolution of the
 * small map. No external service or JS map library needed.
 *
 * Pakenham base: (-38.078, 145.487)
 */

export const PAKENHAM: readonly [number, number] = [-38.078, 145.487];
export const RADIUS_KM = 50;

export const suburbCoords: Record<string, readonly [number, number]> = {
  "pakenham":            [-38.078, 145.487],
  "pakenham-upper":      [-38.005, 145.464],
  "officer":             [-38.079, 145.407],
  "officer-south":       [-38.099, 145.404],
  "beaconsfield":        [-38.045, 145.371],
  "beaconsfield-upper":  [-37.997, 145.415],
  "berwick":             [-38.031, 145.348],
  "narre-warren":        [-38.026, 145.302],
  "narre-warren-north":  [-37.997, 145.302],
  "narre-warren-south":  [-38.052, 145.302],
  "endeavour-hills":     [-37.977, 145.257],
  "hallam":              [-38.008, 145.269],
  "hampton-park":        [-38.030, 145.259],
  "lynbrook":            [-38.055, 145.257],
  "lyndhurst":           [-38.062, 145.245],
  "doveton":             [-37.994, 145.244],
  "dandenong":           [-37.988, 145.213],
  "keysborough":         [-37.998, 145.176],
  "noble-park":          [-37.970, 145.174],
  "springvale":          [-37.949, 145.150],
  "cranbourne":          [-38.111, 145.283],
  "cranbourne-east":     [-38.115, 145.311],
  "cranbourne-north":    [-38.087, 145.278],
  "cranbourne-south":    [-38.145, 145.276],
  "cranbourne-west":     [-38.112, 145.253],
  "clyde":               [-38.130, 145.348],
  "clyde-north":         [-38.109, 145.336],
  "botanic-ridge":       [-38.146, 145.316],
  "devon-meadows":       [-38.163, 145.311],
  "pearcedale":          [-38.208, 145.269],
  "tooradin":            [-38.226, 145.379],
  "nar-nar-goon":        [-38.036, 145.541],
  "tynong":              [-38.045, 145.612],
  "bunyip":              [-38.093, 145.716],
  "garfield":            [-38.070, 145.679],
  "cardinia-town":       [-38.106, 145.416],
  "koo-wee-rup":         [-38.191, 145.484],
  "lang-lang":           [-38.286, 145.567],
  "bayles":              [-38.183, 145.581],
  "yannathan":           [-38.199, 145.639],
  "longwarry":           [-38.116, 145.771],
  "drouin":              [-38.135, 145.858],
  "warragul":            [-38.156, 145.933],
  "emerald":             [-37.939, 145.446],
  "cockatoo":            [-37.941, 145.500],
  "gembrook":            [-37.955, 145.564],
};

/** Great-circle distance in km between two lat/lng points (haversine). */
export function distanceKm(a: readonly [number, number], b: readonly [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Compass bearing from a to b (0=N, 90=E, 180=S, 270=W). */
export function bearingDeg(a: readonly [number, number], b: readonly [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export function compass(bearing: number): (typeof COMPASS)[number] {
  return COMPASS[Math.round(bearing / 45) % 8];
}
