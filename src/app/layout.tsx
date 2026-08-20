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
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: site.url,
    siteName: site.name,
    title: "Aircon & Heat Pump Installation | Advanced Gas, Pakenham",
    description:
      "Family-run Pakenham aircon and heat pump specialists. VEU rebates up to $5,000, we do the paperwork.",
    images: [{ url: "/team-photo.webp", width: 1800, height: 1200, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aircon & Heat Pump Installation | Advanced Gas, Pakenham",
    description: "VEU rebates up to $5,000, we do the paperwork.",
    images: ["/team-photo.webp"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
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
        <UtilityBar />
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <StickyMobileCTA />
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
