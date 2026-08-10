import type { MetadataRoute } from "next";
import { site, services } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { publishedSuburbs } from "@/lib/suburbs";
import { brands } from "@/lib/brands";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = site.url;

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.65 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/tools/heat-pump-sizing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/tools/sizing-calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/running-cost-calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/fault-codes`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/hot-water-savings`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/tools/veu-rebate-estimator`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/tools/heating-comparator`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/tools/system-comparison`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/heat-pump-compare`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/brands/reclaim/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/quote`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/service-areas`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/rebates`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/brands`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  const serviceUrls: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
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
          lastModified: now,
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
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    ...services.slice(0, 2).map((s) => ({
      url: `${base}/areas/${sub.slug}/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]);

  // Brand hubs + individual product pages.
  const brandUrls: MetadataRoute.Sitemap = brands.flatMap((b) => [
    {
      url: `${base}/brands/${b.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    },
    ...b.products.map((p) => ({
      url: `${base}/brands/${b.slug}/${p.slug}`,
      lastModified: now,
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
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.72,
      })),
  );

  return [...staticUrls, ...serviceUrls,
    ...systemUrls, ...suburbUrls, ...brandUrls, ...brandSuburbUrls];
}
