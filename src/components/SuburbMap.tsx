import { PAKENHAM, RADIUS_KM, suburbCoords, distanceKm, bearingDeg, compass } from "@/lib/suburbCoords";

/**
 * Inline SVG map showing a suburb's location within our 50 km service
 * radius from Pakenham. No external map tiles, no JS library — the whole
 * thing renders server-side as static SVG. Extremely fast, works for
 * every suburb.
 */
export function SuburbMap({ slug, name }: { slug: string; name: string }) {
  const coords = suburbCoords[slug];
  if (!coords) return null;

  const dist = distanceKm(PAKENHAM, coords);
  const bearing = bearingDeg(PAKENHAM, coords);
  const dir = compass(bearing);

  // Project lat/lng onto a 300×300 SVG canvas centered on Pakenham.
  // Simple equirectangular projection is fine at this scale (50km ≈ 0.5°
  // latitude; the horizontal squishing at Melbourne latitude is negligible
  // for a visual reference map).
  const W = 300, H = 300;
  const CX = W / 2, CY = H / 2;
  // 1 degree lat ≈ 111km, 1 degree lng at -38° ≈ 88km.
  const degPerKmLat = 1 / 111;
  const degPerKmLng = 1 / 88;
  // The radius circle should render at ~120px so we have breathing room.
  const scale = 120 / RADIUS_KM;
  const project = (c: readonly [number, number]): [number, number] => {
    const [lat, lng] = c;
    const [pLat, pLng] = PAKENHAM;
    const dxKm = (lng - pLng) / degPerKmLng;
    const dyKm = (pLat - lat) / degPerKmLat;
    return [CX + dxKm * scale, CY + dyKm * scale];
  };

  const [px, py] = project(PAKENHAM);
  const [sx, sy] = project(coords);
  const radiusPx = RADIUS_KM * scale;

  const isBase = slug === "pakenham";

  return (
    <figure className="submap">
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Map showing ${name} within the 50 km service radius from Pakenham`}>
        {/* Concentric distance rings (10, 20, 30, 40, 50 km) */}
        {[10, 20, 30, 40].map((r) => (
          <circle key={r} cx={CX} cy={CY} r={r * scale} fill="none" stroke="var(--line, #E5E9F2)" strokeWidth={0.6} strokeDasharray="2 3" />
        ))}
        {/* 50 km hard boundary */}
        <circle cx={CX} cy={CY} r={radiusPx} fill="rgba(243,103,34,0.06)" stroke="var(--orange, #F36722)" strokeWidth={1.5} strokeDasharray="4 4" />

        {/* Compass rose ticks */}
        {[
          { x: CX, y: CY - radiusPx - 6, label: "N" },
          { x: CX + radiusPx + 8, y: CY + 3, label: "E" },
          { x: CX, y: CY + radiusPx + 12, label: "S" },
          { x: CX - radiusPx - 8, y: CY + 3, label: "W" },
        ].map((t) => (
          <text key={t.label} x={t.x} y={t.y} textAnchor="middle" fontSize="9" fill="var(--ink-3, #7A8299)" fontFamily="ui-monospace, monospace" letterSpacing="0.06em">
            {t.label}
          </text>
        ))}

        {/* Connecting line from Pakenham to the suburb */}
        {!isBase && (
          <line x1={px} y1={py} x2={sx} y2={sy} stroke="var(--navy, #050a30)" strokeWidth={1.2} strokeDasharray="3 3" opacity="0.5" />
        )}

        {/* Pakenham (base) */}
        <circle cx={px} cy={py} r={6} fill="var(--orange, #F36722)" stroke="#fff" strokeWidth={2} />
        <text x={px + 10} y={py + 4} fontSize="10.5" fontFamily="ui-sans-serif, system-ui" fontWeight="600" fill="var(--ink, #0A1230)">
          Pakenham
        </text>

        {/* The suburb (unless it's Pakenham itself) */}
        {!isBase && (
          <>
            <circle cx={sx} cy={sy} r={8} fill="var(--navy, #050a30)" stroke="#fff" strokeWidth={2} />
            <text x={sx} y={sy - 14} textAnchor="middle" fontSize="11.5" fontFamily="ui-sans-serif, system-ui" fontWeight="700" fill="var(--navy, #050a30)">
              {name}
            </text>
          </>
        )}
      </svg>
      <figcaption>
        <strong>{dist.toFixed(1)}&nbsp;km</strong> {dir === "N" || dir === "S" || dir === "E" || dir === "W" ? dir.toLowerCase() : `to the ${dir.toLowerCase()}`} of our Pakenham base
        {isBase && " — this is home."}
      </figcaption>
    </figure>
  );
}
