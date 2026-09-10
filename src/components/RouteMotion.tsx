"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Motion between pages.
 *
 * Deliberately done with CSS on an attribute rather than the View Transitions
 * API. App Router navigation resolves asynchronously, so startViewTransition
 * captures its "after" snapshot before the new route has rendered and you get
 * a flash instead of a transition — a broken transition is worse than none.
 *
 *   1. Every navigation lands with a short rise-and-fade on <main>, so a page
 *      arrives rather than replacing the last one instantly. Skipped on first
 *      load, where it would only delay the largest paint.
 *
 *   2. Some navigations get a full-screen sweep — a panel covers the screen,
 *      the route changes underneath it, then it clears. Three kinds:
 *
 *        orange  crossing to the commercial side — hi-vis, left to right
 *        navy    crossing back to the residential side — right to left,
 *                so going back feels like going back
 *        water   the heat pump door — the page fills from the bottom like a
 *                tank, wave on the top edge, then drains upward and away
 *
 * Both respect prefers-reduced-motion, in CSS and here.
 */

export type SweepKind = "orange" | "navy" | "water";

/** Cover / hold / clear, in ms. Keep in step with the keyframes in
 *  design-system.css — the hold is what stops the old page showing under the
 *  panel on a slow route change. */
const TIMING: Record<SweepKind, [number, number, number]> = {
  orange: [300, 130, 420],
  navy: [300, 130, 420],
  water: [560, 120, 640],
};

export function sweepTo(go: () => void, kind: SweepKind = "orange"): void {
  if (typeof document === "undefined") return go();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return go();

  const root = document.documentElement;
  const [cover, hold, clear] = TIMING[kind];
  root.dataset.sweepKind = kind;
  root.dataset.sweep = "in";
  window.setTimeout(() => {
    go();
    window.setTimeout(() => {
      root.dataset.sweep = "out";
      window.setTimeout(() => {
        delete root.dataset.sweep;
        delete root.dataset.sweepKind;
      }, clear);
    }, hold);
  }, cover);
}

export function RouteMotion() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const root = document.documentElement;
    root.dataset.routeEnter = "1";
    const t = window.setTimeout(() => { delete root.dataset.routeEnter; }, 560);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // The panel. Inert and off-screen until data-sweep says otherwise, so it
  // costs nothing on a page nobody sweeps from. The wave is only shown for the
  // water kind — two identical cycles side by side, so sliding it half its own
  // width loops without a seam.
  return (
    <div className="sweep" aria-hidden="true">
      <svg className="sweep__wave" viewBox="0 0 2880 120" preserveAspectRatio="none">
        <path d="M0,70 C240,120 480,20 720,70 C960,120 1200,20 1440,70 C1680,120 1920,20 2160,70 C2400,120 2640,20 2880,70 L2880,120 L0,120 Z" />
      </svg>
    </div>
  );
}
