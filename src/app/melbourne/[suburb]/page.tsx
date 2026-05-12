import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { suburbs, services, site } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";
import { CTASection } from "@/components/CTASection";
import { QuoteForm } from "@/components/QuoteForm";

export function generateStaticParams() {
  return suburbs.map((s) => ({ suburb: s.slug }));
}

export function generateMetadata({ params }: { params: { suburb: string } }): Metadata {
  const sub = suburbs.find((s) => s.slug === params.suburb);
  if (!sub) return {};
  const title = `Aircon & Heat Pump Installation ${sub.name} | Advanced Gas`;
  const description = `Licensed aircon, heat pump and gas plumbing services in ${sub.name} ${sub.postcode}. Same-week installs, fixed-price quotes, 6-year warranty.`;
  return {
    title,
    description,
    alternates: { canonical: `/melbourne/${sub.slug}` },
  };
}

export default function SuburbPage({ params }: { params: { suburb: string } }) {
  const sub = suburbs.find((s) => s.slug === params.suburb);
  if (!sub) notFound();

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/melbourne/${sub.slug}` },
  ]);

  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 text-white">
        <div className="container py-16 md:py-20">
          <nav className="text-sm text-brand-100" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/service-areas" className="hover:text-white">Service Areas</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{sub.name}</span>
          </nav>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
            Aircon, Heat Pump & Gas Plumbing in {sub.name}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-brand-50">
            Licensed plumbing and refrigeration team serving {sub.name} ({sub.postcode}) and surrounding suburbs.
            Same-week installs, fixed pricing, and VEU rebates that drop heat pump hot water installs to as little as $33.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/quote" className="btn-accent">Get my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              📞 {site.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Services in {sub.name}</span>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">What we install nearby</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {services.slice(0, 2).map((s) => (
              <Link
                key={s.slug}
                href={`/melbourne/${sub.slug}/${s.slug}`}
                className="card group transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <h3 className="text-xl font-bold">
                  {s.short} in {sub.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{s.blurb}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-brand-700 group-hover:underline">
                  See {s.short.toLowerCase()} in {sub.name} →
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {services.slice(2).map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                {s.short}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Local team</span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Why {sub.name} homeowners choose Advanced Gas
            </h2>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li>✓ Local technicians familiar with {sub.name}'s housing stock</li>
              <li>✓ Council and body-corporate paperwork sorted on your behalf</li>
              <li>✓ Same-week installation slots almost always available</li>
              <li>✓ VEU rebate eligibility checked before you commit</li>
              <li>✓ 6-year workmanship warranty on every installation</li>
            </ul>
            <h3 className="mt-8 text-lg font-bold">Also serving nearby</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/melbourne/${s.slug}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50">
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>

      <CTASection title={`Free quote for ${sub.name}`} />
      <Script id={`ld-crumbs-${sub.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </>
  );
}
