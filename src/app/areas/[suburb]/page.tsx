import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { suburbs, services, site } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import "../../detail.css";

export function generateStaticParams() {
  return suburbs.map((s) => ({ suburb: s.slug }));
}

export function generateMetadata({ params }: { params: { suburb: string } }): Metadata {
  const sub = suburbs.find((s) => s.slug === params.suburb);
  if (!sub) return {};
  const title = `Aircon & Heat Pump Installation ${sub.name} | Advanced Gas & Aircon`;
  const description = `Licensed aircon, heat pump and gas plumbing services in ${sub.name} ${sub.postcode}. Same-week installs, fixed-price quotes, VEU rebates handled.`;
  return {
    title,
    description,
    alternates: { canonical: `/areas/${sub.slug}` },
  };
}

export default function SuburbPage({ params }: { params: { suburb: string } }) {
  const sub = suburbs.find((s) => s.slug === params.suburb);
  if (!sub) notFound();

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/areas/${sub.slug}` },
  ]);

  return (
    <div className="page-detail">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/service-areas">Service Areas</Link>
            <span className="sep">/</span>
            <span className="cur">{sub.name}</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" />
            {sub.name} · VIC {sub.postcode}
          </div>
          <h1>
            Aircon &amp; heat pump installation in <span className="accent">{sub.name}</span>.
          </h1>
          <p className="dp-hero__sub">
            Licensed plumbing and refrigeration team serving {sub.name} ({sub.postcode}) and surrounding areas.
            Same-week installs, fixed pricing, and VEU rebates that drop heat pump hot water installs to around $1,780 after rebate.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get my {sub.name} quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="dp-benefits">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Services in {sub.name}</span>
            <h2>What we install nearby.</h2>
          </div>
          <div className="dp-benefits__grid">
            {services.slice(0, 2).map((s) => (
              <Link key={s.slug} href={`/areas/${sub.slug}/${s.slug}`} className="dp-benefit" style={{ textDecoration: "none", display: "block" }}>
                <span className="dp-benefit__icon">→</span>
                <h3>{s.short} in {sub.name}</h3>
                <p>{s.blurb}</p>
              </Link>
            ))}
            {services.slice(2).map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="dp-benefit" style={{ textDecoration: "none", display: "block" }}>
                <span className="dp-benefit__icon">↗</span>
                <h3>{s.short}</h3>
                <p>{s.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Local team</span>
            <h2>Why {sub.name} homeowners choose us.</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                `Local technicians who know ${sub.name}'s housing stock`,
                "Council and body-corporate paperwork sorted",
                "Same-week install slots almost always available",
                "VEU rebate eligibility checked before you commit",
                "6-year workmanship warranty on every installation",
              ].map((l) => (
                <li key={l} style={{ paddingLeft: 24, position: "relative", fontSize: "15px", color: "var(--ink-2)" }}>
                  <span style={{ position: "absolute", left: 0, color: "var(--orange)", fontWeight: 800 }}>✓</span>
                  {l}
                </li>
              ))}
            </ul>
            <h3 style={{ marginTop: 28, marginBottom: 10, fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Also serving nearby
            </h3>
            <div className="dp-quote__chips">
              {suburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}`}>{s.name}</Link>
              ))}
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Free quote for {sub.name}.</h2>
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

      <Script id={`ld-crumbs-${sub.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
