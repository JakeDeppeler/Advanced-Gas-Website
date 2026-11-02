"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { DiagramKind, HowStep } from "@/lib/homepage/learn";
import "./how.css";

/**
 * "How it works" as a moving diagram rather than photos. The photos we have
 * are of installs, and beside "the pipes between" or "inverter control" they
 * showed whatever we had rather than the thing being described. Each kind of
 * system gets one drawing with everything in it; picking a step rings the
 * part it's about. Air, water and refrigerant move in the direction they
 * really go.
 *
 * Steps advance on their own while the diagram is on screen, until someone
 * picks one. With reduced motion asked for, nothing moves or advances.
 */

type Rect = [number, number, number, number];

const C = {
  navy: "#050A30", cold: "#00B0ED", hot: "#FF7A36", water: "#E8542A", line: "#B8C4D4", soft: "#E3E9F2",
  wall: "#C9D3E0", unit: "#FFFFFF", dark: "#2B3247", gas: "#D99A00", grey: "#8A97AB", ground: "#DCE6D5",
};

/** A pipe or duct with something moving along it, start to end. */
function Flow({ d, c, w = 3, bed = 0, slow = false }: { d: string; c: string; w?: number; bed?: number; slow?: boolean }) {
  return (
    <>
      {bed > 0 && <path d={d} stroke={C.soft} strokeWidth={bed} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={d} className={`hw-flow${slow ? " hw-flow--slow" : ""}`} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Fan({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#F4F7FB" stroke={C.line} strokeWidth="2" />
      <g className="hw-spin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {[0, 90, 180, 270].map((a) => <ellipse key={a} cx={cx} cy={cy - r * 0.45} rx={r * 0.2} ry={r * 0.44} fill={C.grey} transform={`rotate(${a} ${cx} ${cy})`} />)}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.13} fill="#5D6B80" />
    </g>
  );
}

function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="hw-flame">
        <path d="M0 0 C-10 -8 -8 -22 0 -32 C8 -22 10 -8 0 0Z" fill={C.hot} />
        <path d="M0 0 C-5 -5 -4 -13 0 -19 C4 -13 5 -5 0 0Z" fill="#FFD166" />
      </g>
    </g>
  );
}

/** Wavy moving air: three lines from a point, heading (dx, dy). */
function Air({ x, y, dx, dy, c, n = 3, gap = 22 }: { x: number; y: number; dx: number; dy: number; c: string; n?: number; gap?: number }) {
  const horiz = Math.abs(dx) > Math.abs(dy);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const ox = horiz ? 0 : (i - (n - 1) / 2) * gap;
        const oy = horiz ? (i - (n - 1) / 2) * gap : 0;
        const sx = x + ox, sy = y + oy;
        const mx = sx + dx / 2 + (horiz ? 0 : 8), my = sy + dy / 2 + (horiz ? 8 : 0);
        return <Flow key={i} d={`M${sx} ${sy} Q${mx} ${my} ${sx + dx} ${sy + dy}`} c={c} w={2.5} />;
      })}
    </g>
  );
}

function Sun({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <g className="hw-spin hw-spin--slow" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1={cx} y1={cy - 30} x2={cx} y2={cy - 38} stroke="#F5B700" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 45} ${cx} ${cy})`} />)}
      </g>
      <circle cx={cx} cy={cy} r="22" fill="#FFC93C" />
    </g>
  );
}

function Clock({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="22" fill="#fff" stroke={C.navy} strokeWidth="2.5" />
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
      <path d={`M${cx - 15} ${cy} A15 15 0 0 1 ${cx + 15} ${cy}`} fill="none" stroke={C.line} strokeWidth="4" strokeLinecap="round" />
      <line className="hw-needle" style={{ transformOrigin: `${cx}px ${cy}px` }} x1={cx} y1={cy} x2={cx} y2={cy - 13} stroke={C.hot} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Shower({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} h-22 v14`} stroke={C.grey} strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x={x - 34} y={y + 12} width="24" height="7" rx="3" fill={C.grey} />
      {[-28, -22, -16].map((dx, i) => <line key={i} className="hw-drip" style={{ animationDelay: `${i * 0.18}s` }} x1={x + dx} y1={y + 24} x2={x + dx} y2={y + 34} stroke={C.cold} strokeWidth="2.5" strokeLinecap="round" />)}
    </g>
  );
}

