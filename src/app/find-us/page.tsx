import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";
import "../detail.css";
import "./find-us.css";

// Leaflet touches `window` on import, so it can only load in the browser.
const LeafletFindUsMap = dynamic(
  () => import("@/components/LeafletFindUsMap").then((m) => m.LeafletFindUsMap),
  { ssr: false, loading: () => <div className="findus__map findus__map--loading" /> },
);

const ADDRESS = `${site.address.street}, ${site.address.suburb} ${site.address.state} ${site.address.postcode}`;
const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;

export const metadata: Metadata = {
  title: `Find Us · ${site.address.street}, Pakenham VIC | Advanced Gas & Aircon`,
  description: `Our workshop is at ${ADDRESS}. Opening hours, directions, and the 75 km service radius we install across Melbourne's south-east.`,
  alternates: { canonical: "/find-us" },
};

export default function FindUsPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "About us", url: `${site.url}/about` },
    { name: "Find us", url: `${site.url}/find-us` },
  ]);

  /**
   * LocalBusiness with a real postal address and geo. This is what puts
   * the business in the map pack, and it needs to match the Google
   * Business profile exactly — same street, same suburb, same phone.
   */
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
    name: site.name,
    url: `${site.url}/find-us`,
    telephone: site.phone,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.suburb,
      addressRegion: site.address.state,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    openingHoursSpecification: site.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: h.open,
      closes: h.close,
    })),
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: site.geo.lat,
        longitude: site.geo.lng,
      },
      geoRadius: 75000,
    },
  };

  return (
    <div className="page-detail page-findus">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/about">About us</Link>
            <span className="sep">/</span>
            <span className="cur">Find us</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {site.address.suburb} {site.address.state} {site.address.postcode}
          </div>
          <h1>
            Find <span className="accent">us</span>.
          </h1>
          <p className="dp-hero__sub">
            We work out of a workshop in Pakenham and install across every
            postcode within 75 km. Most of what we do happens at your place, not
            ours, so ring before you drive over.
          </p>
          <div className="dp-hero__ctas">
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn--orange ds-btn--lg">
              Get directions →
            </a>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Call {site.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="findus">
        <div className="wrap findus__grid">
          <div className="findus__mapcol">
            <LeafletFindUsMap />
            <p className="findus__maplbl">
              Orange pin is the workshop. Scroll-zoom is off so the map
              doesn&rsquo;t grab the page as you go past; use the + and − buttons.
            </p>
          </div>

          <div className="findus__details">
            <div className="findus__block">
              <div className="findus__lbl">Workshop</div>
              <address className="findus__address">
                {site.address.street}<br />
                {site.address.suburb} {site.address.state} {site.address.postcode}
              </address>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="findus__link">
                Open in Google Maps ↗
              </a>
            </div>

            <div className="findus__block">
              <div className="findus__lbl">Hours</div>
              {site.hours.map((h) => (
                <p key={h.day} className="findus__row">
                  <span>{h.day}</span>
                  <strong>{h.open} – {h.close}</strong>
                </p>
              ))}
              <p className="findus__note">
                Phones are answered outside these hours for genuine emergencies:
                a gas leak, no hot water with kids in the house, a heater that
                smells wrong.
              </p>
            </div>

            <div className="findus__block">
              <div className="findus__lbl">Get in touch</div>
              <p className="findus__row">
                <span>Phone</span>
                <a href={`tel:${site.phoneE164}`}><strong>{site.phone}</strong></a>
              </p>
              <p className="findus__row">
                <span>Email</span>
                <a href={`mailto:${site.email}`}><strong>{site.email}</strong></a>
              </p>
            </div>

            <div className="findus__block">
              <div className="findus__lbl">Licences &amp; registration</div>
              <p className="findus__row"><span>ABN</span><strong>{site.abn}</strong></p>
              <p className="findus__row"><span>Plumbing</span><strong>{site.licences.plumbing}</strong></p>
              <p className="findus__row"><span>Refrigeration</span><strong>{site.licences.refrigeration}</strong></p>
              <p className="findus__note">
                Worth checking on any quote you get, ours included. Refrigerant
                work without an ARC licence is illegal, and gas work without a
                plumbing licence voids your insurance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="findus__cta">
        <div className="wrap findus__cta-grid">
          <div className="findus__cta-card">
            <h2>Coming to us?</h2>
            <p>
              Ring first. We&rsquo;re a working crew, so there&rsquo;s a good
              chance everyone is out on a job even inside business hours, and a
              two-minute call saves you the drive.
            </p>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--orange ds-btn--sm">
              Call {site.phone}
            </a>
          </div>
          <div className="findus__cta-card">
            <h2>Want us to come to you?</h2>
            <p>
              That&rsquo;s most jobs. We install across 64 suburbs inside a 75 km
              radius, from Pakenham out to Warragul, down to Cranbourne and up
              into the hills.
            </p>
            <Link href="/service-areas" className="ds-btn ds-btn--ghost ds-btn--sm">
              See the coverage map →
            </Link>
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Free quote, wherever you are in the 75 km.</h2>
            <p>60 seconds to ask. Replied within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id="ld-crumbs-findus" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id="ld-place-findus" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }} />
    </div>
  );
}
