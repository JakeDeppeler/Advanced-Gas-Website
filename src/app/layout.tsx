import type { Metadata, Viewport } from "next";
import { Archivo, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./design-system.css";
import { site } from "@/lib/site";
import { localBusinessSchema } from "@/lib/schema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";
import { UtilityBar } from "@/components/UtilityBar";

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
  title: {
    default: "Aircon & Heat Pump Installation Pakenham | VEU Rebates | Advanced Gas & Aircon",
    template: "%s | Advanced Gas & Aircon",
  },
  description:
    "Pakenham aircon and heat pump specialists. VEU rebates up to $5,000 off aircon and $2,600 off heat pumps. Same-week installs, fixed quotes, 6-year warranty.",
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
    title: "Aircon & Heat Pump Installation | Advanced Gas & Aircon Pakenham",
    description:
      "Family-run Pakenham aircon and heat pump specialists. VEU rebates up to $5,000 — we do the paperwork.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aircon & Heat Pump Installation | Advanced Gas & Aircon Pakenham",
    description: "VEU rebates up to $5,000 — we do the paperwork.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050a30",
  width: "device-width",
  initialScale: 1,
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
      </body>
    </html>
  );
}
