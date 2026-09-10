"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Motion between pages.
 *
 * Two things, both deliberately done with CSS on an attribute rather than the
 * View Transitions API. App Router navigation resolves asynchronously, so
 * startViewTransition captures its "after" snapshot before the new route has
 * rendered and you get a flash instead of a transition — a broken transition
 * is worse than none.
 *
 *   1. Every navigation lands with a short rise-and-fade on <main>, so a page
 *      arrives rather than replacing the last one instantly. Skipped on first
 *      load, where it would only delay the largest paint.
 *
 *   2. Crossing between the residential and commercial sides sweeps a hi-vis
 *      orange panel over the screen. That crossing is the one navigation on
 *      the site where the reader genuinely changes context, and it should feel
 *      like it — see sweepTo(), driven by the switcher in the header.
 *
 * Both respect prefers-reduced-motion, in CSS.
 */

/** How long the orange panel takes to cover the screen, in ms. Keep in step
 *  with the mode-sweep animation in design-system.css. */
const SWEEP_IN = 300;
const SWEEP_HOLD = 130;
const SWEEP_OUT = 420;

/**
 * Sweep the orange panel across, run `go` under it, then sweep it away.
 * Falls back to navigating immediately if the reader has asked for less
 * motion, or if anything about the timing goes wrong.
 */
export function sweepTo(go: () => void): void {
  if (typeof document === "undefined") return go();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return go();

  const root = document.documentElement;
  root.dataset.sweep = "in";
  window.setTimeout(() => {
    go();
    window.setTimeout(() => {
      root.dataset.sweep = "out";
      window.setTimeout(() => { delete root.dataset.sweep; }, SWEEP_OUT);
    }, SWEEP_HOLD);
  }, SWEEP_IN);
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

  // The panel itself. Inert and invisible until data-sweep says otherwise, so
  // it costs nothing on a page nobody crosses over from.
  return <div className="sweep" aria-hidden="true" />;
}
