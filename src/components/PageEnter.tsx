"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The floor under the page-arrival animation.
 *
 * Almost all of that animation is CSS — see "How a page arrives" in
 * design-system.css — because a page that needs JavaScript to become visible
 * is a page that can fail to become visible. This handles the one case CSS
 * cannot: a navigation where React reuses the DOM instead of replacing it.
 * Going from /services/split-system to /services/ducted renders the same
 * component with different props, the elements never remount, and a CSS
 * animation on an element that never remounted does not run again. Flipping an
 * attribute on <html> gives those navigations something to animate on.
 *
 * Skipped on first load, where the CSS has already done it and this would only
 * double the fade.
 *
 * This is what is left of a 258-line component that drove full-screen themed
 * sweeps between pages — a tank filling with water on the way to the heat pump
 * page, a crane lowering a load on the way to commercial. They were good, and
 * they cost a second of waiting on every door, every time, forever.
 */
export function PageEnter() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const root = document.documentElement;
    root.dataset.routeEnter = "1";
    const t = window.setTimeout(() => { delete root.dataset.routeEnter; }, 440);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
