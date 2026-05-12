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

// Only generate suburb pages for the top 2 services (aircon + heat pump)
// to keep build fast and avoid thin pages for low-volume long-tail queries.
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

  const title = `${svc.short} ${sub.name} | Fixed-Price Quote | Advanced Gas`;
  const description =
    svc.slug === "heat-pump-installation"
      ? `Heat pump hot water installation in ${sub.name} from $33 with VEU rebate. Licensed plumbers, same-week install, 6-year warranty.`
      : `${svc.short} in ${sub.name} ${sub.postcode}. Licensed refrigeration techs, fixed quotes, same-week installs, 6-year workmanship warranty.`;

  return {
    title,
    description,
    alternates: { canonical: `/melbourne/${sub.slug}/${svc.slug}` },
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

  const h1 = `${svc.short} in ${sub.name}`;
  const localFaqs = [
    {
      q: `Do you service ${sub.name} ${sub.postcode}?`,
      a: `Yes — we service ${sub.name} and surrounding suburbs as part of our Melbourne metro coverage. Most ${sub.name} jobs are scheduled within 5-7 days.`,
    },
    ...content.faqs.slice(0, 4),
  ];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/melbourne/${sub.slug}` },
    { name: svc.short, url: `${site.url}/melbourne/${sub.slug}/${svc.slug}` },
  ]);

  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 text-white">
        <div className="container py-16 md:py-20">
          <nav className="text-sm text-brand-100" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href={`/melbourne/${sub.slug}`} className="hover:text-white">{sub.name}</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{svc.short}</span>
          </nav>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">{h1}</h1>
          <p className="mt-4 max-w-3xl text-lg text-brand-50">
            {svc.slug === "heat-pump-installation"
              ? `Cut your hot water bill by up to 75% with a heat pump installed in your ${sub.name} home from as little as $33 after VEU rebates. Licensed plumbers, paperwork handled, 6-year workmanship warranty.`
              : `Licensed refrigeration technicians installing split system, multi-head and ducted air conditioning in ${sub.name}. Fixed-price quotes, same-week installs, 6-year warranty.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/quote" className="btn-accent">Get my {sub.name} quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              📞 {site.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-4xl">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-3xl font-bold">{svc.short} {sub.name} — what you get</h2>
            <p className="mt-4 text-slate-700">{content.intro}</p>
            <p className="mt-4 text-slate-700">
              {sub.name} ({sub.postcode}) sits within our core Melbourne service zone, so we
              can usually book {sub.name} jobs within 5-7 days. Whether you're upgrading
              an older home or fitting out a new build, our licensed team handles the
              install end-to-end — including the council and rebate paperwork.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {content.benefits.slice(0, 4).map((b) => (
              <div key={b.t} className="card">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-500 font-black">✓</div>
                <h3 className="mt-3 text-lg font-bold">{b.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow">{sub.name} quote</span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Fixed price within 1 hour</h2>
            <p className="mt-3 text-slate-600">
              60 seconds. No obligation. No spam. We text or call within 1 business hour.
            </p>
            <h3 className="mt-8 text-lg font-bold">Nearby suburbs we cover</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/melbourne/${s.slug}/${svc.slug}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50">
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
