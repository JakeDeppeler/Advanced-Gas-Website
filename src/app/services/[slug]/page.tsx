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
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 text-white">
        <div className="container py-16 md:py-20">
          <nav className="text-sm text-brand-100" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#services" className="hover:text-white">Services</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{svc.short}</span>
          </nav>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">{content.h1}</h1>
          <p className="mt-4 max-w-3xl text-lg text-brand-50">{content.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/quote" className="btn-accent">Get my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              📞 {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section">
        <div className="container">
          <span className="eyebrow">Why us for {svc.short.toLowerCase()}</span>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">What's included</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {content.benefits.map((b) => (
              <div key={b.t} className="card">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-500 font-black">✓</div>
                <h3 className="mt-4 text-lg font-bold">{b.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section bg-slate-50">
        <div className="container">
          <span className="eyebrow">Indicative pricing</span>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Transparent fixed-price options</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Real prices, not "from $X" bait. Your final quote depends on site specifics —
            we confirm in writing before any work starts.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-50 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">System</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Includes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {content.pricing.map((p) => (
                  <tr key={p.tier}>
                    <td className="px-4 py-3 font-medium">{p.tier}</td>
                    <td className="px-4 py-3 font-bold text-brand-700">{p.price}</td>
                    <td className="px-4 py-3 text-slate-600">{p.includes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            *Prices subject to eligibility, site inspection and rebate program changes. Final quote provided in writing.
          </p>
        </div>
      </section>

      {/* Brands */}
      <section className="section">
        <div className="container">
          <span className="eyebrow">Brands we install</span>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">Top-tier brands only</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {content.brands.map((b) => (
              <span key={b} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Quote form inline */}
      <section className="section bg-slate-50">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Free quote</span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Quote for {svc.short.toLowerCase()} in Melbourne</h2>
            <p className="mt-3 text-slate-600">
              60 seconds. No obligation. Replied within 1 business hour.
            </p>
            <h3 className="mt-8 text-lg font-bold">Service areas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suburbs.slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/melbourne/${s.slug}/${svc.slug}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50">
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
