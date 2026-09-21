"use client";

import { COMM_JOURNEY } from "@/lib/commercial";
import { ScrollJourney } from "@/components/ScrollJourney";

/**
 * The drawings for the commercial journey. The shell that sticks them and
 * tracks the scroll is ScrollJourney, which the home page uses too.
 *
 * These are drawn from the trade rather than from an icon set: a reflected
 * ceiling plan with the standard cross-in-a-square diffuser symbol, a spiral
 * spine with branch drops, a condenser on its pad. This audience spends its
 * day looking at exactly these, and a generic glyph would read as a marketing
 * site that has never been on a site.
 */

const STROKE = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A diffuser, drawn the way a ceiling plan draws one. */
function Diffuser({ x, y, s = 12, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <g className="cj-pop" style={{ ["--d" as string]: `${d}s` }}>
      <rect x={x} y={y} width={s} height={s} rx="1.5" className="cj-sky" strokeWidth="1.6" {...STROKE} />
      <path d={`M${x} ${y}L${x + s} ${y + s}M${x + s} ${y}L${x} ${y + s}`} className="cj-sky" strokeWidth="1.1" {...STROKE} />
    </g>
  );
}

function Person({ x, y, h = 30, d = 0 }: { x: number; y: number; h?: number; d?: number }) {
  const head = h * 0.26;
  return (
    <g className="cj-pop" style={{ ["--d" as string]: `${d}s` }}>
      <circle cx={x} cy={y - h + head} r={head} className="cj-line" strokeWidth="1.8" {...STROKE} />
      <path d={`M${x - h * 0.3} ${y} L${x - h * 0.3} ${y - h + head * 2.4} Q${x} ${y - h + head * 1.6} ${x + h * 0.3} ${y - h + head * 2.4} L${x + h * 0.3} ${y}`}
        className="cj-line" strokeWidth="1.8" {...STROKE} />
    </g>
  );
}

/** Shopfront elevation, shared by the fit-out and the open-for-trade beats. */
function Shopfront({ lit }: { lit: boolean }) {
  return (
    <>
      <path d="M40 176 H300" className="cj-line cj-draw" strokeWidth="2" pathLength={1} {...STROKE} />
      <path d="M52 176 V70 H288 V176" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} style={{ ["--d" as string]: "0.05s" }} {...STROKE} />
      {/* fascia + signage band */}
      <path d="M52 70 H288 V50 H52 Z" className="cj-line cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.2s" }} {...STROKE} />
      <rect x="120" y="56" width="100" height="8" rx="4" className={lit ? "cj-accent-f" : "cj-dim-f"} />
      {/* glazing */}
      {lit && <rect x="60" y="84" width="220" height="92" rx="2" className="cj-glow" />}
      <path d="M60 84 H280 V176" className="cj-line cj-draw" strokeWidth="1.6" pathLength={1} style={{ ["--d" as string]: "0.3s" }} {...STROKE} />
      <path d="M110 84 V176 M170 84 V176 M230 84 V176" className="cj-line-2 cj-draw" strokeWidth="1.4" pathLength={1} style={{ ["--d" as string]: "0.4s" }} {...STROKE} />
      {/* entry */}
      <path d="M170 176 V96 H230 V176" className="cj-accent cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.5s" }} {...STROKE} />
      {/* ceiling line inside, with the grilles that were just installed */}
      <path d="M62 100 H278" className="cj-line-2 cj-draw" strokeWidth="1.2" pathLength={1} style={{ ["--d" as string]: "0.6s" }} {...STROKE} />
      <Diffuser x={78} y={104} s={10} d={0.7} />
      <Diffuser x={128} y={104} s={10} d={0.78} />
      <Diffuser x={252} y={104} s={10} d={0.86} />
    </>
  );
}

