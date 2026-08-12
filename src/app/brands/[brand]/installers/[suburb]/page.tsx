import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, findBrand, productPhoto } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import { publishedSuburbs } from "@/lib/suburbs";
import { breadcrumbSchema } from "@/lib/schema";
import "../../../../detail.css";
import "../../brand.css";
import { pageTitle, metaDescription } from "@/lib/seo";

// A cross-linked "Reclaim installer in Berwick" style page.
// We only spawn combos for the first 12 highest-priority suburbs so we don't
// flood Google with thin cross-multiplied pages. That still gives us
// 6 brands × 12 suburbs = 72 combo URLs — genuinely useful for the "X installer
// [suburb]" long-tail queries.
const TOP_SUBURB_SLUGS = [
  "pakenham", "officer", "beaconsfield", "berwick", "narre-warren",
  "endeavour-hills", "hallam", "hampton-park", "cranbourne", "clyde-north",
  "drouin", "warragul",
] as const;

const topSuburbs = () =>
  TOP_SUBURB_SLUGS
    .map((slug) => publishedSuburbs.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

export function generateStaticParams() {
  return brands.flatMap((b) =>
    topSuburbs().map((sub) => ({ brand: b.slug, suburb: sub.slug })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { brand: string; suburb: string };
}): Metadata {
  const brand = findBrand(params.brand);
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  if (!brand || !sub) return {};

  const title = pageTitle(`${brand.name} Installer ${sub.name} ${sub.postcode}`);
  const description = metaDescription(
    `Licensed ${brand.name} installer working in ${sub.name} since 2014. ${sub.commonInstall.charAt(0).toUpperCase() + sub.commonInstall.slice(1)}. Fixed-price quotes, VEU rebates handled, 6-year warranty.`,
  );
  return {
    title,
    description,
    alternates: { canonical: `/brands/${brand.slug}/installers/${sub.slug}` },
  };
}

export default function BrandSuburbPage({
  params,
}: {
  params: { brand: string; suburb: string };
}) {
  const brand = findBrand(params.brand);
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  if (!brand || !sub) notFound();

  // Pull 4 products from this brand to showcase inline as install options.
  const featured = brand.products.slice(0, 4);

  // Nearby suburbs that ALSO have this brand's installer page (so we cross-
  // link to related combos rather than dead-ending).
  const nearbyCombos = sub.nearby
    .map((slug) => publishedSuburbs.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .filter((s) => TOP_SUBURB_SLUGS.includes(s.slug as (typeof TOP_SUBURB_SLUGS)[number]));

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Brands", url: `${site.url}/brands` },
    { name: brand.name, url: `${site.url}/brands/${brand.slug}` },
    { name: `${sub.name} installer`, url: `${site.url}/brands/${brand.slug}/installers/${sub.slug}` },
  ]);

  return (
    <div className="page-detail page-brand-suburb">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <Link href={`/brands/${brand.slug}`}>{brand.name}</Link>
            <span className="sep">/</span>
            <span className="cur">{sub.name} installer</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {brand.name} · {sub.name} VIC {sub.postcode}
          </div>
          <h1>
            <span className="accent">{brand.name}</span> installer, {sub.name}.
          </h1>
          <p className="dp-hero__sub">
            Licensed {brand.name} installer working in {sub.name} ({sub.postcode}) since 2014.
            You&rsquo;ll find us {sub.landmark}. Fixed-price quotes inside 2 business hours,
            {brand.accreditation ? ` ${brand.accreditation.toLowerCase()},` : ""} VEU rebates
            handled end-to-end where the unit qualifies.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a {sub.name} {brand.name} quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Intersection strip, why this brand suits this suburb */}
      <section className="dp-local">
        <div className="wrap">
          <div className="dp-local__grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">{brand.name}, why we install it</div>
              <p>{brand.ourTake}</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">{sub.name}, what we usually install</div>
              <p>{sub.commonInstall.charAt(0).toUpperCase() + sub.commonInstall.slice(1)}.</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Local housing stock</div>
              <p>{sub.housingStock.charAt(0).toUpperCase() + sub.housingStock.slice(1)}. {brand.name}'s range covers this stock end-to-end. That's why we lead with it here.</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Council + compliance</div>
              <p>{sub.council}. Compliance certificates handled in-house. You receive yours by email within 24 hours of install.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured products from this brand */}
      <section className="brand-range">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> {brand.name} in {sub.name}</span>
            <h2>The {brand.name} models we install most often in {sub.name}.</h2>
            <p>
              A handful of the range shown below, {brand.products.length} total {brand.name} models
              are in our regular install list. Tap through for spec sheet, installed price and our
              take on each model.
            </p>
          </div>
          <div className="brand-group__grid">
            {featured.map((p) => {
              const photo = productPhoto(p, brand);
              return (
                <Link key={p.slug} href={`/brands/${brand.slug}/${p.slug}`} className="brand-card">
                  <div className="brand-card__photo">
                    {p.veuEligible && (
                      <span className="brand-card__pill--rebate brand-card__pill--overlay">VEU rebate</span>
                    )}
                    <SafeImg src={photo.src} fallback={photo.fallback} alt={photo.alt} loading="lazy" width="480" height="360" />
                  </div>
                  <div className="brand-card__inner">
                    <div className="brand-card__head">
                      <h3>{p.name}</h3>
                      <span className="brand-card__model">{p.model}</span>
                    </div>
                    {p.capacity && <div className="brand-card__cap">{p.capacity}</div>}
                    <p className="brand-card__take">{p.ourTake}</p>
                    <div className="brand-card__foot">
                      <span className="brand-card__price">
                        {p.installedPriceFrom ? `from ${p.installedPriceFrom}` : "Message for quote →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href={`/brands/${brand.slug}`} className="ds-btn ds-btn--ghost">
              See the full {brand.name} range →
            </Link>
          </div>
        </div>
      </section>

      {/* Cross-links: same brand nearby, same suburb other brands */}
      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Same brand nearby</span>
            <h2>{brand.name} installer, other suburbs.</h2>
            {sub.testimonial && (
              <figure className="dp-quotebox">
                <blockquote>&ldquo;{sub.testimonial.quote}&rdquo;</blockquote>
                <figcaption>
                  <strong>{sub.testimonial.who}</strong>
                  <span> · {sub.testimonial.what}</span>
                </figcaption>
              </figure>
            )}
            {nearbyCombos.length > 0 && (
              <>
                <h3 className="dp-quote__nearby-lbl">Also installing {brand.name} nearby</h3>
                <div className="dp-quote__chips">
                  {nearbyCombos.map((s) => (
                    <Link key={s.slug} href={`/brands/${brand.slug}/installers/${s.slug}`}>
                      {brand.name} · {s.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
            <h3 className="dp-quote__nearby-lbl" style={{ marginTop: 32 }}>Other brands we install in {sub.name}</h3>
            <div className="dp-quote__chips">
              {brands
                .filter((b) => b.slug !== brand.slug)
                .map((b) => (
                  <Link key={b.slug} href={`/brands/${b.slug}/installers/${sub.slug}`}>
                    {b.name}
                  </Link>
                ))}
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: "var(--ink-3)" }}>
              Prefer to browse by suburb? See our full {sub.name} service page{" "}
              <Link href={`/areas/${sub.slug}`} style={{ color: "var(--navy)" }}>
                → /areas/{sub.slug}
              </Link>
            </p>
          </div>

          {/* Right-side quote form placeholder, reuse the shared QuoteForm */}
          <QuoteFormLite brand={brand.name} suburb={sub.name} />
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>{brand.name} in {sub.name}. Free quote.</h2>
            <p>Fixed price, no obligation, replied within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id={`ld-crumbs-${brand.slug}-${sub.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}

function QuoteFormLite({ brand, suburb }: { brand: string; suburb: string }) {
  return (
    <div className="qf-card">
      <div className="qf-ribbon">
        <span className="qf-ribbon-dot" /> {brand} · {suburb} quote
      </div>
      <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.01em", color: "var(--navy)", margin: "0 0 14px" }}>
        60-second {brand} quote for {suburb}.
      </h3>
      <p style={{ fontSize: 15, color: "var(--ink-2)", margin: "0 0 20px" }}>
        Tell us the address and the room, we'll come back with a fixed price on the model that suits.
      </p>
      <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg" style={{ width: "100%", justifyContent: "center" }}>
        Open the quote form →
      </Link>
    </div>
  );
}
