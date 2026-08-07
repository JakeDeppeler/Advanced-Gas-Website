import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { publishedSuburbs, suburbs } from "@/lib/suburbs";
import { services } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import { SuburbMap } from "@/components/SuburbMap";
import { CoverageMap } from "@/components/CoverageMap";
import "../../detail.css";

export function generateStaticParams() {
  return publishedSuburbs.map((s) => ({ suburb: s.slug }));
}

export function generateMetadata({ params }: { params: { suburb: string } }): Metadata {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  if (!sub) return {};
  const title = `Aircon, Heat Pump & Gas Plumbing ${sub.name} ${sub.postcode} | Advanced Gas & Aircon`;
  const description = `Licensed installer for aircon, heat pump hot water and gas plumbing in ${sub.name}. ${sub.commonInstall.charAt(0).toUpperCase()}${sub.commonInstall.slice(1)}. VEU rebates handled, fixed-price quotes, 6-year workmanship warranty.`;
  return {
    title,
    description,
    alternates: { canonical: `/areas/${sub.slug}` },
  };
}

export default function SuburbPage({ params }: { params: { suburb: string } }) {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  if (!sub) notFound();

  // Resolve the nearby-chip slugs to actual (published or not) suburb records —
  // if a nearby entry isn't published yet, we still show it as a plain label so
  // the neighbourhood context reads correctly, but only render a link when it
  // resolves to a real, published page.
  const nearbyResolved = sub.nearby
    .map((slug) => suburbs.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/areas/${sub.slug}` },
  ]);

  return (
    <div className="page-detail page-suburb">
      {/* ------------------ Hero with scrimmed background photo ------------------ */}
      <section className="dp-hero suburb-hero">
        <div className="suburb-hero__pic" aria-hidden="true">
          <img
            src="/team-photo.webp"
            alt=""
            width="1800"
            height="1200"
            fetchPriority="high"
          />
        </div>
        <div className="suburb-hero__scrim" aria-hidden="true" />
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
            {sub.name} · VIC {sub.postcode} · {sub.council}
          </div>
          <h1>
            Aircon, heat pump &amp; gas plumbing in <span className="accent">{sub.name}</span>.
          </h1>
          <p className="dp-hero__sub">
            Licensed plumbing and refrigeration team working in {sub.name} ({sub.postcode}) since 2014.
            You&rsquo;ll usually find us {sub.landmark}. Fixed-price quotes, same-week installs, and VEU rebates handled end-to-end.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get my {sub.name} quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* ------------------ Local knowledge strip ------------------ */}
      <section className="dp-local">
        <div className="wrap">
          <div className="dp-local__grid">
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Housing stock</div>
              <p>{sub.housingStock.charAt(0).toUpperCase() + sub.housingStock.slice(1)}.</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">What we mostly install here</div>
              <p>{sub.commonInstall.charAt(0).toUpperCase() + sub.commonInstall.slice(1)}.</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Local council</div>
              <p>{sub.council}. Compliance certificates and permit submissions handled in-house.</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Distance from our Pakenham base</div>
              <p>
                <strong>{sub.distanceKm} km</strong>
                {sub.distanceKm === 0
                  ? " — this is our home patch."
                  : " — well inside our 50 km same-day service radius."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Location map ------------------ */}
      <section className="dp-map">
        <div className="wrap dp-map__grid">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> Location</span>
            <h2>Where {sub.name} sits in our service radius.</h2>
            <p>
              {sub.name} is <strong>{sub.distanceKm}&nbsp;km</strong> from our Pakenham base — well inside
              the 50&nbsp;km circle we cover same-week. The dotted rings step out in
              10&nbsp;km increments so you can see how quickly we can reach nearby suburbs
              along the same route.
            </p>
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--ink-3)" }}>
              Typical driving time from our Pakenham workshop to {sub.name}:{" "}
              <strong style={{ color: "var(--navy)" }}>
                {sub.driveMin
                  ? sub.driveMin[0] === sub.driveMin[1]
                    ? `${sub.driveMin[0]} min`
                    : `${sub.driveMin[0]}–${sub.driveMin[1]} min`
                  : sub.distanceKm === 0
                    ? "on-site"
                    : `${Math.max(10, Math.round(sub.distanceKm * 0.7))}–${Math.max(15, Math.round(sub.distanceKm * 1.1))} min`}
              </strong>{" "}
              {sub.distanceKm > 30
                ? "— mostly highway on the Princes Freeway."
                : "depending on traffic on the Princes Highway."}
            </p>
          </div>
          <SuburbMap slug={sub.slug} name={sub.name} />
        </div>
      </section>

      {/* ------------------ Services in this suburb ------------------ */}
      <section className="dp-benefits">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Services in {sub.name}</span>
            <h2>What we install nearby.</h2>
          </div>
          <div className="dp-benefits__grid">
            {services.slice(0, 2).map((s) => (
              <Link
                key={s.slug}
                href={`/areas/${sub.slug}/${s.slug}`}
                className="dp-benefit"
                style={{ textDecoration: "none", display: "block" }}
              >
                <span className="dp-benefit__icon">→</span>
                <h3>{s.short} in {sub.name}</h3>
                <p>{s.blurb}</p>
              </Link>
            ))}
            {services.slice(2).map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="dp-benefit"
                style={{ textDecoration: "none", display: "block" }}
              >
                <span className="dp-benefit__icon">↗</span>
                <h3>{s.short}</h3>
                <p>{s.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------ Local hooks + testimonial + quote form ------------------ */}
      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Local team</span>
            <h2>Why {sub.name} homeowners choose us.</h2>
            <ul className="dp-hooks">
              <li>
                Local technicians who know {sub.name}&rsquo;s housing stock — we&rsquo;re usually
                working somewhere near {sub.localHooks[0]}
                {sub.localHooks[1] ? ` or ${sub.localHooks[1]}` : ""} in any given week.
              </li>
              <li>
                {sub.council} compliance and permit paperwork sorted before we start on-site.
              </li>
              <li>
                Same-week install slots almost always available inside {sub.postcode}.
              </li>
              <li>
                VEU rebate eligibility checked and the rebate applied to your quote — you don&rsquo;t pay it up-front and then chase it back.
              </li>
              <li>6-year workmanship warranty on every {sub.name} installation.</li>
            </ul>

            {sub.testimonial && (
              <figure className="dp-quotebox">
                <blockquote>&ldquo;{sub.testimonial.quote}&rdquo;</blockquote>
                <figcaption>
                  <strong>{sub.testimonial.who}</strong>
                  <span> · {sub.testimonial.what}</span>
                </figcaption>
              </figure>
            )}

            {nearbyResolved.length > 0 && (
              <>
                <h3 className="dp-quote__nearby-lbl">Also serving nearby</h3>
                <div className="dp-quote__chips">
                  {nearbyResolved.map((s) =>
                    s.published ? (
                      <Link key={s.slug} href={`/areas/${s.slug}`}>{s.name}</Link>
                    ) : (
                      <span key={s.slug} className="dp-chip--muted">{s.name}</span>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
          <QuoteForm />
        </div>
      </section>

      {/* ------------------ Why local matters + common problems ------------------ */}
      {(sub.whyLocal || sub.commonProblems || sub.knownEstates) && (
        <section className="suburb-local">
          <div className="wrap suburb-local__grid">
            {sub.whyLocal && (
              <div className="suburb-local__why">
                <span className="ds-eyebrow"><span className="ds-dot" /> Why local matters</span>
                <h2>We&rsquo;re not driving out from the city — we&rsquo;re your neighbours.</h2>
                <p>{sub.whyLocal}</p>
                {sub.knownEstates && (
                  <p className="suburb-local__estates">
                    <strong>Estates we know cold:</strong> {sub.knownEstates}
                  </p>
                )}
              </div>
            )}
            {sub.commonProblems && sub.commonProblems.length > 0 && (
              <div className="suburb-local__problems">
                <span className="ds-eyebrow"><span className="ds-dot" /> Common in {sub.name}</span>
                <h3>What we see on the tools around {sub.name}.</h3>
                <ul>
                  {sub.commonProblems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ------------------ Coverage map + where-we-work button list ------------------ */}
      <section className="suburb-coverage">
        <div className="wrap">
          <div className="ds-section-head" style={{ marginBottom: 24 }}>
            <span className="ds-eyebrow"><span className="ds-dot" /> Where we work</span>
            <h2>{sub.name} in context of every suburb we service.</h2>
            <p>
              Click any suburb on the map or the buttons below to jump to that page.
              Orange dot is our Pakenham HQ; {sub.name} is highlighted.
            </p>
          </div>
          <CoverageMap highlight={sub.slug} />
        </div>
      </section>

      {/* ------------------ Big CTA ------------------ */}
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
