import type { MetadataRoute } from "next";
import { site, services } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { publishedSuburbs } from "@/lib/suburbs";
import { brands } from "@/lib/brands";
import { detailedCodes, faultSlug } from "@/lib/faultCodes";

/**
 * No `lastModified` anywhere in here, deliberately.
 *
 * It used to be `new Date()` on all 406 URLs, which told Google that
 * every page on the site changed on every deploy. Google's own guidance
 * is that they only use lastmod when it is consistently accurate, and
 * they ignore it outright on sites where it obviously isn't. A blanket
 * build timestamp is the textbook way to get it ignored, and it is
 * worse than useless when 425 of 432 pages aren't indexed yet and we
 * need every crawl signal we send to be believed.
 *
 * We don't track per-page content dates, so omitting the field is the
 * honest option. If we ever want it back, the right source is the git
 * commit date of the file that produces each page, resolved at build
 * time, not the moment the build ran.
 *
 * `changeFrequency` and `priority` are kept because they cost nothing.
 * Google ignores both; some smaller crawlers still read them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/gallery`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/reviews`, changeFrequency: "weekly", priority: 0.65 },
    { url: `${base}/tools`, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/tools/heat-pump-sizing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/tools/sizing-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/running-cost-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/fault-codes`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/hot-water-savings`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/tools/veu-rebate-estimator`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/tools/heating-comparator`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/tools/system-comparison`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/heat-pump-compare`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/brands/reclaim/compare`, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/brands/reclaim/models`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/quote`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/service-areas`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/rebates`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/upgrade-or-repair`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/services/heat-pump-installation/split-heat-pump`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/heat-pump-installation/all-in-one`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/range`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/water-filtration`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/water-filtration/whole-home`, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/water-filtration/hot-water`, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/water-filtration/under-sink`, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/water-filtration/rainwater-uv`, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/water-filtration/range`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/brands`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // One entry per written-up fault code. These are the best-shaped
  // searches on the site: someone with a broken appliance and a code in
  // front of them. Only codes with long-form content have a page.
  const faultUrls: MetadataRoute.Sitemap = detailedCodes().map((f) => ({
    url: `${base}/tools/fault-codes/${faultSlug(f.brand)}/${faultSlug(f.code)}`,
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  const serviceUrls: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  // One entry per system page (/services/<service>/<system>). Only the
  // ones with long-form content — the route 404s the rest, so listing
  // them would advertise dead URLs.
  const systemUrls: MetadataRoute.Sitemap = Object.entries(serviceContent).flatMap(
    ([slug, c]) =>
      (c.systems ?? [])
        .filter((sys) => sys.intro)
        .map((sys) => ({
          url: `${base}/services/${slug}/${sys.id}`,
          changeFrequency: "monthly" as const,
          priority: 0.8,
        })),
  );

  // Only sitemap-emit the suburbs we've published in the current SEO wave.
  // Draft entries live in suburbs.ts with published:false so we can iterate on
  // their per-suburb hooks without exposing thin content to Google.
  const suburbUrls: MetadataRoute.Sitemap = publishedSuburbs.flatMap((sub) => [
    {
      url: `${base}/areas/${sub.slug}`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    ...services.slice(0, 2).map((s) => ({
      url: `${base}/areas/${sub.slug}/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]);

  // Brand hubs + individual product pages.
  const brandUrls: MetadataRoute.Sitemap = brands.flatMap((b) => [
    {
      url: `${base}/brands/${b.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    },
    ...b.products.map((p) => ({
      url: `${base}/brands/${b.slug}/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ]);

  // Brand × suburb combo pages — 6 brands × 12 top suburbs = 72 URLs.
  // Slug list kept in sync with TOP_SUBURB_SLUGS in the combo page template.
  const TOP_SUBURB_SLUGS = [
    "pakenham", "officer", "beaconsfield", "berwick", "narre-warren",
    "endeavour-hills", "hallam", "hampton-park", "cranbourne", "clyde-north",
    "drouin", "warragul",
  ];
  const brandSuburbUrls: MetadataRoute.Sitemap = brands.flatMap((b) =>
    TOP_SUBURB_SLUGS
      .filter((slug) => publishedSuburbs.some((s) => s.slug === slug))
      .map((slug) => ({
        url: `${base}/brands/${b.slug}/installers/${slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.72,
      })),
  );

  return [...staticUrls, ...serviceUrls, ...faultUrls,
    ...systemUrls, ...suburbUrls, ...brandUrls, ...brandSuburbUrls];
}
