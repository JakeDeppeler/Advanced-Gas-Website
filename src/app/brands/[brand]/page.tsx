import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, findBrand } from "@/lib/brands";
import { REVIEWS } from "@/lib/reviews";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { seoMeta } from "@/lib/seo";
import { BrandView } from "@/components/homepage/brand/BrandView";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";

/**
 * A brand page, in the redesign: the "why we use them" step after a product
 * page, as Jake asked. The page it replaced (systems grid, advisors,
 * Instagram, comparisons) is in git history if any of it is wanted back.
 */

export function generateStaticParams() {
  return brands.map((b) => ({ brand: b.slug }));
}

export function generateMetadata({ params }: { params: { brand: string } }): Metadata {
  const brand = findBrand(params.brand);
  if (!brand) notFound();
  return seoMeta({
    title: `${brand.name} Installer, Melbourne South-East`,
    description: `Licensed ${brand.name} installer across Melbourne's south-east. ${brand.productLabel}. Written quotes, VEU rebates handled where eligible, 6-year workmanship warranty.`,
    canonical: `/brands/${brand.slug}`,
    image: brand.photo,
  });
}

export default function BrandPage({ params }: { params: { brand: string } }) {
  const brand = findBrand(params.brand);
  if (!brand) notFound();

  // Reviews that name the brand first, topped up with the rest so there are always three.
  const word = brand.name.split(" ")[0];
  const named = REVIEWS.filter((r) => new RegExp(word, "i").test(`${r.txt} ${r.what} ${r.title}`));
  const reviews = [...named, ...REVIEWS.filter((r) => !named.includes(r))].slice(0, 3);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Brands", url: `${site.url}/brands` },
    { name: brand.name, url: `${site.url}/brands/${brand.slug}` },
  ]);

  return (
    // data-no-reveal: the site-wide scroll reveal hides sections until they animate in; this page, like /find, doesn't use it.
    <div className="ag ag--flat" data-no-reveal>
      <BrandView brand={brand} reviews={reviews} />
      <Script id={`ld-crumbs-${brand.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {brand.faqs && brand.faqs.length > 0 && (
        <Script id={`ld-faq-${brand.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(brand.faqs)) }} />
      )}
    </div>
  );
}
