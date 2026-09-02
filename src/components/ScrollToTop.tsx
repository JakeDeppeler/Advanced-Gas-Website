"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * Forces window.scrollTo(0,0) on every pathname / search-param change.
 * Next.js's App Router usually does this, but a few flows leave the
 * user scrolled halfway down the new page — annoying on mobile where
 * the user expects a fresh page to open at the top. Explicit reset.
 *
 * Anchor links (URLs with a #hash) are respected — those should scroll
 * to the anchor, not to top.
 */
function ScrollToTopInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, searchParams]);

  return null;
}

export function ScrollToTop() {
  // useSearchParams needs Suspense wrapping under App Router.
  return (
    <Suspense fallback={null}>
      <ScrollToTopInner />
    </Suspense>
  );
}
