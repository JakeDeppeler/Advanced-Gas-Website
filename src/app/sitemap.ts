import type { MetadataRoute } from "next";
import { site, services, suburbs } from "@/lib/site";

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
    { url: `${base}/membership`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
  ];

  const serviceUrls: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const suburbUrls: MetadataRoute.Sitemap = suburbs.flatMap((sub) => [
    {
      url: `${base}/areas/${sub.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...services.slice(0, 2).map((s) => ({
      url: `${base}/areas/${sub.slug}/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]);

  return [...staticUrls, ...serviceUrls, ...suburbUrls];
}
