"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site's chrome (utility bar, header, footer, sticky CTA)
 * on the team portal, which brings its own full-screen shell. Everything
 * else on the site renders it as normal.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/portal")) return null;
  return <>{children}</>;
}
