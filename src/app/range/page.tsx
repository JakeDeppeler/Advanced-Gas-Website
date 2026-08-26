import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, categoryPhoto, rangeFilterType } from "@/lib/brands";
import { TIERS, SYSTEM_STYLES } from "@/lib/waterFiltration";
import { breadcrumbSchema } from "@/lib/schema";
import { pageTitle, metaDescription } from "@/lib/seo";
import { RangeExplorer, type RangeItem } from "@/components/RangeExplorer";
import { QuoteForm } from "@/components/QuoteForm";
import { RangeFinder } from "@/components/RangeFinder";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import "../detail.css";
import "./range.css";

/**
 * The full range, in one filterable list.
 *
 * The brand pages each show their own models and the service pages point
 * at the brands, but nothing let somebody stand back and see all of it
 * at once — which is what "show me the range" actually means when a
 * customer says it.
 *
 * Built off the same catalogue the brand pages render, so a model added
 * there appears here without anybody remembering to add it twice.
 */

export const metadata: Metadata = {
  title: pageTitle("The full range — every model we install"),
  description: metaDescription(
    "Every air conditioner, heat pump, gas heater and hot water system we install, filterable by brand, system type and VEU rebate eligibility. Installed prices where we publish them.",
  ),
  keywords: [
    "air conditioner models melbourne",
    "heat pump models",
    "ducted heating models",
    "veu eligible systems",
    "advanced gas range",
  ],
  alternates: { canonical: "/range" },
};

const catalogue: RangeItem[] = brands.flatMap((b) =>
  b.products.map((p) => {
    const fallback = categoryPhoto[p.category];
    return {
      slug: p.slug,
      brandSlug: b.slug,
      brand: b.name,
      name: p.name,
      model: p.model,
      category: p.category,
      categoryLabel: rangeFilterType(p.category, p.categoryLabel),
      capacity: p.capacity,
      veuEligible: p.veuEligible,
      installedPriceFrom: p.installedPriceFrom,
      bestFor: p.bestFor,
      photo: p.photo ?? fallback?.src ?? "",
      photoFallback: p.photo ? (fallback?.src ?? undefined) : (fallback?.fallback ?? undefined),
      accent: b.accent,
    };
  }),
);

/**
 * Water filtration belongs in the range too — it's a thing we install and
 * a customer looking at "everything we do" shouldn't have to know it
 * lives in its own section. The whole-house units come from the system
 * list (they're the ones with a brand and a model); the rest of the
 * categories go in as one card each, pointing at their own page.
 */
const filtration: RangeItem[] = [
  ...SYSTEM_STYLES.map((sy) => ({
    slug: "",
    brandSlug: "",
    brand: sy.brand,
    name: sy.name,
    model: sy.style,
    category: "filtration",
    categoryLabel: "Water filtration",
    veuEligible: false,
    bestFor: sy.blurb,
    photo: sy.photo,
    photoFallback: "/water-filtration-whole-home-diagram.webp",
    accent: "#00b0ed",
    href: "/water-filtration/whole-home",
  })),
  ...TIERS.filter((t) => t.slug !== "whole-home").map((t) => ({
    slug: "",
    brandSlug: "",
    brand: "Puretec",
    name: t.label,
    model: t.tagline,
    category: "filtration",
    categoryLabel: "Water filtration",
    veuEligible: false,
    bestFor: t.fitsWhere,
    photo: t.productPhoto,
    photoFallback: t.diagram,
    accent: "#00b0ed",
    href: `/water-filtration/${t.slug}`,
  })),
];

const items: RangeItem[] = [...catalogue, ...filtration];

export default function RangePage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "The range", url: `${site.url}/range` },
  ]);

  const veu = items.filter((i) => i.veuEligible).length;
  const brandCount = new Set(items.map((i) => i.brand)).size;
  const typeCount = new Set(items.map((i) => i.categoryLabel)).size;

  return (
    <div className="page-detail page-range">
      <Script id="ld-range-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">The range</span>
          </nav>
          <div className="dp-hero__copy">
            <div className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot" /> Everything we install
            </div>
            <h1>
              The full <em>range</em>.
            </h1>
            <p className="dp-hero__sub">
              Every model we fit, in one list. Filter it by brand, by what the system actually is,
              or by whether it takes the VEU rebate — then open the one you want for specs and an
              installed price.
            </p>
          </div>
          <ul className="dp-hero__at">
            <li><strong>{items.length}</strong><span>Models we install</span></li>
            <li><strong>{brandCount}</strong><span>Brands</span></li>
            <li><strong>{typeCount}</strong><span>System types</span></li>
            <li><strong>{veu}</strong><span>VEU rebate eligible</span></li>
          </ul>
        </div>
      </section>

      <section className="rangesec">
        <div className="wrap">
          <RangeExplorer items={items} />
        </div>
      </section>

      {/* Nobody should have to pick a model number off a list. This is
          the way out of the grid for somebody who knows what they want
          and not what it's called — the filter rail has a search field
          for that too, and this is the same question asked properly. */}
      <section className="quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange">
                  <span className="ds-dot ds-dot--on-orange" /> Too many options?
                </span>
                <h2>Tell us the room, not the model.</h2>
                <p className="quotesec__lede">
                  Ninety-odd models is a lot to read. Two questions and we&rsquo;ll point you at the
                  right kind of system — then send the room through and you&rsquo;ll get the model
                  and what it costs installed, including when a cheaper one does the job.
                </p>
                <RangeFinder />
                <p className="quotesec__finep">
                  Licensed plumbers · {site.licences.refrigeration} · 6-year workmanship warranty.
                </p>
              </div>
              <QuoteForm presetService="air-conditioning-installation" />
            </div>
          </div>
        </div>
      </section>

      <ReviewMarquee heading="Reviews from households across the south-east." />
    </div>
  );
}