const Ground = () => <rect x="0" y="352" width="600" height="48" fill={C.ground} />;
const Label = ({ x, y, children, anchor = "middle", c = C.navy }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; c?: string }) =>
  <text x={x} y={y} textAnchor={anchor} className="hw-label" fill={c}>{children}</text>;

/* ------------------------------------------------------------ scenes */

function SplitScene({ heat = false }: { heat?: boolean }) {
  const room = heat ? C.hot : C.cold, out = heat ? C.cold : C.hot;
  return (
    <>
      <Ground />
      <rect x="24" y="40" width="330" height="312" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <rect x="60" y="300" width="150" height="40" rx="10" fill={C.soft} />
      <rect x="354" y="40" width="18" height="312" fill={C.wall} />
      {/* indoor unit and the air it moves */}
      <rect x="110" y="78" width="200" height="54" rx="14" fill="#fff" stroke={C.line} strokeWidth="2" />
      <path d="M126 120 H294" stroke={C.soft} strokeWidth="3" />
      <circle cx="292" cy="92" r="3.5" fill={C.cold} />
      <Air x={210} y={142} dx={-30} dy={110} c={room} n={4} gap={34} />
      {/* refrigerant pipes, the drain, the outdoor unit */}
      <Flow d="M310 98 H432 V248" c={heat ? C.hot : C.cold} bed={9} />
      <Flow d="M420 248 V110 H310" c={heat ? C.cold : C.hot} bed={9} />
      <Flow d="M296 132 V148 H384 V352" c={C.grey} w={2} slow />
      <rect x="400" y="248" width="170" height="104" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
      <rect x="412" y="262" width="52" height="78" rx="6" fill="#EEF2F7" />
      <Dial cx={438} cy={312} />
      <Label x={438} y={290}>INV</Label>
      <Fan cx={520} cy={300} r={38} />
      <Air x={572} y={300} dx={24} dy={0} c={out} n={3} gap={18} />
      <Label x={150} y={290} anchor="start">{heat ? "Warm air into the room" : "Cool air into the room"}</Label>
      <Label x={485} y={374}>Outdoor unit</Label>
    </>
  );
}

function MultiScene() {
  return (
    <>
      <Ground />
      <rect x="24" y="40" width="330" height="312" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <path d="M24 192 H354 M188 40 V192" stroke={C.wall} strokeWidth="6" />
      <rect x="354" y="40" width="18" height="312" fill={C.wall} />
      {[[44, 70, 120], [210, 70, 120], [110, 222, 140]].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height="34" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
          <Air x={x + w / 2} y={y + 42} dx={-10} dy={52} c={C.cold} n={3} gap={26} />
        </g>
      ))}
      {/* each head piped back on its own run */}
      <Flow d="M104 70 V30 H430 V248" c={C.cold} bed={8} />
      <Flow d="M330 87 H384 V270 H400" c={C.cold} bed={8} />
      <Flow d="M250 239 H366 V320 H400" c={C.cold} bed={8} />
      <rect x="400" y="248" width="170" height="104" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
      <Fan cx={510} cy={300} r={38} />
      <Air x={572} y={300} dx={24} dy={0} c={C.hot} n={3} gap={18} />
      {/* how hard the outdoor unit is working: two of three rooms on */}
      <g transform="translate(470 214)">
        {[0, 1, 2].map((i) => <rect key={i} x={i * 30} y="0" width="26" height="14" rx="4" fill={i < 2 ? C.cold : C.soft} className={i < 2 ? "hw-pulse" : undefined} />)}
      </g>
      <Label x={515} y={252 - 56}>Rooms running</Label>
    </>
  );
}

