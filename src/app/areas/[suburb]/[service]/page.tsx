import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { services, site } from "@/lib/site";
import { publishedSuburbs } from "@/lib/suburbs";
import { localAngle, driveTime } from "@/lib/localAngle";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import "../../../detail.css";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import type { NudgeVariant } from "@/lib/upgradeAngle";
import { metaDescription, pageTitle, seoMeta } from "@/lib/seo";

/** Same mapping as the parent service page. Here the nudge is the one
 *  bit of the page that varies by service rather than by suburb, which
 *  is deliberate: the suburb pages already vary it the other way. */
const NUDGE_BY_SERVICE: Record<string, NudgeVariant> = {
  "air-conditioning-installation": "cooling",
  "aircon-servicing-repairs": "cooling",
  "heat-pump-installation": "hot-water",
  "gas-plumbing": "heating",
};

const PRIMARY_SERVICES = services.slice(0, 2);

export function generateStaticParams() {
  return publishedSuburbs.flatMap((sub) =>
    PRIMARY_SERVICES.map((svc) => ({ suburb: sub.slug, service: svc.slug })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { suburb: string; service: string };
}): Metadata {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  const svc = services.find((s) => s.slug === params.service);
  if (!sub || !svc) notFound();
  return seoMeta({
    title: `${svc.short} ${sub.name} ${sub.postcode}`,
    description:
      svc.slug === "heat-pump-installation"
        ? `Heat pump hot water installed in ${sub.name} ${sub.postcode} with the VEU rebate applied at the quote. Licensed plumbers, same-week install, 6-year warranty.`
        : `${svc.short} in ${sub.name} ${sub.postcode}. Licensed refrigeration techs, fixed quotes, same-week installs, 6-year workmanship warranty.`,
    canonical: `/areas/${sub.slug}/${svc.slug}`,
    absolute: true,
  });
}

export default function SuburbServicePage({
  params,
}: {
  params: { suburb: string; service: string };
}) {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  const svc = services.find((s) => s.slug === params.service);
  const content = svc ? serviceContent[svc.slug] : undefined;
  if (!sub || !svc || !content) notFound();

  // Neighbouring suburbs that are actually published, capped at six so
  // the block stays a list a person would read rather than a footer dump.
  const nearbySame = sub.nearby
    .map((slug) => publishedSuburbs.find((x) => x.slug === slug))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 6);

  const otherServices = services.filter((x) => x.slug !== svc.slug);

  // The reason these pages were 93% identical to each other: the
  // template read the suburb's name and nothing else, while suburbs.ts
  // carried a paragraph of real local detail for every one of them.
  const angle = localAngle(sub, svc.slug);

  const localFaqs = [
    {
      q: `Do you service ${sub.name} ${sub.postcode}?`,
      a: `Yes, we service ${sub.name} and surrounding areas as part of our Pakenham + 75 km coverage. Most ${sub.name} jobs are scheduled within 5-7 days.`,
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
              ? `Heat pump hot water installed in your ${sub.name} home with the VEU rebate applied at the quote. Licensed plumbers, paperwork handled by us, 6-year workmanship warranty.`
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
            <h2>{svc.short} {sub.name}, done properly.</h2>
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

      <div className="wrap">
        <UpgradeNudge variant={NUDGE_BY_SERVICE[svc.slug] ?? "general"} />
      </div>

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
              {publishedSuburbs.filter((s) => s.slug !== sub.slug).slice(0, 8).map((s) => (
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
            <h2>{sub.name} {svc.short.toLowerCase()}, answered.</h2>
            <p>If your question isn&apos;t here, call us on <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)" }}>{site.phone}</a>.</p>
          </div>
          <div className="dp-faq__right">
            {localFaqs.map((f, i) => (
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Sibling links. Before this, a page like
          /areas/clyde/heat-pump-installation had exactly one inbound
          internal link, the suburb page, which is not enough for
          anything to get crawled properly or to pass any weight around.
          Every one of these pages now links to the same service in the
          neighbouring suburbs and to the other services in this suburb,
          which is also genuinely what the reader wants next. */}
      {angle && (
        <section className="dp-local-angle">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> On the ground in {sub.name}</span>
              <h2>{angle.heading}</h2>
            </div>
            <div className="localangle__grid">
              <div className="localangle__body">
                {angle.paras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {angle.bullets && (
                  <>
                    <h3>{angle.bullets.label}</h3>
                    <ul className="localangle__list">
                      {angle.bullets.items.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <aside className="localangle__facts">
                <dl>
                  <div>
                    <dt>Drive from our workshop</dt>
                    <dd>{driveTime(sub)}</dd>
                  </div>
                  <div>
                    <dt>Council</dt>
                    <dd>{sub.council}</dd>
                  </div>
                  <div>
                    <dt>We know it by</dt>
                    <dd>{sub.landmark}</dd>
                  </div>
                  <div>
                    <dt>Around here</dt>
                    <dd>{sub.localHooks.join(", ")}</dd>
                  </div>
                </dl>
                {sub.testimonial && (
                  <figure className="localangle__quote">
                    <blockquote>{sub.testimonial.quote}</blockquote>
                    <figcaption>
                      <strong>{sub.testimonial.who}</strong>
                      <span>{sub.testimonial.what}</span>
                    </figcaption>
                  </figure>
                )}
              </aside>
            </div>
          </div>
        </section>
      )}

      <section className="svcnear">
        <div className="wrap">
          <div className="svcnear__grid">
            {nearbySame.length > 0 && (
              <div className="svcnear__col">
                <h2>{svc.short} near {sub.name}</h2>
                <p>Same crew, same day rates, same warranty. We work right across the area.</p>
                <ul className="svcnear__list">
                  {nearbySame.map((n) => (
                    <li key={n.slug}>
                      <Link href={`/areas/${n.slug}/${svc.slug}`}>
                        {svc.short} {n.name} <span>{n.postcode}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="svcnear__col">
              <h2>What else we do in {sub.name}</h2>
              <p>Most jobs here end up being more than one trade. We hold all of them.</p>
              <ul className="svcnear__list">
                {otherServices.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/areas/${sub.slug}/${o.slug}`}>
                      {o.short} {sub.name} <span>{sub.postcode}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`/areas/${sub.slug}`}>
                    Everything in {sub.name} <span>overview</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/services/${svc.slug}`}>
                    {svc.short} <span>how we do it</span>
                  </Link>
                </li>
              </ul>
            </div>
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
