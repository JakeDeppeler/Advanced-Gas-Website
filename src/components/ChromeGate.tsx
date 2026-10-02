"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site's chrome (utility bar, header, footer, sticky CTA)
 * on the two internal portals, each of which brings its own full-screen
 * shell. Everything else on the site renders it as normal.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/portal") || pathname?.startsWith("/trade")) return null;
  return <>{children}</>;
}
