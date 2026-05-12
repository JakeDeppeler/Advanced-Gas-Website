import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { site } from "@/lib/site";
import { localBusinessSchema } from "@/lib/schema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Aircon & Heat Pump Installation South-East Vic & Gippsland | Advanced Gas & Aircon",
    template: "%s | Advanced Gas & Aircon",
  },
  description:
    "Licensed aircon and heat pump installation across South-East Victoria and Gippsland. Same-week installs, fixed-price quotes, VEU rebates from $33, 6-year workmanship warranty.",
  keywords: [
    "aircon installation Pakenham",
    "air conditioning installation Warragul",
    "heat pump installation Gippsland",
    "heat pump hot water Pakenham",
    "split system installation Berwick",
    "ducted aircon South-East Victoria",
    "VEU heat pump rebate",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: site.url,
    siteName: site.name,
    title: "Aircon & Heat Pump Installation | Advanced Gas & Aircon",
    description:
      "Licensed aircon and heat pump specialists across South-East Vic & Gippsland. Free same-day quotes, VEU heat pump rebates from $33, 6-year warranty.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aircon & Heat Pump Installation | Advanced Gas & Aircon",
    description: "Licensed aircon and heat pump specialists across South-East Vic & Gippsland.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [{ url: "/logo-mark.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E1638",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white"
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
