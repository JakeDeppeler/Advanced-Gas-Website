"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The one transition worth waiting for.
 *
 * There used to be nine of these — a tank filling with water on the way to the
 * heat pump page, a crane lowering a load, a mechanical layout drawing itself —
 * and they were a second of waiting on every door, every time. They went.
 *
 * This one comes back because it is not the same thing. Crossing between the
 * residential and commercial sides is the only navigation on this site where
 * the reader genuinely changes context: different services, different prices,
 * a different person reading. The pause is doing work — it marks the border.
 * Every other link on the site goes somewhere within one of the two sites, and
 * gets the ordinary page arrival.
 *
 * A house going one way, a building coming back, so the direction of travel is
 * legible rather than just "something happened".
 */

export type CrossDir = "to-commercial" | "to-home";

/** Cover / hold / clear, in ms. Must match the keyframes in design-system.css;
 *  the hold is what stops the old page showing under the panel on a slow
 *  route change. */
const COVER = 720;
const HOLD = 200;
const CLEAR = 680;

export function crossTo(go: () => void, dir: CrossDir): void {
  if (typeof document === "undefined") return go();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return go();

  const root = document.documentElement;
  root.dataset.crossDir = dir;
  root.dataset.cross = "in";
  window.setTimeout(() => {
    go();
    window.setTimeout(() => {
      root.dataset.cross = "out";
      window.setTimeout(() => {
        delete root.dataset.cross;
        delete root.dataset.crossDir;
      }, CLEAR);
    }, HOLD);
  }, COVER);
}

export function SiteCross() {
  const pathname = usePathname();

  // A back button pressed mid-sweep, or a navigation that never lands, would
  // otherwise leave the panel across the screen forever. Any path change with
  // the attribute still set clears it.
  const seen = useRef(pathname);
  useEffect(() => {
    if (seen.current === pathname) return;
    seen.current = pathname;
    const root = document.documentElement;
    if (root.dataset.cross !== "in") {
      delete root.dataset.cross;
      delete root.dataset.crossDir;
    }
  }, [pathname]);

  // Inert until data-cross says otherwise, so it costs a handful of hidden
  // nodes on every page that nobody crosses from.
  return (
    <div className="cross" aria-hidden="true">
      <div className="cross__art">
        <svg viewBox="0 0 200 150" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
          <g className="cross__house">
            <path d="M28 72 100 22l72 50" />
            <path d="M44 68v58h112V68" />
            <path d="M86 126V94h28v32" />
          </g>
          <g className="cross__tower">
            <path d="M46 126V34h108v92" />
            <path d="M72 58h12M116 58h12M72 84h12M116 84h12M72 110h12M116 110h12" />
          </g>
        </svg>
        <span className="cross__word" />
      </div>
    </div>
  );
}
