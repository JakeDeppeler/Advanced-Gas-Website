"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { DiagramKind, HowStep } from "@/lib/homepage/learn";
import "./how.css";

/**
 * "How it works" as a moving cutaway rather than photos. The photos we have
 * are of installs, and beside "the pipes between" or "inverter control" they
 * showed whatever we had rather than the thing being described. Each kind of
 * system gets one detailed drawing of a real house with everything in it:
 * brick, roof tiles, insulated copper, flex duct, the compressor inside the
 * outdoor unit. Air, water, gas and refrigerant move in the direction they
 * really go, as particles along the pipes.
 *
 * Kept real but simple (Jake, Nov 2026): the equipment and what moves
 * through it are drawn as they are; the scenery that was only decoration
 * (sun, clouds, trees, fences, lamps, rugs, curtains, roof trusses, every
 * brick) is gone, so the eye lands on the system.
 *
 * Steps advance on their own while the diagram is on screen, until someone
 * picks one. The whole drawing stays on screen throughout; a step lights its
 * part rather than zooming in on it. With reduced motion asked for, nothing
 * moves or advances.
 */

type Rect = [number, number, number, number];

const C = {
  navy: "#050A30", cold: "#1BA7E0", coldLt: "#7FD3F4", hot: "#F2663A", hotLt: "#FFB08A", water: "#E8542A",
  line: "#B8C4D4", soft: "#E3E9F2", dark: "#2B3247", gas: "#E2A400", grey: "#8A97AB", ink: "#33405A",
};

/** Ids for this drawing's gradients and patterns, and whether things may move. */
const Ctx = createContext({ p: "hw", motion: true });
const useU = () => {
  const { p } = useContext(Ctx);
  return (n: string) => `url(#${p}-${n})`;
};

