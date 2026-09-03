/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  /**
   * Permanent redirects for URLs that shipped and then moved.
   *
   * Everything here was live on www.advancedgas.com.au before it was
   * renamed, so these are real addresses that Google has crawled and
   * that could be sitting in someone's bookmarks or in a quote email.
   * 308 rather than 302: the move is permanent and we want the ranking
   * to follow it to the new address rather than being split across two.
   *
   * Keep this list append-only. A redirect costs nothing to serve and
   * removing one turns a working link back into a 404 years later.
   */
  async redirects() {
    return [
      // ---- WEB-002: apex host → www, 308 ----
      // Both advancedgas.com.au and www.advancedgas.com.au were indexed
      // as separate URLs, splitting authority down the middle (the apex
      // ranked position 2.56, www 16.17 — same page). Canonicals,
      // sitemap and robots already point at www; this makes the apex
      // itself redirect there in the deploy, so the fix does not depend
      // on the Vercel dashboard being set. Preview deploys use a
      // *.vercel.app host, so this only fires on the bare production
      // apex and never on previews or localhost.
      {
        source: "/:path*",
        has: [{ type: "host", value: "advancedgas.com.au" }],
        destination: "https://www.advancedgas.com.au/:path*",
        permanent: true,
      },

      // ---- WEB-008 B1/B2: prune the machine-generated estate ----
      // 53 suburb×service sub-pages and the brand×installer×suburb pages
      // produced a handful of clicks between them and flattened internal
      // link equity across the whole site — every page linking to every
      // other page so nothing concentrated anywhere. Both route families
      // are removed; these two rules 301 every URL in them to the hub
      // that carries the real content, so the link equity follows rather
      // than being thrown away with a noindex. Named params pass through,
      // so one rule covers every combination.
      {
        source: "/areas/:suburb/:service",
        destination: "/areas/:suburb",
        permanent: true,
      },
      {
        source: "/brands/:brand/installers/:suburb",
        destination: "/brands/:brand",
        permanent: true,
      },

      // Retired Reclaim 215 L split — it sat between the 160 and 250 on
      // the same pump and only muddied the range, so its page 301s to the
      // Reclaim hub.
      { source: "/brands/reclaim/co2-split-215-5kw", destination: "/brands/reclaim", permanent: true },

      // ---- WEB-010: legacy Wix URLs ----
      // /plumbing-services/ held rankings and inbound links on the old
      // site and now 404s. Sent to the gas & plumbing service page, the
      // closest equivalent. This is the only legacy URL I can confirm
      // from the rendered site; the full old-sitemap map needs the Wix
      // export or a Wayback crawl, and anything with no equivalent
      // should go to its nearest category page, not the homepage.
      {
        source: "/plumbing-services",
        destination: "/services/gas-plumbing",
        permanent: true,
      },

      // ---- Water softeners retired ----
      // The page argued that Melbourne mains water is soft enough that
      // most people don't need one, which is true and is why the category
      // came out. It was in the sitemap, so the URL goes to the section
      // rather than a 404.
      {
        source: "/water-filtration/water-softeners",
        destination: "/water-filtration",
        permanent: true,
      },

      // ---- Water filtration moved out of gas plumbing ----
      // It shipped as three systems under /services/gas-plumbing and got
      // its own section a day later, because it isn't the same kind of
      // sale as a broken heater. Short-lived URLs, but they were in a
      // sitemap Google had already been handed.
      {
        source: "/services/gas-plumbing/whole-home-filtration",
        destination: "/water-filtration/whole-home",
        permanent: true,
      },
      {
        source: "/services/gas-plumbing/hot-water-filtration",
        destination: "/water-filtration/hot-water",
        permanent: true,
      },
      {
        source: "/services/gas-plumbing/under-sink-filtration",
        destination: "/water-filtration/under-sink",
        permanent: true,
      },
      // ---- Reclaim tank naming, corrected against Reclaim's own docs ----
      // SSQ is "stainless steel squat", a short wide tank. We had it as
      // 316-grade marine stainless, which it never was.
      {
        source: "/brands/reclaim/co2-split-315-stainless-316",
        destination: "/brands/reclaim/co2-split-315-stainless-squat",
        permanent: true,
      },
      // The co-op tank is Earthworker, from the Earthworker Energy
      // Manufacturing Cooperative in Morwell. We had it as "Earthworks".
      {
        source: "/brands/reclaim/co2-split-250-earthworks",
        destination: "/brands/reclaim/co2-split-250-earthworker",
        permanent: true,
      },
      {
        source: "/brands/reclaim/co2-split-315-earthworks",
        destination: "/brands/reclaim/co2-split-315-earthworker",
        permanent: true,
      },
      // Every Reclaim CO2 split turned out to be a 5 kW, so a product
      // page whose whole identity was "the 315 with the 5 kW" became a
      // duplicate of the 315 stainless. Sent there rather than to the
      // glass-lined, because stainless is the one we install most.
      {
        source: "/brands/reclaim/co2-split-315-5kw",
        destination: "/brands/reclaim/co2-split-315-stainless",
        permanent: true,
      },

      // ---- Product renders that moved from PNG to WebP ----
      // These are in Google Images and can be hotlinked from anywhere,
      // and the filename had to change to get past the one-year
      // immutable cache header on /public.
      {
        source: "/commercial.png",
        destination: "/commercial-v3.webp",
        permanent: true,
      },
      {
        source: "/mitsubishi-msz-ap-series-v2.png",
        destination: "/mitsubishi-msz-ap-series-v2-v3.webp",
        permanent: true,
      },
      {
        source: "/mitsubishi-msz-ap-wall-split-v2.png",
        destination: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
        permanent: true,
      },
      {
        source: "/mitsubishi-pea-m-ducted-v2.png",
        destination: "/mitsubishi-pea-m-ducted-v2-v3.webp",
        permanent: true,
      },
    ];
  },

  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    const immutable = { key: "Cache-Control", value: "public, max-age=31536000, immutable" };

    return [
      { source: "/:path*", headers: security },
      // Content-addressed build assets — safe to cache forever.
      { source: "/_next/static/:path*", headers: [immutable] },
      // Images (fingerprint-free but replaced infrequently). One-year cache with
      // stale-while-revalidate so repeat visits don't re-download 4MB of hero photos.
      {
        source: "/:all*(webp|avif|jpg|jpeg|png|svg|ico|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
