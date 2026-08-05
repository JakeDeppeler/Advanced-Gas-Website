import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, findBrand } from "@/lib/brands";
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
  const title = `${brand.name} Installer Melbourne — ${brand.tagline} | Advanced Gas & Aircon`;
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

  // Group products by category label so the page reads as a coherent range
  // rather than a flat SKU dump.
  const grouped = brand.products.reduce<Record<string, typeof brand.products>>((acc, p) => {
    (acc[p.categoryLabel] ||= []).push(p);
    return acc;
  }, {});
  const groupOrder = Object.keys(grouped);

  return (
    <div className="page-detail page-brand">
      <section className="dp-hero">
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

      {/* Our-take strip */}
      <section className="dp-local">
        <div className="wrap">
          <div className="dp-local__grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Why we install it</div>
              <p>{brand.ourTake}</p>
            </div>
            <div className="dp-local__cell">
              <div className="dp-local__lbl">Accreditation</div>
              <p>{brand.accreditation ?? "Authorised installer"}</p>
              <div className="dp-local__lbl" style={{ marginTop: 16 }}>Range</div>
              <p>{brand.productLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product range grouped by category */}
      <section className="brand-range">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Full range we install</span>
            <h2>The {brand.name} models we install and support.</h2>
            <p>
              Every SKU below is a product we've installed enough of to have an opinion on.
              Tap through for our take, spec sheet, installed price and what it&rsquo;s best for.
            </p>
          </div>

          {groupOrder.map((groupName) => (
            <div key={groupName} className="brand-group">
              <h3 className="brand-group__title">{groupName}</h3>
              <div className="brand-group__grid">
                {grouped[groupName].map((p) => (
                  <Link key={p.slug} href={`/brands/${brand.slug}/${p.slug}`} className="brand-card">
                    <div className="brand-card__head">
                      <h4>{p.name}</h4>
                      <span className="brand-card__model">{p.model}</span>
                    </div>
                    {p.capacity && <div className="brand-card__cap">{p.capacity}</div>}
                    <p className="brand-card__take">{p.ourTake}</p>
                    <div className="brand-card__foot">
                      {p.veuEligible && <span className="brand-card__pill brand-card__pill--rebate">VEU rebate eligible</span>}
                      {p.installedPriceFrom && <span className="brand-card__price">from {p.installedPriceFrom}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Where we install this brand — 12 suburb combo links */}
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
