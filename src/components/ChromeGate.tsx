"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site's chrome (utility bar, header, footer, sticky CTA)
 * on the two internal portals, each of which brings its own full-screen
 * shell. Everything else on the site renders it as normal.
 */
export function ChromeGate({ children, legacy = false, header = false }: { children: React.ReactNode; legacy?: boolean; header?: boolean }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/portal") || pathname?.startsWith("/trade")) return null;
  if (legacy && pathname && (ownChrome(pathname) || (header && ownHeader(pathname)))) return null;
  return <>{children}</>;
}

/**
 * Pages that draw the homepage's floating pill header over their own photo
 * hero but keep the rest of the site chrome: the suburb pages (Jake, Nov
 * 2026: "the header in the same pill as the home screen"). Unlike the
 * homepage they keep the sticky call bar on phones, since getting someone
 * local on the phone is what those pages are for.
 */
function ownHeader(pathname: string) {
  // The service pages joined them once rebuilt from the homepage's own
  // sections (Jake, Nov 2026: "they need to resemble the home page more"),
  // then the other inside pages with the homepage's hero (PageHero.tsx).
  // Exact paths: a page's children (/brands/<brand>, /tools/<tool>,
  // /blog/<post>) keep the flat header until they move too.
  return pathname.startsWith("/areas/") || pathname.startsWith("/services/") || PAGE_HERO.has(pathname.replace(/\/$/, ""));
}

/** Pages whose top is PageHero, with the pill header over its photo. */
const PAGE_HERO = new Set([
  "/cooling", "/heating", "/hot-water",
  "/about", "/reviews", "/contact", "/brands", "/tools", "/service-areas",
  "/gallery", "/blog", "/rebates", "/membership", "/upgrade-or-repair",
  // Both drawn by app/legal/LegalPage.tsx.
  "/privacy", "/terms",
  // The commercial front page; its four sub-pages keep the flat header.
  "/commercial",
]);

/**
 * Pages built on the homepage redesign, which bring their own header
 * (components/homepage). Homepage only for now, plus the /find product pages
 * that open from it. `legacy` marks the old chrome that gives way; the site
 * footer stays on every page.
 */
function ownChrome(pathname: string) {
  return pathname === "/" || pathname.startsWith("/find/");
}
