import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { seoMeta } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { REVIEWS, RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import { allProductParams, findSystem, money, PHOTO, REVIEW_MATCH, tierModels, BRAND_SLUGS } from "@/lib/homepage/data";
import { badgesFor, keyFigures } from "@/lib/homepage/badges";
import { findBrand, findProduct } from "@/lib/brands";
import { HomeHeader } from "@/components/homepage/HomeHeader";
import { SiteModeStrip } from "@/components/Header";
import { ProductView, type PModel, type PBrand } from "@/components/homepage/ProductView";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";

/**
 * The product page an option in "Find your system" opens. A real URL rather
 * than the prototype's in-page view, so it can be shared and indexed; the
 * customer's answers ride in the query string and the canonical drops them.
 */

type Params = { system: string; tier: string };

export const dynamicParams = false;
export function generateStaticParams() {
  return allProductParams();
}

function lookup(p: Params) {
  const ref = findSystem(p.system);
  const tier = ref?.sys.tiers.find((t) => t.slug === p.tier);
  return ref && tier ? { ...ref, tier } : null;
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const found = lookup(params);
  if (!found) notFound();
  const { sys, tier } = found;
  const price = typeof tier.price === "number" ? ` From ${money(tier.price)} installed, GST included.` : " Fixed price in writing after a free site check.";
  return seoMeta({
    title: `${tier.tier} ${sys.label.toLowerCase()}: ${tier.brand} ${tier.model}`,
    description: `${tier.brand} ${tier.model} installed by our own crews across Melbourne's south-east.${price} 6-year workmanship warranty.`,
    canonical: `/find/${sys.slug}/${tier.slug}`,
    image: PHOTO.team,
    // The model is the end of the title and the part that tells these apart.
    absolute: true,
  });
}

export default function FindProductPage({ params }: { params: Params }) {
  const found = lookup(params);
  if (!found) notFound();
  const { cat, sys, tier } = found;

  const match = REVIEW_MATCH[sys.faq];
  let reviews = REVIEWS.filter((r) => match.test(r.what) || match.test(r.txt));
  if (reviews.length < 3) reviews = [...reviews, ...REVIEWS.filter((r) => !reviews.includes(r))];

  // Resolved here so the brand catalogue stays out of the browser bundle.
  const models: PModel[] = tierModels(sys, tier).flatMap(([b, slug, chip]) => {
    const found = findProduct(b, slug);
    if (!found) return [];
    const p = found.product;
    const room = p.specs?.find((x) => /room size|suits/i.test(x.label))?.value;
    return [{
      slug, chip, name: p.name, code: p.model ?? p.name, bestFor: p.bestFor, room,
      href: `/brands/${b}/${slug}`, specs: (p.specs ?? []).map((x) => ({ label: x.label, value: x.value })),
      take: p.ourTake, badges: badgesFor(p, tier.feats), keys: keyFigures(p.specs),
      features: p.features, why: p.whyWeInstall,
    }];
  });
  const b = BRAND_SLUGS[tier.brand] ? findBrand(BRAND_SLUGS[tier.brand]) : null;
  const brand: PBrand | null = b ? {
    name: b.name, page: `/brands/${b.slug}`, site: b.resources?.[0],
    tagline: b.tagline, sub: b.heroSub, origin: b.origin, photo: b.photo, photoAlt: b.photoAlt, photoScene: b.photoScene,
    features: b.keyFeatures?.slice(0, 3), facts: b.heroFacts?.slice(0, 3),
  } : null;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: cat.label, url: `${site.url}/?find=${cat.id}` },
    { name: sys.label, url: `${site.url}/?find=${sys.slug}` },
    { name: `${tier.brand} ${tier.model}`, url: `${site.url}/find/${sys.slug}/${tier.slug}` },
  ]);

  return (
    <>
    <SiteModeStrip tabs={false} />
    <div className="ag ag--flat" id="top" data-no-reveal>
      <HomeHeader variant="flat" />
      <ProductView
        system={sys.slug} tier={tier.slug} reviews={reviews.slice(0, 3)} rating={RATING_TEXT} count={RATING_SUMMARY.count}
        models={models} brand={brand} tierBadges={badgesFor({}, tier.feats)}
      />
      <Script id="ld-find-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
    </>
  );
}
