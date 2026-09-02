import { ChromeGate } from "@/components/ChromeGate";
import type { Metadata, Viewport } from "next";
import { Archivo, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { Analytics } from "@/components/Analytics";
import "./globals.css";
import "./design-system.css";
import { site } from "@/lib/site";
import { localBusinessSchema } from "@/lib/schema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";
import { UtilityBar } from "@/components/UtilityBar";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TITLE_SUFFIX } from "@/lib/seo";
import { Reveal } from "@/components/Reveal";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  // Search Console ownership. Set NEXT_PUBLIC_GSC_VERIFICATION to the
  // content value from the "HTML tag" verification option. DNS
  // verification is better where you control the domain, because it
  // survives a redesign; this is here for when you don't.
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } }
    : {}),
  title: {
    // 60 characters is all Google renders. The suffix is short on
    // purpose, see lib/seo.ts, and pages must not repeat it.
    default: "Aircon & Heat Pump Installation Pakenham | Advanced Gas",
    template: `%s${TITLE_SUFFIX}`,
  },
  description:
    "Pakenham aircon and heat pump specialists. VEU rebates handled at the quote. Same-week installs, fixed prices, 6-year workmanship warranty.",
  keywords: [
    "aircon installation Pakenham",
    "heat pump installation Pakenham",
    "VEU rebate Pakenham",
    "VEU heat pump Victoria",
    "split system installation Berwick",
    "ducted aircon Pakenham",
    "Reclaim heat pump installer",
  ],
  alternates: { canonical: "/" },
  // WEB-004. These carried a hardcoded homepage title and description,
  // and App Router does NOT mirror a page's own `title` into
  // `openGraph.title` — so every page that didn't set OG itself shared
  // to Facebook AS the homepage. The dynamic routes now set full OG via
  // seoMeta; static pages set none, so the title and description are
  // omitted here on purpose. A crawler with no og:title falls back to
  // the page's <title>, which is correct per-page. Only the frame
  // stays: type, locale, siteName, card and the default image.
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: site.url,
    siteName: site.name,
    images: [{ url: "/team-photo.webp", width: 1800, height: 1200, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/team-photo.webp"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  /**
   * Favicons cut from the actual logo raster rather than the
   * hand-approximated SVG that was here — that drawing is what Google
   * has been showing in the search results, and it isn't our logo.
   *
   * PNG rather than SVG as the primary: Google's SERP favicon wants a
   * square raster of at least 48px and handles PNG most reliably. The
   * .ico carries 16 through 256 for older crawlers and pinned tabs.
   */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050a30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${manrope.variable} ${archivo.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col font-sans" style={{ background: "var(--bg)" }}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <ScrollToTop />
        <ChromeGate>
          <UtilityBar />
          <Header />
        </ChromeGate>
        <main id="main" className="flex-1">{children}</main>
        <Reveal />
        <ChromeGate>
          <Footer />
          <StickyMobileCTA />
        </ChromeGate>
        <Script
          id="ld-localbusiness"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema()) }}
        />
        {/* Vercel Speed Insights — real-user performance metrics from every
            visit. Beacon-based, no impact on TBT or LCP; script only loads
            once the page is idle. Dashboard at
            vercel.com/[team]/[project]/speed-insights. */}
        <SpeedInsights />
        {/* Page views and referrers. ~1 KB, cookieless, so no consent
            banner. Google Analytics sits alongside it and only loads
            when NEXT_PUBLIC_GA_ID is set. */}
        <VercelAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
