import Link from "next/link";
import { publishedSuburbs } from "@/lib/suburbs";
import { PAKENHAM, RADIUS_KM, suburbCoords, distanceKm } from "@/lib/suburbCoords";

/**
 * Full-coverage service-area map — every published suburb plotted on the
 * same canvas, sized larger than <SuburbMap>. Pure static SVG (no JS,
 * no external tiles). Suburb dots are clickable links through to each
 * /areas/[slug] page.
 *
 * Used on /service-areas as the visual anchor and can drop into
 * anywhere else that wants a "here's every postcode we service".
 */
export function CoverageMap({ highlight }: { highlight?: string }) {
  const W = 720, H = 540;
  const CX = W / 2, CY = H / 2;
  const degPerKmLat = 1 / 111;
  const degPerKmLng = 1 / 88;
  // Larger scale so the 50 km radius fills most of the canvas.
  const scale = Math.min(W, H) * 0.42 / RADIUS_KM;
  const project = (c: readonly [number, number]): [number, number] => {
    const [lat, lng] = c;
    const [pLat, pLng] = PAKENHAM;
    const dxKm = (lng - pLng) / degPerKmLng;
    const dyKm = (pLat - lat) / degPerKmLat;
    return [CX + dxKm * scale, CY + dyKm * scale];
  };

  const [px, py] = project(PAKENHAM);
  const radiusPx = RADIUS_KM * scale;

  // Suburbs with coords, projected + distance-annotated.
  const plotted = publishedSuburbs
    .filter((s) => suburbCoords[s.slug] && s.slug !== "pakenham")
    .map((s) => {
      const [x, y] = project(suburbCoords[s.slug]);
      return { ...s, x, y, dist: distanceKm(PAKENHAM, suburbCoords[s.slug]) };
    });

  return (
    <div className="covmap">
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Service area map — every suburb we install in within 50 km of Pakenham`}>
        {/* Warm-grey background tint so the SVG reads as a "map surface" */}
        <rect width={W} height={H} fill="var(--paper, #FBF9F2)" />

        {/* Concentric distance rings */}
        {[10, 20, 30, 40].map((r) => (
          <g key={r}>
            <circle cx={CX} cy={CY} r={r * scale} fill="none" stroke="var(--line, #E5E9F2)" strokeWidth={0.8} strokeDasharray="3 5" />
            <text
              x={CX + r * scale + 4}
              y={CY - 3}
              fontSize="9.5"
              fontFamily="ui-monospace, monospace"
              fill="var(--ink-3, #7A8299)"
              letterSpacing="0.04em"
            >
              {r} km
            </text>
          </g>
        ))}

        {/* 50 km hard boundary */}
        <circle cx={CX} cy={CY} r={radiusPx} fill="rgba(243,103,34,0.06)" stroke="var(--orange, #F36722)" strokeWidth={2} strokeDasharray="6 5" />
        <text
          x={CX + radiusPx + 4}
          y={CY - 3}
          fontSize="10.5"
          fontFamily="ui-monospace, monospace"
          fill="var(--orange, #F36722)"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          50 km · same-week
        </text>

        {/* Compass rose corner */}
        <g transform={`translate(${W - 50}, 40)`}>
          <circle r="18" fill="#fff" stroke="var(--line, #E5E9F2)" strokeWidth="1" />
          <path d="M0,-13 L4,0 L0,-4 L-4,0 Z" fill="var(--navy, #050a30)" />
          <text x="0" y="-16" textAnchor="middle" fontSize="8" fontFamily="ui-monospace, monospace" fill="var(--navy, #050a30)" fontWeight="700">N</text>
        </g>

        {/* Pakenham base — labelled prominently */}
        <g>
          <circle cx={px} cy={py} r={9} fill="var(--orange, #F36722)" stroke="#fff" strokeWidth={2.5} />
          <circle cx={px} cy={py} r={16} fill="none" stroke="var(--orange, #F36722)" strokeWidth={1} opacity="0.4" />
          <text
            x={px + 14}
            y={py - 8}
            fontSize="12"
            fontFamily="ui-sans-serif, system-ui"
            fontWeight="800"
            fill="var(--navy, #050a30)"
          >
            Pakenham
          </text>
          <text
            x={px + 14}
            y={py + 6}
            fontSize="10"
            fontFamily="ui-monospace, monospace"
            fill="var(--ink-3, #7A8299)"
            letterSpacing="0.04em"
          >
            HQ · 3810
          </text>
        </g>

        {/* Suburb dots — clickable links to each suburb page */}
        {plotted.map((s) => {
          const isHi = s.slug === highlight;
          const r = isHi ? 8 : 5;
          const dotColor = isHi ? "var(--orange, #F36722)" : "var(--navy, #050a30)";
          return (
            <a key={s.slug} href={`/areas/${s.slug}`} className="covmap__dot">
              <title>{s.name} · {s.postcode} · {s.dist.toFixed(1)} km</title>
              <circle
                cx={s.x}
                cy={s.y}
                r={r + 6}
                fill="transparent"
                stroke="none"
              />
              <circle cx={s.x} cy={s.y} r={r} fill={dotColor} stroke="#fff" strokeWidth={1.8} />
              {isHi && (
                <text
                  x={s.x}
                  y={s.y - 14}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontFamily="ui-sans-serif, system-ui"
                  fontWeight="700"
                  fill="var(--navy, #050a30)"
                >
                  {s.name}
                </text>
              )}
            </a>
          );
        })}
      </svg>

      {/* Suburb legend — a compact list under the map so users can find any
          suburb without hunting for the dot. Structured so it works on mobile
          where dots may cluster too tightly to tap. */}
      <div className="covmap__legend">
        <div className="covmap__legend-lbl">All {publishedSuburbs.length} suburbs we install in</div>
        <ul>
          {publishedSuburbs.map((s) => (
            <li key={s.slug}>
              <Link href={`/areas/${s.slug}`} className={s.slug === highlight ? "is-hi" : ""}>
                {s.name}
                <span>{s.postcode}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
