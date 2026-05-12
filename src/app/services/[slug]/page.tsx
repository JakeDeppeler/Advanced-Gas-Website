import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { services, suburbs, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { FAQ } from "@/components/FAQ";
import { CTASection } from "@/components/CTASection";
import { QuoteForm } from "@/components/QuoteForm";

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
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-28">
          <nav className="text-sm text-navy-200" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-cyan-300">Home</Link>
            <span className="mx-2 text-navy-400">/</span>
            <Link href="/#services" className="hover:text-cyan-300">Services</Link>
            <span className="mx-2 text-navy-400">/</span>
            <span className="text-white">{svc.short}</span>
          </nav>
          <h1 className="mt-6 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            {content.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-navy-100">{content.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/quote" className="btn-accent">
              Get my free quote
              <span aria-hidden>→</span>
            </Link>
            <a href={`tel:${site.phoneE164}`} className="btn-outline">☎ {site.phone}</a>
          </div>
        </div>
        <div className="relative -mb-px">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full text-white" aria-hidden>
            <path d="M0 80V40c240 30 480 30 720 0s480-30 720 0v40H0z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* Benefits */}
      <section className="section">
        <div className="container">
          <span className="eyebrow">What's included</span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
            Every {svc.short.toLowerCase()} we do, done properly.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {content.benefits.map((b) => (
              <div key={b.t} className="card card-hover">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/15 to-navy-900/5 text-cyan-600 ring-1 ring-cyan-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <h3 className="mt-4 text-lg font-bold">{b.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-600">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
        <div className="container">
          <span className="eyebrow">Indicative pricing</span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
            Transparent fixed-price options.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-navy-600">
            Real prices, not "from $X" bait. Your final quote depends on site specifics —
            we confirm in writing before any work starts.
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-navy-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-navy-900">
                <tr>
                  <th className="px-5 py-4 font-semibold">System</th>
                  <th className="px-5 py-4 font-semibold">Price</th>
                  <th className="hidden px-5 py-4 font-semibold md:table-cell">Includes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {content.pricing.map((p) => (
                  <tr key={p.tier} className="hover:bg-cyan-50/40 transition">
                    <td className="px-5 py-4 font-medium">{p.tier}</td>
                    <td className="px-5 py-4 font-display text-lg font-extrabold text-cyan-700">{p.price}</td>
                    <td className="hidden px-5 py-4 text-navy-600 md:table-cell">{p.includes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-navy-500">
            *Prices subject to eligibility, site inspection and rebate program changes. Final quote provided in writing.
          </p>
        </div>
      </section>

      {/* Brands */}
      <section className="section">
        <div className="container">
          <span className="eyebrow">Brands we install</span>
          <h2 className="mt-4 text-balance text-3xl font-extrabold md:text-4xl">Top-tier brands only.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {content.brands.map((b) => (
              <span key={b} className="rounded-full bg-navy-50 px-5 py-2.5 font-display text-sm font-bold text-navy-700 ring-1 ring-navy-100">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Quote form inline */}
      <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Free quote</span>
            <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
              Quote for {svc.short.toLowerCase()}.
            </h2>
            <p className="mt-4 text-navy-600">
              60 seconds. No obligation. Replied within 1 business hour.
            </p>
            <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-navy-500">Service areas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suburbs.slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}/${svc.slug}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 ring-1 ring-navy-100 transition hover:bg-cyan-50 hover:text-cyan-700 hover:ring-cyan-200">
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
          <QuoteForm presetService={params.slug} />
        </div>
      </section>

      <FAQ items={content.faqs} id={`faq-${svc.slug}`} />
      <CTASection title={`Ready for your ${svc.short.toLowerCase()} quote?`} />

      <Script id={`ld-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug)) }} />
      <Script id={`ld-crumbs-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-faq-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(content.faqs)) }} />
    </>
  );
}
