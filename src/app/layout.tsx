import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { site } from "@/lib/site";
import { localBusinessSchema } from "@/lib/schema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Aircon & Heat Pump Installation Melbourne | Advanced Gas",
    template: "%s | Advanced Gas Melbourne",
  },
  description:
    "Licensed aircon and heat pump installation across Melbourne. Same-week installs, upfront fixed pricing, 6-year workmanship warranty. Get a free quote today.",
  keywords: [
    "aircon installation Melbourne",
    "air conditioning installation Melbourne",
    "heat pump installation Melbourne",
    "heat pump hot water Melbourne",
    "split system installation Melbourne",
    "ducted aircon Melbourne",
    "VEU heat pump rebate",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: site.url,
    siteName: site.name,
    title: "Aircon & Heat Pump Installation Melbourne | Advanced Gas",
    description:
      "Licensed Melbourne aircon and heat pump specialists. Free same-day quotes, VEU heat pump rebates from $33, 6-year warranty.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aircon & Heat Pump Installation Melbourne | Advanced Gas",
    description: "Licensed Melbourne aircon and heat pump specialists. Free same-day quotes.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#155cb8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
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
      </body>
    </html>
  );
}
