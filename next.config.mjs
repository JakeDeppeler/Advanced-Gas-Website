/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
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
