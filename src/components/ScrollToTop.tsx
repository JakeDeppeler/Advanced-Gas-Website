"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Forces window.scrollTo(0,0) when the page changes. Next.js's App Router
 * usually does this, but a few flows leave the user scrolled halfway down
 * the new page — annoying on mobile where the user expects a fresh page to
 * open at the top. Explicit reset.
 *
 * Only a new path counts, not a new query string: the product pages rewrite
 * their query (?size=…&model=…) when a size is picked, so a shared link
 * shows the same size, and resetting on that threw the reader back to the
 * top of the page from wherever they tapped (Nov 2026).
 *
 * Anchor links (URLs with a #hash) are respected — those should scroll
 * to the anchor, not to top.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const last = useRef(pathname);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
