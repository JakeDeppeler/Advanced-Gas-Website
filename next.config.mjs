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
