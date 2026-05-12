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
  const title = `Aircon & Heat Pump Installation ${sub.name} | Advanced Gas & Aircon`;
  const description = `Licensed aircon, heat pump and gas plumbing services in ${sub.name} ${sub.postcode}. Same-week installs, fixed-price quotes, 6-year workmanship warranty.`;
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
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-24">
          <nav className="text-sm text-navy-200" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-cyan-300">Home</Link>
            <span className="mx-2 text-navy-400">/</span>
            <Link href="/service-areas" className="hover:text-cyan-300">Service Areas</Link>
            <span className="mx-2 text-navy-400">/</span>
            <span className="text-white">{sub.name}</span>
          </nav>
          <span className="eyebrow-dark mt-6">{sub.name} · VIC {sub.postcode}</span>
          <h1 className="mt-5 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Aircon &amp; heat pump installation in <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">{sub.name}</span>.
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-navy-100">
            Licensed plumbing and refrigeration team serving {sub.name} ({sub.postcode}) and surrounding areas.
            Same-week installs, fixed pricing, and VEU rebates that drop heat pump hot water installs to as little as $33.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/quote" className="btn-accent">
              Get my {sub.name} quote
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

      <section className="section">
        <div className="container">
          <span className="eyebrow">Services in {sub.name}</span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">What we install nearby.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {services.slice(0, 2).map((s) => (
              <Link
                key={s.slug}
                href={`/areas/${sub.slug}/${s.slug}`}
                className="card card-hover group"
              >
                <h3 className="text-2xl font-bold">{s.short} in {sub.name}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-navy-600">{s.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 transition group-hover:gap-2">
                  See {s.short.toLowerCase()} in {sub.name}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {services.slice(2).map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-full bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-cyan-50 hover:text-cyan-700">
                {s.short}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Local team</span>
            <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
              Why {sub.name} homeowners choose us.
            </h2>
            <ul className="mt-8 space-y-4 text-navy-700">
              {[
                `Local technicians who know ${sub.name}'s housing stock`,
                "Council and body-corporate paperwork sorted on your behalf",
                "Same-week install slots almost always available",
                "VEU rebate eligibility checked before you commit",
                "6-year workmanship warranty on every installation",
              ].map((l) => (
                <li key={l} className="flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-400 text-white">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-navy-500">Also serving nearby</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 ring-1 ring-navy-100 transition hover:bg-cyan-50 hover:text-cyan-700 hover:ring-cyan-200">
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>

      <CTASection title={`Free quote for ${sub.name}.`} />
      <Script id={`ld-crumbs-${sub.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </>
  );
}
