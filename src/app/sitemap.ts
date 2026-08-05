import type { MetadataRoute } from "next";
import { site, services } from "@/lib/site";
import { publishedSuburbs } from "@/lib/suburbs";
import { brands } from "@/lib/brands";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = site.url;

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/quote`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/service-areas`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/rebates`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/brands`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
  ];

  const serviceUrls: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

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

  return [...staticUrls, ...serviceUrls, ...suburbUrls, ...brandUrls];
}
