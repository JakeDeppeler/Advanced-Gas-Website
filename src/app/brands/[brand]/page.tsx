import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, findBrand, productPhoto } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import { BrandCompare } from "@/components/BrandCompare";
import { ProductTabs } from "@/components/ProductTabs";
import { BrandFacts } from "@/components/BrandFacts";
import { ProofStrip } from "@/components/ProofStrip";
import { QuoteForm } from "@/components/QuoteForm";
import { installsFor } from "@/lib/brandGallery";
import { getInstagramForBrand } from "@/lib/instagram";
import { InstagramFeed } from "@/components/InstagramFeed";
import { publishedSuburbs } from "@/lib/suburbs";
import { breadcrumbSchema } from "@/lib/schema";

const INSTALLER_SUBURB_SLUGS = [
  "pakenham", "officer", "beaconsfield", "berwick", "narre-warren",
  "endeavour-hills", "hallam", "hampton-park", "cranbourne", "clyde-north",
  "drouin", "warragul",
];
import "../../detail.css";
import "./brand.css";

export function generateStaticParams() {
  return brands.map((b) => ({ brand: b.slug }));
}

export function generateMetadata({ params }: { params: { brand: string } }): Metadata {
  const brand = findBrand(params.brand);
  if (!brand) return {};
  const title = `${brand.name} Installer Melbourne · ${brand.tagline} | Advanced Gas & Aircon`;
  const description = `Licensed ${brand.name} installer across Melbourne's south-east. ${brand.productLabel}. Fixed-price quotes, VEU rebates handled where eligible, 6-year workmanship warranty.`;
  return {
    title,
    description,
    alternates: { canonical: `/brands/${brand.slug}` },
  };
}

