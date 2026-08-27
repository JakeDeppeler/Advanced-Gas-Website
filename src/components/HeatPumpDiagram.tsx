/**
 * "How a heat pump makes hot water" — on the hot-water brand pages
 * (Reclaim, Thermann, iStore). A blue panel holding two animated inline-SVG
 * schematics (all-in-one + split), a 3-step explainer and a running-cost
 * chart. Inline SVG + CSS animation rather than a GIF so it stays crisp,
 * scales, and respects prefers-reduced-motion. Palette matches the site.
 */

/* Running cost per year, 200 L/day — system types worst-to-best. Brand-
 * neutral (a Reclaim / Thermann / iStore heat pump all land in this band),
 * with the point made by the last two bars: a heat pump on solar is close
 * to free. Indicative figures, flagged as such below the chart. */
const COST = [
  { label: "3-star gas storage (LPG)", amount: 1344, tone: "c1" },
  { label: "Electric storage", amount: 1320, tone: "c1" },
  { label: "4-star gas storage", amount: 868, tone: "c2" },
  { label: "5-star gas continuous flow", amount: 792, tone: "c3" },
  { label: "Heat pump (grid power)", amount: 273, tone: "c4" },
  { label: "Solar + electric boost", amount: 240, tone: "c5" },
  { label: "Heat pump on solar PV", amount: 42, tone: "c6" },
];
const COST_MAX = 1344;

function SplitSvg() {
  return (
    <svg viewBox="0 0 430 300" role="img" aria-label="Split heat pump: an outdoor unit passes heat through pipes to a separate tank" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="hpd-tank-a" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2ea3d6" /><stop offset="48%" stopColor="#6bbf8f" /><stop offset="100%" stopColor="#f0803a" />
        </linearGradient>
      </defs>
      {/* pipes */}
      <path className="hpd-flow hpd-flow--hot" d="M205 108 H300" fill="none" stroke="#f36722" strokeWidth="8" strokeLinecap="round" />
      <path className="hpd-flow hpd-flow--cold" d="M300 232 H205" fill="none" stroke="#00a0df" strokeWidth="8" strokeLinecap="round" />
      <polygon points="300,100 318,108 300,116" fill="#f36722" />
      <polygon points="205,224 187,232 205,240" fill="#00a0df" />
      {/* outdoor unit */}
      <rect x="24" y="70" width="182" height="160" rx="16" fill="#eef1f6" stroke="#c7cfdc" strokeWidth="2" />
      <circle cx="82" cy="150" r="44" fill="#fff" stroke="#c3cbd9" strokeWidth="3" />
      <g className="hpd-fan" fill="#9aa4b8">
        <path d="M82 150 L82 112 A38 38 0 0 1 110 128 Z" />
        <path d="M82 150 L115 172 A38 38 0 0 1 78 188 Z" />
        <path d="M82 150 L49 172 A38 38 0 0 1 54 133 Z" />
      </g>
      <circle cx="82" cy="150" r="9" fill="#5a6377" />
      <g stroke="#f3b53a" strokeWidth="3" fill="none" opacity="0.85"><path d="M140 108 h52" /><path d="M140 126 h52" /><path d="M140 144 h52" /></g>
      <rect x="140" y="158" width="56" height="34" rx="8" fill="#f36722" />
      <text x="168" y="180" textAnchor="middle" className="hpd__chip">COMP</text>
      <rect className="hpd-pulse" x="140" y="200" width="56" height="18" rx="6" fill="#ec1c22" />
      {/* tank */}
      <rect x="300" y="46" width="96" height="208" rx="14" fill="url(#hpd-tank-a)" stroke="#c3cbd9" strokeWidth="2" />
      <rect x="300" y="46" width="96" height="26" rx="14" fill="#d7dde6" />
      <path d="M348 92 v150" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <g className="hpd__lbl">
        <text x="82" y="214" textAnchor="middle">Fan</text>
        <text x="168" y="150" textAnchor="middle">Compressor</text>
        <text x="348" y="270" textAnchor="middle">Tank</text>
      </g>
    </svg>
  );
}

