/**
 * Line diagrams for the three filtration fittings.
 *
 * These replaced photographs, on purpose. We don't have photos of a
 * Puretec install yet, and the site-archive shots we were using (a Reece
 * branch, a hot water changeover) told the reader nothing about where a
 * filter goes — which is the single thing someone landing on these pages
 * needs to understand. A diagram answers it in one glance and doesn't
 * pretend to be a photo of our work.
 *
 * Inline SVG rather than files: three small drawings, no extra requests,
 * and they inherit the theme colours so they can't drift from the
 * palette.
 */

const NAVY = "var(--navy)";
const SKY = "var(--sky)";
const ORANGE = "var(--orange)";

/** The filter canister, drawn once and reused at three positions. */
function Canister({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-15" y="-8" width="30" height="9" rx="3" fill={NAVY} />
      <path d="M-13 1 h26 v30 a13 13 0 0 1 -26 0 z" fill={SKY} fillOpacity="0.18" stroke={NAVY} strokeWidth="2.5" />
      <line x1="-6" y1="8" x2="-6" y2="26" stroke={NAVY} strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1="0" y1="8" x2="0" y2="28" stroke={NAVY} strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1="6" y1="8" x2="6" y2="26" stroke={NAVY} strokeWidth="1.5" strokeOpacity="0.45" />
      <circle cx="0" cy="-12" r="5" fill={ORANGE} />
      <text x="0" y="56" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>{label}</text>
    </g>
  );
}

const PIPE = { stroke: SKY, strokeWidth: 5, strokeLinecap: "round" as const, fill: "none" };