/** Ducted, gas ducted and zoning share a house: a unit in the roof, ducts to three rooms. */
function DuctHouse({ kind }: { kind: "ducted" | "gas" | "zoning" }) {
  const warm = kind === "gas";
  const air = warm ? C.hot : C.cold;
  const wide = kind !== "ducted";
  const R = wide ? 576 : 440;
  const off = kind === "zoning";
  return (
    <>
      <Ground />
      <polygon points={`14,134 ${(14 + R + 10) / 2},40 ${R + 10},134`} fill={C.soft} stroke={C.wall} strokeWidth="2" />
      <rect x="24" y="134" width={R - 24} height="218" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <path d={`M24 150 H${R}`} stroke={C.wall} strokeWidth="3" />
      <path d={`M${wide ? 210 : 160} 150 V352 M${wide ? 400 : 300} 150 V352`} stroke={C.wall} strokeWidth="5" />
      {/* the unit in the roof */}
      <rect x="150" y="92" width="110" height="36" rx="8" fill={warm ? "#FFF4EC" : "#fff"} stroke={C.line} strokeWidth="2" />
      {warm ? <><Flame x={190} y={124} s={0.7} /><Flame x={210} y={124} s={0.7} /><Flame x={230} y={124} s={0.7} /></> : <Fan cx={205} cy={110} r={13} />}
      {warm && <Flow d="M252 92 V44" c={C.grey} w={2.5} slow />}
      {/* supply ducts, vents, and the air into each room */}
      {[
        { d: "M150 110 H80 V150", vx: 80, on: true },
        { d: "M205 128 V150", vx: wide ? 300 : 220, on: true, d2: wide ? "M205 128 V138 H300 V150" : "M205 128 V138 H220 V150" },
        { d: `M260 110 H${wide ? 490 : 380} V150`, vx: wide ? 490 : 380, on: !off },
      ].map((v, i) => (
        <g key={i}>
          <path d={v.d2 ?? v.d} stroke={C.wall} strokeWidth="11" fill="none" strokeLinejoin="round" />
          {v.on && <Flow d={v.d2 ?? v.d} c={air} w={3} />}
          <rect x={v.vx - 16} y="150" width="32" height="6" rx="2" fill={v.on ? C.navy : C.line} />
          {v.on ? <Air x={v.vx} y={164} dx={0} dy={60} c={air} n={3} gap={14} /> : <Label x={v.vx} y={190} c={C.grey}>Zone off</Label>}
        </g>
      ))}
      {/* return air back to the unit */}
      <rect x={wide ? 150 : 120} y="150" width="36" height="8" rx="2" fill="none" stroke={C.navy} strokeWidth="2" />
      <Flow d={`M${wide ? 168 : 138} 230 V170`} c={C.grey} w={2.5} />
      <Flow d={`M${wide ? 168 : 138} 150 V128 H160`} c={C.grey} w={2.5} slow />
      {/* dampers: one per zone */}
      {(kind !== "gas") && [[110, 110], [wide ? 270 : 213, 138], [wide ? 420 : 330, 110]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill="#fff" stroke={C.navy} strokeWidth="2" />
          <line className={i === 2 && off ? undefined : "hw-damper"} style={{ transformOrigin: `${x}px ${y}px` }} x1={x - 7} y1={y} x2={x + 7} y2={y} stroke={C.navy} strokeWidth="2.5" transform={i === 2 && off ? `rotate(90 ${x} ${y})` : undefined} />
        </g>
      ))}
      {kind === "zoning" && (
        <g>
          <rect x="240" y="236" width="30" height="42" rx="5" fill={C.navy} />
          <rect x="245" y="242" width="20" height="18" rx="2" fill={C.cold} className="hw-pulse" />
          <Label x={255} y={296}>Controller</Label>
        </g>
      )}
      {kind === "gas" && (
        <g>
          <rect x="286" y="60" width="62" height="34" rx="8" fill="#fff" stroke={C.navy} strokeWidth="2" />
          <text x="317" y="82" textAnchor="middle" className="hw-label" fill={C.navy}>CO ✓</text>
        </g>
      )}
      {kind === "ducted" && (
        <>
          <Flow d="M260 100 H452 V290 H462" c={C.cold} bed={8} />
          <rect x="462" y="262" width="110" height="90" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
          <Fan cx={517} cy={307} r={30} />
          <Air x={574} y={307} dx={20} dy={0} c={C.hot} n={3} gap={16} />
        </>
      )}
      <Label x={warm ? 150 : 205} y={84} anchor={warm ? "start" : "middle"}>{warm ? "Gas heater" : "Unit in the roof"}</Label>
    </>
  );
}