function Scene({ kind }: { kind: string }) {
  switch (kind) {
    /* ---------- 01 · the enquiry lands ---------- */
    case "enquiry":
      return (
        <>
          <rect x="58" y="44" width="224" height="132" rx="10" className="cj-line cj-draw" strokeWidth="2" pathLength={1} {...STROKE} />
          <path d="M58 70 H282" className="cj-line-2 cj-draw" strokeWidth="1.4" pathLength={1} style={{ ["--d" as string]: "0.15s" }} {...STROKE} />
          <circle cx="72" cy="57" r="3" className="cj-line-2-f" />
          <circle cx="84" cy="57" r="3" className="cj-line-2-f" />
          <circle cx="96" cy="57" r="3" className="cj-line-2-f" />
          <rect x="76" y="86" width="126" height="6" rx="3" className="cj-line-2-f cj-rise" style={{ ["--d" as string]: "0.3s" }} />
          <rect x="76" y="100" width="172" height="6" rx="3" className="cj-line-2-f cj-rise" style={{ ["--d" as string]: "0.37s" }} />
          <rect x="76" y="114" width="94" height="6" rx="3" className="cj-line-2-f cj-rise" style={{ ["--d" as string]: "0.44s" }} />
          {/* the attachment, which is the actual point of the beat */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.6s" }}>
            <rect x="76" y="134" width="150" height="26" rx="6" className="cj-accent" strokeWidth="1.8" {...STROKE} />
            <path d="M92 141 v9 a4 4 0 0 0 8 0 v-11 a6 6 0 0 0-12 0 v12" className="cj-accent" strokeWidth="1.6" {...STROKE} />
            <rect x="108" y="144" width="104" height="6" rx="3" className="cj-accent-f" />
          </g>
          {/* landing */}
          <path d="M292 108 h-22 m8-8 -8 8 8 8" className="cj-sky cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.75s" }} {...STROKE} />
        </>
      );

    /* ---------- 02 · the plans ---------- */
    case "plans":
      return (
        <>
          {/* dimension string across the top, the way a drawing is read */}
          <path d="M60 44 H280 M60 40 v8 M280 40 v8 M170 40 v8" className="cj-line-2 cj-draw" strokeWidth="1.2" pathLength={1} {...STROKE} />
          <rect x="60" y="60" width="220" height="116" rx="2" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} style={{ ["--d" as string]: "0.1s" }} {...STROKE} />
          {/* partitions */}
          <path d="M170 60 V128 M170 128 H280 M110 128 V176" className="cj-line cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.3s" }} {...STROKE} />
          {/* door swing */}
          <path d="M170 104 h22" className="cj-line-2 cj-draw" strokeWidth="1.6" pathLength={1} style={{ ["--d" as string]: "0.45s" }} {...STROKE} />
          <path d="M192 104 a22 22 0 0 1-22 22" className="cj-line-2 cj-draw" strokeWidth="1.2" pathLength={1} style={{ ["--d" as string]: "0.5s" }} {...STROKE} />
          {/* reflected ceiling: the grilles, set out */}
          <Diffuser x={88} y={76} d={0.6} />
          <Diffuser x={130} y={76} d={0.66} />
          <Diffuser x={88} y={100} d={0.72} />
          <Diffuser x={130} y={100} d={0.78} />
          <Diffuser x={206} y={76} d={0.84} />
          <Diffuser x={244} y={76} d={0.9} />
          {/* the schedule block, bottom right, where a title block lives */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.95s" }}>
            <rect x="196" y="140" width="78" height="30" rx="2" className="cj-accent" strokeWidth="1.6" {...STROKE} />
            <path d="M196 152 H274 M222 140 v30" className="cj-accent" strokeWidth="1" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 03 · the building goes up ---------- */
    case "frame":
      return (
        <>
          <path d="M34 176 H306" className="cj-line cj-draw" strokeWidth="2.4" pathLength={1} {...STROKE} />
          {/* slab hatching */}
          <path d="M44 182 l8-6 M64 182 l8-6 M84 182 l8-6 M104 182 l8-6 M124 182 l8-6 M144 182 l8-6 M164 182 l8-6 M184 182 l8-6 M204 182 l8-6 M224 182 l8-6 M244 182 l8-6 M264 182 l8-6 M284 182 l8-6"
            className="cj-line-2 cj-draw" strokeWidth="1.1" pathLength={1} style={{ ["--d" as string]: "0.1s" }} {...STROKE} />
          {/* portal frame */}
          <path d="M72 176 V88 M268 176 V88" className="cj-line cj-draw" strokeWidth="2.6" pathLength={1} style={{ ["--d" as string]: "0.25s" }} {...STROKE} />
          <path d="M72 88 L170 58 L268 88" className="cj-line cj-draw" strokeWidth="2.6" pathLength={1} style={{ ["--d" as string]: "0.45s" }} {...STROKE} />
          {/* purlins */}
          <path d="M97 80 L97 92 M122 72 L122 84 M147 64 L147 76 M193 64 L193 76 M218 72 L218 84 M243 80 L243 92"
            className="cj-line-2 cj-draw" strokeWidth="1.5" pathLength={1} style={{ ["--d" as string]: "0.65s" }} {...STROKE} />
          {/* mid columns */}
          <path d="M120 176 V108 M220 176 V108" className="cj-line-2 cj-draw" strokeWidth="1.6" pathLength={1} style={{ ["--d" as string]: "0.7s" }} {...STROKE} />
          {/* the crane, still lowering a member in */}
          <g className="cj-hook">
            <path d="M170 18 V44" className="cj-accent cj-draw" strokeWidth="1.6" pathLength={1} style={{ ["--d" as string]: "0.85s" }} {...STROKE} />
            <path d="M164 44 h12 v8 h-12 z" className="cj-accent" strokeWidth="1.8" {...STROKE} />
            <path d="M138 56 H202" className="cj-accent" strokeWidth="3.4" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 04 · the install ---------- */
    case "duct":
      return (
        <>
          {/* ceiling and floor */}
          <path d="M28 52 H214" className="cj-line cj-draw" strokeWidth="2" pathLength={1} {...STROKE} />
          <path d="M28 176 H312" className="cj-line cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.05s" }} {...STROKE} />
          {/* external wall, plant sits the other side of it */}
          <path d="M214 52 V176" className="cj-line cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.1s" }} {...STROKE} />
          {/* the spiral spine */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.3s" }}>
            <rect x="40" y="66" width="150" height="20" rx="4" className="cj-line" strokeWidth="2" {...STROKE} />
            <path d="M62 66 v20 M84 66 v20 M106 66 v20 M128 66 v20 M150 66 v20 M172 66 v20" className="cj-line-2" strokeWidth="1" {...STROKE} />
          </g>
          {/* branch drops to the grilles */}
          <path d="M66 86 v22 M118 86 v22 M168 86 v22" className="cj-line cj-draw" strokeWidth="1.8" pathLength={1} style={{ ["--d" as string]: "0.5s" }} {...STROKE} />
          <Diffuser x={58} y={108} d={0.62} />
          <Diffuser x={110} y={108} d={0.68} />
          <Diffuser x={160} y={108} d={0.74} />
          {/* air, once it is actually running */}
          <path d="M64 128 v14 M116 128 v14 M166 128 v14" className="cj-sky cj-air" strokeWidth="1.6" strokeDasharray="3 5" {...STROKE} />
          {/* the ducted split's indoor unit, in the void */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.42s" }}>
            <rect x="140" y="30" width="54" height="18" rx="3" className="cj-accent" strokeWidth="1.8" {...STROKE} />
            <path d="M152 30 v18 M166 30 v18 M180 30 v18" className="cj-accent" strokeWidth="1" {...STROKE} />
          </g>
          {/* refrigerant lines out through the wall */}
          <path d="M194 39 H226 V132" className="cj-accent cj-draw" strokeWidth="1.8" pathLength={1} style={{ ["--d" as string]: "0.8s" }} {...STROKE} />
          {/* condenser on its pad */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.92s" }}>
            <rect x="240" y="120" width="56" height="44" rx="4" className="cj-line" strokeWidth="2" {...STROKE} />
            <circle cx="268" cy="142" r="14" className="cj-line-2" strokeWidth="1.5" {...STROKE} />
            <circle cx="268" cy="142" r="3" className="cj-accent-f" />
            <path d="M232 168 H304" className="cj-line-2" strokeWidth="3" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 05 · commissioned and balanced ---------- */
    case "commission":
      return (
        <>
          {/* the reading, against the figure it had to hit */}
          <g>
            <path d="M84 150 a62 62 0 0 1 124 0" className="cj-line-2 cj-draw" strokeWidth="2" pathLength={1} {...STROKE} />
            <path d="M84 150 a62 62 0 0 1 96-52" className="cj-accent cj-draw" strokeWidth="4" pathLength={1} style={{ ["--d" as string]: "0.25s" }} {...STROKE} />
            <path d="M90 128 l-9-4 M104 108 l-7-7 M146 90 l0-9 M188 108 l7-7 M202 128 l9-4"
              className="cj-line-2 cj-draw" strokeWidth="1.4" pathLength={1} style={{ ["--d" as string]: "0.15s" }} {...STROKE} />
            {/* needle, landing on target */}
            <g className="cj-needle">
              <path d="M146 150 L178 112" className="cj-line cj-draw" strokeWidth="2.6" pathLength={1} style={{ ["--d" as string]: "0.6s" }} {...STROKE} />
              <circle cx="146" cy="150" r="6" className="cj-line-f" />
            </g>
          </g>
          <g className="cj-rise" style={{ ["--d" as string]: "0.8s" }}>
            <rect x="94" y="160" width="104" height="26" rx="13" className="cj-sky" strokeWidth="1.6" {...STROKE} />
            <text x="146" y="178" className="cj-read" textAnchor="middle">420 L/s</text>
          </g>
          {/* the record of it, which is the half people skip */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.9s" }}>
            <rect x="228" y="54" width="68" height="86" rx="4" className="cj-line" strokeWidth="1.8" {...STROKE} />
            <rect x="248" y="46" width="28" height="12" rx="4" className="cj-line" strokeWidth="1.6" {...STROKE} />
            <path d="M240 78 l5 5 8-10 M240 98 l5 5 8-10 M240 118 l5 5 8-10" className="cj-accent" strokeWidth="2" {...STROKE} />
            <path d="M260 80 h26 M260 100 h26 M260 120 h26" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 06 · handed over ---------- */
    case "handover":
      return (
        <>
          {/* Two hands on the same package. Drawn as a handshake this beat
              failed twice — as arms and a clasp it reads as a moustache, as
              a solid mass it reads as a bone, and two little figures read as
              headstones. Hands holding the thing being handed over is the
              same moment, survives 340 x 220, and is what the beat is
              actually about. */}
          <g className="cj-rise">
            <rect x="120" y="38" width="128" height="96" rx="5" className="cj-line-2 cj-draw" strokeWidth="1.6" pathLength={1} {...STROKE} />
            <rect x="110" y="50" width="128" height="96" rx="5" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} style={{ ["--d" as string]: "0.12s" }} {...STROKE} />
            <path d="M128 74 h72 M128 90 h92 M128 106 h56" className="cj-line-2 cj-draw" strokeWidth="1.8" pathLength={1} style={{ ["--d" as string]: "0.3s" }} {...STROKE} />
            <g className="cj-pop" style={{ ["--d" as string]: "0.5s" }}>
              <circle cx="212" cy="124" r="15" className="cj-accent" strokeWidth="2" {...STROKE} />
              <path d="M205 124 l5 5 10-11" className="cj-accent" strokeWidth="2.2" {...STROKE} />
            </g>
          </g>

          {/* the hand offering it */}
          <g className="cj-shake">
            <g className="cj-pop" style={{ ["--d" as string]: "0.75s" }}>
              <rect x="58" y="122" width="28" height="8" rx="4" className="cj-line-f" />
              <rect x="50" y="130" width="48" height="32" rx="14" className="cj-line-f" />
              <rect x="92" y="133" width="32" height="7" rx="3.5" className="cj-line-f" />
              <rect x="92" y="143" width="32" height="7" rx="3.5" className="cj-line-f" />
              <rect x="92" y="153" width="26" height="7" rx="3.5" className="cj-line-f" />
            </g>
            {/* and the hand taking it */}
            <g className="cj-pop" style={{ ["--d" as string]: "0.88s" }}>
              <rect x="262" y="122" width="28" height="8" rx="4" className="cj-line-f" />
              <rect x="250" y="130" width="48" height="32" rx="14" className="cj-line-f" />
              <rect x="224" y="133" width="32" height="7" rx="3.5" className="cj-line-f" />
              <rect x="224" y="143" width="32" height="7" rx="3.5" className="cj-line-f" />
              <rect x="230" y="153" width="26" height="7" rx="3.5" className="cj-line-f" />
            </g>
          </g>
        </>
      );

    /* ---------- 07 · fit-out complete ---------- */
    case "fitout":
      return (
        <>
          <Shopfront lit={false} />
          {/* fittings going in */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.85s" }}>
            <path d="M70 176 V132 H104 V176 M70 154 H104" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <path d="M120 176 V140 H150 V176 M120 158 H150" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <path d="M244 176 V128 H274 V176 M244 148 H274 M244 164 H274" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 08 · open, and nobody mentions it ---------- */
    case "open":
      return (
        <>
          <Shopfront lit />
          {/* air doing its job, quietly */}
          <path d="M83 118 q6 8 0 16 M133 118 q6 8 0 16 M257 118 q6 8 0 16" className="cj-sky cj-air" strokeWidth="1.6" {...STROKE} />
          <Person x={98} y={176} h={34} d={0.9} />
          <Person x={142} y={176} h={30} d={0.98} />
          <Person x={262} y={176} h={32} d={1.06} />
          {/* the reading, off the glass and up in the corner where it reads
              as a thermostat rather than a sticker on the window */}
          <g className="cj-pop" style={{ ["--d" as string]: "1.15s" }}>
            <rect x="232" y="18" width="68" height="30" rx="15" className="cj-accent-f" />
            <text x="266" y="38" className="cj-temp" textAnchor="middle">22°</text>
          </g>
        </>
      );

    default:
      return null;
  }
}

export function CommercialJourney() {
  return <ScrollJourney beats={COMM_JOURNEY} renderScene={(k) => <Scene kind={k} />} />;
}