export function FiltrationDiagram({ tier }: { tier: string }) {
  if (tier === "hot-water") {
    return (
      <svg viewBox="0 0 480 320" role="img" aria-label="A filter fitted on the cold water line feeding the hot water system">
        <rect width="480" height="320" fill="none" />
        {/* cold main in from the left */}
        <path d="M20 210 H150" {...PIPE} />
        <path d="M195 210 H300" {...PIPE} />
        <text x="24" y="196" fontSize="12" fill={NAVY} fillOpacity="0.7">Cold water in</text>

        <Canister x={172} y={186} label="Filter" />

        {/* the hot water unit */}
        <rect x="300" y="88" width="110" height="170" rx="18" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <rect x="316" y="106" width="78" height="40" rx="8" fill={SKY} fillOpacity="0.16" stroke={NAVY} strokeWidth="2" />
        <circle cx="355" cy="190" r="17" fill="none" stroke={NAVY} strokeWidth="2.5" />
        <path d="M347 190 h16 M355 182 v16" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
        <text x="355" y="284" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>Hot water system</text>

        {/* hot out */}
        <path d="M410 130 H455 V60" {...PIPE} stroke={ORANGE} />
        <text x="424" y="48" fontSize="12" fill={ORANGE} fontWeight="700">Hot out</text>
      </svg>
    );
  }

  if (tier === "under-sink") {
    return (
      <svg viewBox="0 0 480 320" role="img" aria-label="A filter in the cupboard under the kitchen sink, feeding a filtered tap">
        {/* tap */}
        <path d="M232 96 V52 a24 24 0 0 1 48 0 V78" fill="none" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
        <circle cx="280" cy="88" r="4" fill={SKY} />
        <circle cx="280" cy="102" r="3" fill={SKY} fillOpacity="0.6" />

        {/* benchtop + sink */}
        <rect x="60" y="112" width="360" height="16" rx="6" fill={NAVY} />
        <path d="M120 128 h120 v42 a14 14 0 0 1 -14 14 h-92 a14 14 0 0 1 -14 -14 z" fill={SKY} fillOpacity="0.14" stroke={NAVY} strokeWidth="2.5" />

        {/* cupboard */}
        <rect x="60" y="128" width="360" height="150" rx="8" fill="none" stroke={NAVY} strokeWidth="3" strokeOpacity="0.35" />
        <line x1="240" y1="128" x2="240" y2="278" stroke={NAVY} strokeWidth="2" strokeOpacity="0.2" />

        {/* supply and the filter */}
        <path d="M330 278 V232" {...PIPE} />
        <path d="M330 190 V150 H286 V102" {...PIPE} />
        <Canister x={330} y={208} label="Filter" />

        <text x="150" y="300" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>Under the sink</text>
      </svg>
    );
  }

  if (tier === "water-softeners") {
    return (
      <svg viewBox="0 0 480 320" role="img" aria-label="An ion-exchange softener on the main, with a resin vessel and a brine tank">
        <path d="M18 250 H120" {...PIPE} />
        <text x="22" y="236" fontSize="12" fill={NAVY} fillOpacity="0.7">Hard water in</text>

        {/* resin vessel */}
        <path d="M150 120 h74 v112 a37 22 0 0 1 -74 0 z" fill={SKY} fillOpacity="0.16" stroke={NAVY} strokeWidth="3" />
        <ellipse cx="187" cy="120" rx="37" ry="20" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <rect x="171" y="86" width="32" height="24" rx="6" fill={NAVY} />
        <text x="187" y="286" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>Resin vessel</text>
        <path d="M120 250 H150" {...PIPE} />

        {/* brine tank */}
        <path d="M300 150 h62 v92 a10 10 0 0 1 -10 10 h-42 a10 10 0 0 1 -10 -10 z" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <rect x="296" y="136" width="70" height="16" rx="6" fill={NAVY} />
        <path d="M306 214 h50 v24 h-50 z" fill={ORANGE} fillOpacity="0.28" />
        <text x="331" y="286" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>Salt / brine</text>
        <path d="M224 176 H300" stroke={ORANGE} strokeWidth="3" strokeDasharray="6 5" fill="none" strokeLinecap="round" />

        {/* softened out */}
        <path d="M224 250 H452 V196" {...PIPE} />
        <text x="392" y="184" fontSize="12" fill={NAVY} fillOpacity="0.7">Softened out</text>
      </svg>
    );
  }

  if (tier === "rainwater-uv") {
    return (
      <svg viewBox="0 0 480 320" role="img" aria-label="Tank water filtered then passed through a UV lamp before entering the house">
        {/* tank */}
        <path d="M24 110 h96 v146 a10 10 0 0 1 -10 10 h-76 a10 10 0 0 1 -10 -10 z" fill={SKY} fillOpacity="0.16" stroke={NAVY} strokeWidth="3" />
        <ellipse cx="72" cy="110" rx="48" ry="16" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <text x="72" y="292" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>Rain tank</text>

        <path d="M120 214 H176" {...PIPE} />
        <Canister x={198} y={190} label="Filter" />
        <path d="M220 214 H286" {...PIPE} />

        {/* UV lamp */}
        <rect x="286" y="196" width="104" height="36" rx="18" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <line x1="302" y1="214" x2="374" y2="214" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" />
        <text x="338" y="266" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>UV</text>
        <path d="M390 214 H452 V152" {...PIPE} />
        <text x="404" y="140" fontSize="12" fill={NAVY} fillOpacity="0.7">To the house</text>
      </svg>
    );
  }

  // whole-home
  return (
    <svg viewBox="0 0 480 320" role="img" aria-label="A filter on the incoming water main, before it splits to the whole house">
      {/* the house */}
      <path d="M232 96 L370 40 L448 96" fill="none" stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
      <rect x="256" y="96" width="176" height="150" rx="10" fill="#fff" stroke={NAVY} strokeWidth="3" />
      <rect x="282" y="126" width="42" height="38" rx="5" fill={SKY} fillOpacity="0.18" stroke={NAVY} strokeWidth="2" />
      <rect x="364" y="126" width="42" height="38" rx="5" fill={SKY} fillOpacity="0.18" stroke={NAVY} strokeWidth="2" />

      {/* main in, filter, then it splits */}
      <path d="M18 246 H126" {...PIPE} />
      <path d="M170 246 H256" {...PIPE} />
      <text x="22" y="232" fontSize="12" fill={NAVY} fillOpacity="0.7">Water main in</text>
      <Canister x={148} y={222} label="Filter" />

      {/* Manifold inside the house feeding three risers, rather than three
          loose verticals — the old version ran a pipe straight through
          the front door, which read as a mistake. */}
      <path d="M256 246 H274 V218" {...PIPE} strokeWidth={4} strokeOpacity={0.8} />
      <path d="M274 218 H406" stroke={SKY} strokeWidth="4" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
      <path d="M294 218 V190" stroke={SKY} strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.55" />
      <path d="M350 218 V190" stroke={SKY} strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.55" />
      <path d="M406 218 V190" stroke={SKY} strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.55" />
      <text x="344" y="292" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>Every tap in the house</text>
    </svg>
  );
}