function Defs({ p }: { p: string }) {
  const id = (n: string) => `${p}-${n}`;
  return (
    <defs>
      <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EDF2F7" /><stop offset="1" stopColor="#FAFBFD" /></linearGradient>
      <linearGradient id={id("grass")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D3DCC9" /><stop offset="1" stopColor="#BFCBB3" /></linearGradient>
      <linearGradient id={id("wall")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFDF8" /><stop offset="1" stopColor="#F1EBE1" /></linearGradient>
      <linearGradient id={id("metal")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="0.7" stopColor="#EEF1F5" /><stop offset="1" stopColor="#D9DFE7" /></linearGradient>
      <linearGradient id={id("metalD")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A5470" /><stop offset="1" stopColor="#252C40" /></linearGradient>
      <linearGradient id={id("cyl")} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity=".16" /><stop offset=".3" stopColor="#fff" stopOpacity=".45" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".2" />
      </linearGradient>
      <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#EF5A2A" /><stop offset="0.45" stopColor="#F59A6E" /><stop offset="0.75" stopColor="#BFE3F3" /><stop offset="1" stopColor="#7FC9EC" />
      </linearGradient>
      <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E4F4FD" /><stop offset="1" stopColor="#A9D7F0" /></linearGradient>
      <linearGradient id={id("lag")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F7F8FA" /><stop offset="1" stopColor="#CDD4DE" /></linearGradient>
      <linearGradient id={id("duct")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F1F3F6" /><stop offset="1" stopColor="#AEB8C6" /></linearGradient>
      <linearGradient id={id("roofspace")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E7DCCB" /><stop offset="1" stopColor="#F4EEE4" /></linearGradient>
      <radialGradient id={id("glow")}><stop offset="0" stopColor="#FFB347" stopOpacity=".75" /><stop offset="1" stopColor="#FF7A36" stopOpacity="0" /></radialGradient>
      <radialGradient id={id("sun")}><stop offset="0" stopColor="#FFE58A" /><stop offset="1" stopColor="#FFC229" /></radialGradient>
      {/* Brick as a flat colour with its courses, not every brick drawn: the wall is there to hold the unit, not to be looked at (Jake, Nov 2026: real but simple). */}
      <pattern id={id("brick")} width="28" height="14" patternUnits="userSpaceOnUse">
        <rect width="28" height="14" fill="#C9896C" /><path d="M0 0.4 H28 M0 7.4 H28" stroke="#B87657" strokeWidth=".8" />
      </pattern>
      <pattern id={id("boards")} width="46" height="12" patternUnits="userSpaceOnUse">
        <rect width="46" height="12" fill="#E3CBA8" /><path d="M0 6 H46" stroke="#D6BB95" strokeWidth=".8" />
      </pattern>
      <pattern id={id("tiles")} width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#F4F7FA" /><path d="M0 0.5 H16 M0.5 0 V16" stroke="#D6DEE7" strokeWidth="1" />
      </pattern>
      <pattern id={id("fins")} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#DDE3EA" /><path d="M1 0 V4" stroke="#AFB9C6" strokeWidth="1" />
      </pattern>
      <pattern id={id("pv")} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#1D2F6B" /><path d="M0 0.4 H8 M0.4 0 V8" stroke="#6F87C9" strokeWidth=".7" />
      </pattern>
      <pattern id={id("pad")} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#D9C08A" /><path d="M0 6 L6 0 M-1 1 L1 -1 M5 7 L7 5" stroke="#B89A5E" strokeWidth="1" />
      </pattern>
      <linearGradient id={id("shade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A2A1A" stopOpacity="0" /><stop offset="1" stopColor="#3A2A1A" stopOpacity=".07" /></linearGradient>
      <linearGradient id={id("floorshade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A2A1A" stopOpacity=".22" /><stop offset="1" stopColor="#3A2A1A" stopOpacity="0" /></linearGradient>
      <linearGradient id={id("plumeHot")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF8A50" stopOpacity=".38" /><stop offset="1" stopColor="#FF8A50" stopOpacity="0" /></linearGradient>
      <linearGradient id={id("plumeCold")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3DBBEE" stopOpacity=".34" /><stop offset="1" stopColor="#3DBBEE" stopOpacity="0" /></linearGradient>
      <filter id={id("shadow")} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0A1A3A" floodOpacity=".18" /></filter>
      <filter id={id("blur")}><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
  );
}

/* ------------------------------------------------------------ moving things */

/** Particles carried along a path: refrigerant, water, gas or air. */
function Stream({ d, c, n = 5, dur = 3, r = 2.4 }: { d: string; c: string; n?: number; dur?: number; r?: number }) {
  const { motion } = useContext(Ctx);
  if (!motion) return null;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const begin = `${(-(i * dur) / n).toFixed(2)}s`;
        return (
          <circle key={i} r={r} fill={c}>
            <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={d} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.88;1" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

/** An insulated copper or water line: lagging, a line of colour, and what's moving in it. */
function Pipe({ d, c, w = 8, dur = 3, n = 6, lag = true }: { d: string; c: string; w?: number; dur?: number; n?: number; lag?: boolean }) {
  const u = useU();
  return (
    <g>
      {lag && <path d={d} stroke="#A9B4C2" strokeWidth={w + 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={d} stroke={lag ? u("lag") : "#C98B57"} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={c} strokeOpacity=".55" strokeWidth={Math.max(2, w / 3)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Stream d={d} c={c} n={n} dur={dur} r={Math.max(1.8, w / 3.4)} />
    </g>
  );
}

/** A thin pipe with no lagging: drains, gas. */
function Line({ d, c, w = 3, dash, flow }: { d: string; c: string; w?: number; dash?: string; flow?: string }) {
  return (
    <g>
      <path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      {flow && <Stream d={d} c={flow} n={4} dur={4} r={1.8} />}
    </g>
  );
}

/** Flexible duct: a silver tube with its ribs, and air moving inside. */
function Duct({ d, c, on = true, w = 13 }: { d: string; c: string; on?: boolean; w?: number }) {
  const u = useU();
  return (
    <g>
      <path d={d} stroke="#9AA6B5" strokeWidth={w + 2} fill="none" strokeLinejoin="round" />
      <path d={d} stroke={u("duct")} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <path d={d} stroke="#7F8B9C" strokeOpacity=".35" strokeWidth={w} fill="none" strokeLinejoin="round" strokeDasharray="1.4 4.6" />
      {on && <Stream d={d} c={c} n={7} dur={2.6} r={2.6} />}
    </g>
  );
}

/** Moving air: soft ribbons with particles riding them, heading (dx, dy). */
function Breeze({ x, y, dx, dy, c, n = 3, gap = 22 }: { x: number; y: number; dx: number; dy: number; c: string; n?: number; gap?: number }) {
  const horiz = Math.abs(dx) > Math.abs(dy);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const ox = horiz ? 0 : (i - (n - 1) / 2) * gap;
        const oy = horiz ? (i - (n - 1) / 2) * gap : 0;
        const sx = x + ox, sy = y + oy;
        const mx = sx + dx / 2 + (horiz ? 0 : 9), my = sy + dy / 2 + (horiz ? 9 : 0);
        const d = `M${sx} ${sy} Q${mx} ${my} ${sx + dx} ${sy + dy}`;
        return (
          <g key={i}>
            <path d={d} stroke={c} strokeOpacity=".14" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d={d} className="hw-flow" stroke={c} strokeOpacity=".75" strokeWidth="2" fill="none" strokeLinecap="round" />
            <Stream d={d} c={c} n={2} dur={1.8 + i * 0.15} r={2.2} />
          </g>
        );
      })}
    </g>
  );
}

/** A fan with curved blades behind a round grille. */
function Fan({ cx, cy, r, grille = true }: { cx: number; cy: number; r: number; grille?: boolean }) {
  const blade = `M${cx} ${cy} C${cx + r * 0.18} ${cy - r * 0.35} ${cx + r * 0.42} ${cy - r * 0.86} ${cx + r * 0.05} ${cy - r * 0.92} C${cx - r * 0.32} ${cy - r * 0.88} ${cx - r * 0.24} ${cy - r * 0.34} ${cx} ${cy}Z`;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 3} fill="#1F2536" />
      <circle cx={cx} cy={cy} r={r} fill="#30384E" />
      <g className="hw-spin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {[0, 120, 240].map((a) => <path key={a} d={blade} fill="#9AA6B8" transform={`rotate(${a} ${cx} ${cy})`} />)}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.16} fill="#C9D1DC" stroke="#5D6B80" strokeWidth="1.5" />
      {grille && (
        <g stroke="#E8EDF3" strokeOpacity=".75" fill="none" strokeWidth="1.2">
          {[0.42, 0.7, 0.98].map((k) => <circle key={k} cx={cx} cy={cy} r={r * k} />)}
          {[0, 45, 90, 135].map((a) => <line key={a} x1={cx - r} y1={cy} x2={cx + r} y2={cy} transform={`rotate(${a} ${cx} ${cy})`} />)}
        </g>
      )}
    </g>
  );
}

/** A gas flame: blue at the burner, orange above, with a glow. */
function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const u = useU();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-14" rx="16" ry="20" fill={u("glow")} />
      <g className="hw-flame">
        <path d="M0 0 C-11 -8 -9 -24 0 -36 C9 -24 11 -8 0 0Z" fill="#FF7A36" />
        <path d="M0 0 C-7 -6 -6 -16 0 -24 C6 -16 7 -6 0 0Z" fill="#FFC74D" />
        <path d="M0 0 C-6 -2 -6 -7 0 -10 C6 -7 6 -2 0 0Z" fill="#3D8BFF" />
      </g>
    </g>
  );
}



/** A timer, for a heat pump that runs while the sun is up or power is cheap. */
function Clock({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="24" fill="#fff" stroke={C.navy} strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={cx} y1={cy - 19} x2={cx} y2={cy - (i % 3 ? 17 : 15)} stroke={C.navy} strokeWidth="1.6" transform={`rotate(${i * 30} ${cx} ${cy})`} />)}
      <path d={`M${cx} ${cy} L${cx} ${cy - 19} A19 19 0 0 1 ${cx + 19} ${cy}Z`} fill="#FFC229" opacity=".35" />
      <line x1={cx} y1={cy} x2={cx + 9} y2={cy + 4} stroke={C.navy} strokeWidth="3" strokeLinecap="round" />
      <line className="hw-spin" style={{ transformOrigin: `${cx}px ${cy}px` }} x1={cx} y1={cy} x2={cx} y2={cy - 16} stroke={C.hot} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill={C.navy} />
    </g>
  );
}

/** A dial whose needle hunts up and down, for an inverter compressor finding its speed. */
function Dial({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path d={`M${cx - 15} ${cy} A15 15 0 0 1 ${cx + 15} ${cy}`} fill="none" stroke="#5E6A82" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${cx + 6} ${cy - 14} A15 15 0 0 1 ${cx + 15} ${cy}`} fill="none" stroke={C.hot} strokeWidth="5" strokeLinecap="round" />
      <line className="hw-needle" style={{ transformOrigin: `${cx}px ${cy}px` }} x1={cx} y1={cy} x2={cx} y2={cy - 13} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill="#fff" />
    </g>
  );
}

/** A compressor: the dark dome inside an outdoor unit, with its copper stubs. */
function Compressor({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const u = useU();
  return (
    <g>
      <path d={`M${x + w * 0.3} ${y + 6} V${y - 6} H${x + w * 0.5} M${x + w * 0.7} ${y + 6} V${y - 10}`} stroke="#C98B57" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x={x} y={y} width={w} height={h} rx={w / 2.4} fill={u("metalD")} />
      <rect x={x} y={y} width={w} height={h} rx={w / 2.4} fill={u("cyl")} />
      <rect x={x + 3} y={y + h - 6} width={w - 6} height="6" rx="2" fill="#1B2030" />
    </g>
  );
}

function Shower({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} h-22 v12`} stroke="#AEB7C4" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d={`M${x} ${y} h-22 v12`} stroke="#EEF2F6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d={`M${x - 36} ${y + 18} q14 -10 28 0z`} fill="#C3CBD6" stroke="#8D98A8" strokeWidth="1" />
      {[-32, -27, -22, -17, -12].map((dx, i) => (
        <line key={i} className="hw-drip" style={{ animationDelay: `${(i % 3) * 0.22 + i * 0.05}s` }} x1={x + dx} y1={y + 22} x2={x + dx - (dx + 22) * 0.25} y2={y + 31} stroke={C.coldLt} strokeWidth="2" strokeLinecap="round" />
      ))}
      <ellipse cx={x - 22} cy={y + 20} rx="18" ry="5" fill="#FFB08A" opacity=".25" className="hw-pulse" />
    </g>
  );
}

/** Steam or flue gas rising and fading. */
function Puffs({ x, y, c = "#C3CBD6" }: { x: number; y: number; c?: string }) {
  const { motion } = useContext(Ctx);
  if (!motion) return null;
  return (
    <g>{[0, 1, 2].map((i) => <circle key={i} cx={x} cy={y} r={5 + i} fill={c} className="hw-puff" style={{ animationDelay: `${i * 0.7}s` }} />)}</g>
  );
}

/* ------------------------------------------------------------ the building */

const Sky = () => {
  const u = useU();
  return <rect x="0" y="0" width="600" height="400" fill={u("sky")} />;
};

const Ground = () => {
  const u = useU();
  return (
    <g>
      <rect x="0" y="350" width="600" height="50" fill={u("grass")} />
      <path d="M0 351 H600" stroke="#C6D0BB" strokeWidth="1.5" />
    </g>
  );
};

/** Wall colours for the rooms: [back wall, side walls]. */
const PAINT = {
  // One quiet off-white for every room: the pastel walls competed with the air and water that are the point.
  cream: ["#FFFDF9", "#EEE9E0"], blue: ["#FFFDF9", "#EEE9E0"], warm: ["#FFFDF9", "#EEE9E0"], sage: ["#FFFDF9", "#EEE9E0"],
} as const;
type Tone = keyof typeof PAINT;

/**
 * A room seen in cutaway, with depth: a back wall, side walls and a ceiling
 * running back to it, and the floorboards coming forward. Bathrooms get a
 * tiled back wall.
 */
function Room({ x, y, w, h, d = 14, tone = "cream", tiles = false }: { x: number; y: number; w: number; h: number; d?: number; tone?: Tone; tiles?: boolean }) {
  const u = useU();
  const [back, side] = PAINT[tone];
  const bx = x + d, by = y + d * 0.6, bw = w - 2 * d, bh = h - d * 0.6 - d;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={side} />
      <polygon points={`${x},${y} ${x + w},${y} ${bx + bw},${by} ${bx},${by}`} fill="#FBF9F5" />
      <rect x={bx} y={by} width={bw} height={bh} fill={tiles ? u("tiles") : back} />
      <rect x={bx} y={by} width={bw} height={bh} fill={u("shade")} />
      <polygon points={`${x},${y} ${bx},${by} ${bx},${by + bh} ${x},${y + h}`} fill={side} />
      <polygon points={`${x + w},${y} ${bx + bw},${by} ${bx + bw},${by + bh} ${x + w},${y + h}`} fill={side} opacity=".85" />
      <polygon points={`${x},${y + h} ${x + w},${y + h} ${bx + bw},${by + bh} ${bx},${by + bh}`} fill={u("boards")} />
      <polygon points={`${x},${y + h} ${x + w},${y + h} ${bx + bw},${by + bh} ${bx},${by + bh}`} fill={u("floorshade")} />
      {!tiles && <rect x={bx} y={by + bh - 4} width={bw} height="4" fill="#FFFFFF" stroke="#E2D9CB" strokeWidth=".6" />}
      <path d={`M${bx} ${by} H${bx + bw}`} stroke="#E4DBCD" strokeWidth="1.5" />
    </g>
  );
}

/** A window in the back wall, with the sky through it and curtains either side. */
function Window({ x, y, w, h, curtains = false }: { x: number; y: number; w: number; h: number; curtains?: boolean }) {
  const u = useU();
  return (
    <g>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="2" fill="#fff" stroke="#D3CCC0" />
      <rect x={x} y={y} width={w} height={h} fill={u("glass")} />
      <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.45} H${x + w}`} stroke="#fff" strokeWidth="3" />
      <path d={`M${x + 6} ${y + h - 10} L${x + w * 0.4} ${y + 8}`} stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
      <rect x={x - 6} y={y + h + 2} width={w + 12} height="5" rx="2" fill="#EDE6DA" />
    </g>
  );
}

/** A bathroom vanity: cabinet, basin and tap, with a mirror above. */
function Vanity({ x, y, w = 56 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <rect x={x + 6} y={y - 58} width={w - 12} height="40" rx="4" fill="#DDEBF4" stroke="#B9C3CF" />
      <path d={`M${x + 12} ${y - 26} L${x + 22} ${y - 52}`} stroke="#fff" strokeWidth="3" strokeOpacity=".8" />
      <rect x={x} y={y} width={w} height="30" rx="3" fill="#F5F1EA" stroke="#D3CCC0" />
      <path d={`M${x + w / 2} ${y + 4} V${y + 26}`} stroke="#D3CCC0" />
      <rect x={x - 2} y={y - 4} width={w + 4} height="5" rx="2" fill="#E9E4DC" />
      <ellipse cx={x + w / 2} cy={y - 4} rx="13" ry="3.5" fill="#fff" stroke="#C3CBD6" />
      <path d={`M${x + w / 2} ${y - 6} v-8 h6`} stroke="#AEB7C4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}








/** The roof space: the triangle under the tiles, its trusses, and the foil sarking. */
function RoofSpace({ l, r, top, eave, space = true }: { l: number; r: number; top: number; eave: number; space?: boolean }) {
  const u = useU();
  const mid = (l + r) / 2;
  return (
    <g>
      <polygon points={`${l},${eave} ${mid},${top} ${r},${eave}`} fill={space ? u("roofspace") : "#E9DFD0"} />
      {space && <polyline points={`${l + 8},${eave - 1} ${mid},${top + 7} ${r - 8},${eave - 1}`} fill="none" stroke="#D8C7AE" strokeWidth="3" strokeLinejoin="round" />}
    </g>
  );
}

/** Terracotta tiles along both slopes, ridge capping, and a gutter at each eave. */
function RoofTiles({ l, r, top, eave }: { l: number; r: number; top: number; eave: number }) {
  const mid = (l + r) / 2;
  const pts = `${l - 8},${eave + 5} ${mid},${top - 5} ${r + 8},${eave + 5}`;
  return (
    <g>
      <polyline points={pts} fill="none" stroke="#7A3A28" strokeWidth="14" strokeLinejoin="round" />
      <polyline points={pts} fill="none" stroke="#A9573D" strokeWidth="12" strokeLinejoin="round" />
      <polyline points={pts} fill="none" stroke="#C26A4C" strokeWidth="4" strokeLinejoin="round" transform="translate(0 -3)" />
      <rect x={mid - 9} y={top - 14} width="18" height="9" rx="4" fill="#8E4630" />
      {[l - 14, r + 2].map((x) => (
        <g key={x}>
          <rect x={x} y={eave + 4} width="12" height="8" fill="#F4F1EC" />
          <path d={`M${x - 1} ${eave + 10} h14 v4 a7 7 0 0 1 -14 0z`} fill="#B9C0C9" />
        </g>
      ))}
    </g>
  );
}

/** The tiled roof whole, for houses where nothing has to pass through it. */
function Roof(props: { l: number; r: number; top: number; eave: number; space?: boolean }) {
  return <><RoofSpace {...props} /><RoofTiles {...props} /></>;
}

/** A round ceiling diffuser, with the soft cone of air it throws into the room. */
function Diffuser({ x, y, c, on = true }: { x: number; y: number; c: string; on?: boolean }) {
  const u = useU();
  return (
    <g>
      {on && <path d={`M${x - 14} ${y + 6} L${x - 46} ${y + 92} H${x + 46} L${x + 14} ${y + 6}Z`} fill={u(c === C.hot ? "plumeHot" : "plumeCold")} />}
      <rect x={x - 9} y={y - 6} width="18" height="7" fill="#B9C2CE" />
      <ellipse cx={x} cy={y + 3} rx="19" ry="5" fill="#fff" stroke={on ? "#7F8B9C" : C.line} strokeWidth="1.2" />
      <ellipse cx={x} cy={y + 3} rx="12" ry="3" fill="none" stroke={on ? "#9AA6B5" : C.line} strokeWidth="1" />
      <ellipse cx={x} cy={y + 3} rx="5" ry="1.4" fill={on ? "#7F8B9C" : C.line} />
    </g>
  );
}



const Brick = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => {
  const u = useU();
  return <rect x={x} y={y} width={w} height={h} fill={u("brick")} />;
};

/** The eave along the top of an outside wall: soffit, fascia and gutter. */
const Eave = ({ x, y, w }: { x: number; y: number; w: number }) => (
  <g>
    <rect x={x} y={y - 4} width={w} height="6" fill="#F4F1EC" />
    <rect x={x} y={y - 14} width={w} height="10" fill="#E9E4DC" stroke="#CFC7BA" strokeWidth="1" />
    <rect x={x} y={y - 18} width={w} height="6" rx="2" fill="#B9C0C9" />
  </g>
);


function Sofa({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="22" rx="8" fill="#5E7FA8" />
      <rect x={x + 6} y={y + 14} width={w - 12} height="16" rx="5" fill="#7194C0" />
      <rect x={x - 4} y={y + 8} width="14" height="26" rx="6" fill="#4F6E95" /><rect x={x + w - 10} y={y + 8} width="14" height="26" rx="6" fill="#4F6E95" />
      <rect x={x + w * 0.62} y={y + 2} width="18" height="14" rx="4" fill="#F2B279" transform={`rotate(-8 ${x + w * 0.62} ${y + 2})`} />
    </g>
  );
}

function Bed({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y - 10} width="8" height="34" rx="3" fill="#8A6B4E" />
      <rect x={x + 6} y={y + 6} width={w - 6} height="16" rx="5" fill="#fff" stroke="#D8DEE6" />
      <rect x={x + 24} y={y + 2} width={w - 24} height="18" rx="5" fill="#9DB7D6" />
      <rect x={x + 9} y={y} width="16" height="9" rx="4" fill="#fff" stroke="#D8DEE6" />
    </g>
  );
}

function Table({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="6" rx="2" fill="#A5774F" />
      <path d={`M${x + 6} ${y + 6} V${y + 30} M${x + w - 6} ${y + 6} V${y + 30}`} stroke="#8A6040" strokeWidth="4" />
      <path d={`M${x + w * 0.35} ${y} c0-14 14-14 14 0`} fill="#7DB46B" />
    </g>
  );
}



/** A label on a white pill so it reads over anything. */
function Label({ x, y, children, anchor = "middle", c = C.navy }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end"; c?: string }) {
  const w = children.length * 6.5 + 16;
  const lx = anchor === "start" ? x - 8 : anchor === "end" ? x - w + 8 : x - w / 2;
  return (
    <g>
      <rect x={lx} y={y - 14} width={w} height="20" rx="10" fill="#fff" fillOpacity=".92" stroke="#DCE3EC" />
      <text x={x} y={y} textAnchor={anchor} className="hw-label" fill={c}>{children}</text>
    </g>
  );
}

/** A temperature reading: a small thermometer and the figure, warm or cool. */
function Temp({ x, y, t, hot }: { x: number; y: number; t: string; hot: boolean }) {
  const col = hot ? C.hot : C.cold;
  return (
    <g>
      <rect x={x} y={y} width={t.length * 8 + 34} height="26" rx="13" fill="#fff" stroke={col} strokeWidth="2" />
      <rect x={x + 10} y={y + 5} width="6" height="13" rx="3" fill="#fff" stroke={col} strokeWidth="1.6" />
      <circle cx={x + 13} cy={y + 19} r="4" fill={col} />
      <rect x={x + 12} y={y + (hot ? 8 : 12)} width="2" height={hot ? 10 : 6} fill={col} />
      <text x={x + 24} y={y + 18} className="hw-temp" fill={C.navy}>{t}</text>
    </g>
  );
}

/* ------------------------------------------------------------ the equipment */

/** A wall-mounted split head: cover, display, the louvre the air leaves by. */
function IndoorSplit({ x, y, w, h, on = true }: { x: number; y: number; w: number; h: number; on?: boolean }) {
  const u = useU();
  const { p } = useContext(Ctx);
  return (
    <g filter={`url(#${p}-shadow)`}>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(14, h / 3)} fill={u("metal")} stroke="#C8D1DD" strokeWidth="1.5" />
      <path d={`M${x + 12} ${y + 8} H${x + w - 12}`} stroke="#E1E6EC" strokeWidth="1.5" />
      <rect x={x + 8} y={y + h - 15} width={w - 16} height="8" rx="4" fill="#2B3247" />
      <path d={`M${x + 12} ${y + h - 7} H${x + w - 12} L${x + w - 16} ${y + h + 1} H${x + 16}Z`} fill="#E8EDF2" stroke="#C3CCD7" strokeWidth="1" />
      {on && <circle cx={x + w - 18} cy={y + 14} r="3" fill={C.cold} className="hw-pulse" />}
    </g>
  );
}

/**
 * An outdoor unit: metal cabinet, the fan behind its grille, the coil fins
 * down the side and, cut away, the compressor with its inverter dial.
 */
function OutdoorUnit({ x, y, w, h, fan, cut, label }: {
  x: number; y: number; w: number; h: number;
  fan: { cx: number; cy: number; r: number };
  cut?: { x: number; y: number; w: number; h: number; dial?: boolean; text?: string };
  label?: string;
}) {
  const u = useU();
  const { p } = useContext(Ctx);
  return (
    <g>
      <ellipse cx={x + w / 2} cy={y + h + 2} rx={w / 2 + 10} ry="6" fill="#000" opacity=".12" />
      <rect x={x - 6} y={y + h - 4} width={w + 12} height="8" rx="2" fill="#C9CED6" />
      <g filter={`url(#${p}-shadow)`}>
        <rect x={x} y={y} width={w} height={h - 4} rx="8" fill={u("metal")} stroke="#B9C3CF" strokeWidth="1.5" />
        <rect x={x + w - 12} y={y + 8} width="6" height={h - 20} rx="2" fill={u("fins")} />
      </g>
      {cut && (
        <g>
          <rect x={cut.x} y={cut.y} width={cut.w} height={cut.h} rx="5" fill="#1C2233" />
          <Compressor x={cut.x + cut.w * 0.2} y={cut.y + cut.h * 0.42} w={cut.w * 0.6} h={cut.h * 0.52} />
          {cut.dial && <Dial cx={cut.x + cut.w / 2} cy={cut.y + cut.h * 0.3} />}
          {cut.text && <text x={cut.x + cut.w / 2} y={cut.y + cut.h * 0.3} textAnchor="middle" className="hw-label hw-label--big" fill="#fff">{cut.text}</text>}
        </g>
      )}
      <Fan cx={fan.cx} cy={fan.cy} r={fan.r} />
      {label && <text x={x + 10} y={y + h - 10} className="hw-brand" fill="#9AA6B5">{label}</text>}
    </g>
  );
}

/** A ceiling vent: the square diffuser the air comes down through. */
function Vent({ x, y, on = true }: { x: number; y: number; on?: boolean }) {
  return (
    <g>
      <rect x={x - 18} y={y} width="36" height="8" rx="2" fill={on ? "#fff" : "#EEF1F4"} stroke={on ? C.navy : C.line} strokeWidth="1.5" />
      <path d={`M${x - 12} ${y + 4} H${x + 12}`} stroke={on ? C.navy : C.line} strokeWidth="1.2" strokeDasharray="3 2" />
    </g>
  );
}

/** A zone damper inside the duct: a blade turned by a small motor. */
function Damper({ x, y, shut = false }: { x: number; y: number; shut?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill="#fff" stroke={C.navy} strokeWidth="2" />
      <rect x={x + 8} y={y - 16} width="14" height="10" rx="2" fill={C.navy} />
      <circle cx={x + 15} cy={y - 11} r="2" fill={shut ? C.grey : "#4ADE80"} />
      <line className={shut ? undefined : "hw-damper"} style={{ transformOrigin: `${x}px ${y}px` }} x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={C.navy} strokeWidth="3" strokeLinecap="round" transform={shut ? `rotate(90 ${x} ${y})` : undefined} />
    </g>
  );
}

/** A storage tank in its casing, cut open to show the water hot at the top and cold at the bottom. */
function Tank({ x, y, w, h, coil = false, flue = false }: { x: number; y: number; w: number; h: number; coil?: boolean; flue?: boolean }) {
  const u = useU();
  const { p } = useContext(Ctx);
  const cx = x + 10, cw = w - 20, cy = y + 16, ch = h - 34;
  return (
    <g>
      <g filter={`url(#${p}-shadow)`}>
        <rect x={x} y={y} width={w} height={h} rx={Math.min(22, w / 3.5)} fill={u("metal")} stroke="#B9C3CF" strokeWidth="1.5" />
        <rect x={x} y={y} width={w} height={h} rx={Math.min(22, w / 3.5)} fill={u("cyl")} />
      </g>
      <rect x={cx} y={cy} width={cw} height={ch} rx="8" fill={u("water")} />
      <rect x={cx} y={cy} width={cw} height={ch} rx="8" fill="#fff" opacity=".18" className="hw-shimmer" />
      {coil && Array.from({ length: Math.floor(ch / 18) }, (_, i) => (
        <path key={i} d={`M${cx + 4} ${cy + 10 + i * 18} H${cx + cw - 4}`} stroke="#B5531F" strokeWidth="4" strokeLinecap="round" opacity=".85" />
      ))}
      {flue && <path d={`M${x + w / 2} ${cy} V${cy + ch}`} stroke="#6B768A" strokeWidth="8" />}
      <rect x={cx} y={cy} width={cw} height={ch} rx="8" fill="none" stroke="#fff" strokeWidth="2" />
      <path d={`M${x + 6} ${cy - 2} l6 -8 M${x + w - 6} ${cy + ch + 2} l-6 8`} stroke="#B9C3CF" strokeWidth="1" />
    </g>
  );
}

/** A gas meter on the wall, with the yellow gas line through it. */
function GasMeter({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="40" height="38" rx="5" fill="#E9ECF0" stroke="#9AA6B5" strokeWidth="1.5" />
      <rect x={x + 7} y={y + 7} width="26" height="10" rx="2" fill="#1F2536" />
      <text x={x + 20} y={y + 15} textAnchor="middle" className="hw-meter" fill="#7CF0A6">0382</text>
      <circle cx={x + 20} cy={y + 27} r="5" fill="#fff" stroke="#9AA6B5" />
    </g>
  );
}


/** A window in an outside brick wall: soldier course over it, aluminium frame, brick sill. */
function FacadeWindow({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const u = useU();
  return (
    <g>
      <rect x={x - 7} y={y - 10} width={w + 14} height="7" fill="#8E4A33" />
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="#3B4252" />
      <rect x={x} y={y} width={w} height={h} fill={u("glass")} />
      <rect x={x + w * 0.62} y={y} width={w * 0.38} height={h} fill="#E9DCC6" opacity=".6" />
      <path d={`M${x + w / 2} ${y} V${y + h}`} stroke="#3B4252" strokeWidth="3" />
      <path d={`M${x + 5} ${y + h - 6} L${x + w * 0.35} ${y + 6}`} stroke="#fff" strokeOpacity=".6" strokeWidth="4" />
      <rect x={x - 8} y={y + h + 3} width={w + 16} height="6" fill="#A5583A" />
    </g>
  );
}



const Slab = ({ x, w, y = 352 }: { x: number; w: number; y?: number }) => (
  <g>
    <rect x={x} y={y - 6} width={w} height="8" rx="1" fill="#D2CEC6" />
    <rect x={x} y={y - 6} width={w} height="2" fill="#E3E0DA" />
  </g>
);

/** The edge of the roof over a room in cutaway: ceiling space, tiles, gutter. */
function RoofEdge({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const d = `M${x1 - 10} ${y - 24} L${x2 + 12} ${y - 10}`;
  return (
    <g>
      <path d={`M${x1} ${y - 18} L${x2} ${y - 10} V${y} H${x1}Z`} fill="#E7DCCB" />
      <path d={d} stroke="#7A3A28" strokeWidth="13" />
      <path d={d} stroke="#A9573D" strokeWidth="11" />
      <rect x={x2 + 6} y={y - 12} width="10" height="8" fill="#F4F1EC" />
      <path d={`M${x2 + 5} ${y - 6} h14 v4 a7 7 0 0 1 -14 0z`} fill="#B9C0C9" />
    </g>
  );
}

/** A plastic cover the pipes run down the outside wall in, see-through here so the pipes show. */
const PipeCover = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="3" fill="#F1ECE1" opacity=".55" stroke="#D3CCC0" />
    {Array.from({ length: Math.floor(h / 60) }, (_, i) => <rect key={i} x={x - 1} y={y + 50 + i * 60} width={w + 2} height="3" fill="#E3DCCF" />)}
  </g>
);

/* ------------------------------------------------------------ scenes */

function SplitScene({ heat = false }: { heat?: boolean }) {
  const room = heat ? C.hot : C.cold, out = heat ? C.cold : C.hot;
  return (
    <>
      <Sky />
      <Ground />
      <RoofEdge x1={14} x2={382} y={40} />
      <Room x={24} y={40} w={330} h={312} tone="warm" />
      <Window x={40} y={150} w={72} h={92} curtains />
      <Sofa x={64} y={304} w={146} />
      <Brick x={354} y={40} w={28} h={312} />
      {/* indoor unit and the air it moves */}
      <IndoorSplit x={110} y={78} w={200} h={54} />
      <Breeze x={210} y={146} dx={-30} dy={106} c={room} n={4} gap={34} />
      {/* refrigerant: two insulated lines through the wall and down it in a cover, the drain beside them */}
      <Line d="M296 132 V148 H384 V350" c="#9AA6B5" w={3} flow={C.coldLt} />
      {/* Jake's picture of it (Nov 2026): cooling, cold refrigerant comes in to
          the head and hot gas leaves it carrying the room's heat; heating is the
          same pipes the other way round. */}
      <Pipe d="M420 248 V110 H310" c={heat ? C.hot : C.cold} />
      <Pipe d="M310 98 H432 V248" c={heat ? C.cold : C.hot} />
      <PipeCover x={382} y={90} w={60} h={28} />
      <PipeCover x={412} y={118} w={28} h={124} />
      {/* words as well as colour on the two lines, nearest-line order matching the drawing */}
      <Label x={456} y={146} anchor="start" c={heat ? "#1F5FBF" : "#C2521A"}>{heat ? "Cooled gas out ↓" : "Hot gas out ↓"}</Label>
      <Label x={456} y={172} anchor="start" c={heat ? "#C2521A" : "#1F5FBF"}>{heat ? "Hot gas in ↑" : "Cold in ↑"}</Label>
      <Slab x={392} w={186} />
      <OutdoorUnit x={400} y={248} w={170} h={104} fan={{ cx: 520, cy: 298, r: 36 }} cut={{ x: 412, y: 260, w: 52, h: 80, dial: true }} />
      <Breeze x={574} y={298} dx={24} dy={0} c={out} n={3} gap={18} />
      <Temp x={36} y={262} t={heat ? "21°" : "22°"} hot={heat} />
      <Temp x={462} y={206} t={heat ? "8° out" : "34° out"} hot={!heat} />
      <Label x={150} y={282} anchor="start">{heat ? "Warm air into the room" : "Cool air into the room"}</Label>
      <Label x={485} y={380}>Outdoor unit</Label>
    </>
  );
}

function MultiScene() {
  return (
    <>
      <Sky />
      <Ground />
      <RoofEdge x1={14} x2={382} y={40} />
      <Room x={24} y={40} w={164} h={152} tone="blue" />
      <Room x={188} y={40} w={166} h={152} tone="sage" />
      <Room x={24} y={192} w={330} h={160} tone="warm" />
      <path d="M24 192 H354" stroke="#C9C2B6" strokeWidth="8" />
      <path d="M188 40 V192" stroke="#D8D1C5" strokeWidth="6" />
      <Brick x={354} y={40} w={28} h={312} />
      <Bed x={40} y={160} w={110} />
      <Table x={262} y={154} w={70} />
      <Window x={54} y={262} w={56} h={50} curtains />
      <Sofa x={150} y={304} w={150} />
      {[[44, 70, 120], [210, 70, 120], [110, 222, 140]].map(([x, y, w], i) => (
        <g key={i}>
          <IndoorSplit x={x} y={y} w={w} h={34} />
          <Breeze x={x + w / 2} y={y + 44} dx={-10} dy={48} c={C.cold} n={3} gap={26} />
        </g>
      ))}
      {/* each head on its own run, cold flowing in to it as on the split */}
      <Pipe d="M430 248 V34 H104 V70" c={C.cold} w={7} />
      <Pipe d="M400 270 H390 V87 H330" c={C.cold} w={7} />
      <Pipe d="M400 320 H372 V239 H250" c={C.cold} w={7} />
      <Slab x={392} w={186} />
      <OutdoorUnit x={400} y={248} w={170} h={104} fan={{ cx: 516, cy: 298, r: 36 }} />
      <Breeze x={574} y={298} dx={24} dy={0} c={C.hot} n={3} gap={18} />
      {/* how hard the outdoor unit is working: two of three rooms on */}
      <g transform="translate(466 210)">
        <rect x="-8" y="-8" width="112" height="30" rx="15" fill="#fff" stroke="#DCE3EC" />
        {[0, 1, 2].map((i) => <rect key={i} x={i * 32} y="0" width="26" height="14" rx="4" fill={i < 2 ? C.cold : C.soft} className={i < 2 ? "hw-pulse" : undefined} />)}
      </g>
      <Label x={515} y={194}>Rooms running</Label>
    </>
  );
}

/**
 * Ducted, gas ducted and zoning share a house: a single-storey brick-veneer
 * home cut open, with the unit sitting on boards in the roof, flex duct
 * strapped to the trusses and running over the ceiling batts to a round
 * diffuser in each room, and the return air coming back through a grille in
 * the ceiling.
 */
function DuctHouse({ kind }: { kind: "ducted" | "gas" | "zoning" | "dominator" }) {
  const u = useU();
  const warm = kind === "gas";
  // The Dominator: the same house, the gas heater swapping out for it in the
  // same spot on the same ducts (Jake, Nov 2026: "suit the style and design
  // of the Dominator"), Braemar's two-fan outdoor unit, and warm air, since
  // it is replacing a heater.
  const dom = kind === "dominator";
  const air = warm || dom ? C.hot : C.cold;
  const wide = kind === "gas" || kind === "zoning";
  const off = kind === "zoning";
  const R = wide ? 576 : 440;
  const L = 14, RR = R + 10, TOP = 40, EAVE = 134, MID = (L + RR) / 2;
  // Where the underside of the roof is at x, for hanging straps from it.
  const roofY = (x: number) => (x < MID ? EAVE - ((x - L) / (MID - L)) * (EAVE - TOP) : TOP + ((x - MID) / (RR - MID)) * (EAVE - TOP)) + 10;
  const w1 = wide ? 210 : 160, w2 = wide ? 400 : 300;
  const v2 = wide ? 300 : 220, v3 = wide ? 490 : 380;
  const rx = wide ? 168 : 138;
  const runs = [
    { x: 80, d: "M150 110 H96 Q80 110 80 126 V146", on: true, straps: [118] },
    { x: v2, d: `M205 130 V134 Q205 138 213 138 H${v2 - 12} Q${v2} 138 ${v2} 146`, on: true, straps: [] as number[] },
    { x: v3, d: `M284 110 H${v3 - 16} Q${v3} 110 ${v3} 126 V146`, on: !off, straps: wide ? [350, 440] : [330] },
  ];
  return (
    <>
      <Sky />
      <Ground />
      <RoofSpace l={L} r={RR} top={TOP} eave={EAVE} />
      <rect x="20" y="148" width={R - 16} height="5" fill="#E7E1D7" />
      {/* the rooms: a bedroom, the living room, the dining room */}
      <Room x={24} y={152} w={w1 - 24} h={200} tone="blue" />
      <Room x={w1} y={152} w={w2 - w1} h={200} tone="warm" />
      <Room x={w2} y={152} w={R - w2} h={200} tone="sage" />
      <path d={`M${w1} 152 V352 M${w2} 152 V352`} stroke="#D8D1C5" strokeWidth="6" />
      <Brick x={14} y={134} w={10} h={218} />
      <Brick x={R} y={134} w={10} h={218} />
      {wide && <path d={`M${RR + 4} 144 V350`} stroke="#B9C0C9" strokeWidth="5" strokeLinecap="round" />}

      {wide ? <Window x={104} y={182} w={44} h={46} curtains /> : <Window x={92} y={182} w={34} h={42} curtains />}
      <Bed x={34} y={318} w={wide ? 118 : 96} />
      <Window x={wide ? 330 : 246} y={182} w={wide ? 52 : 40} h={46} curtains />
      <Sofa x={w1 + 28} y={308} w={wide ? 130 : 100} />
      <Window x={wide ? 516 : 398} y={182} w={wide ? 44 : 30} h={46} curtains />
      <Table x={w2 + 34} y={314} w={wide ? 92 : 70} />
      {off && <rect x={w2} y={152} width={R - w2} height={200} fill={C.navy} opacity=".18" />}

      {/* the unit, on boards across the joists, with its plenum box */}
      <rect x="138" y="130" width="156" height="5" fill="#C9A473" />
      {dom ? (
        <>
          {/* the old gas heater and its flue fade out; the Dominator fades in where it sat */}
          <g className="hw-swap-old">
            <path d="M252 92 V28" stroke="#AAB4C2" strokeWidth="9" />
            <rect x="150" y="92" width="110" height="38" rx="5" fill={u("metal")} stroke="#9AA6B5" strokeWidth="1.5" />
            <rect x="164" y="99" width="66" height="25" rx="3" fill="#1C2233" />
            <Flame x={180} y={124} s={0.55} /><Flame x={197} y={124} s={0.55} /><Flame x={214} y={124} s={0.55} />
          </g>
          <g className="hw-swap-new">
            <rect x="150" y="90" width="110" height="40" rx="3" fill="#EEF0F3" stroke="#9AA6B5" strokeWidth="1.5" />
            <rect x="214" y="94" width="1.4" height="32" fill="#C9D1DC" />
            <Fan cx={182} cy={110} r={14} grille={false} />
            <rect x="224" y="96" width="28" height="4" rx="1" fill="#C8102E" />
            {[0, 1, 2, 3].map((i) => <line key={i} x1="224" y1={106 + i * 5} x2="252" y2={106 + i * 5} stroke="#C9D1DC" strokeWidth="1.6" />)}
          </g>
          {/* the gas line, capped off where it fed the heater */}
          <path d="M150 122 H128 V134" stroke={C.gas} strokeWidth="5" fill="none" />
          <rect x="144" y="117" width="8" height="10" rx="1.5" fill="#C9CED6" stroke="#8A97AB" />
        </>
      ) : warm ? (
        <g>
          <path d="M252 92 V28" stroke="#AAB4C2" strokeWidth="9" />
          <rect x="150" y="92" width="110" height="38" rx="5" fill={u("metal")} stroke="#9AA6B5" strokeWidth="1.5" />
          <rect x="164" y="99" width="66" height="25" rx="3" fill="#1C2233" />
          <Flame x={180} y={124} s={0.55} /><Flame x={197} y={124} s={0.55} /><Flame x={214} y={124} s={0.55} />
          {[0, 1, 2, 3].map((i) => <line key={i} x1="236" y1={100 + i * 6} x2="254" y2={100 + i * 6} stroke="#B9C3CF" strokeWidth="2" />)}
          <circle cx="245" cy="125" r="2.5" fill="#4ADE80" />
        </g>
      ) : (
        <g>
          <rect x="150" y="92" width="110" height="38" rx="5" fill={u("metal")} stroke="#9AA6B5" strokeWidth="1.5" />
          <rect x="157" y="99" width="38" height="25" rx="2" fill={u("fins")} />
          <Fan cx={226} cy={111} r={13} grille={false} />
          {[[154, 95], [256, 95], [154, 127], [256, 127]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" fill="#8A97AB" />)}
        </g>
      )}
      <rect x="260" y="96" width="24" height="32" rx="2" fill={u("duct")} stroke="#9AA6B5" />
      <path d="M266 96 V128 M278 96 V128" stroke="#9AA6B5" strokeWidth=".8" />

      {/* supply runs to each room, strapped up off the batts */}
      {runs.map((v, i) => (
        <g key={i}>
          <Duct d={v.d} c={air} on={v.on} />
          <Diffuser x={v.x} y={150} c={air} on={v.on} />
          {v.on ? <Breeze x={v.x} y={166} dx={0} dy={56} c={air} n={3} gap={14} /> : <Label x={v.x} y={204} c={C.grey}>Zone off</Label>}
        </g>
      ))}
      {/* return air: a grille in the hall ceiling, back up to the unit. Left off the
          plain ducted drawing: a fourth duct curling down read as clutter there. */}
      {kind !== "ducted" && <>
      <Duct d={wide ? `M${rx} 150 V132` : `M${rx} 150 V140 Q${rx} 128 ${rx + 12} 128 H150`} c={C.grey} w={14} />
      <rect x={rx - 18} y="150" width="36" height="9" rx="2" fill="#fff" stroke={C.navy} strokeWidth="1.5" />
      <path d={`M${rx - 13} 152.5 H${rx + 13} M${rx - 13} 155 H${rx + 13} M${rx - 13} 157.5 H${rx + 13}`} stroke="#9AA6B5" strokeWidth=".8" />
      <Breeze x={rx} y={236} dx={0} dy={-66} c={C.grey} n={2} gap={14} />
      </>}

      {/* Dampers only on the zoning drawing: drawn small on a plain ducted system they read as no-entry signs. */}
      {kind === "zoning" && [[110, 110], [wide ? 270 : 213, 138], [wide ? 420 : 330, 110]].map(([x, y], i) => <Damper key={i} x={x} y={y} shut={i === 2 && off} />)}

      {dom && (
        <>
          {/* the XE7C wall controller, Wi-Fi built in */}
          <rect x="170" y="238" width="30" height="34" rx="5" fill="#F4F6F8" stroke="#B9C3CF" />
          <rect x="174" y="242" width="22" height="20" rx="2" fill="#0F1A44" />
          <circle cx="185" cy="252" r="6" fill="none" stroke={C.hot} strokeWidth="2" className="hw-pulse" />
          {/* refrigerant up the wall and in under the eave, warm flowing in to the unit in the roof */}
          <Pipe d="M466 292 Q455 292 455 282 V135 Q455 118 438 118 H284" c={C.hot} w={7} />
          {/* Braemar's outdoor unit: tall, two fans */}
          <OutdoorUnit x={466} y={230} w={84} h={122} fan={{ cx: 506, cy: 260, r: 20 }} />
          <Fan cx={506} cy={312} r={20} />
          <Breeze x={556} y={286} dx={18} dy={0} c={C.cold} n={3} gap={14} />
        </>
      )}
      {kind === "ducted" && (
        <>
          {/* the zone controller on the living-room wall: where you turn rooms on and off */}
          <rect x="168" y="238" width="26" height="34" rx="5" fill={C.navy} />
          <rect x="172" y="242" width="18" height="22" rx="2" fill="#0F1A44" />
          {[0, 1, 2].map((i) => <rect key={i} x="174" y={245 + i * 6.5} width="14" height="4" rx="1.5" fill={C.cold} className="hw-pulse" />)}
          {/* refrigerant line up the wall and in under the eave, cold flowing in to the roof unit */}
          <Pipe d="M465 292 Q455 292 455 282 V135 Q455 118 438 118 H284" c={C.cold} w={7} />
          <OutdoorUnit x={466} y={262} w={106} h={90} fan={{ cx: 524, cy: 304, r: 28 }} />
          <Breeze x={576} y={304} dx={18} dy={0} c={C.hot} n={3} gap={14} />
        </>
      )}
      <RoofTiles l={L} r={RR} top={TOP} eave={EAVE} />
      {dom && (
        <g className="hw-swap-old">
          <rect x="244" y="20" width="16" height="8" rx="2" fill="#8A97AB" />
          <Puffs x={252} y={18} />
        </g>
      )}
      {warm && (
        <g>
          <rect x="244" y="20" width="16" height="8" rx="2" fill="#8A97AB" />
          <rect x="242" y="52" width="20" height="5" fill="#9AA6B5" />
          <Puffs x={252} y={18} />
        </g>
      )}

      {kind === "zoning" && (
        <g>
          <rect x="238" y="234" width="34" height="46" rx="6" fill={C.navy} />
          <rect x="243" y="240" width="24" height="30" rx="3" fill="#0F1A44" />
          {[0, 1, 2].map((i) => <rect key={i} x="246" y={244 + i * 9} width="18" height="6" rx="2" fill={i === 2 ? "#3A4566" : C.cold} className={i === 2 ? undefined : "hw-pulse"} />)}
          <Label x={255} y={298}>Controller</Label>
        </g>
      )}
      {kind === "gas" && (
        <g>
          <rect x="286" y="60" width="62" height="34" rx="8" fill={C.navy} />
          <rect x="292" y="66" width="50" height="22" rx="4" fill="#123A2A" />
          <text x="317" y="81" textAnchor="middle" className="hw-meter" fill="#7CF0A6">CO 0 ✓</text>
        </g>
      )}
      <Temp x={off ? 300 : wide ? 418 : 318} y={244} t={warm ? "21°" : "22°"} hot={warm || dom} />
      {dom ? (
        <>
          <g className="hw-swap-old hw-swap--word"><Label x={150} y={82} anchor="start">Old gas heater</Label></g>
          <g className="hw-swap-new hw-swap--word"><Label x={150} y={82} anchor="start">Dominator, same spot</Label></g>
        </>
      ) : <Label x={warm ? 150 : 205} y={82} anchor={warm ? "start" : "middle"}>{warm ? "Gas heater" : "Unit in the roof"}</Label>}
    </>
  );
}

function EvapScene() {
  const u = useU();
  return (
    <>
      <Sky />
      <Ground />
      <RoofSpace l={50} r={460} top={56} eave={144} />
      <rect x="56" y="142" width="398" height="5" fill="#E7E1D7" />
      {/* a living room and a bedroom under the one roof */}
      <Room x={60} y={146} w={240} h={206} tone="warm" />
      <Room x={300} y={146} w={150} h={206} tone="blue" />
      <path d="M300 146 V352" stroke="#D8D1C5" strokeWidth="6" />
      <Brick x={50} y={144} w={10} h={208} />
      <Brick x={450} y={144} w={10} h={208} />
      <Window x={160} y={182} w={46} h={46} curtains />
      <Sofa x={110} y={306} w={140} />
      <Bed x={312} y={318} w={100} />
      {/* the cooler: louvred panels over wet pads, a fan blowing down */}
      <rect x="208" y="28" width="94" height="10" rx="4" fill="#7F8B9C" />
      <rect x="212" y="36" width="86" height="58" rx="6" fill={u("metal")} stroke="#9AA6B5" strokeWidth="1.5" />
      {[218, 268].map((x) => (
        <g key={x}>
          <rect x={x} y="44" width="24" height="42" rx="3" fill={u("pad")} />
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1={x} y1={47 + i * 5} x2={x + 24} y2={47 + i * 5} stroke="#E9EDF2" strokeWidth="1.6" />)}
        </g>
      ))}
      <Fan cx={255} cy={66} r={11} grille={false} />
      <rect x="230" y="94" width="50" height="8" fill="#AEB8C6" />
      {[224, 236, 274, 286].map((x, i) => <line key={x} className="hw-drip hw-drip--long" style={{ animationDelay: `${i * 0.3}s` }} x1={x} y1="44" x2={x} y2="54" stroke={C.cold} strokeWidth="2.5" strokeLinecap="round" />)}
      {/* hot outside air drawn in, cool air down the drop duct and out to the rooms */}
      <Breeze x={150} y={62} dx={56} dy={0} c={C.hot} n={2} gap={20} />
      <Breeze x={360} y={62} dx={-56} dy={0} c={C.hot} n={2} gap={20} />
      <Duct d="M255 102 V118 Q255 124 247 124 H124 Q110 124 110 136 V142" c={C.cold} w={14} />
      <Duct d="M255 102 V118 Q255 124 263 124 H386 Q400 124 400 136 V142" c={C.cold} w={14} />
      <Duct d="M255 102 V142" c={C.cold} w={14} />
      {[110, 255, 400].map((x) => (
        <g key={x}>
          <Diffuser x={x} y={146} c={C.cold} />
          <Breeze x={x} y={162} dx={0} dy={52} c={C.cold} n={3} gap={14} />
        </g>
      ))}
      {/* an open window lets the warm air out */}
      <rect x="446" y="206" width="12" height="78" fill="#fff" stroke="#D3CCC0" />
      <rect x="454" y="210" width="26" height="6" rx="2" fill="#EDE6DA" transform="rotate(-20 454 210)" />
      <Breeze x={420} y={245} dx={110} dy={0} c={C.hot} n={3} gap={16} />
      <Temp x={70} y={226} t="24°" hot={false} />
      <Label x={310} y={22} anchor="start">Cooler on the roof</Label>
      <Label x={505} y={224}>Window open</Label>
    </>
  );
}

/**
 * The all-in-one heat pump, drawn after the manufacturer's cutaway Jake
 * chose (Nov 2026) so it can still move, and set beside the house it serves
 * (the bathroom, the shower and the basin tap): warm air drawn in on the
 * right and cooled air blown out on the left as moving airflow rather than
 * arrows, the fan and compressor in the head, heat carried down a copper
 * coil into a tank that runs from cold blue at the bottom to hot at the top,
 * and hot water piped across to the taps.
 *
 * "Run when power is cheap" is a day going round (Jake): the sun rises, arcs
 * over and sets, then night falls. In the day it runs on the panels' power;
 * at night the airflow and the coil go quiet and it's off, or on off-peak.
 * One 12-second loop, every part on the same key times. With motion off it
 * holds a still midday. The spots in S.aio and S.hp follow this layout.
 */
const DAY = 12;
// dawn → full day → sunset → night → dawn, as fractions of the loop.
const DAY_T = "0;0.06;0.5;0.58;0.94;1";

function AioScene() {
  const { p, motion } = useContext(Ctx);
  const u = useU();
  const id = (n: string) => `${p}-aio-${n}`;
  const X = 362, W = 94, headY = 66, tankY = 122, tankB = 352;
  const cx = X + W / 2;
  // The coil: a helix down the middle of the tank, front strands over back.
  const turns = 12, top = tankY + 22, bottom = tankB - 18, rw = 13;
  const step = (bottom - top) / turns;
  const front = Array.from({ length: turns }, (_, k) => `M${cx - rw} ${top + k * step} Q${cx} ${top + k * step + step * 0.9} ${cx + rw} ${top + k * step + step * 0.5}`).join(" ");
  const back = Array.from({ length: turns }, (_, k) => `M${cx + rw} ${top + k * step + step * 0.5} Q${cx} ${top + k * step + step * 0.2} ${cx - rw} ${top + (k + 1) * step}`).join(" ");
  const coilPath = `M${cx} ${tankY - 4} V${top} ${Array.from({ length: turns }, (_, k) => `L${cx + (k % 2 ? -rw : rw)} ${top + (k + 0.5) * step}`).join(" ")} L${cx} ${bottom}`;
  const ay = headY + 29;
  // Airflow: three ribbons drawn in from the right into the head's fins, three
  // blown out of the fan side to the left, fanning as they go.
  const warm = [50, 90, 130].map((y0, i) => `M598 ${y0} C548 ${y0} 506 ${ay - 12 + i * 12} ${X + W + 2} ${ay - 12 + i * 12}`);
  const cool = [58, 96, 134].map((y1, i) => `M${X - 2} ${ay - 12 + i * 12} C${X - 46} ${ay - 12 + i * 12} 268 ${y1} 206 ${y1}`);
  // The sun's arc: up from behind the wall, over the head, down behind it again.
  const arc = "M250 132 Q420 -92 590 132";
  // Fan blades, turned by SMIL so they can stop at night with everything else.
  const fx = X + 24, fr = 16;
  const blade = `M${fx} ${ay} C${fx + fr * 0.18} ${ay - fr * 0.35} ${fx + fr * 0.42} ${ay - fr * 0.86} ${fx + fr * 0.05} ${ay - fr * 0.92} C${fx - fr * 0.32} ${ay - fr * 0.88} ${fx - fr * 0.24} ${ay - fr * 0.34} ${fx} ${ay}Z`;
  const cycle = (values: string) => (motion ? <animate attributeName="opacity" values={values} keyTimes={DAY_T} dur={`${DAY}s`} repeatCount="indefinite" /> : null);
  // The two chips hand over rather than crossfade: their words differ in
  // length, and overlapping they read as a smudge.
  const chip = (values: string, keyTimes: string) => (motion ? <animate attributeName="opacity" values={values} keyTimes={keyTimes} dur={`${DAY}s`} repeatCount="indefinite" /> : null);
  const stars: [number, number, number][] = [[250, 22, 1.4], [292, 54, 1.1], [338, 18, 1.6], [372, 44, 1], [474, 16, 1.3], [508, 58, 1], [566, 24, 1.5], [596, 70, 1.1], [228, 70, 1]];
  return (
    <>
      <defs>
        <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F04FA6" />
          <stop offset=".45" stopColor="#9C6CF2">
            {motion && <animate attributeName="offset" values=".55;.38;.55" dur="6s" repeatCount="indefinite" />}
          </stop>
          <stop offset="1" stopColor="#2CC4F5" />
        </linearGradient>
        <linearGradient id={id("warm")} gradientUnits="userSpaceOnUse" x1="598" y1="0" x2={X + W} y2="0"><stop offset="0" stopColor="#FFB070" /><stop offset="1" stopColor="#F04FA6" /></linearGradient>
        <linearGradient id={id("cool")} gradientUnits="userSpaceOnUse" x1={X} y1="0" x2="206" y2="0"><stop offset="0" stopColor="#1FA9E6" /><stop offset="1" stopColor="#A9E4FB" /></linearGradient>
        <linearGradient id={id("shell")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#D9DEE6" /><stop offset=".5" stopColor="#F7F9FB" /><stop offset="1" stopColor="#C9D0DA" /></linearGradient>
        <linearGradient id={id("night")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0A1240" /><stop offset="1" stopColor="#24346E" /></linearGradient>
        <radialGradient id={id("sunGlow")}><stop offset="0" stopColor="#FFD65A" stopOpacity=".55" /><stop offset="1" stopColor="#FFD65A" stopOpacity="0" /></radialGradient>
      </defs>

      {/* the sky through the day: the sun's arc, then night with the moon and stars */}
      <Sky />
      <rect x="0" y="0" width="600" height="352" fill={`url(#${id("night")})`} opacity={motion ? 0.35 : 0}>{cycle(".35;0;0;.88;.88;.35")}</rect>
      <g opacity="0">
        {cycle("0;0;0;1;1;0")}
        {stars.map(([sx, sy, r]) => <circle key={`${sx}-${sy}`} cx={sx} cy={sy} r={r} fill="#fff" />)}
        <circle cx="446" cy="26" r="11" fill="#F4F1DE" />
        <circle cx="451" cy="22" r="10" fill={`url(#${id("night")})`} />
      </g>
      {motion ? (
        <g>
          <circle r="30" fill={`url(#${id("sunGlow")})`} />
          <circle r="13" fill={u("sun")} />
          <animateMotion dur={`${DAY}s`} repeatCount="indefinite" path={arc} keyPoints="0;1;1" keyTimes="0;0.54;1" calcMode="linear" />
        </g>
      ) : (
        <g transform="translate(420 20)">
          <circle r="30" fill={`url(#${id("sunGlow")})`} />
          <circle r="13" fill={u("sun")} />
        </g>
      )}

      {/* the house: the bathroom with its shower and basin, solar on the roof */}
      <Ground />
      <Brick x={200} y={114} w={400} h={238} />
      <Eave x={200} y={114} w={400} />
      <Roof l={14} r={210} top={50} eave={114} space={false} />
      <path d="M58 94 L112 62 L152 86 L98 118Z" fill={u("pv")} stroke="#AFC0E8" strokeWidth="1.5" />
      {/* the panels catch the sun in the day */}
      <g opacity={motion ? 0 : 1}>
        {cycle("0;1;1;0;0;0")}
        <path d="M58 94 L112 62 L152 86 L98 118Z" fill="#CFE2FF" opacity=".28" />
        <path d="M58 94 L112 62 L152 86 L98 118Z" fill="none" stroke="#FFC229" strokeWidth="3" strokeLinejoin="round" />
      </g>
      <Room x={24} y={114} w={176} h={238} tiles />
      <Vanity x={40} y={300} />
      <rect x="100" y="140" width="4" height="120" fill="#D7E6F0" opacity=".8" />
      <Shower x={150} y={150} />

      {/* hot water across to the shower and the basin tap; cold mains in at the bottom */}
      <Pipe d={`M${X} 156 H232 V150 H150`} c={C.water} w={7} />
      <Pipe d="M232 156 V236 H72 V246" c={C.water} w={6} n={4} />
      <Pipe d={`M600 336 H${X + W}`} c={C.cold} w={7} />

      {/* airflow: warm air drawn in on the right, cooled air blown out on the left; it goes quiet at night */}
      <g opacity="1">
        {cycle(".25;1;1;.12;.12;.25")}
        {warm.map((d, i) => (
          <g key={`w${i}`}>
            <path d={d} stroke={`url(#${id("warm")})`} strokeOpacity=".2" strokeWidth="15" fill="none" strokeLinecap="round" />
            <path d={d} className="hw-flow" stroke={`url(#${id("warm")})`} strokeWidth="3" fill="none" strokeLinecap="round" />
            <Stream d={d} c="#FFE0EE" n={3} dur={1.9 + i * 0.2} r={2.4} />
          </g>
        ))}
        {cool.map((d, i) => (
          <g key={`c${i}`}>
            <path d={d} stroke={`url(#${id("cool")})`} strokeOpacity=".2" strokeWidth="15" fill="none" strokeLinecap="round" />
            <path d={d} className="hw-flow" stroke={`url(#${id("cool")})`} strokeWidth="3" fill="none" strokeLinecap="round" />
            <Stream d={d} c="#E3F6FE" n={3} dur={1.9 + i * 0.2} r={2.4} />
          </g>
        ))}
      </g>

      {/* the tank: shell, then the cut-away water and coil */}
      <rect x={X} y={tankY} width={W} height={tankB - tankY} rx="10" fill={`url(#${id("shell")})`} stroke="#AEB7C4" strokeWidth="1.5" />
      <rect x={X + 9} y={tankY + 10} width={W - 18} height={tankB - tankY - 20} rx="28" fill={`url(#${id("water")})`} opacity=".9" />
      <rect x={X + 9} y={tankY + 10} width={W - 18} height={tankB - tankY - 20} rx="28" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
      <path d={back} stroke="#8A4A1E" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      <path d={front} stroke="#D98543" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <g>
        {cycle("0;1;1;0;0;0")}
        <Stream d={coilPath} c="#FFE2C4" n={6} dur={4.5} r={2.4} />
      </g>

      {/* the head: fan, compressor and fins */}
      <rect x={X} y={headY} width={W} height={tankY - headY + 2} rx="8" fill="#252A35" />
      <rect x={X} y={headY} width={W} height={tankY - headY + 2} rx="8" fill="none" stroke="#3A4152" strokeWidth="2" />
      <circle cx={fx} cy={ay} r={fr + 3} fill="#1F2536" />
      <circle cx={fx} cy={ay} r={fr} fill="#30384E" />
      <g>
        {[0, 120, 240].map((a) => <path key={a} d={blade} fill="#9AA6B8" transform={`rotate(${a} ${fx} ${ay})`} />)}
        {motion && <animateTransform attributeName="transform" type="rotate" values={`0 ${fx} ${ay};0 ${fx} ${ay};1800 ${fx} ${ay};1800 ${fx} ${ay}`} keyTimes="0;0.04;0.52;1" dur={`${DAY}s`} repeatCount="indefinite" />}
      </g>
      <circle cx={fx} cy={ay} r={fr * 0.16} fill="#C9D1DC" stroke="#5D6B80" strokeWidth="1.5" />
      <rect x={X + 44} y={headY + 9} width="20" height="40" rx="9" fill="#B9C2CE" />
      <rect x={X + 44} y={headY + 9} width="20" height="9" rx="4.5" fill="#DDE3EA" />
      <path d={`M${X + 64} ${headY + 16} H${X + 72} V${tankY - 4}`} stroke="#D98543" strokeWidth="2.6" fill="none" />
      <g stroke="#C98B57" strokeWidth="1.6">{Array.from({ length: 6 }, (_, k) => <line key={k} x1={X + 75 + k * 2.4} y1={headY + 6} x2={X + 75 + k * 2.4} y2={tankY - 4} />)}</g>

      {/* what it's running on: the panels by day, off or off-peak by night */}
      <g opacity={motion ? 0 : 1}>
        {chip("0;0;1;1;0;0", "0;0.03;0.06;0.52;0.55;1")}
        <rect x="34" y="12" width="166" height="26" rx="13" fill="#FFF3C4" stroke="#F2B705" strokeWidth="1.5" />
        <circle cx="52" cy="25" r="6" fill="#F2B705" />
        <text x="64" y="29.5" className="hw-label" fill={C.navy}>Running on your solar</text>
      </g>
      {motion && (
        <g opacity="0">
          {chip("1;0;0;0;1;1", "0;0.03;0.52;0.55;0.58;1")}
          <rect x="34" y="12" width="166" height="26" rx="13" fill="#1B2559" stroke="#5B6BB0" strokeWidth="1.5" />
          <path d="M55 19 A7 7 0 1 0 55 31 A5.5 5.5 0 1 1 55 19Z" fill="#F4F1DE" />
          <text x="64" y="29.5" className="hw-label" fill="#fff">Off, or on off-peak</text>
        </g>
      )}

      <Label x={cx} y={56}>Heat pump</Label>
      <Label x={534} y={36}>Warm air in</Label>
      <Label x={282} y={36}>Cooled air out</Label>
      <Label x={296} y={186}>Hot to the taps</Label>
      <Label x={540} y={322}>Cold mains in</Label>
    </>
  );
}

function Co2Scene() {
  return (
    <>
      <Sky />
      <Ground />
      <Brick x={174} y={114} w={426} h={238} />
      <Eave x={174} y={114} w={426} />
      <FacadeWindow x={300} y={160} w={64} h={54} />
      <Roof l={14} r={184} top={56} eave={114} space={false} />
      <Room x={24} y={114} w={150} h={238} tiles />
      <Vanity x={40} y={300} w={50} />
      <Shower x={130} y={150} />
      <Slab x={198} w={88} />
      <Tank x={206} y={104} w={72} h={244} />
      <Pipe d="M206 130 H180 V150 H130" c={C.water} w={7} />
      {/* one pass: cold from the bottom of the tank out, hot back into the top */}
      <Pipe d="M278 326 H380" c={C.cold} w={7} />
      <Pipe d="M400 244 V126 H278" c={C.water} w={7} />
      <OutdoorUnit x={380} y={244} w={180} h={104} fan={{ cx: 504, cy: 294, r: 34 }} cut={{ x: 392, y: 256, w: 56, h: 82, text: "CO₂" }} />
      <Breeze x={562} y={294} dx={26} dy={0} c={C.cold} n={3} gap={16} />
      <Clock cx={540} cy={150} />
      <Temp x={214} y={300} t="65°" hot />
      <Label x={242} y={90}>Tank</Label>
      <Label x={470} y={232}>Heat pump</Label>
    </>
  );
}

function GasCfScene() {
  const u = useU();
  return (
    <>
      <Sky />
      <Ground />
      <Brick x={240} y={40} w={360} h={312} />
      <Eave x={240} y={40} w={360} />
      <FacadeWindow x={452} y={112} w={76} h={64} />
      <RoofEdge x1={14} x2={240} y={40} />
      <Room x={24} y={40} w={216} h={312} tiles />
      <Vanity x={44} y={302} w={64} />
      <rect x="96" y="96" width="4" height="170" fill="#D7E6F0" opacity=".8" />
      <Shower x={150} y={110} />
      {/* the unit on the outside wall, cut open: heat exchanger above the burners */}
      <rect x="300" y="100" width="110" height="160" rx="10" fill={u("metal")} stroke="#B9C3CF" strokeWidth="1.5" />
      <rect x="310" y="112" width="90" height="136" rx="6" fill="#1C2233" />
      <path d="M318 120 H392 L318 140 H392 L318 160 H392 L318 180 H392 L318 200 H392" stroke="#C98B57" strokeWidth="7" fill="none" strokeLinejoin="round" />
      <Stream d="M318 200 H392 L318 180 H392 L318 160 H392 L318 140 H392 L318 120 H392" c={C.water} n={8} dur={3} r={2.6} />
      <rect x="318" y="238" width="74" height="6" rx="2" fill="#5E6A82" />
      <Flame x={330} y={240} s={0.62} /><Flame x={355} y={240} s={0.62} /><Flame x={380} y={240} s={0.62} />
      <rect x="340" y="88" width="30" height="14" rx="3" fill="#8A97AB" />
      <Puffs x={355} y={86} />
      {/* cold in from the mains, hot out to the shower, gas to the burner, each with its own valve */}
      <Pipe d="M600 300 H340 V260" c={C.cold} w={7} />
      <Pipe d="M372 100 V80 H150 V110" c={C.water} w={7} />
      <Line d="M600 326 H390 V260" c={C.gas} w={5} flow="#FFE08A" />
      <GasMeter x={512} y={308} />
      <circle cx="340" cy="282" r="7" fill="#fff" stroke={C.cold} strokeWidth="2.5" className="hw-pulse" />
      <Temp x={36} y={210} t="50°" hot />
      <Label x={326} y={286} anchor="end">Flow sensor</Label>
      <Label x={490} y={292}>Cold in</Label>
      <Label x={470} y={348}>Gas</Label>
    </>
  );
}

function GasStorageScene() {
  const u = useU();
  return (
    <>
      <Sky />
      <Ground />
      <Brick x={214} y={80} w={386} h={272} />
      <Eave x={214} y={80} w={386} />
      <FacadeWindow x={440} y={130} w={72} h={60} />
      <RoofEdge x1={14} x2={214} y={80} />
      <Room x={24} y={80} w={190} h={272} tiles />
      <Vanity x={44} y={302} />
      <Shower x={150} y={120} />
      {/* the flue, the tank, the burner underneath, on a slab */}
      <rect x="302" y="34" width="16" height="60" fill="#AAB4C2" />
      <rect x="296" y="28" width="28" height="8" rx="2" fill="#8A97AB" />
      <Puffs x={310} y={24} />
      <Slab x={254} w={112} />
      <Tank x={262} y={90} w={96} h={216} flue />
      <rect x="262" y="306" width="96" height="40" rx="6" fill={u("metalD")} />
      <rect x="276" y="314" width="68" height="26" rx="4" fill="#1C2233" />
      <Flame x={292} y={338} s={0.55} /><Flame x={310} y={338} s={0.55} /><Flame x={328} y={338} s={0.55} />
      {/* how full of hot water it is, refilling */}
      <rect x="370" y="104" width="12" height="190" rx="6" fill="#fff" stroke={C.line} strokeWidth="2" />
      <rect x="372" y="106" width="8" height="186" rx="4" fill={C.water} className="hw-fill" />
      <Pipe d="M262 116 H200 V120 H150" c={C.water} w={7} />
      <Pipe d="M600 290 H358" c={C.cold} w={7} />
      <Line d="M600 330 H358" c={C.gas} w={5} flow="#FFE08A" />
      <GasMeter x={540} y={312} />
      <Temp x={276} y={252} t="60°" hot />
      <Label x={490} y={282}>Cold in</Label>
      <Label x={490} y={322}>Gas</Label>
    </>
  );
}

/* ------------------------------------------------------------ the parts each step points at */

const S = {
  split: [[[96, 64, 228, 196]], [[300, 84, 146, 172]], [[474, 240, 114, 120]], [[404, 254, 68, 94]]],
  multi: [[[392, 240, 196, 120]], [[36, 60, 140, 76], [202, 60, 140, 76], [100, 212, 162, 76]], [[94, 20, 346, 20], [372, 80, 24, 250]], [[456, 192, 124, 44]]],
  // Three steps, in the order the air travels: outdoor unit, the unit in the roof, then the vents and the zone dampers.
  ducted: [[[452, 252, 130, 112]], [[140, 72, 130, 64]], [[54, 140, 350, 96], [160, 230, 42, 50]]],
  gas: [[[140, 40, 130, 96]], [[54, 104, 470, 130]], [[134, 120, 70, 120]], [[278, 52, 78, 50]]],
  // The Dominator's four steps: the heater coming out, the unit on the same ducts, the outdoor unit, the return air grille.
  dominator: [[[124, 16, 146, 120]], [[140, 86, 150, 50], [54, 104, 350, 60]], [[440, 110, 124, 250]], [[114, 140, 48, 100]]],
  zoning: [[[96, 96, 28, 28], [256, 124, 28, 28], [406, 96, 28, 28]], [[228, 226, 54, 80]], [[30, 150, 370, 200]], [[140, 72, 130, 64]]],
  evap: [[[204, 26, 102, 74]], [[140, 40, 76, 44], [294, 40, 76, 44]], [[90, 96, 330, 130]], [[420, 196, 130, 100]]],
  // On the drawn cutaway beside the house: the whole unit, the head with the air in and out, the tank and the pipe to the taps, then the clock and the solar.
  aio: [[[362, 66, 94, 288]], [[362, 66, 94, 58], [204, 52, 160, 90], [456, 44, 144, 94]], [[362, 122, 94, 230], [150, 146, 212, 16]], [[30, 8, 174, 114], [222, 4, 376, 58]]],
  hp: [[[456, 44, 144, 94], [204, 52, 160, 90]], [[404, 74, 24, 42]], [[362, 122, 94, 230]], [[30, 8, 174, 114], [222, 4, 376, 58]]],
  co2: [[[198, 96, 88, 260], [372, 236, 196, 120]], [[372, 236, 196, 120]], [[270, 112, 140, 226]], [[430, 18, 140, 160]]],
  gascf: [[[100, 100, 70, 60]], [[292, 92, 126, 176]], [[110, 66, 280, 52]], [[310, 210, 96, 50]]],
  gasstorage: [[[254, 82, 112, 232]], [[254, 298, 112, 56]], [[364, 96, 26, 206]], [[294, 28, 32, 72], [354, 280, 70, 20], [354, 320, 70, 20], [196, 106, 70, 22]]],
} satisfies Record<string, Rect[][]>;

const SCENES: Record<DiagramKind, { scene: ReactNode; spots: Rect[][]; label: string }> = {
  split: { scene: <SplitScene />, spots: S.split, label: "A split system: indoor unit, pipes through the wall, outdoor unit" },
  "split-heat": { scene: <SplitScene heat />, spots: S.split, label: "A reverse-cycle split heating: warm air indoors, heat drawn from outside" },
  multi: { scene: <MultiScene />, spots: S.multi, label: "A multi-head system: three indoor heads piped to one outdoor unit" },
  ducted: { scene: <DuctHouse kind="ducted" />, spots: S.ducted, label: "A ducted system: unit in the roof, ducts to ceiling vents, outdoor unit" },
  "gas-ducted": { scene: <DuctHouse kind="gas" />, spots: S.gas, label: "Gas ducted heating: heater in the roof, warm air to each room, return air back" },
  dominator: { scene: <DuctHouse kind="dominator" />, spots: S.dominator, label: "A Braemar Dominator: the gas heater swapped out for it in the same spot, on the same ducts, with an outdoor unit" },
  zoning: { scene: <DuctHouse kind="zoning" />, spots: S.zoning, label: "Zoning: dampers in each duct and a wall controller, one zone turned off" },
  evap: { scene: <EvapScene />, spots: S.evap, label: "An evaporative cooler: air drawn through wet pads on the roof and down into the house" },
  hp: { scene: <AioScene />, spots: S.hp, label: "A heat pump: heat taken from the air, compressed and passed into a tank of water" },
  "hp-aio": { scene: <AioScene />, spots: S.aio, label: "An all-in-one heat pump: heat pump on top, tank below, one unit" },
  "hp-co2": { scene: <Co2Scene />, spots: S.co2, label: "A CO₂ split heat pump: outdoor heat pump and a separate tank joined by water pipes" },
  "gas-cf": { scene: <GasCfScene />, spots: S.gascf, label: "Gas continuous flow: water heated as it runs through the unit to the tap" },
  "gas-storage": { scene: <GasStorageScene />, spots: S.gasstorage, label: "Gas storage: a tank heated by a gas burner underneath" },
};

/** The step's parts as one box, for the camera to frame. */
function bounds(rects: Rect[]): Rect {
  const x0 = Math.min(...rects.map((r) => r[0])), y0 = Math.min(...rects.map((r) => r[1]));
  const x1 = Math.max(...rects.map((r) => r[0] + r[2])), y1 = Math.max(...rects.map((r) => r[1] + r[3]));
  return [x0, y0, x1 - x0, y1 - y0];
}

export function HowDiagram({ kind, active, motion = true }: { kind: DiagramKind; active: number; motion?: boolean }) {
  const sc = SCENES[kind];
  const id = useId().replace(/:/g, "");
  const lit = active >= 0 ? sc.spots[active] : null;
  return (
    <svg viewBox="0 0 600 400" className="hw__svg" role="img" aria-label={sc.label}>
      <Defs p={`hw-${id}`} />
      <defs>
        <clipPath id={`hw-clip-${id}`}><rect x="0" y="0" width="600" height="400" rx="20" /></clipPath>
        {lit && (
          <mask id={`hw-mask-${id}`}>
            <rect x="-50" y="-50" width="700" height="500" fill="#fff" />
            {lit.map(([x, y, w, h], k) => <rect key={k} x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="18" fill="#000" />)}
          </mask>
        )}
      </defs>
      <g clipPath={`url(#hw-clip-${id})`}>
        <rect x="0" y="0" width="600" height="400" fill="#EEF5FB" />
        {/* The whole system stays in view: each step lights its part and dims the rest, rather than zooming in and losing what it connects to. */}
        <g>
          <Ctx.Provider value={{ p: `hw-${id}`, motion }}>{sc.scene}</Ctx.Provider>
          {lit && <rect key={active} className="hw-dim" x="-50" y="-50" width="700" height="500" mask={`url(#hw-mask-${id})`} />}
          {sc.spots.map((rects, i) => (
            <g key={i} className={`hw-spot${i === active ? " on" : ""}`}>
              {rects.map(([x, y, w, h], k) => <rect key={k} x={x} y={y} width={w} height={h} rx="14" />)}
              <g transform={`translate(${rects[0][0]} ${rects[0][1]})`}>
                <circle r="13" />
                <text y="4.5" textAnchor="middle">{i + 1}</text>
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

const STEP_MS = 5200;
const OVERVIEW_MS = 2400;

/**
 * Plays like a short explainer: the whole system first, then each part in
 * turn while the rest dims, then round again. It runs while it's on screen; picking a step,
 * or pause, stops it there. With reduced motion asked for it never plays on
 * its own, and the camera cuts rather than glides.
 */
export function HowItWorks({ kind, steps }: { kind: DiagramKind; steps: HowStep[] }) {
  const [on, setOn] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setStill(true); setPlaying(false); }
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !seen) return;
    const t = setTimeout(() => setOn((n) => (n + 1 >= steps.length ? -1 : n + 1)), on < 0 ? OVERVIEW_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [on, playing, seen, steps.length]);

  const pick = (i: number) => { setOn(i); setPlaying(false); };
  const step = on >= 0 ? steps[on] : null;

  return (
    <div className="hw" ref={ref}>
      <div className="hw__fig">
        <HowDiagram kind={kind} active={on} motion={!still} />
        <div className="hw__bar">
          <span className="hw__cap" aria-live="polite">
            {step ? <><b>{String(on + 1).padStart(2, "0")}</b> {step.t}</> : <><b>All</b> The whole system</>}
          </span>
          <div className="hw__ctl">
            <button type="button" aria-label="Previous step" onClick={() => pick(on <= 0 ? steps.length - 1 : on - 1)}>‹</button>
            {!still && (
              <button type="button" className="hw__play" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
                {playing ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /></svg>}
              </button>
            )}
            <button type="button" aria-label="Next step" onClick={() => pick(on + 1 >= steps.length ? 0 : on + 1)}>›</button>
          </div>
        </div>
        <div className="hw__prog" aria-hidden="true">
          {steps.map((x, i) => (
            <span key={x.t} className={i < on ? "done" : i === on ? (playing && seen ? "run" : "done") : undefined}>
              <i key={`${i}-${on}-${playing}`} style={{ animationDuration: `${STEP_MS}ms` }} />
            </span>
          ))}
        </div>
      </div>
      <ol className="hw__steps">
        {steps.map((x, i) => (
          <li key={x.t}>
            <button type="button" className={`hw__step${i === on ? " on" : ""}`} aria-pressed={i === on} onClick={() => pick(i)}>
              <span className="hw__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="hw__t"><strong>{x.t}</strong><span>{x.d}</span></span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
