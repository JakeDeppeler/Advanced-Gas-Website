import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // A preview build on a test address keeps crawlers out altogether; the
  // X-Robots-Tag header in next.config covers anything that gets in anyway.
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/thanks", "/preview", "/portal"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
