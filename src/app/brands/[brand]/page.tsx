import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, findBrand } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import { BrandCompare } from "@/components/BrandCompare";
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

export default function BrandPage({ params }: { params: { brand: string } }) {
  const brand = findBrand(params.brand);
  if (!brand) notFound();

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
        </div>
      </section>

      {/* At-a-glance strip (4 cells): our-take, accreditation, warranty, established */}
      <section className="dp-local">
        <div className="wrap">
          <div className="dp-local__grid">
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Why we install it</div>
              <p>{brand.ourTake}</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Accreditation</div>
              <p>{brand.accreditation ?? "Authorised installer"}</p>
            </div>
            {brand.warranty && (
              <div className="dp-local__cell">
                <div className="dp-local__lbl">Warranty</div>
                <p>{brand.warranty}</p>
              </div>
            )}
            {brand.established && (
              <div className="dp-local__cell">
                <div className="dp-local__lbl">Established</div>
                <p>{brand.established}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Key features + Melbourne context · dense info-panels */}
      {(brand.keyFeatures || brand.commonInMelbourne || brand.support) && (
        <section className="brand-info">
          <div className="wrap brand-info__grid">
            {brand.keyFeatures && brand.keyFeatures.length > 0 && (
              <div className="brand-info__block">
                <span className="ds-eyebrow"><span className="ds-dot" /> Why {brand.name}</span>
                <h2>What sets it apart.</h2>
                <ul className="brand-info__list">
                  {brand.keyFeatures.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
            <div className="brand-info__aside">
              {brand.commonInMelbourne && (
                <div className="brand-info__cell">
                  <div className="dp-local__lbl">Common in Melbourne</div>
                  <p>{brand.commonInMelbourne}</p>
                </div>
              )}
              {brand.support && (
                <div className="brand-info__cell">
                  <div className="dp-local__lbl">Parts &amp; service</div>
                  <p>{brand.support}</p>
                </div>
              )}
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

      {/* Per-brand install gallery — each brand supplies its own tile set
          so brand hubs feel distinct rather than sharing the same 6 photos.
          Tiles with a blank `src` render as a "photo goes here" placeholder
          so Jake can drop the real image in without touching code. */}
      {brand.gallery && brand.gallery.length > 0 && (
        <section className="brand-gallery">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> On the tools</span>
              <h2>Recent {brand.name} installs around Melbourne&rsquo;s south-east.</h2>
              <p>
                Real jobs we&rsquo;ve completed · no manufacturer catalogue shots.
                Every one photographed on the day the compliance certificate was signed.
              </p>
            </div>
            <div className="brand-gallery__grid">
              {brand.gallery.map((g, i) =>
                g.src ? (
                  <figure key={`${g.src}-${i}`} className="brand-gallery__cell">
                    <img src={g.src} alt={g.alt} loading="lazy" width="480" height="360" />
                  </figure>
                ) : (
                  <figure key={`blank-${i}`} className="brand-gallery__cell brand-gallery__cell--blank" aria-hidden="true">
                    <div className="brand-gallery__blank">
                      <span className="brand-gallery__blank-icon">+</span>
                      <span className="brand-gallery__blank-lbl">Photo</span>
                    </div>
                  </figure>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* Product range grouped by category — client component wraps the
          grid to add per-card compare checkboxes + a bottom drawer that
          opens a side-by-side spec table. */}
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
          </div>

          <BrandCompare brand={brand} />
        </div>
      </section>

      {/* Where we install this brand · 12 suburb combo links */}
      <section className="dp-quote" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div className="wrap">
          <div className="ds-section-head" style={{ marginBottom: 24 }}>
            <span className="ds-eyebrow"><span className="ds-dot" /> Local {brand.name} installer</span>
            <h2 style={{ marginBottom: 6 }}>Where we install {brand.name}.</h2>
            <p>
              Every one of these suburbs has {brand.name} systems we&rsquo;ve installed and continue to service.
              Tap through to see what we typically install in each area.
            </p>
          </div>
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
