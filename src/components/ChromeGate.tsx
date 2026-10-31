"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site's chrome (utility bar, header, footer, sticky CTA)
 * on the two internal portals, each of which brings its own full-screen
 * shell. Everything else on the site renders it as normal.
 */
export function ChromeGate({ children, legacy = false }: { children: React.ReactNode; legacy?: boolean }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/portal") || pathname?.startsWith("/trade")) return null;
  if (legacy && pathname && ownChrome(pathname)) return null;
  return <>{children}</>;
}

/**
 * Pages built on the homepage redesign, which bring their own header and
 * footer (components/homepage). Homepage only for now, plus the /find product
 * pages that open from it. `legacy` marks the old chrome that gives way.
 */
function ownChrome(pathname: string) {
  return pathname === "/" || pathname.startsWith("/find/");
}