function EvapScene() {
  return (
    <>
      <Ground />
      <polygon points="50,144 255,56 460,144" fill={C.soft} stroke={C.wall} strokeWidth="2" />
      <rect x="60" y="144" width="390" height="208" fill="#fff" stroke={C.soft} strokeWidth="2" />
      {/* the cooler: pads with water running down them */}
      <rect x="212" y="34" width="86" height="58" rx="8" fill="#fff" stroke={C.line} strokeWidth="2" />
      {[222, 236, 250, 264, 278, 288].map((x) => <line key={x} x1={x} y1="44" x2={x} y2="84" stroke="#CDEFFB" strokeWidth="5" />)}
      {[229, 257, 283].map((x, i) => <line key={x} className="hw-drip hw-drip--long" style={{ animationDelay: `${i * 0.3}s` }} x1={x} y1="44" x2={x} y2="56" stroke={C.cold} strokeWidth="2.5" strokeLinecap="round" />)}
      {/* hot outside air drawn in, cool air down the duct */}
      <Air x={150} y={62} dx={56} dy={0} c={C.hot} n={2} gap={20} />
      <Air x={360} y={62} dx={-56} dy={0} c={C.hot} n={2} gap={20} />
      <path d="M255 92 V132 M110 132 H400" stroke={C.wall} strokeWidth="12" fill="none" />
      <Flow d="M255 92 V132 H110" c={C.cold} />
      <Flow d="M255 132 H400" c={C.cold} />
      {[110, 255, 400].map((x) => (
        <g key={x}>
          <rect x={x - 16} y="144" width="32" height="6" rx="2" fill={C.navy} />
          <Air x={x} y={158} dx={0} dy={56} c={C.cold} n={3} gap={14} />
        </g>
      ))}
      {/* an open window lets the warm air out */}
      <rect x="446" y="210" width="10" height="70" fill="#fff" />
      <path d="M450 206 V214 M450 276 V284" stroke={C.wall} strokeWidth="6" />
      <Air x={420} y={245} dx={110} dy={0} c={C.hot} n={3} gap={16} />
      <Label x={310} y={24} anchor="start">Cooler on the roof</Label>
      <Label x={505} y={222}>Window open</Label>
    </>
  );
}

