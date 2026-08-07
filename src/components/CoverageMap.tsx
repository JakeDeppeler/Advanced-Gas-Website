import Link from "next/link";
import dynamic from "next/dynamic";
import { publishedSuburbs } from "@/lib/suburbs";

/**
 * Coverage-map wrapper: a real OSM tile map on the left (client-only,
 * lazy-loaded via next/dynamic) alongside a scrollable suburb list on
 * the right. The map replaces the previous static-SVG rings so users
 * see actual streets, tile background and pins for every suburb.
 *
 * Server-rendered shell (this file) preserves the SEO-visible suburb
 * list — every suburb name/postcode is in the initial HTML — and only
 * the map itself is deferred client-side.
 */
const LeafletCoverageMap = dynamic(
  () => import("@/components/LeafletCoverageMap").then((m) => m.LeafletCoverageMap),
  { ssr: false, loading: () => <div className="covmap__leaflet covmap__leaflet--loading" aria-hidden="true" /> },
);

export function CoverageMap({ highlight }: { highlight?: string }) {
  return (
    <div className="covmap">
      <LeafletCoverageMap highlight={highlight} />

      {/* Suburb legend — full list of every published suburb, always
          visible next to the map so users can jump straight to any
          page without hunting for a pin. Same list Google reads for
          crawling — every /areas/[slug] link is in the initial HTML. */}
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
