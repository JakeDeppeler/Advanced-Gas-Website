/**
 * "How a heat pump makes hot water" — a schematic on the hot-water brand
 * pages (Reclaim, Thermann, iStore). Inline SVG rather than a screenshot so
 * it stays crisp, scales to any width and matches the site's palette. The
 * mechanism, not a photo: air in → evaporator → compressor → heat exchanger
 * → tank, with the refrigerant loop in orange and the water in blue.
 */
export function HeatPumpDiagram({ brandName }: { brandName: string }) {
  return (
    <section className="hpd">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> How it works</span>
          <h2>How a heat pump makes your hot water.</h2>
          <p>
            A {brandName} heat pump doesn&rsquo;t burn anything or run an element. It moves heat that&rsquo;s
            already in the air into your tank &mdash; which is why it does the same job on roughly a third
            of the power an old electric tank draws.
          </p>
        </div>

        <div className="hpd__diagram">
          <svg viewBox="0 0 820 420" role="img" aria-labelledby="hpd-title" preserveAspectRatio="xMidYMid meet">
            <title id="hpd-title">Heat pump schematic: an outdoor unit takes heat from the air and passes it to a hot water tank</title>
            <defs>
              <linearGradient id="hpd-tank" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#2ea3d6" />
                <stop offset="45%" stopColor="#6bbf8f" />
                <stop offset="100%" stopColor="#f0803a" />
              </linearGradient>
              <marker id="hpd-arrow-o" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="#f36722" />
              </marker>
              <marker id="hpd-arrow-b" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="#00a0df" />
              </marker>
            </defs>

            {/* ---- refrigerant + water pipes (drawn first, under the boxes) ---- */}
            {/* hot line: unit → top of tank */}
            <path d="M360 150 H470 a14 14 0 0 1 14 14 V150" fill="none" stroke="#f36722" strokeWidth="9" strokeLinecap="round" markerEnd="url(#hpd-arrow-o)" />
            {/* cold line: bottom of tank → unit */}
            <path d="M600 330 H360" fill="none" stroke="#00a0df" strokeWidth="9" strokeLinecap="round" markerEnd="url(#hpd-arrow-b)" />

            {/* ---- outdoor unit ---- */}
            <rect x="70" y="120" width="300" height="220" rx="18" fill="#eef1f6" stroke="#cdd4e0" strokeWidth="2" />
            {/* fan */}
            <circle cx="170" cy="230" r="66" fill="#fff" stroke="#c3cbd9" strokeWidth="3" />
            <g fill="#8f9bb3">
              <path d="M170 230 m0 -54 a54 54 0 0 1 34 20 l-34 34z" />
              <path d="M170 230 m47 27 a54 54 0 0 1 -40 4 l-7 -31z" transform="rotate(120 170 230)" />
              <path d="M170 230 m47 27 a54 54 0 0 1 -40 4 l-7 -31z" transform="rotate(240 170 230)" />
            </g>
            <circle cx="170" cy="230" r="12" fill="#5a6377" />
            {/* evaporator coils behind the fan (hinted with wavy lines) */}
            <g stroke="#b9c2d2" strokeWidth="3" fill="none" opacity="0.9">
              <path d="M250 165 h95" />
              <path d="M250 185 h95" />
              <path d="M250 205 h95" />
            </g>
            {/* compressor */}
            <rect x="256" y="228" width="86" height="52" rx="10" fill="#f36722" />
            <text x="299" y="259" textAnchor="middle" className="hpd__chip">COMP</text>
            {/* heat exchanger bar */}
            <rect x="256" y="296" width="86" height="26" rx="7" fill="#ec1c22" />

            {/* ---- hot water tank ---- */}
            <rect x="484" y="96" width="132" height="268" rx="16" fill="url(#hpd-tank)" stroke="#c3cbd9" strokeWidth="2" />
            <rect x="484" y="96" width="132" height="34" rx="16" fill="#d7dde6" />
            {/* heat-exchanger coil hint inside tank */}
            <path d="M550 150 v170" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.85" />

            {/* ---- labels ---- */}
            <g className="hpd__lbl">
              <text x="170" y="326" textAnchor="middle">Fan + evaporator</text>
              <text x="299" y="214" textAnchor="middle">Compressor</text>
              <text x="299" y="344" textAnchor="middle">Heat exchanger</text>
              <text x="550" y="86" textAnchor="middle">Hot water tank</text>
            </g>
            <g className="hpd__flow">
              <text x="430" y="140" textAnchor="middle" fill="#c1540f">hot</text>
              <text x="430" y="352" textAnchor="middle" fill="#0378a8">cold</text>
            </g>
          </svg>
        </div>

        <ol className="hpd__steps">
          <li>
            <span className="hpd__num">1</span>
            <div>
              <strong>Pull heat from the air</strong>
              <p>A fan draws outside air across the evaporator, where the refrigerant soaks up the warmth. Even on a cold morning there&rsquo;s plenty of heat in the air to take.</p>
            </div>
          </li>
          <li>
            <span className="hpd__num">2</span>
            <div>
              <strong>Concentrate it</strong>
              <p>The compressor squeezes that refrigerant, and squeezing it makes it hot &mdash; hot enough to heat water well past shower temperature.</p>
            </div>
          </li>
          <li>
            <span className="hpd__num">3</span>
            <div>
              <strong>Pass it to the water</strong>
              <p>The heat exchanger hands that heat to the water in the tank. Cold water in the bottom, hot out the top, ready for the next shower.</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