/** An all-in-one heat pump beside the house: heat pump on top, tank below, solar and a timer. */
function AioScene() {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <linearGradient id={`hw-tank-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F26B3A" /><stop offset="0.55" stopColor="#F5A27A" /><stop offset="1" stopColor="#9ED8F2" />
        </linearGradient>
      </defs>
      <Ground />
      <polygon points="14,114 112,50 210,114" fill={C.soft} stroke={C.wall} strokeWidth="2" />
      <path d="M60 92 L112 60 L150 84 L98 116Z" fill={C.navy} opacity="0.85" />
      <path d="M72 94 L112 69 M86 103 L126 78 M98 112 L138 87" stroke="#3B5BA9" strokeWidth="1.5" />
      <rect x="24" y="114" width="176" height="238" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <Shower x={150} y={150} />
      {/* hot out to the house, cold in from the mains */}
      <Flow d="M258 176 H230 V150 H150" c={C.water} bed={8} />
      <Flow d="M600 334 H342" c={C.cold} bed={8} />
      {/* the unit */}
      <rect x="258" y="150" width="84" height="196" rx="20" fill={`url(#hw-tank-${id})`} stroke={C.line} strokeWidth="2" />
      {[178, 198, 218, 238].map((y, i) => <Flow key={y} d={`M262 ${y} H338`} c="#C2411B" w={2.5} slow={i % 2 === 1} />)}
      <rect x="250" y="84" width="100" height="72" rx="18" fill={C.dark} />
      <Fan cx={290} cy={120} r={24} />
      <rect x="320" y="100" width="22" height="38" rx="4" fill="#4A5470" />
      <Dial cx={331} cy={128} />
      <Air x={420} y={110} dx={-62} dy={0} c={C.cold} n={2} gap={20} />
      <Sun cx={480} cy={60} />
      <Clock cx={540} cy={180} />
      <Label x={300} y={74}>Heat pump</Label>
      <Label x={300} y={370} c={C.navy}>Tank</Label>
    </>
  );
}

function Co2Scene() {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <linearGradient id={`hw-tank2-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F26B3A" /><stop offset="0.5" stopColor="#F5A27A" /><stop offset="1" stopColor="#9ED8F2" />
        </linearGradient>
      </defs>
      <Ground />
      <rect x="24" y="114" width="150" height="238" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <polygon points="14,114 99,56 184,114" fill={C.soft} stroke={C.wall} strokeWidth="2" />
      <Shower x={130} y={150} />
      <rect x="206" y="104" width="72" height="244" rx="24" fill={`url(#hw-tank2-${id})`} stroke={C.line} strokeWidth="2" />
      <Flow d="M206 130 H180 V150 H130" c={C.water} bed={8} />
      {/* one pass: cold from the bottom of the tank out, hot back into the top */}
      <Flow d="M278 326 H380" c={C.cold} bed={8} />
      <Flow d="M400 244 V126 H278" c={C.water} bed={8} />
      <rect x="380" y="244" width="180" height="104" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
      <Fan cx={500} cy={296} r={36} />
      <text x="420" y="292" textAnchor="middle" className="hw-label hw-label--big" fill={C.navy}>CO₂</text>
      <g transform="translate(420 318)" stroke={C.cold} strokeWidth="2" strokeLinecap="round">
        <path d="M0 -10 V10 M-9 -5 L9 5 M-9 5 L9 -5" />
      </g>
      <Air x={562} y={296} dx={26} dy={0} c={C.cold} n={3} gap={16} />
      <Sun cx={470} cy={62} />
      <Clock cx={540} cy={150} />
      <Label x={242} y={92}>Tank</Label>
      <Label x={470} y={236}>Heat pump</Label>
    </>
  );
}

function GasCfScene() {
  return (
    <>
      <Ground />
      <rect x="24" y="60" width="216" height="292" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <rect x="240" y="60" width="16" height="292" fill={C.wall} />
      <Shower x={150} y={110} />
      {/* the unit on the outside wall */}
      <rect x="300" y="100" width="110" height="160" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
      <path d="M318 120 H392 L318 140 H392 L318 160 H392 L318 180 H392 L318 200 H392" stroke={C.wall} strokeWidth="7" fill="none" strokeLinejoin="round" />
      <Flow d="M318 200 H392 L318 180 H392 L318 160 H392 L318 140 H392 L318 120 H392" c={C.water} w={3} />
      <Flame x={330} y={246} s={0.75} /><Flame x={355} y={246} s={0.75} /><Flame x={380} y={246} s={0.75} />
      {/* cold in from the mains, hot out to the shower, gas to the burner */}
      <Flow d="M600 300 H340 V260" c={C.cold} bed={8} />
      <Flow d="M372 100 V80 H150 V110" c={C.water} bed={8} />
      <path d="M600 326 H390 V260" stroke={C.gas} strokeWidth="5" strokeDasharray="10 6" fill="none" />
      <circle cx="356" cy="282" r="6" fill={C.cold} className="hw-pulse" />
      <Label x={330} y={288} anchor="end">Flow sensor</Label>
      <Label x={540} y={290}>Cold in</Label>
      <Label x={540} y={346}>Gas</Label>
    </>
  );
}

function GasStorageScene() {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <linearGradient id={`hw-gs-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F26B3A" /><stop offset="0.6" stopColor="#F5A27A" /><stop offset="1" stopColor="#9ED8F2" />
        </linearGradient>
      </defs>
      <Ground />
      <rect x="24" y="80" width="190" height="272" fill="#fff" stroke={C.soft} strokeWidth="2" />
      <rect x="214" y="80" width="16" height="272" fill={C.wall} />
      <Shower x={150} y={120} />
      {/* the flue, the tank, the burner underneath */}
      <rect x="302" y="34" width="16" height="60" fill={C.grey} />
      <Air x={310} y={30} dx={0} dy={-26} c={C.grey} n={2} gap={14} />
      <rect x="262" y="90" width="96" height="216" rx="22" fill={`url(#hw-gs-${id})`} stroke={C.line} strokeWidth="2" />
      <rect x="262" y="306" width="96" height="40" rx="6" fill={C.dark} />
      <Flame x={290} y={340} s={0.7} /><Flame x={310} y={340} s={0.7} /><Flame x={330} y={340} s={0.7} />
      {/* how full of hot water it is, refilling */}
      <rect x="370" y="104" width="12" height="190" rx="6" fill="#fff" stroke={C.line} strokeWidth="2" />
      <rect x="372" y="106" width="8" height="186" rx="4" fill={C.water} className="hw-fill" />
      <Flow d="M262 116 H200 V120 H150" c={C.water} bed={8} />
      <Flow d="M600 290 H358" c={C.cold} bed={8} />
      <path d="M600 330 H358" stroke={C.gas} strokeWidth="5" strokeDasharray="10 6" fill="none" />
      <Label x={520} y={282}>Cold in</Label>
      <Label x={520} y={322}>Gas</Label>
    </>
  );
}

/* ------------------------------------------------------------ the parts each step points at */

const S = {
  split: [[[96, 64, 228, 196]], [[300, 84, 146, 172]], [[474, 240, 114, 120]], [[404, 254, 68, 94]]],
  multi: [[[392, 240, 196, 120]], [[36, 60, 140, 76], [202, 60, 140, 76], [100, 212, 162, 76]], [[94, 20, 346, 20], [372, 80, 24, 250]], [[456, 192, 124, 44]]],
  ducted: [[[140, 72, 130, 64]], [[54, 140, 350, 96]], [[452, 252, 130, 112]], [[96, 96, 28, 28], [199, 124, 28, 28], [316, 96, 28, 28]]],
  gas: [[[140, 40, 130, 96]], [[54, 104, 470, 130]], [[134, 120, 70, 120]], [[278, 52, 78, 50]]],
  zoning: [[[96, 96, 28, 28], [256, 124, 28, 28], [406, 96, 28, 28]], [[228, 226, 54, 80]], [[30, 150, 370, 200]], [[140, 72, 130, 64]]],
  evap: [[[204, 26, 102, 74]], [[140, 40, 76, 44], [294, 40, 76, 44]], [[90, 96, 330, 130]], [[420, 196, 130, 100]]],
  aio: [[[242, 76, 116, 276]], [[242, 76, 186, 84]], [[250, 144, 100, 208]], [[440, 18, 128, 192], [52, 52, 104, 70]]],
  hp: [[[242, 76, 186, 84]], [[312, 92, 38, 54]], [[250, 144, 100, 208]], [[440, 18, 128, 192], [52, 52, 104, 70]]],
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
  zoning: { scene: <DuctHouse kind="zoning" />, spots: S.zoning, label: "Zoning: dampers in each duct and a wall controller, one zone turned off" },
  evap: { scene: <EvapScene />, spots: S.evap, label: "An evaporative cooler: air drawn through wet pads on the roof and down into the house" },
  hp: { scene: <AioScene />, spots: S.hp, label: "A heat pump: heat taken from the air, compressed and passed into a tank of water" },
  "hp-aio": { scene: <AioScene />, spots: S.aio, label: "An all-in-one heat pump: heat pump on top, tank below, one unit" },
  "hp-co2": { scene: <Co2Scene />, spots: S.co2, label: "A CO₂ split heat pump: outdoor heat pump and a separate tank joined by water pipes" },
  "gas-cf": { scene: <GasCfScene />, spots: S.gascf, label: "Gas continuous flow: water heated as it runs through the unit to the tap" },
  "gas-storage": { scene: <GasStorageScene />, spots: S.gasstorage, label: "Gas storage: a tank heated by a gas burner underneath" },
};

export function HowDiagram({ kind, active }: { kind: DiagramKind; active: number }) {
  const s = SCENES[kind];
  return (
    <svg viewBox="0 0 600 400" className="hw__svg" role="img" aria-label={s.label}>
      <rect x="0" y="0" width="600" height="400" rx="20" fill="#EEF5FB" />
      {s.scene}
      {s.spots.map((rects, i) => (
        <g key={i} className={`hw-spot${i === active ? " on" : ""}`}>
          {rects.map(([x, y, w, h], k) => <rect key={k} x={x} y={y} width={w} height={h} rx="14" />)}
          <g transform={`translate(${rects[0][0]} ${rects[0][1]})`}>
            <circle r="13" />
            <text y="4.5" textAnchor="middle">{i + 1}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

export function HowItWorks({ kind, steps }: { kind: DiagramKind; steps: HowStep[] }) {
  const [on, setOn] = useState(0);
  const [held, setHeld] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (held || !el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = setInterval(() => setOn((n) => (n + 1) % steps.length), 4500);
      if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [held, steps.length]);

  return (
    <div className="hw" ref={ref}>
      <div className="hw__fig"><HowDiagram kind={kind} active={on} /></div>
      <ol className="hw__steps">
        {steps.map((x, i) => (
          <li key={x.t}>
            <button type="button" className={`hw__step${i === on ? " on" : ""}`} aria-pressed={i === on} onClick={() => { setOn(i); setHeld(true); }}>
              <span className="hw__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="hw__t"><strong>{x.t}</strong><span>{x.d}</span></span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
