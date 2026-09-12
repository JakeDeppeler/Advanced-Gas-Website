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

export type SweepKind =
  /** Crossing between the two sides: a building going out, a house coming back. */
  | "building" | "house"
  /** Residential doors, one per thing we sell. */
  | "water" | "climate" | "rebate" | "service"
  /** Commercial doors. Each one is the shape of the job behind it: a hook and
   *  load dropping down the screen, a girder sliding across, a checklist
   *  ticking itself off, a van arriving. */
  | "crane" | "build" | "schedule" | "callout";

/** Cover / hold / clear, in ms. Keep in step with the keyframes in
 *  design-system.css — the hold is what stops the old page showing under the
 *  panel on a slow route change. */
const TIMING: Record<SweepKind, [number, number, number]> = {
  building: [540, 130, 460],
  house: [540, 130, 460],
  water: [560, 120, 640],
  climate: [540, 120, 480],
  rebate: [540, 130, 470],
  service: [540, 130, 470],
  crane: [620, 120, 520],
  build: [520, 120, 480],
  schedule: [560, 140, 460],
  callout: [540, 120, 500],
};

export function sweepTo(go: () => void, kind: SweepKind = "building"): void {
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
  // One panel, one set of props, and the kind decides which of them draws.
  // Everything is inert until data-sweep says otherwise, so a page nobody
  // sweeps from pays for a handful of hidden nodes and nothing else.
  return (
    <div className="sweep" aria-hidden="true">
      {/* Water: a wave on the leading edge. Two identical cycles side by side,
          so sliding it half its own width loops without a seam. */}
      <svg className="sweep__wave" viewBox="0 0 2880 120" preserveAspectRatio="none">
        <path d="M0,70 C240,120 480,20 720,70 C960,120 1200,20 1440,70 C1680,120 1920,20 2160,70 C2400,120 2640,20 2880,70 L2880,120 L0,120 Z" />
      </svg>

      {/* Crossing over: a building goes up on the way to commercial, a house on
          the way home. Same mechanism, different roof. */}
      <div className="sweep__place">
        <svg viewBox="0 0 200 150" fill="none" aria-hidden="true">
          {/* house */}
          <g className="sweep__house">
            <path d="M28 72 100 22l72 50" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 68v58h112V68" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M86 126V94h28v32" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* building */}
          <g className="sweep__tower">
            <path d="M46 126V34h108v92" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M72 58h12M116 58h12M72 84h12M116 84h12M72 110h12M116 110h12" strokeWidth="9" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Climate: warm air one way, cool the other, meeting in the middle. */}
      <div className="sweep__climate">
        <span className="sweep__stream sweep__stream--warm" />
        <span className="sweep__stream sweep__stream--cool" />
        <svg className="sweep__flake" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
        </svg>
      </div>

      {/* Rebate: the number coming off the price. */}
      <div className="sweep__rebate">
        {[0, 1, 2, 3, 4].map((i) => <span key={i}>$</span>)}
      </div>

      {/* Service: a spanner turning onto the nut. */}
      <div className="sweep__service">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.6 6.3a1 1 0 0 0 0 1.4l1.7 1.7a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />
        </svg>
      </div>

      {/* Crane: the hoist line drops, the load lands, the whole thing covers. */}
      <div className="sweep__crane">
        <span className="sweep__line" />
        <span className="sweep__hook" />
        <span className="sweep__load" />
      </div>

      {/* Build: a girder slides in and sets. */}
      <div className="sweep__build"><span /><span /><span /></div>

      {/* Schedule: a service sheet ticking itself off. */}
      <div className="sweep__sched">
        {[0, 1, 2, 3].map((i) => (
          <span className="sweep__row" key={i}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5.5 5.5L20 6" />
            </svg>
            <i />
          </span>
        ))}
      </div>

      {/* Call-out: a van arrives, and the beacon is already going. */}
      <div className="sweep__van">
        <span className="sweep__beacon" />
        <svg viewBox="0 0 120 60" fill="currentColor" aria-hidden="true">
          <path d="M4 40V18a4 4 0 0 1 4-4h50v26H4zm58-26h20l14 16v10H62V14z" />
          <circle cx="26" cy="44" r="7" />
          <circle cx="84" cy="44" r="7" />
        </svg>
      </div>
    </div>
  );
}
