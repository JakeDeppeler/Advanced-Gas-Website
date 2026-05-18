import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { services, suburbs, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import "../../detail.css";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const content = serviceContent[params.slug];
  if (!content) return {};
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: `/services/${params.slug}` },
  };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const content = serviceContent[params.slug];
  const svc = services.find((s) => s.slug === params.slug);
  if (!content || !svc) notFound();

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: svc.name, url: `${site.url}/services/${svc.slug}` },
  ]);

  return (
    <div className="page-detail">
      {/* HERO */}
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/services">Services</Link>
            <span className="sep">/</span>
            <span className="cur">{svc.short}</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" />
            {svc.short} · Pakenham &amp; within 75 km
          </div>
          <h1>{content.h1}</h1>
          <p className="dp-hero__sub">{content.intro}</p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="dp-benefits">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> What&apos;s included</span>
            <h2>Every {svc.short.toLowerCase()} we do, done properly.</h2>
          </div>
          <div className="dp-benefits__grid">
            {content.benefits.map((b) => (
              <div key={b.t} className="dp-benefit">
                <span className="dp-benefit__icon">✓</span>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="dp-pricing">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Indicative pricing</span>
            <h2>Transparent fixed-price options.</h2>
            <p>Real numbers — not &ldquo;from $X&rdquo; bait. Your final quote depends on site specifics — we confirm in writing before any work starts.</p>
          </div>
          <div className="dp-pricing__table">
            <table>
              <thead>
                <tr>
                  <th>System</th>
                  <th>Price</th>
                  <th>Includes</th>
                </tr>
              </thead>
              <tbody>
                {content.pricing.map((p) => (
                  <tr key={p.tier}>
                    <td><span className="dp-pricing__tier">{p.tier}</span></td>
                    <td><span className="dp-pricing__price">{p.price}</span></td>
                    <td>{p.includes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dp-pricing__fp">
            *Prices subject to eligibility, site inspection and rebate program changes. Final quote provided in writing.
          </p>
        </div>
      </section>

      {/* BRANDS */}
      <section className="dp-brands">
        <div className="wrap">
          <h3>Brands we install</h3>
          <div className="dp-brands__row">
            {content.brands.map((b) => <span key={b}>{b}</span>)}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Free quote</span>
            <h2>Quote for {svc.short.toLowerCase()}.</h2>
            <p>60 seconds. No obligation. Replied within 2 business hours.</p>
            <h3 style={{ marginTop: 24, marginBottom: 10, fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Service areas
            </h3>
            <div className="dp-quote__chips">
              {suburbs.slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}/${svc.slug}`}>{s.name}</Link>
              ))}
            </div>
          </div>
          <QuoteForm presetService={params.slug} />
        </div>
      </section>

      {/* FAQ */}
      <section className="dp-faq">
        <div className="wrap dp-faq__grid">
          <div className="dp-faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
            <h2>Quick honest answers.</h2>
            <p>If your question isn&apos;t here, call us on <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)" }}>{site.phone}</a>.</p>
          </div>
          <div className="dp-faq__right">
            {content.faqs.map((f, i) => (
              <details key={f.q} name={`service-faq-${svc.slug}`} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready for your {svc.short.toLowerCase()} quote?</h2>
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

      <Script id={`ld-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug)) }} />
      <Script id={`ld-crumbs-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-faq-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(content.faqs)) }} />
    </div>
  );
}
