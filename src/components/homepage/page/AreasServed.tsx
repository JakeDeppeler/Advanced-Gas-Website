import Link from "next/link";
import { publishedSuburbs } from "@/lib/suburbs";
import { Head } from "./kit";

/**
 * The suburbs nearest the workshop, linked, at the foot of a service page.
 *
 * Service pages linked to no suburb page except through the footer's eight, so
 * the 73 suburb pages were reached almost entirely from /service-areas, one
 * click deeper than anything we want ranked. A suburb page that's linked from
 * the page about the job is how "split system Berwick" finds either of them.
 *
 * Nearest sixteen in the core corridor, not all 73: WEB-019 cut the footer's
 * full list because 73 links of boilerplate on every page dilutes the lot and
 * reads as keyword stuffing. The outer ring is left out because those pages
 * say plainly that we travel there for booked work only. Everything else is
 * one click away through the full list.
 */
const NEAREST = publishedSuburbs
  .filter((s) => !s.outerRing)
  .sort((a, b) => a.distanceKm - b.distanceKm)
  .slice(0, 16);

export function AreasServed({ what, tone }: { what: string; tone?: "cream" }) {
  return (
    <section className={`pxs${tone ? ` pxs--${tone}` : ""}`} aria-labelledby="areas-served">
      <div className="wrap pp__col">
        <Head
          eye="Where we work"
          h={<span id="areas-served">{what} in Pakenham and the suburbs around it.</span>}
          lede="Our own crews, out of the Sierra Circuit workshop in Pakenham, cover everywhere within about 75 km. These are the suburbs nearest it; each page has the drive time and the jobs we usually do there."
        />
        <div className="kx__chips kx__chips--light">
          {NEAREST.map((s) => (
            <Link key={s.slug} href={`/areas/${s.slug}`}>{s.name}</Link>
          ))}
          <Link href="/service-areas" className="kx__chips-all">All {publishedSuburbs.length} suburbs →</Link>
        </div>
      </div>
    </section>
  );
}
