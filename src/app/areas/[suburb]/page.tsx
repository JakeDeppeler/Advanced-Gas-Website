import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { publishedSuburbs, suburbs } from "@/lib/suburbs";
import { services } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";
import { seoMeta } from "@/lib/seo";
import { Crumbs, Hero, Head, Next, Cta } from "@/components/homepage/page/kit";
// detail.css only for the Leaflet map's frame (.submap__leaflet).
import "../../detail.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

// Client-only Leaflet map, lazy loaded so the tiles and CSS stay out of the
// first paint. The placeholder holds the layout while the chunk fetches.
const LeafletSuburbMap = dynamic(
  () => import("@/components/LeafletSuburbMap").then((m) => m.LeafletSuburbMap),
  { ssr: false, loading: () => <div className="submap__leaflet submap__leaflet--loading" aria-hidden="true" /> }
);

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function generateStaticParams() {
  return publishedSuburbs.map((s) => ({ suburb: s.slug }));
}

export function generateMetadata({ params }: { params: { suburb: string } }): Metadata {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  // WEB-003. This used to `return {}` here, which does not mean "no
  // metadata" — it means "inherit the root layout's", i.e. serve the
  // homepage title on a suburb page. A suburb search landing on a
  // result headed "Pakenham" gets scrolled past. Fail loudly instead,
  // so the page 404s rather than impersonating the homepage.
  if (!sub) notFound();
  return seoMeta({
    title: `Air Conditioning & Heating ${sub.name} ${sub.postcode}`,
    description: `Air conditioning, heating and hot water in ${sub.name} ${sub.postcode}. ${sub.commonInstall.charAt(0).toUpperCase()}${sub.commonInstall.slice(1)}. VEU rebates handled, written quotes, 6-year workmanship warranty.`,
    canonical: `/areas/${sub.slug}`,
    // Absolute so the suffix gives way, not the postcode. A long suburb
    // name (Beaconsfield Upper) pushed the title past 60 and the clamp
    // dropped "3808" — which is exactly the signal an "aircon officer
    // 3809" search wants in the title.
    absolute: true,
  });
}

/**
 * A suburb page, in the redesign. Every line about the suburb comes from its
 * record in lib/suburbs.ts as before; the layout around it changed.
 */
export default function SuburbPage({ params }: { params: { suburb: string } }) {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  if (!sub) notFound();

  // Nearby suburbs: linked where they have a page, plain text where not.
  const nearby = sub.nearby
    .map((slug) => suburbs.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const drive = sub.driveMin
    ? sub.driveMin[0] === sub.driveMin[1] ? `${sub.driveMin[0]} min` : `${sub.driveMin[0]}–${sub.driveMin[1]} min`
    : sub.distanceKm === 0 ? "On site" : `${Math.max(10, Math.round(sub.distanceKm * 0.7))}–${Math.max(15, Math.round(sub.distanceKm * 1.1))} min`;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/areas/${sub.slug}` },
  ]);

  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Service areas", href: "/service-areas" }, { name: sub.name }]} />
      <Hero
        eye={`${sub.name} · VIC ${sub.postcode} · ${sub.council}`}
        title={<>Air conditioning, heating &amp; hot water in <em>{sub.name}</em>.</>}
        sub={
          /* The outer ring gets the honest version: we travel there for booked
             work, and say so rather than claim to be around the corner. See
             `outerRing` in lib/suburbs.ts. */
          sub.outerRing
            ? `We travel to ${sub.name} from Pakenham for booked work, about ${drive} each way. That makes us the right call for a planned install and the wrong one for a 2 am emergency, and we'd rather say so up front.`
            : `Licensed plumbing and refrigeration team working in ${sub.name} since 2014. You'll usually find us ${sub.landmark}.`
        }
        img="/team-photo.webp" imgAlt={`The Advanced Gas & Aircon crew, who work in ${sub.name}`}
        facts={[
          { v: `${sub.distanceKm} km`, k: "from our Pakenham workshop" },
          { v: drive, k: "typical drive" },
          { v: "6 yrs", k: "workmanship warranty" },
          { v: "12 hrs", k: "to a written quote" },
        ]}
      />

      <section className="pxs">
        <div className="wrap kx2">
          <div className="kx__prose">
            <Head eye={`About ${sub.name}`} h={sub.outerRing ? "What we get called out for here." : "What we mostly install here."} />
            <p><strong>Housing:</strong> {cap(sub.housingStock)}.</p>
            <p><strong>{sub.outerRing ? "Usual jobs" : "Most common install"}:</strong> {cap(sub.commonInstall)}.</p>
            <p><strong>Council:</strong> {sub.council}. Compliance certificates and permits handled in-house.</p>
            {sub.whyLocal && <p>{sub.whyLocal}</p>}
            {sub.knownEstates && <p><strong>Estates we know well:</strong> {sub.knownEstates}</p>}
          </div>
          <LeafletSuburbMap slug={sub.slug} name={sub.name} />
        </div>
      </section>

      {sub.commonProblems && sub.commonProblems.length > 0 && (
        <section className="pxs pxs--cream">
          <div className="wrap pp__col">
            <Head eye={`Common in ${sub.name}`} h="What we see on the tools here." />
            <ul className="kxk">{sub.commonProblems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </section>
      )}

      {sub.testimonial && (
        <section className="pxs">
          <div className="wrap">
            <figure className="kxq">
              <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
              <blockquote>&ldquo;{sub.testimonial.quote}&rdquo;</blockquote>
              <figcaption><strong>{sub.testimonial.who}</strong> · {sub.testimonial.what}</figcaption>
            </figure>
          </div>
        </section>
      )}

      <section className="pxs pxs--navy">
        <div className="wrap pp__col">
          <Head dark eye={`Services in ${sub.name}`} h="What we do nearby." />
          <div className="kxc">
            {services.map((s) => <Link key={s.slug} href={`/services/${s.slug}`} className="kxc__i"><strong>{s.short}</strong><small>See the service →</small></Link>)}
            <Link href="/#find" className="kxc__i"><strong>Find your system</strong><small>Options and prices →</small></Link>
          </div>
          {nearby.length > 0 && (
            <>
              <h3 className="kx__sub">Also serving nearby</h3>
              <div className="kx__chips">
                {nearby.map((s) => s.published ? <Link key={s.slug} href={`/areas/${s.slug}`}>{s.name}</Link> : <span key={s.slug}>{s.name}</span>)}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="pxs pxs--sky">
        <div className="wrap pp__col">
          <Head eye="Where next" h="See the work." />
          <Next items={[
            { t: "What customers say", s: "Reviews from real jobs", href: "/reviews" },
            { t: "Every suburb we cover", s: "Pakenham and 75 km around", href: "/service-areas" },
            { t: "Who we are", s: "The team and how we work", href: "/about" },
          ]} />
        </div>
      </section>

      <Cta title={`Free quote for ${sub.name}.`} text="Free and no obligation, with a written quote back within 12 business hours." />
      <Script id={`ld-crumbs-${sub.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
