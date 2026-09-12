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
  // The crossing is the one navigation where the reader genuinely changes
  // context, so it is the one that can afford to be unhurried. Both halves
  // long, both halves eased, nothing snapping.
  building: [820, 220, 820],
  house: [820, 220, 820],
  water: [1100, 200, 700],
  // The drawn ones need time to draw. A duct layout that appears fully formed
  // in half a second is a picture, not a drawing, and the drawing is the point.
  climate: [1300, 200, 680],
  rebate: [900, 200, 520],
  service: [1200, 200, 680],
  // In and out at the same pace. A load that comes down slowly and then whips
  // away reads as a mistake, not a lift.
  crane: [1250, 200, 1300],
  build: [1150, 170, 560],
  schedule: [1050, 200, 560],
  callout: [1150, 180, 620],
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
      {/* The heat pump itself, drawn on as the water rises behind it: the tank,
          the compressor on top, the fan, and the level coming up inside. */}
      <div className="sweep__hp">
        <svg viewBox="0 0 200 260" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <defs>
            <clipPath id="hp-tank"><rect x="46" y="86" width="108" height="158" rx="16" /></clipPath>
          </defs>
          <rect className="w1" x="46" y="86" width="108" height="158" rx="16" />
          <rect className="w2" x="62" y="26" width="76" height="52" rx="10" />
          <circle className="w3" cx="100" cy="52" r="15" />
          <path className="w3" d="M100 37v30M85 52h30" />
          <path className="w4" d="M100 78v8" />
          <rect className="w5" x="46" y="86" width="108" height="158" clipPath="url(#hp-tank)" />
        </svg>
      </div>

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

      {/* Heating and cooling: the house in section. A plan view was the same
          drawing as the commercial fit-out door — this is unmistakably a home:
          roof, rooms, the unit in the roof space, flexible duct down to a
          ceiling outlet in each room, then the air arriving. */}
      <div className="sweep__home">
        <svg viewBox="0 0 320 230" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path className="h1" d="M18 96 160 20l142 76" />
          <path className="h2" d="M40 96v114h240V96M40 210h240" />
          <path className="h3" d="M40 150h240M118 150v60M212 150v60" />
          <rect className="h4" x="132" y="56" width="56" height="30" rx="4" />
          <path className="h5" d="M160 86v22M160 108H80v38M160 108h80v38M160 108v82M160 190H82M160 190h76" />
          <g className="h6">
            <rect x="66" y="140" width="28" height="11" rx="2" />
            <rect x="226" y="140" width="28" height="11" rx="2" />
            <rect x="68" y="182" width="28" height="11" rx="2" />
            <rect x="224" y="182" width="28" height="11" rx="2" />
          </g>
          <g className="h7 h7--warm">
            <path d="M74 162v14M86 162v14M76 204v10M88 204v10" strokeWidth="3.5" />
          </g>
          <g className="h7 h7--cool">
            <path d="M234 162v14M246 162v14M232 204v10M244 204v10" strokeWidth="3.5" />
          </g>
        </svg>
      </div>

      {/* Rebate: what it actually is. The quote total, then the rebate line
          landing under it, then a smaller number where the big one was. */}
      <div className="sweep__quote">
        <span className="sweep__q1">$5,324</span>
        <span className="sweep__q2">VEU rebate &minus;$2,700</span>
        <span className="sweep__qrule" />
        <span className="sweep__q3">$2,624</span>
      </div>

      {/* Servicing: the gauge going on and the needle coming up. A spanner
          spinning was decoration; this is the actual moment of a service, and
          it draws itself like the rest of them. */}
      <div className="sweep__gauge">
        <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle className="g1" cx="120" cy="120" r="98" strokeWidth="5" />
          {/* The zones: most of the dial is fine, the top of it is not. */}
          <path className="g6" d="M46 162A82 82 0 0 1 166 46" strokeWidth="10" />
          <path className="g7" d="M166 46A82 82 0 0 1 194 162" strokeWidth="10" />
          <g className="g3" strokeWidth="4">
            <path d="M120 34v14M59 59l10 10M34 120h14M59 181l10-10M120 206v-14M181 181l-10-10M206 120h-14M181 59l-10 10" />
          </g>
          <path className="g4" d="M120 120 82 70" strokeWidth="7" />
          <circle className="g5" cx="120" cy="120" r="10" strokeWidth="5" />
          <g className="g8">
            <circle cx="120" cy="120" r="30" strokeWidth="0" />
            <path d="M104 121l11 11 21-24" strokeWidth="6" />
          </g>
        </svg>
      </div>

      {/* Crane: the hoist line drops, the load lands, the whole thing covers. */}
      <div className="sweep__crane">
        <span className="sweep__line" />
        <span className="sweep__hook" />
        <span className="sweep__load" />
      </div>

      {/* Fit-out: the mechanical layout drawing itself. Plant at one end, trunk
          duct across, branches off it to the outlets — the drawing a tenancy
          package actually starts from. */}
      <div className="sweep__duct">
        <svg viewBox="0 0 300 170" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect className="d1" x="14" y="60" width="52" height="46" rx="4" />
          <path className="d2" d="M66 83h206" />
          <path className="d3" d="M112 83V38h34M180 83V38h34M146 83v46h34M236 83v46h30" />
          <g className="d4">
            <rect x="140" y="26" width="26" height="14" rx="2" />
            <rect x="208" y="26" width="26" height="14" rx="2" />
            <rect x="174" y="124" width="26" height="14" rx="2" />
            <rect x="260" y="124" width="26" height="14" rx="2" />
          </g>
        </svg>
      </div>

      {/* Maintenance: the clipboard, filling itself in. */}
      <div className="sweep__board">
        <svg viewBox="0 0 180 230" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect className="b-body" x="10" y="24" width="160" height="196" rx="12" stroke="currentColor" strokeWidth="5" />
          <rect className="b-clip" x="62" y="6" width="56" height="30" rx="8" stroke="currentColor" strokeWidth="5" fill="none" />
          {[0, 1, 2, 3].map((i) => (
            <g className="b-row" key={i} transform={`translate(0 ${64 + i * 40})`}>
              <rect x="32" y="-11" width="22" height="22" rx="5" stroke="currentColor" strokeWidth="4" />
              <path className="b-tick" d="M36 0l6 7 12-14" stroke="currentColor" strokeWidth="5" />
              <path d="M68 0h78" stroke="currentColor" strokeWidth="5" opacity="0.35" />
            </g>
          ))}
        </svg>
      </div>

      {/* Breakdown: the van, drawn rather than stamped. It was a filled shape
          sliding across while everything else on the site drew itself, which
          made it the one door that looked like it came from somewhere else. */}
      <div className="sweep__callout">
        <svg viewBox="0 0 300 170" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path className="v1" d="M18 118V54a8 8 0 0 1 8-8h140v72" />
          <path className="v2" d="M166 60h44l32 36v22" />
          <path className="v3" d="M18 118h22M78 118h64M178 118h30M242 118h22" />
          <circle className="v4" cx="59" cy="118" r="19" />
          <circle className="v5" cx="222" cy="118" r="19" />
          <g className="v6">
            <rect x="96" y="26" width="34" height="16" rx="6" strokeWidth="5" />
            <path d="M88 16l-8-10M138 16l8-10M113 12V0" strokeWidth="4" />
          </g>
        </svg>
      </div>

    </div>
  );
}
