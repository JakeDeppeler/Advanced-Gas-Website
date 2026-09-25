"use client";

import { useEffect, useRef, useState } from "react";
import { COMM_ZONES } from "@/lib/commercialSite";

/**
 * A building in section, with the four disciplines drawn into it.
 *
 * The page's argument is that one licensed team covers mechanical, Type A
 * gas, controls and refrigeration. Four cards say that; this shows it — the
 * same building with a different trade lit up, so you can see they are all
 * in the one structure rather than four separate offerings.
 *
 * The live zone is at full opacity and the other three sit back at .22, and
 * it steps on every 3.4 seconds. Touching a tab takes over: auto-advance
 * stops for good, because a reader who has chosen a zone is reading it and
 * having it move underneath them is the opposite of helpful.
 *
 * Three things it will not do:
 *  · auto-advance for `prefers-reduced-motion: reduce` — the tabs still work
 *    and every zone still draws, because which trade is which is information
 *  · leave the drawing blank before the effect runs: zone 0 is the initial
 *    state, so no JavaScript means a static cross-section with the
 *    mechanical services lit
 *  · hide the other three: at .22 they are still legible as structure, which
 *    is the point — they are all the same building
 */

export function BuildingSchematic() {
  const [live, setLive] = useState(0);
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  useEffect(() => {
    if (heldRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      if (!heldRef.current) setLive((n) => (n + 1) % COMM_ZONES.length);
    }, 3400);
    return () => window.clearInterval(t);
  }, []);

  const pick = (i: number) => {
    heldRef.current = true;
    setHeld(true);
    setLive(i);
  };

  const z = (i: number) => `cx-z${i === live ? " is-on" : ""}`;

  return (
    <figure className="cx-rig" aria-label="Animated building cross-section showing the four disciplines">
      <svg viewBox="0 0 520 370" role="img" aria-hidden="true">
        {/* the building itself: ground, two floors and a roof */}
        <line className="cx-rig-dim" x1="12" y1="340" x2="508" y2="340" />
        <rect className="cx-rig-ln" x="70" y="110" width="380" height="230" />
        <line className="cx-rig-dim" x1="70" y1="187" x2="450" y2="187" />
        <line className="cx-rig-dim" x1="70" y1="264" x2="450" y2="264" />
        <text className="cx-rig-t" x="78" y="180" opacity=".4">L2</text>
        <text className="cx-rig-t" x="78" y="257" opacity=".4">L1</text>
        <text className="cx-rig-t" x="78" y="334" opacity=".4">G</text>

        {/* 0 · mechanical: rooftop unit, risers, ducts and supply air */}
        <g className={z(0)}>
          <rect x="296" y="74" width="84" height="36" rx="3" fill="var(--cx-navy-2)" stroke="#fff" strokeWidth="1.6" />
          <circle cx="318" cy="92" r="11" className="cx-rig-ln" />
          <g className="cx-rig-fan cx-spin">
            <line x1="318" y1="83" x2="318" y2="101" />
            <line x1="309" y1="92" x2="327" y2="92" />
          </g>
          <g className="cx-rig-grille">
            <line x1="340" y1="84" x2="370" y2="84" />
            <line x1="340" y1="92" x2="370" y2="92" />
            <line x1="340" y1="100" x2="370" y2="100" />
          </g>
          <rect className="cx-rig-ln" x="350" y="110" width="18" height="90" />
          <rect className="cx-rig-ln" x="184" y="122" width="166" height="14" />
          <rect className="cx-rig-ln" x="214" y="198" width="136" height="12" />
          <g className="cx-rig-ln">
            <line x1="214" y1="140" x2="234" y2="140" />
            <line x1="270" y1="140" x2="290" y2="140" />
            <line x1="238" y1="214" x2="258" y2="214" />
            <line x1="300" y1="214" x2="320" y2="214" />
          </g>
          <path className="cx-rig-air" d="M224 144 v30" />
          <path className="cx-rig-air" d="M280 144 v30" />
          <path className="cx-rig-air" d="M248 218 v34" />
          <path className="cx-rig-air" d="M310 218 v34" />
        </g>

        {/* 1 · Type A gas: meter, the line in, and two appliances alight */}
        <g className={z(1)}>
          <rect x="24" y="290" width="28" height="36" rx="2" fill="none" stroke="var(--cx-orange)" strokeWidth="2" />
          <circle cx="38" cy="302" r="6" fill="none" stroke="var(--cx-orange)" strokeWidth="1.5" />
          <path className="cx-gas" d="M52 318 H96" />
          <rect className="cx-rig-ln" x="96" y="278" width="40" height="56" rx="4" />
          <path className="cx-flick" d="M110 326 q6 -12 6 -18 q4 8 6 18 z" fill="var(--cx-orange)" />
          <path className="cx-gas" d="M136 318 H160 V246 H186" />
          <rect className="cx-rig-ln" x="186" y="248" width="52" height="16" />
          <path
            className="cx-flick"
            d="M198 248 q3 -7 3 -10 q2 4 3 10 z M218 248 q3 -7 3 -10 q2 4 3 10 z"
            fill="var(--cx-orange)"
          />
        </g>

        {/* 2 · controls: the BMS panel, and what it is talking to */}
        <g className={z(2)}>
          <rect x="262" y="284" width="46" height="34" rx="3" fill="var(--cx-navy-2)" stroke="var(--cx-sky)" strokeWidth="1.6" />
          <rect className="cx-barm" x="270" y="298" width="5" height="14" />
          <rect className="cx-barm" x="279" y="294" width="5" height="18" style={{ animationDelay: "-.4s" }} />
          <rect className="cx-barm" x="288" y="300" width="5" height="12" style={{ animationDelay: "-.8s" }} />
          <rect className="cx-barm" x="297" y="292" width="5" height="20" style={{ animationDelay: "-1.2s" }} />
          <path className="cx-sig" d="M308 300 H430 V92 H380" />
          <path className="cx-sig" d="M430 160 H414" />
          <path className="cx-sig" d="M430 236 H414" />
          <circle cx="408" cy="160" r="6" fill="none" stroke="var(--cx-sky)" strokeWidth="1.6" />
          <circle cx="408" cy="236" r="6" fill="none" stroke="var(--cx-sky)" strokeWidth="1.6" />
        </g>

        {/* 3 · refrigeration: condenser, cassette, and the heat-pump tank */}
        <g className={z(3)}>
          <rect x="104" y="80" width="66" height="30" rx="3" fill="var(--cx-navy-2)" stroke="#fff" strokeWidth="1.6" />
          <circle cx="124" cy="95" r="9" className="cx-rig-ln" />
          <g className="cx-rig-fan cx-spin">
            <line x1="124" y1="88" x2="124" y2="102" />
            <line x1="117" y1="95" x2="131" y2="95" />
          </g>
          <line x1="150" y1="110" x2="150" y2="124" stroke="var(--cx-sky)" strokeWidth="2" />
          <line x1="156" y1="110" x2="156" y2="124" stroke="var(--cx-orange)" strokeWidth="2" />
          <rect className="cx-rig-ln" x="112" y="124" width="58" height="10" />
          <path className="cx-rig-air" d="M126 138 v26" />
          <path className="cx-rig-air" d="M156 138 v26" />
          <rect className="cx-rig-ln" x="376" y="274" width="34" height="62" rx="8" />
          <circle cx="393" cy="290" r="7" className="cx-rig-ln" />
          <g className="cx-rig-fan cx-spin">
            <line x1="393" y1="284" x2="393" y2="296" />
            <line x1="387" y1="290" x2="399" y2="290" />
          </g>
          <path d="M382 322 h22" stroke="var(--cx-orange)" strokeWidth="2" />
        </g>
      </svg>

      <figcaption className="cx-rig__cap">
        <div className="cx-schem__tabs" role="tablist" aria-label="Disciplines">
          {COMM_ZONES.map((zone, i) => (
            <button
              key={zone.label}
              type="button"
              role="tab"
              aria-selected={i === live}
              className={i === live ? "is-on" : undefined}
              onClick={() => pick(i)}
            >
              {zone.label}
            </button>
          ))}
        </div>
        <span className="cx-rig__live" aria-live={held ? "polite" : "off"}>
          {COMM_ZONES[live].cap}
        </span>
      </figcaption>
    </figure>
  );
}
