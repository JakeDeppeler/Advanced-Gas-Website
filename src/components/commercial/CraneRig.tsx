/**
 * The hero drawing: a rooftop unit craned in, landed, commissioned.
 *
 * Nine seconds, on a loop. The trolley runs out along the jib, the cable
 * pays out, the unit lands on the plinth, air starts moving through it, the
 * windows underneath come on, and COMMISSIONED appears. Then it resets.
 * It is the whole argument of the page in one picture: plant swapped on a
 * building that kept trading while we did it.
 *
 * The design arrived as SMIL — `<animate>` and `<animateTransform>` inside
 * the SVG. This is the same timing driven by CSS keyframes instead, for one
 * reason: SMIL cannot be stopped by a media query. `prefers-reduced-motion`
 * has to be able to turn this off, and with CSS it can — every animation
 * below is switched off in one block at the bottom of the stylesheet and
 * each part is left at its finished position, so somebody who has asked for
 * no motion gets a drawing of a commissioned unit rather than an empty roof.
 *
 * Everything shares the same 9s period so the parts stay in step. The
 * percentages in the stylesheet are the SMIL keyTimes: trolley 6–32%, cable
 * and landing 32–58%, airflow from 60%, badge from 66%, windows 66–92%.
 *
 * No state, no effects — it renders on the server and the browser animates it.
 */

export function CraneRig() {
  return (
    <figure className="cx-rig" aria-label="Animation: a rooftop unit craned onto a building and commissioned">
      <svg viewBox="0 0 520 380" role="img" aria-hidden="true">
        {/* ---- ground line and dimension ticks ---- */}
        <line className="cx-rig-dim" x1="16" y1="340" x2="504" y2="340" />
        <g className="cx-rig-dim">
          <line x1="30" y1="348" x2="60" y2="348" />
          <line x1="130" y1="348" x2="170" y2="348" />
          <line x1="450" y1="348" x2="490" y2="348" />
        </g>

        {/* ---- the building, still trading ---- */}
        <rect className="cx-rig-ln" x="190" y="210" width="240" height="130" />
        <line className="cx-rig-ln" x1="184" y1="210" x2="436" y2="210" />
        <g>
          <rect className="cx-rig-win" x="206" y="228" width="30" height="20" />
          <rect className="cx-rig-win is-lit" x="252" y="228" width="30" height="20" />
          <rect className="cx-rig-win" x="298" y="228" width="30" height="20" />
          <rect className="cx-rig-win is-lit" x="344" y="228" width="30" height="20" />
          <rect className="cx-rig-win" x="390" y="228" width="26" height="20" />
          <rect className="cx-rig-win is-lit" x="206" y="262" width="30" height="20" />
          <rect className="cx-rig-win" x="252" y="262" width="30" height="20" />
          <rect className="cx-rig-win is-lit" x="298" y="262" width="30" height="20" />
          <rect className="cx-rig-win" x="344" y="262" width="30" height="20" />
          <rect className="cx-rig-win is-lit" x="390" y="262" width="26" height="20" />
          <rect className="cx-rig-win" x="206" y="296" width="30" height="20" />
          <rect className="cx-rig-win is-lit" x="252" y="296" width="30" height="20" />
          <rect className="cx-rig-win" x="298" y="296" width="30" height="20" />
          <rect className="cx-rig-win is-lit" x="344" y="296" width="30" height="20" />
          <rect className="cx-rig-win" x="390" y="296" width="26" height="44" />
        </g>
        <rect className="cx-rig-ln" x="396" y="192" width="22" height="18" />
        {/* the plinth the unit is going onto, marked out and waiting */}
        <rect className="cx-rig-pad" x="270" y="202" width="80" height="8" strokeDasharray="4 4" />
        <text className="cx-rig-t" x="206" y="202" opacity=".55">ROOF · PAKENHAM</text>

        {/* ---- the crane ---- */}
        <g className="cx-rig-ln">
          <line x1="74" y1="340" x2="74" y2="56" />
          <line x1="86" y1="340" x2="86" y2="56" />
          <polyline points="74,330 86,310 74,290 86,270 74,250 86,230 74,210 86,190 74,170 86,150 74,130 86,110 74,90 86,70" />
          <line x1="80" y1="56" x2="80" y2="26" />
          <line x1="80" y1="26" x2="36" y2="56" />
          <line x1="80" y1="26" x2="440" y2="56" />
          <line x1="30" y1="56" x2="470" y2="56" />
          <line x1="30" y1="62" x2="470" y2="62" />
          <rect x="58" y="332" width="44" height="8" />
          <rect x="88" y="68" width="20" height="16" />
        </g>
        <rect className="cx-rig-cab" x="34" y="62" width="30" height="18" />

        {/* ---- trolley, cable and the unit on the end of it ----
            The whole group runs out along the jib; inside it the cable pays
            out and the unit comes down with it. */}
        <g className="cx-rig-trolley">
          <rect className="cx-rig-trolleybox" x="300" y="55" width="20" height="9" />
          {/* The cable is a 64px bar scaled from the trolley down, rather than
              a line with an animated y2: geometry attributes are not
              animatable by CSS in every engine, and a scale is. */}
          <rect className="cx-rig-cable" x="309.2" y="64" width="1.6" height="64" />

          <g className="cx-rig-unit">
            <path className="cx-rig-hook" d="M310 128 v6 a4 4 0 1 1 -6 3" />
            <line className="cx-rig-sling" x1="310" y1="130" x2="282" y2="150" />
            <line className="cx-rig-sling" x1="310" y1="130" x2="338" y2="150" />
            <rect className="cx-rig-box" x="278" y="150" width="64" height="52" rx="3" />
            <circle className="cx-rig-ln" cx="296" cy="176" r="14" />
            <g className="cx-rig-fan">
              <line x1="296" y1="164" x2="296" y2="188" />
              <line x1="284" y1="176" x2="308" y2="176" />
            </g>
            <g className="cx-rig-grille">
              <line x1="318" y1="164" x2="334" y2="164" />
              <line x1="318" y1="171" x2="334" y2="171" />
              <line x1="318" y1="178" x2="334" y2="178" />
              <line x1="318" y1="185" x2="334" y2="185" />
              <line x1="318" y1="192" x2="334" y2="192" />
            </g>
          </g>
        </g>

        {/* ---- air moving through it ---- */}
        <g className="cx-rig-air">
          <path d="M292 144 q-8 -12 0 -24 t0 -24" />
          <path d="M310 144 q-8 -12 0 -24 t0 -24 t0 -18" />
          <path d="M328 144 q-8 -12 0 -24 t0 -24" />
        </g>

        {/* ---- and the only word that matters ---- */}
        <g className="cx-rig-badge">
          <rect x="350" y="112" width="128" height="24" rx="12" />
          <path className="cx-rig-badge__tick" d="M362 124 l4 4 7 -8" />
          <text className="cx-rig-t" x="380" y="127.5">COMMISSIONED</text>
        </g>
      </svg>

      <figcaption className="cx-rig__cap">
        <div>
          <span className="cx-rig__eye">On the roof, Pakenham</span>
          <div>Craned in, commissioned, handed over.</div>
        </div>
        <span className="cx-rig__live">Building kept trading</span>
      </figcaption>
    </figure>
  );
}