function AllInOneSvg() {
  return (
    <svg viewBox="0 0 300 340" role="img" aria-label="All-in-one heat pump: the compressor sits on top of the tank in a single shell" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="hpd-tank-b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2ea3d6" /><stop offset="50%" stopColor="#6bbf8f" /><stop offset="100%" stopColor="#f0803a" />
        </linearGradient>
      </defs>
      {/* air-intake marks */}
      <g stroke="#7c8698" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M40 40 q8 -6 16 0 q8 6 16 0" /><path d="M40 54 q8 -6 16 0 q8 6 16 0" />
        <path d="M228 40 q8 -6 16 0 q8 6 16 0" /><path d="M228 54 q8 -6 16 0 q8 6 16 0" />
      </g>
      {/* shell */}
      <rect x="78" y="24" width="144" height="292" rx="16" fill="#4b5364" />
      {/* head */}
      <rect x="88" y="34" width="124" height="86" rx="9" fill="#eef1f6" />
      <circle cx="122" cy="77" r="27" fill="#fff" stroke="#c3cbd9" strokeWidth="2.5" />
      <g className="hpd-fan" fill="#9aa4b8">
        <path d="M122 77 L122 53 A24 24 0 0 1 140 63 Z" />
        <path d="M122 77 L143 88 A24 24 0 0 1 120 99 Z" />
        <path d="M122 77 L101 88 A24 24 0 0 1 104 65 Z" />
      </g>
      <circle cx="122" cy="77" r="6" fill="#5a6377" />
      <g stroke="#f3b53a" strokeWidth="2.5" fill="none" opacity="0.9"><path d="M162 52 h38" /><path d="M162 66 h38" /><path d="M162 80 h38" /></g>
      <rect className="hpd-pulse" x="162" y="90" width="38" height="16" rx="5" fill="#ec1c22" />
      {/* tank */}
      <rect x="92" y="126" width="116" height="182" rx="10" fill="url(#hpd-tank-b)" />
      {/* internal element + refrigerant coil */}
      <path className="hpd-flow hpd-flow--hot" d="M150 120 V300" fill="none" stroke="#f3b53a" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M104 140 V296" stroke="#f3b53a" strokeWidth="3" opacity="0.6" />
      <path d="M196 140 V296" stroke="#f3b53a" strokeWidth="3" opacity="0.6" />
      {/* hot out / cold in */}
      <path className="hpd-flow hpd-flow--hot" d="M208 150 H250" fill="none" stroke="#f36722" strokeWidth="7" strokeLinecap="round" />
      <polygon points="250,142 268,150 250,158" fill="#f36722" />
      <path className="hpd-flow hpd-flow--cold" d="M250 284 H208" fill="none" stroke="#00a0df" strokeWidth="7" strokeLinecap="round" />
      <polygon points="208,276 190,284 208,292" fill="#00a0df" />
      {/* feet */}
      <path d="M96 316 l14 14 M204 316 l-14 14" stroke="#4b5364" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function HeatPumpDiagram({ brandName }: { brandName: string }) {
  return (
    <section className="hpd">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> How it works</span>
          <h2>How a heat pump makes your hot water.</h2>
          <p>
            A {brandName} heat pump doesn&rsquo;t burn anything or run an element. It moves heat that&rsquo;s
            already in the air into your tank &mdash; which is why it does the same job on a fraction of the
            power, whether it&rsquo;s an all-in-one or a split.
          </p>
        </div>

        <div className="hpd__box">
          <div className="hpd__pair">
            <figure className="hpd__unit">
              <span className="hpd__tag">All-in-one</span>
              <div className="hpd__svg"><AllInOneSvg /></div>
              <p className="hpd__cap">Tank and heat pump in one shell &mdash; nothing to place outside.</p>
            </figure>
            <figure className="hpd__unit">
              <span className="hpd__tag">Split system</span>
              <div className="hpd__svg"><SplitSvg /></div>
              <p className="hpd__cap">Outdoor heat pump plumbed to a separate tank indoors.</p>
            </figure>
          </div>

          <ol className="hpd__steps">
            <li><span className="hpd__num">1</span><div><strong>Pull heat from the air</strong><p>A fan draws air across the evaporator, where the refrigerant soaks up the warmth &mdash; even a cold morning has heat to give.</p></div></li>
            <li><span className="hpd__num">2</span><div><strong>Concentrate it</strong><p>The compressor squeezes that refrigerant, and squeezing it makes it hot &mdash; hotter than shower temperature.</p></div></li>
            <li><span className="hpd__num">3</span><div><strong>Pass it to the water</strong><p>The heat exchanger hands the heat to the water. Cold in the bottom, hot out the top.</p></div></li>
          </ol>

          <div className="hpd__cost">
            <div className="hpd__cost-head">
              <h3>What it costs to run</h3>
              <span>Per year &middot; 200 L/day</span>
            </div>
            <div className="hpd__cost-chart" role="img" aria-label="Running cost per year: 3-star gas storage LPG $1344, electric storage $1320, 4-star gas storage $868, 5-star gas continuous flow $792, heat pump on grid power $273, solar with electric boost $240, heat pump on solar PV $42">
              {COST.map((c) => (
                <div key={c.label} className="hpd__cost-col">
                  <div className="hpd__cost-bar-wrap">
                    <span className="hpd__cost-amt">${c.amount.toLocaleString()}</span>
                    <div className={`hpd__cost-bar hpd__cost-bar--${c.tone}`} style={{ height: `${Math.round((c.amount / COST_MAX) * 100)}%` }} />
                  </div>
                  <span className="hpd__cost-lbl">{c.label}</span>
                </div>
              ))}
            </div>
            <p className="hpd__cost-note">
              Indicative running cost per year on 200 L/day, current Victorian tariffs. Your figure depends on
              usage, tariff and whether you have solar &mdash; we run the numbers for your place at the quote.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
