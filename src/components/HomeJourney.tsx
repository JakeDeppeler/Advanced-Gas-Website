"use client";

import { HOME_JOURNEY } from "@/lib/homeJourney";
import { ScrollJourney } from "@/components/ScrollJourney";

/**
 * The drawings for the home page journey. The shell that sticks them and
 * tracks the scroll is ScrollJourney, shared with the commercial page.
 *
 * Domestic on purpose. The commercial scenes are a reflected ceiling plan and
 * a condenser on a pad, because a builder reads those every day; these are a
 * phone, a quote, a van in a driveway and a head unit on a lounge room wall,
 * because that is what this reader is actually looking at.
 */

const STROKE = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A wall-mounted head, the shape everyone recognises on a lounge room wall. */
function HeadUnit({ x, y, w = 76, d = 0 }: { x: number; y: number; w?: number; d?: number }) {
  const h = w * 0.3;
  return (
    <g className="cj-pop" style={{ ["--d" as string]: `${d}s` }}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2.6} className="cj-line" strokeWidth="2" {...STROKE} />
      <path d={`M${x + 8} ${y + h - 5} H${x + w - 8}`} className="cj-line-2" strokeWidth="1.4" {...STROKE} />
      <circle cx={x + w - 10} cy={y + 7} r="1.8" className="cj-accent-f" />
    </g>
  );
}

/** Air, leaving the unit and meaning it. */
function Air({ x, y, d = 0 }: { x: number; y: number; d?: number }) {
  return (
    <path
      d={`M${x} ${y} q9 11 0 22 M${x + 16} ${y} q9 11 0 22 M${x + 32} ${y} q9 11 0 22`}
      className="cj-sky cj-air"
      strokeWidth="1.8"
      style={{ ["--d" as string]: `${d}s` }}
      {...STROKE}
    />
  );
}

