import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { suburbs, services, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { FAQ } from "@/components/FAQ";
import { QuoteForm } from "@/components/QuoteForm";
import { CTASection } from "@/components/CTASection";

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
      ? `Heat pump hot water installation in ${sub.name} from $33 with VEU rebate. Licensed plumbers, same-week install, 6-year warranty.`
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
      a: `Yes — we service ${sub.name} and surrounding areas as part of our South-East Vic and Gippsland coverage. Most ${sub.name} jobs are scheduled within 5-7 days.`,
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
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-24">
          <nav className="text-sm text-navy-200" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-cyan-300">Home</Link>
            <span className="mx-2 text-navy-400">/</span>
            <Link href={`/areas/${sub.slug}`} className="hover:text-cyan-300">{sub.name}</Link>
            <span className="mx-2 text-navy-400">/</span>
            <span className="text-white">{svc.short}</span>
          </nav>
          <h1 className="mt-6 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            {svc.short} in <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">{sub.name}</span>.
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-navy-100">
            {svc.slug === "heat-pump-installation"
              ? `Cut your hot water bill by up to 75% with a heat pump installed in your ${sub.name} home from as little as $33 after VEU rebates. Licensed plumbers, paperwork handled, 6-year workmanship warranty.`
              : `Licensed refrigeration technicians installing split system, multi-head and ducted air conditioning in ${sub.name}. Fixed-price quotes, same-week installs, 6-year warranty.`}
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
        <div className="container max-w-5xl">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
              {svc.short} {sub.name} — what you get.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-navy-700">{content.intro}</p>
            <p className="mt-4 text-[17px] leading-relaxed text-navy-700">
              {sub.name} ({sub.postcode}) is within our core service zone, so we
              can usually book {sub.name} jobs within 5-7 days. Whether you're upgrading
              an older home or fitting out a new build, our licensed team handles the
              install end-to-end — including the rebate paperwork.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {content.benefits.slice(0, 4).map((b) => (
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

      <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">{sub.name} quote</span>
            <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
              Fixed price within 1 hour.
            </h2>
            <p className="mt-4 text-navy-600">
              60 seconds. No obligation. No spam. We text or call within 1 business hour.
            </p>
            <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-navy-500">Nearby suburbs we cover</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}/${svc.slug}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 ring-1 ring-navy-100 transition hover:bg-cyan-50 hover:text-cyan-700 hover:ring-cyan-200">
                  {svc.short} {s.name}
                </Link>
              ))}
            </div>
          </div>
          <QuoteForm presetService={svc.slug} />
        </div>
      </section>

      <FAQ items={localFaqs} id={`faq-${sub.slug}-${svc.slug}`} />
      <CTASection title={`Ready for your ${sub.name} quote?`} />

      <Script id={`ld-svc-${sub.slug}-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug, sub.name)) }} />
      <Script id={`ld-crumbs-${sub.slug}-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-faq-${sub.slug}-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(localFaqs)) }} />
    </>
  );
}