export default async function BrandPage({ params }: { params: { brand: string } }) {
  const brand = findBrand(params.brand);
  if (!brand) notFound();

  // Posts whose caption mentions this brand — see lib/instagram.ts.
  // Empty when the feed isn't configured, so the page degrades cleanly.
  const igPosts = await getInstagramForBrand(params.brand, 8);

  // Real install photos for this brand, if any are wired yet. When the
  // list is empty the page falls back to the manufacturer gallery — which
  // is labelled as such — so brands can be filled in one at a time.
  const installs = installsFor(brand.slug);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Brands", url: `${site.url}/brands` },
    { name: brand.name, url: `${site.url}/brands/${brand.slug}` },
  ]);

  return (
    <div className="page-detail page-brand" style={{ ["--card-accent" as string]: brand.accent }}>
      <section className="dp-hero brand-hero">
        <div className="brand-hero__pic" aria-hidden="true">
          <SafeImg src={brand.photo} fallback={brand.photoFallback} alt="" width="1600" height="900" fetchPriority="high" />
        </div>
        <div className="brand-hero__scrim" aria-hidden="true" />
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <span className="cur">{brand.name}</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {brand.name} · {brand.origin}
          </div>
          <h1>
            <span className="accent">{brand.name}</span> installer, Melbourne&rsquo;s south-east.
          </h1>
          <p className="dp-hero__sub">{brand.intro}</p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed {brand.name} quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>

          {/* Same trust bar as the home page and service pages — dark
              variant so it sits on the hero photo instead of blocking it. */}
          <div className="dp-trust dp-trust--dark">
            <div className="dp-trust__stat dp-trust__stat--stars">
              <strong>★★★★★</strong>
              <span>4.9 / 5 on Google</span>
            </div>
            <div className="dp-trust__div" />
            <div className="dp-trust__stat">
              <strong>{brand.products.length}</strong>
              <span>{brand.name} models we install</span>
            </div>
            <div className="dp-trust__div" />
            <div className="dp-trust__stat">
              <strong>6-year</strong>
              <span>workmanship warranty</span>
            </div>
          </div>
        </div>
      </section>

      {/* At-a-glance. The reason we install it leads as prose; the
          supporting facts hide behind buttons so the strip stays short. */}
      <section className="dp-local">
        <div className="wrap">
          <BrandFacts
            ourTake={brand.ourTake}
            facts={[
              { label: "Warranty", value: brand.warranty ?? "6-year workmanship warranty on every install." },
              { label: "Accreditation", value: brand.accreditation ?? "Authorised installer" },
              ...(brand.established ? [{ label: "Established", value: brand.established }] : []),
              ...(brand.support ? [{ label: "Parts & service", value: brand.support }] : []),
              ...(brand.commonInMelbourne ? [{ label: "Common in Melbourne", value: brand.commonInMelbourne }] : []),
            ]}
          />
        </div>
      </section>

      {/* Key features + Melbourne context · dense info-panels */}
      {(brand.keyFeatures || brand.commonInMelbourne || brand.support) && (
        <section className="brand-info">
          <div className="wrap brand-info__grid brand-info__grid--v2">
            {brand.keyFeatures && brand.keyFeatures.length > 0 && (
              <div className="brand-info__block">
                <span className="ds-eyebrow"><span className="ds-dot" /> Why {brand.name}</span>
                <h2>What sets it apart.</h2>
                <div className="brand-feats">
                  {brand.keyFeatures.map((f, i) => (
                    <div key={f} className="brand-feat">
                      <span className="brand-feat__num" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p>{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="brand-context">
              {brand.resources && brand.resources.length > 0 && (
                <div className="brand-info__cell">
                  <div className="dp-local__lbl">Manufacturer resources</div>
                  <ul className="brand-info__resources">
                    {brand.resources.map((r) => (
                      <li key={r.href}>
                        <a href={r.href} target="_blank" rel="noopener noreferrer">
                          {r.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Our own install photography, when a brand has any wired up in
          brandGallery.ts. The manufacturer-render fallback that used to
          live here is gone — the live Instagram section below shows the
          actual work, which is what that fallback was apologising for. */}
      {installs.length > 0 && (
        <section className="brand-gallery">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> On the tools</span>
              <h2>Our {brand.name} installs.</h2>
              <p>Real jobs we&rsquo;ve finished across Melbourne&rsquo;s south-east, photographed on site, on the day.</p>
            </div>
            <div className="brand-gallery__grid">
              {installs.map((g) => (
                <figure key={g.src} className="brand-gallery__cell">
                  <img src={g.src} alt={g.alt} loading="lazy" width="480" height="360" />
                  {g.caption && <figcaption>{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Live Instagram — posts whose caption mentions this brand. Real
          installs, self-maintaining: post it once, it lands here. */}
      <InstagramFeed
        posts={igPosts}
        eyebrow={`${brand.name} on the tools`}
        heading={`Our latest ${brand.name} jobs.`}
        blurb={`Straight from our Instagram, real ${brand.name} installs across Melbourne's south-east, posted as we finish them.`}
      />

      {/* Product range.
          Single-product brands (e.g. Zonemate — the Milieu zoning system is
          their only product) get the full product detail rendered inline
          instead of a compare grid holding one lonely card. Everyone else
          gets the grouped grid with per-card compare checkboxes. */}
      {brand.products.length === 1 ? (
        <section className="brand-range brand-range--single">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> The {brand.name} system</span>
              <h2>{brand.products[0].name}</h2>
              <p>{brand.products[0].bestFor}.</p>
            </div>

            <div className="brand-single">
              <div className="brand-single__pic">
                {(() => {
                  const ph = productPhoto(brand.products[0], brand);
                  return <SafeImg src={ph.src} fallback={ph.fallback} alt={ph.alt} width="800" height="600" loading="lazy" />;
                })()}
              </div>
              <div className="brand-single__body">
                <div className="brand-single__model">{brand.products[0].model}</div>
                {brand.products[0].capacity && (
                  <div className="brand-single__cap">{brand.products[0].capacity}</div>
                )}
                <p>{brand.products[0].ourTake}</p>
                <Link href={`/brands/${brand.slug}/${brand.products[0].slug}`} className="ds-btn ds-btn--orange">
                  Full spec sheet &amp; pricing →
                </Link>
              </div>
            </div>

            <ProductTabs
              specs={brand.products[0].specs}
              features={brand.products[0].features && brand.products[0].features.length > 0
                ? brand.products[0].features
                : (brand.keyFeatures ?? [])}
              whyWeInstall={brand.products[0].whyWeInstall && brand.products[0].whyWeInstall.length > 0
                ? brand.products[0].whyWeInstall
                : [brand.products[0].ourTake, brand.ourTake].filter(Boolean) as string[]}
              brandName={brand.name}
              brandWarranty={brand.warranty}
            />
          </div>
        </section>
      ) : (
        <section className="brand-range">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> Full range we install</span>
              <h2>The {brand.name} models we install and support.</h2>
              <p>
                Every model below is a product we've installed enough of to have an opinion on.
                Tap through for our take, spec sheet, installed price and what it&rsquo;s best for.
                Tick <strong>Compare</strong> on any 2-4 models to see them side by side.
              </p>
              {brand.slug === "reclaim" && (
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Link href="/brands/reclaim/compare" className="ds-btn ds-btn--orange ds-btn--sm">
                    Open the full Reclaim comparison →
                  </Link>
                  <Link href="/brands/reclaim/models" className="ds-btn ds-btn--ghost ds-btn--sm">
                    Look up a model code →
                  </Link>
                </div>
              )}
            </div>

            <BrandCompare brand={brand} />
          </div>
        </section>
      )}

      {/* Social proof — the short version of /reviews, so brand pages
          carry the same reassurance the home page does. */}
      <ProofStrip
        subject={brand.name}
        heading={`Rated 4.9 by the households we install for.`}
      />

      {/* Quote form + where we install this brand.
          Brand pages used to end on suburb chips and a banner, which meant
          the one page a buyer lands on from "Brivis installer Pakenham"
          had no form on it. Same two-column shape as the service pages. */}
      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Free quote</span>
            <h2>Quote for a {brand.name} system.</h2>
            <p>
              60 seconds. No obligation. Replied within 2 business hours, with the
              model, the installed price and any rebate you qualify for in writing.
            </p>
            <h3 style={{ marginTop: 24, marginBottom: 10, fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Where we install {brand.name}
            </h3>
            <div className="dp-quote__chips">
              {INSTALLER_SUBURB_SLUGS
                .map((slug) => publishedSuburbs.find((s) => s.slug === slug))
                .filter((s): s is NonNullable<typeof s> => Boolean(s))
                .map((s) => (
                  <Link key={s.slug} href={`/brands/${brand.slug}/installers/${s.slug}`}>
                    {brand.name} · {s.name}
                  </Link>
                ))}
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Get a fixed {brand.name} quote.</h2>
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

      <Script id={`ld-crumbs-${brand.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
