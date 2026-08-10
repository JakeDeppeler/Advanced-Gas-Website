import type { Metadata } from "next";
import Link from "next/link";
import { site, publishedSuburbs, services } from "@/lib/site";
import { CoverageMap } from "@/components/CoverageMap";
import "../detail.css";

export const metadata: Metadata = {
  title: "Service Areas, Pakenham + 75 km",
  description:
    "Aircon, heat pump and gas plumbing installation across Pakenham and within 75 km. Berwick, Officer, Cranbourne, Narre Warren, Endeavour Hills, Dandenong, Drouin, Warragul and everywhere in between.",
  alternates: { canonical: "/service-areas" },
};

export default function ServiceAreasPage() {
  return (
    <div className="page-detail">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Service Areas</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> Service areas
          </div>
          <h1>
            Pakenham &amp; <span className="accent">within 75 km</span>.
          </h1>
          <p className="dp-hero__sub">
            Licensed aircon, heat pump and gas plumbing installation across the south-east Melbourne corridor and Gippsland.
            Choose your suburb below or call{" "}
            <a href={`tel:${site.phoneE164}`} style={{ color: "var(--sky-2)", fontWeight: 700 }}>{site.phone}</a> for a fast quote.
          </p>
        </div>
      </section>

      {/* Coverage map, every suburb we install in, plotted on one canvas */}
      <section className="dp-map" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <div className="ds-section-head" style={{ marginBottom: 24 }}>
            <span className="ds-eyebrow"><span className="ds-dot" /> Coverage map</span>
            <h2>Every postcode we install in, on one map.</h2>
            <p>
              Orange centre is our Pakenham workshop. Navy dots are every suburb we
              service. Click any dot, or its name in the list, to jump to that suburb&rsquo;s
              page. Dashed rings mark 25, 50 and 75 km so you can gauge distance at a glance.</p>
          </div>
          <CoverageMap />
        </div>
      </section>

      <section className="dp-benefits">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Suburbs we service</span>
            <h2>Local team, local response times.</h2>
          </div>
          <div className="dp-benefits__grid">
            {publishedSuburbs.map((s) => (
              <Link key={s.slug} href={`/areas/${s.slug}`} className="dp-benefit" style={{ textDecoration: "none", display: "block" }}>
                <h3 style={{ fontSize: 20 }}>{s.name}</h3>
                <p style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  VIC {s.postcode}
                </p>
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {services.slice(0, 2).map((svc) => (
                    <span key={svc.slug} style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: 10.5,
                      background: "rgba(0,176,237,0.1)",
                      color: "var(--navy)",
                      padding: "3px 8px",
                      borderRadius: 5,
                      letterSpacing: "0.04em",
                    }}>
                      {svc.short}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Free quote, rebate applied.</h2>
            <p>Free, no-obligation, replied within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