function Scene({ kind }: { kind: string }) {
  switch (kind) {
    /* ---------- 01 · a photo of the old one ---------- */
    case "enquiry":
      return (
        <>
          <rect x="112" y="22" width="116" height="176" rx="16" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} {...STROKE} />
          <rect x="122" y="40" width="96" height="140" rx="6" className="cj-line-2 cj-draw" strokeWidth="1.4" pathLength={1} style={{ ["--d" as string]: "0.15s" }} {...STROKE} />
          {/* the photo they just took of whatever is on the wall now */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.4s" }}>
            <rect x="130" y="50" width="80" height="54" rx="4" className="cj-line" strokeWidth="1.8" {...STROKE} />
            <rect x="142" y="66" width="46" height="16" rx="7" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <path d="M148 88 h34" className="cj-line-2" strokeWidth="1.4" {...STROKE} />
          </g>
          <rect x="130" y="114" width="64" height="5" rx="2.5" className="cj-line-2-f cj-rise" style={{ ["--d" as string]: "0.58s" }} />
          <rect x="130" y="126" width="80" height="5" rx="2.5" className="cj-line-2-f cj-rise" style={{ ["--d" as string]: "0.64s" }} />
          {/* send */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.8s" }}>
            <rect x="130" y="146" width="80" height="24" rx="12" className="cj-accent-f" />
            <path d="M160 158 h18 m-6-5 6 5 -6 5" className="cj-band-stroke" strokeWidth="2" {...STROKE} />
          </g>
          <path d="M244 96 h24 m-8-8 8 8 -8 8" className="cj-sky cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.95s" }} {...STROKE} />
        </>
      );

    /* ---------- 02 · the price, rebate already off ---------- */
    case "quote":
      return (
        <>
          <rect x="66" y="26" width="208" height="168" rx="6" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} {...STROKE} />
          <path d="M66 58 H274" className="cj-line-2 cj-draw" strokeWidth="1.4" pathLength={1} style={{ ["--d" as string]: "0.14s" }} {...STROKE} />
          <rect x="82" y="38" width="54" height="7" rx="3.5" className="cj-line-2-f cj-rise" style={{ ["--d" as string]: "0.24s" }} />
          {/* line items */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.38s" }}>
            <path d="M82 80 h96 M216 80 h42" className="cj-line-2" strokeWidth="5" {...STROKE} />
            <path d="M82 100 h78 M222 100 h36" className="cj-line-2" strokeWidth="5" {...STROKE} />
            <path d="M82 120 h108 M226 120 h32" className="cj-line-2" strokeWidth="5" {...STROKE} />
          </g>
          <path d="M82 138 H258" className="cj-line-2 cj-draw" strokeWidth="1.2" pathLength={1} style={{ ["--d" as string]: "0.6s" }} {...STROKE} />
          {/* the rebate, which is the whole point of the beat */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.72s" }}>
            <path d="M82 154 h74" className="cj-accent" strokeWidth="5" {...STROKE} />
            <text x="258" y="159" className="cj-fig" textAnchor="end">&#8722; $2,700</text>
          </g>
          <g className="cj-pop" style={{ ["--d" as string]: "0.9s" }}>
            <rect x="170" y="168" width="90" height="16" rx="8" className="cj-accent-f" />
          </g>
        </>
      );

    /* ---------- 03 · someone actually comes and looks ---------- */
    case "visit":
      return (
        <>
          <path d="M22 184 H318" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} {...STROKE} />
          {/* the house */}
          <path d="M176 184 V96 H288 V184" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} style={{ ["--d" as string]: "0.12s" }} {...STROKE} />
          <path d="M164 100 L232 58 L300 100" className="cj-line cj-draw" strokeWidth="2.4" pathLength={1} style={{ ["--d" as string]: "0.28s" }} {...STROKE} />
          <path d="M214 184 V140 H250 V184" className="cj-accent cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.46s" }} {...STROKE} />
          <rect x="262" y="118" width="22" height="22" rx="2" className="cj-line-2 cj-draw" strokeWidth="1.6" pathLength={1} style={{ ["--d" as string]: "0.54s" }} {...STROKE} />
          {/* the van, in the driveway */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.66s" }}>
            <path d="M34 168 V132 h58 l20 22 v14 z" className="cj-line" strokeWidth="2.2" {...STROKE} />
            <path d="M92 138 h14 l10 12 h-24 z" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <path d="M44 150 h34" className="cj-accent" strokeWidth="3" {...STROKE} />
            <circle cx="52" cy="170" r="9" className="cj-line" strokeWidth="2.2" {...STROKE} />
            <circle cx="98" cy="170" r="9" className="cj-line" strokeWidth="2.2" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 04 · install day ---------- */
    case "install":
      return (
        <>
          {/* the wall, with the room on one side of it and the yard on the other */}
          <path d="M196 20 V196" className="cj-line cj-draw" strokeWidth="2.4" pathLength={1} {...STROKE} />
          <path d="M28 186 H196" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} style={{ ["--d" as string]: "0.08s" }} {...STROKE} />
          <path d="M196 186 H318" className="cj-line-2 cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.12s" }} {...STROKE} />
          {/* inside: the head going on the wall */}
          <HeadUnit x={68} y={48} w={92} d={0.4} />
          <Air x={88} y={82} d={0.5} />
          {/* the old one, boxed and going */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.62s" }}>
            <path d="M40 186 V150 h48 v36 z" className="cj-line-2" strokeWidth="1.8" {...STROKE} />
            <path d="M40 162 h48 M64 150 v36" className="cj-line-2" strokeWidth="1.2" {...STROKE} />
          </g>
          {/* the pipe run through the wall */}
          <path d="M160 62 H216 V132 H226" className="cj-accent cj-draw" strokeWidth="2" pathLength={1} style={{ ["--d" as string]: "0.72s" }} {...STROKE} />
          {/* outside: the condenser on its brackets */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.86s" }}>
            <rect x="226" y="114" width="68" height="50" rx="4" className="cj-line" strokeWidth="2" {...STROKE} />
            <circle cx="260" cy="139" r="16" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <circle cx="260" cy="139" r="3" className="cj-accent-f" />
            <path d="M234 164 v22 M286 164 v22" className="cj-line-2" strokeWidth="2.4" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 05 · certified, and shown to you ---------- */
    case "certified":
      return (
        <>
          <rect x="52" y="34" width="152" height="150" rx="5" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} {...STROKE} />
          <path d="M70 62 h94 M70 82 h114 M70 102 h76" className="cj-line-2 cj-draw" strokeWidth="1.8" pathLength={1} style={{ ["--d" as string]: "0.3s" }} {...STROKE} />
          <path d="M70 134 h56" className="cj-line-2 cj-draw" strokeWidth="1.4" pathLength={1} style={{ ["--d" as string]: "0.45s" }} {...STROKE} />
          {/* the seal */}
          <g className="cj-pop" style={{ ["--d" as string]: "0.58s" }}>
            <circle cx="168" cy="144" r="22" className="cj-accent" strokeWidth="2.2" {...STROKE} />
            <path d="M158 144 l7 7 14-15" className="cj-accent" strokeWidth="2.6" {...STROKE} />
          </g>
          {/* the controller, because being shown how it runs is half the beat */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.78s" }}>
            <rect x="232" y="52" width="62" height="114" rx="12" className="cj-line" strokeWidth="2.2" {...STROKE} />
            <rect x="242" y="64" width="42" height="30" rx="4" className="cj-sky" strokeWidth="1.6" {...STROKE} />
            <text x="263" y="86" className="cj-fig" textAnchor="middle">21&#176;</text>
            <circle cx="252" cy="116" r="6" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <circle cx="274" cy="116" r="6" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
            <path d="M242 138 h42 M242 150 h28" className="cj-line-2" strokeWidth="1.6" {...STROKE} />
          </g>
        </>
      );

    /* ---------- 06 · and then you forget about it ---------- */
    case "comfort":
      return (
        <>
          <path d="M40 188 H300" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} {...STROKE} />
          <path d="M62 188 V84 H278 V188" className="cj-line cj-draw" strokeWidth="2.2" pathLength={1} style={{ ["--d" as string]: "0.1s" }} {...STROKE} />
          <path d="M48 90 L170 34 L292 90" className="cj-line cj-draw" strokeWidth="2.4" pathLength={1} style={{ ["--d" as string]: "0.26s" }} {...STROKE} />
          <HeadUnit x={92} y={106} w={68} d={0.5} />
          <Air x={104} y={134} d={0.6} />
          {/* a sofa and somebody not thinking about the air conditioning */}
          <g className="cj-rise" style={{ ["--d" as string]: "0.76s" }}>
            <path d="M188 188 V158 q0-10 10-10 h48 q10 0 10 10 v30" className="cj-line" strokeWidth="2.2" {...STROKE} />
            <path d="M188 170 h80" className="cj-line-2" strokeWidth="1.8" {...STROKE} />
            <circle cx="214" cy="140" r="9" className="cj-line" strokeWidth="2" {...STROKE} />
            <path d="M204 158 q10-12 20 0" className="cj-line" strokeWidth="2" {...STROKE} />
          </g>
          <g className="cj-pop" style={{ ["--d" as string]: "0.96s" }}>
            <rect x="196" y="100" width="62" height="28" rx="14" className="cj-accent-f" />
            <text x="227" y="119" className="cj-temp" textAnchor="middle">21&#176;</text>
          </g>
        </>
      );

    default:
      return null;
  }
}

export function HomeJourney() {
  return <ScrollJourney beats={HOME_JOURNEY} renderScene={(k) => <Scene kind={k} />} />;
}
