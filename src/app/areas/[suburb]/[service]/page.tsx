import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { suburbs, services, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import "../../../detail.css";

const PRIMARY_SERVICES = services.slice(0, 2);

export function generateStaticParams() {
  return suburbs.flatMap((sub) =>
    PRIMARY_SERVICES.map((svc) => ({ suburb: sub.slug, service: svc.slug })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { suburb: string; service: string };
}): Metadata {
  const sub = suburbs.find((s) => s.slug === params.suburb);
  const svc = services.find((s) => s.slug === params.service);
  if (!sub || !svc) return {};

  const title = `${svc.short} ${sub.name} | Fixed-Price Quote | Advanced Gas & Aircon`;
  const description =
    svc.slug === "heat-pump-installation"
      ? `Heat pump hot water installation in ${sub.name} from around $1,780 after VEU rebate. Licensed plumbers, same-week install, 6-year warranty.`
      : `${svc.short} in ${sub.name} ${sub.postcode}. Licensed refrigeration techs, fixed quotes, same-week installs, 6-year workmanship warranty.`;

  return {
    title,
    description,
    alternates: { canonical: `/areas/${sub.slug}/${svc.slug}` },
  };
}

export default function SuburbServicePage({
  params,
}: {
  params: { suburb: string; service: string };
}) {
  const sub = suburbs.find((s) => s.slug === params.suburb);
  const svc = services.find((s) => s.slug === params.service);
  const content = svc ? serviceContent[svc.slug] : undefined;
  if (!sub || !svc || !content) notFound();

  const localFaqs = [
    {
      q: `Do you service ${sub.name} ${sub.postcode}?`,
      a: `Yes — we service ${sub.name} and surrounding areas as part of our Pakenham + 75 km coverage. Most ${sub.name} jobs are scheduled within 5-7 days.`,
    },
    ...content.faqs.slice(0, 4),
  ];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/areas/${sub.slug}` },
    { name: svc.short, url: `${site.url}/areas/${sub.slug}/${svc.slug}` },
  ]);

  return (
    <div className="page-detail">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href={`/areas/${sub.slug}`}>{sub.name}</Link>
            <span className="sep">/</span>
            <span className="cur">{svc.short}</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot ds-dot--orange" />
            {svc.short} · {sub.name} VIC {sub.postcode}
          </div>
          <h1>
            {svc.short} in <span className="accent">{sub.name}</span>.
          </h1>
          <p className="dp-hero__sub">
            {svc.slug === "heat-pump-installation"
              ? `Cut your hot water bill by up to 75% with a heat pump installed in your ${sub.name} home from around $1,780 after VEU rebates. Licensed plumbers, paperwork handled, 6-year workmanship warranty.`
              : `Licensed refrigeration technicians installing split system, multi-head and ducted air conditioning in ${sub.name}. Fixed-price quotes, same-week installs, 6-year warranty.`}
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
            <span className="ds-eyebrow"><span className="ds-dot" /> What you get</span>
            <h2>{svc.short} {sub.name} — done properly.</h2>
            <p>{content.intro}</p>
          </div>
          <div className="dp-benefits__grid">
            {content.benefits.slice(0, 6).map((b) => (
              <div key={b.t} className="dp-benefit">
                <span className="dp-benefit__icon">✓</span>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> {sub.name} quote</span>
            <h2>Fixed price within 2 hours.</h2>
            <p>60 seconds. No obligation. No spam. We text or call within 2 business hours.</p>
            <h3 style={{ marginTop: 28, marginBottom: 10, fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Nearby suburbs we cover
            </h3>
            <div className="dp-quote__chips">
              {suburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}/${svc.slug}`}>{svc.short} {s.name}</Link>
              ))}
            </div>
          </div>
          <QuoteForm presetService={svc.slug} />
        </div>
      </section>

      <section className="dp-faq">
        <div className="wrap dp-faq__grid">
          <div className="dp-faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
            <h2>{sub.name} {svc.short.toLowerCase()} — answered.</h2>
            <p>If your question isn&apos;t here, call us on <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)" }}>{site.phone}</a>.</p>
          </div>
          <div className="dp-faq__right">
            {localFaqs.map((f, i) => (
              <details key={f.q} name={`area-faq-${sub.slug}-${svc.slug}`} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready for your {sub.name} quote?</h2>
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

      <Script id={`ld-svc-${sub.slug}-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug, sub.name)) }} />
      <Script id={`ld-crumbs-${sub.slug}-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-faq-${sub.slug}-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(localFaqs)) }} />
    </div>
  );
}
