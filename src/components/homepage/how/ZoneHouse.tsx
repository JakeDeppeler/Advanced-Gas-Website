"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import "./how.css";

/**
 * Ducted zoning, hands-on: a real floor plan with the ductwork drawn the way
 * our duct designs are (a ø350 trunk off the fan coil to round branch
 * take-offs, then ø300/250/200/150 runs to a ceiling diffuser in each room,
 * a damper on each zone, a ø500 return), driven by a wall controller laid
 * out like the Mitsubishi Electric touch controller.
 *
 * It behaves like ITC (individual temperature control): every zone has its
 * own room sensor and set point, and its damper opens wide when the room is
 * far off and closes down as it gets there. In Auto the system heats when
 * the rooms are under the set point and cools when they're over it. Room
 * temperatures move as it runs, so the effect can be watched.
 *
 * The numbers are a toy model to show the behaviour, not a heat load.
 * Plain SVG and CSS; nothing here needs a 3D or charting library.
 */

type ZoneId = 1 | 2 | 3 | 4 | 5;
type Mode = "Heat" | "Cool" | "Auto" | "Dry" | "Fan";
type Doing = "heat" | "cool" | "fan" | "idle";

const ZONES: { id: ZoneId; name: string; area: number; ls: number }[] = [
  { id: 1, name: "Living", area: 21.3, ls: 106 },
  { id: 2, name: "Kitchen & dining", area: 31.6, ls: 158 },
  { id: 3, name: "Master", area: 18.1, ls: 90 },
  { id: 4, name: "Kids' rooms", area: 33.1, ls: 165 },
  { id: 5, name: "Study", area: 6.9, ls: 35 },
];
const IDS = ZONES.map((z) => z.id);
const TOTAL = ZONES.reduce((s, z) => s + z.area, 0);
const zoneOf = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

const SEASONS = {
  summer: { label: "Summer day", out: 32, start: [25.8, 26.5, 25.4, 25.9, 26.2] },
  winter: { label: "Winter night", out: 9, start: [21.8, 22.4, 21.3, 21.7, 22.0] },
} as const;
type Season = keyof typeof SEASONS;

const PRESETS: { label: string; on: ZoneId[] }[] = [
  { label: "Daytime", on: [1, 2] },
  { label: "Night", on: [3, 4] },
  { label: "Working from home", on: [2, 5] },
  { label: "Everyone home", on: [1, 2, 3, 4, 5] },
];

/** Duct sizes, coloured the way the duct design drawings colour them. */
const SIZE: Record<number, { c: string; w: number }> = {
  350: { c: "#A3ABB6", w: 13 }, 300: { c: "#6CBF4A", w: 12 }, 250: { c: "#E5BE33", w: 10.5 }, 200: { c: "#5B7FD6", w: 9 }, 150: { c: "#E2553F", w: 8 },
};

type Seg = { d: string; size: number; zone?: ZoneId };
/**
 * Three outlets off the plenum, no more: a plenum this size only takes
 * three spigots. The left one is a ø350 trunk to a branch take-off that
 * splits three ways (living, kitchen/dining, study), each with its own zone
 * motor; the top one feeds the kids' rooms and the right one the master.
 * Every run ends at a round diffuser by the window, which is where we put
 * them: the air meets the heat coming in through the glass.
 */
const SEGS: Seg[] = [
  { d: "M332 274 L296 276", size: 350 },
  { d: "M296 276 L296 244 C292 190 286 118 264 68", size: 250, zone: 1 },
  { d: "M296 276 L270 289 C266 294 264 300 262 306", size: 300, zone: 2 },
  { d: "M262 306 C236 292 206 262 182 238", size: 250, zone: 2 },
  { d: "M262 306 C256 336 246 368 236 392", size: 250, zone: 2 },
  { d: "M296 276 L296 310 C292 404 276 480 210 515", size: 200, zone: 5 },
  { d: "M390 262 L390 236 C394 222 436 210 470 205", size: 300, zone: 4 },
  { d: "M470 205 C456 160 434 112 425 66", size: 200, zone: 4 },
  { d: "M470 205 C494 160 530 112 545 66", size: 200, zone: 4 },
  { d: "M470 205 C520 232 556 276 575 320", size: 200, zone: 4 },
  { d: "M448 274 L474 274 C490 290 496 330 496 372", size: 300, zone: 3 },
  { d: "M496 372 C520 410 556 450 575 485", size: 250, zone: 3 },
  { d: "M496 372 C516 382 536 396 558 408", size: 150, zone: 3 },
];
/** The branch take-offs: round fittings where a run splits. */
const BTO: [number, number][] = [[296, 276], [262, 306], [470, 205], [496, 372]];
/** Each zone's motor: where it sits, and which way the duct runs there. */
const DAMPERS: Record<ZoneId, [number, number, number]> = {
  1: [296, 256, -90], 2: [283, 282, 153], 3: [461, 274, 0], 4: [390, 247, -90], 5: [296, 298, 90],
};
const VENTS: Record<ZoneId, [number, number][]> = {
  1: [[264, 68]], 2: [[182, 238], [236, 392]], 3: [[575, 485], [558, 408]], 4: [[425, 66], [545, 66], [575, 320]], 5: [[210, 515]],
};
/** Only the trunks are labelled; the key reads the rest. */
const SIZE_TAGS: [number, number, number][] = [[424, 226, 300], [512, 322, 300]];

const ROOMS: Room[] = [
  { name: "Living", dims: "5.0 × 4.3", x: 160, y: 40, w: 200, h: 170, zone: 1 },
  { name: "Bed 4", dims: "3.3 × 3.8", x: 360, y: 40, w: 130, h: 150, zone: 4 },
  { name: "Bed 3", dims: "2.8 × 3.8", x: 490, y: 40, w: 110, h: 150, zone: 4 },
  { name: "Kitchen / Dining", dims: "5.5 × 5.8", x: 160, y: 210, w: 220, h: 230, zone: 2, ly: 228, tx: 202 },
  { name: "Hall", x: 380, y: 190, w: 50, h: 350, lx: 405, ly: 478 },
  { name: "Bath", x: 430, y: 190, w: 170, h: 80, tx: 524 },
  { name: "Bed 2", dims: "4.3 × 2.5", x: 430, y: 270, w: 170, h: 100, zone: 4, tx: 506 },
  { name: "Master", dims: "4.3 × 4.3", x: 430, y: 370, w: 170, h: 170, zone: 3 },
  { name: "Study", dims: "2.8 × 2.5", x: 160, y: 440, w: 110, h: 100, zone: 5 },
  { name: "Entry", x: 270, y: 440, w: 110, h: 100 },
];


const W = "#3E444D";

function Door({ x, y, r, rot = 0 }: { x: number; y: number; r: number; rot?: number }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`} fill="none" stroke="#9AA3AE" strokeWidth="1">
      <path d={`M${x} ${y} h${r}`} strokeWidth="1.6" stroke="#6B7480" />
      <path d={`M${x + r} ${y} A${r} ${r} 0 0 1 ${x} ${y + r}`} strokeDasharray="3 3" />
    </g>
  );
}

const Win = ({ x, y, w, v = false }: { x: number; y: number; w: number; v?: boolean }) =>
  v ? <rect x={x - 3} y={y} width="6" height={w} fill="#EAF6FD" stroke="#5BA7D9" strokeWidth="1.2" /> : <rect x={x} y={y - 3} width={w} height="6" fill="#EAF6FD" stroke="#5BA7D9" strokeWidth="1.2" />;

/** Furniture and fittings, drawn as a plan draws them: light outlines. */
function Fittings() {
  const f = { fill: "#fff", stroke: "#CBD2DB", strokeWidth: 1 };
  return (
    <g style={{ pointerEvents: "none" }}>
      {/* living */}
      <path d="M180 150 h90 v40 h-20 v-20 h-70z" {...f} /><rect x="300" y="60" width="44" height="14" rx="2" {...f} />
      <rect x="200" y="96" width="70" height="40" rx="4" fill="#F6EFE3" stroke="#E6DCCB" />
      {/* beds */}
      {[[380, 70, 80, 96], [512, 70, 66, 92], [470, 290, 92, 62], [470, 440, 96, 86]].map(([x, y, w, h], i) => (
        <g key={i}><rect x={x} y={y} width={w} height={h} rx="3" {...f} /><rect x={x + 6} y={y + 5} width={w / 2 - 9} height="14" rx="3" {...f} /><rect x={x + w / 2 + 3} y={y + 5} width={w / 2 - 9} height="14" rx="3" {...f} /></g>
      ))}
      <path d="M462 190 v-60 M600 130 h-24" stroke="#CBD2DB" strokeDasharray="4 3" />
      {/* kitchen: bench, sink, cooktop, island, table */}
      <rect x="166" y="402" width="120" height="32" {...f} /><rect x="182" y="408" width="26" height="18" rx="4" {...f} />
      {[[236, 412], [252, 412], [236, 426], [252, 426]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" {...f} />)}
      <rect x="300" y="380" width="60" height="26" rx="2" {...f} />
      <rect x="200" y="350" width="64" height="34" rx="4" {...f} />
      {[[208, 344], [236, 344], [208, 384], [236, 384]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="18" height="7" rx="2" {...f} />)}
      {/* bath */}
      <rect x="540" y="198" width="54" height="64" rx="10" {...f} /><rect x="440" y="198" width="44" height="22" rx="3" {...f} /><ellipse cx="505" cy="250" rx="9" ry="12" {...f} />
      {/* ensuite in the master */}
      <path d="M520 370 v60 h80" fill="none" stroke={W} strokeWidth="3" />
      <rect x="534" y="380" width="26" height="16" rx="3" {...f} /><ellipse cx="582" cy="392" rx="8" ry="10" {...f} />
      {/* study desk */}
      <rect x="170" y="448" width="70" height="26" {...f} /><circle cx="205" cy="488" r="8" {...f} />
    </g>
  );
}


/* ------------------------------------------------------------ the model */

/** A zone: on or off, its room temperature and set point, how far open its damper is, and whether the motor is driving. */
type Z = { on: boolean; t: number; set: number; open: number; mv?: boolean };
type State = Record<ZoneId, Z>;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** What the system is doing: Auto heats below the set point and cools above it, with a little dead band. */
function doing(power: boolean, mode: Mode, zs: State, prev: Doing): Doing {
  if (!power || !IDS.some((id) => zs[id].on)) return "idle";
  if (mode === "Fan") return "fan";
  if (mode === "Heat") return "heat";
  if (mode === "Cool" || mode === "Dry") return "cool";
  const on = IDS.filter((id) => zs[id].on);
  const gap = on.reduce((s, id) => s + (zs[id].t - zs[id].set), 0) / on.length;
  if (gap > 0.5) return "cool";
  if (gap < -0.5) return "heat";
  return prev === "fan" ? "idle" : prev;
}

/** The model runs ten steps a second. */
const TICK = 0.1;
/** Fastest a room changes, with its damper wide open: 1° a minute. */
const RATE = 1 / 60;
/** How fast the outside creeps back in, per degree of difference, per second. 8° out gives a quarter of RATE. */
const LEAK = RATE / 32;

/**
 * One step. ITC works like a thermostat with a valve, not a switch: each
 * damper sits at the opening that holds its room at the set point (enough
 * to cancel the heat leaking in from outside), plus more the further off
 * the room is. So once a room arrives its damper settles and stays put,
 * rather than flicking open and shut around the set point.
 */
function step(zs: State, act: Doing, out: number, speed: number): State {
  const next = { ...zs };
  const fan = 0.7 + speed * 0.1;
  for (const id of IDS) {
    const z = zs[id];
    let want = 0;
    if (z.on && act === "fan") want = 1;
    else if (z.on && (act === "heat" || act === "cool")) {
      const need = act === "cool" ? z.t - z.set : z.set - z.t;
      const hold = (act === "cool" ? out - z.set : z.set - out) * LEAK / (RATE * fan);
      want = clamp(hold + need * 1.2, 0.1, 1);
    }
    // A zone motor drives at a steady pace, about five seconds end to end.
    const open = z.open + clamp(want - z.open, -0.02, 0.02);
    const push = act === "heat" ? 1 : act === "cool" ? -1 : 0;
    const t = z.t + (push * open * RATE * fan + (out - z.t) * LEAK) * TICK;
    next[id] = { ...z, open, t, mv: Math.abs(open - z.open) > 0.001 };
  }
  return next;
}

/* ------------------------------------------------------------ the plan */

/** lx centres the label on a point; tx moves a left-aligned one. */
type Room = { name: string; dims?: string; x: number; y: number; w: number; h: number; zone?: ZoneId; lx?: number; ly?: number; tx?: number };

/**
 * The air moving through the ducts, and the outdoor fan. Driven frame by
 * frame rather than with SVG/CSS animations: those restart from the top
 * whenever their speed changes, so the flow jerked every time a damper
 * moved. Here each run's air simply speeds up or slows down.
 */
function FlowLayer({ live }: { live: MutableRefObject<{ opens: number[]; ret: number; fan: number; speed: number; air: string }> }) {
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[][]>([]);
  const fan = useRef<SVGGElement | null>(null);
  const all = [...SEGS.map((s) => s.d), "M405 422 L405 338"];
  const N = 4;
  useEffect(() => {
    let raf = 0, last = performance.now(), angle = 0;
    const phase = all.map(() => Math.random() * 100);
    const len = all.map((_, i) => paths.current[i]?.getTotalLength() ?? 100);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { opens, ret, fan: f, speed, air } = live.current;
      all.forEach((_, i) => {
        const open = i < SEGS.length ? opens[i] : ret;
        const p = paths.current[i];
        if (!p) return;
        phase[i] = (phase[i] + dt * open * (30 + speed * 14)) % len[i];
        dots.current[i]?.forEach((c, k) => {
          if (!c) return;
          const pt = p.getPointAtLength((phase[i] + (k * len[i]) / N) % len[i]);
          c.setAttribute("cx", pt.x.toFixed(1));
          c.setAttribute("cy", pt.y.toFixed(1));
          c.setAttribute("opacity", Math.min(1, open * 1.6).toFixed(2));
          c.setAttribute("stroke", i < SEGS.length ? air : "#7B5CC9");
        });
      });
      angle = (angle + dt * f * 900) % 360;
      fan.current?.setAttribute("transform", `rotate(${angle.toFixed(1)} 638 320)`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the paths never change; live values are read from the ref each frame
  }, []);
  return (
    <g style={{ pointerEvents: "none" }}>
      {all.map((d, i) => (
        <g key={i}>
          <path ref={(el) => { paths.current[i] = el; }} d={d} fill="none" stroke="none" />
          {Array.from({ length: N }, (_, k) => (
            <circle key={k} ref={(el) => { (dots.current[i] ??= [])[k] = el; }} r="2.5" fill="#fff" strokeWidth="1.5" opacity="0" />
          ))}
        </g>
      ))}
      <g ref={fan}>{[0, 120, 240].map((a) => <ellipse key={a} cx="638" cy="312" rx="3.5" ry="7" fill="#AEB8C6" transform={`rotate(${a} 638 320)`} />)}</g>
    </g>
  );
}

/** A round ceiling diffuser by the window, with rings of air spreading out of it as its damper opens. */
function Diffuser({ x, y, open, air, motion }: { x: number; y: number; open: number; air: string; motion: boolean }) {
  const lit = open > 0.12;
  const ink = lit ? "#3E444D" : "#B8C0CA";
  return (
    <g>
      <circle cx={x} cy={y} r={14 + open * 20} fill={air} opacity={lit ? 0.1 + open * 0.14 : 0} style={{ transition: "r .4s, opacity .4s" }} />
      {motion && [0, 1].map((k) => (
        <circle key={k} cx={x} cy={y} r="12" fill="none" stroke={air} strokeWidth="2" className="zh__ripple"
          style={{ opacity: lit ? 0.25 + open * 0.6 : 0, animationDelay: `${k * 0.8}s`, animationDuration: `${(2.4 - open).toFixed(2)}s` }} />
      ))}
      <circle cx={x} cy={y} r="11" fill="#fff" stroke={ink} strokeWidth="1.4" />
      <circle cx={x} cy={y} r="7.5" fill="none" stroke={ink} strokeWidth="1" />
      <circle cx={x} cy={y} r="4" fill="none" stroke={ink} strokeWidth="1" />
      <circle cx={x} cy={y} r="1.6" fill={ink} />
    </g>
  );
}

/**
 * A zone motor: a collar on the spigot with the damper blade inside it,
 * which turns from across the duct (shut) to along it (open), and the
 * motor box on the side with its light on while it's driving.
 */
function Motor({ x, y, a, open, moving }: { x: number; y: number; a: number; open: number; moving: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <rect x="-7" y="-8.5" width="14" height="17" rx="2" fill="#E4E8EE" stroke="#6B7480" strokeWidth="1.2" />
      <g style={{ transform: `rotate(${(90 * (1 - open)).toFixed(1)}deg)`, transition: "transform .25s linear" }}>
        <rect x="-6.5" y="-1.6" width="13" height="3.2" rx="1" fill={open > 0.12 ? "#1F2536" : "#C2521A"} />
      </g>
      <circle r="1.5" fill="#6B7480" />
      <rect x="-6" y="-21" width="12" height="11" rx="2" fill="#1F2536" />
      <circle cx="0" cy="-15.5" r="1.8" fill={moving ? "#4ADE80" : "#5D6B80"} />
    </g>
  );
}

function Plan({ zs, act, speed, motion, toggle }: { zs: State; act: Doing; speed: number; motion: boolean; toggle: (z: ZoneId) => void }) {
  const air = act === "heat" ? "#F2663A" : act === "cool" ? "#1BA7E0" : "#8A97AB";
  const tint = act === "heat" ? "#FCE9DF" : act === "cool" ? "#E1F2FA" : "#EEF3F7";
  const load = IDS.reduce((s, id) => s + zoneOf(id).area * zs[id].open, 0) / TOTAL;
  const outdoor = (act === "heat" || act === "cool") && load > 0.02;
  const running = act !== "idle";
  const live = useRef({ opens: [] as number[], ret: 0, fan: 0, speed, air });
  live.current = {
    // The ø350 trunk carries whatever its three zones (living, kitchen, study) are drawing.
    opens: SEGS.map((s) => (!running ? 0 : s.zone ? zs[s.zone].open : Math.min(1, zs[1].open + zs[2].open + zs[5].open))),
    ret: running ? Math.max(0.3, load) : 0,
    fan: outdoor ? Math.max(0.15, load) : 0,
    speed, air,
  };
  return (
    <svg viewBox="0 0 680 600" className="zh__svg" role="img"
      aria-label={`Floor plan. ${ZONES.filter((z) => zs[z.id].on).map((z) => `${z.name} ${zs[z.id].t.toFixed(1)} degrees, damper ${Math.round(zs[z.id].open * 100)}% open`).join("; ") || "No zones on"}.`}>
      <defs>
        <pattern id="zh-pave" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#F3F4F6" /><path d="M0 .5H22M.5 0V22" stroke="#DADDE2" /></pattern>
        <pattern id="zh-conc" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#E6E7EA" /><circle cx="2" cy="3" r=".8" fill="#CDD0D5" /><circle cx="6" cy="6" r=".6" fill="#D6D8DC" /></pattern>
        <linearGradient id="zh-galv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E9EDF2" /><stop offset=".5" stopColor="#C9D0D9" /><stop offset="1" stopColor="#DDE2E8" /></linearGradient>
      </defs>
      <rect width="680" height="600" fill="#fff" />
      <rect x="30" y="40" width="130" height="210" fill="url(#zh-pave)" />
      <text x="95" y="150" textAnchor="middle" className="zh__room-n" fill="#A7AFBA">Alfresco</text>
      <rect x="30" y="250" width="130" height="290" fill="url(#zh-conc)" />
      {[[48, 300], [100, 300]].map(([x, y]) => (
        <g key={x} fill="none" stroke="#A7AFBA" strokeWidth="1.2"><rect x={x} y={y} width="44" height="92" rx="14" fill="#F7F8FA" /><path d={`M${x + 6} ${y + 26} h32 M${x + 6} ${y + 62} h32`} /></g>
      ))}
      <text x="95" y="430" textAnchor="middle" className="zh__room-n" fill="#A7AFBA">Garage</text>

      {ROOMS.map((r) => {
        const z = r.zone ? zs[r.zone] : null;
        return (
          <rect key={r.name} x={r.x} y={r.y} width={r.w} height={r.h}
            fill={z ? (z.on ? tint : "#EEF0F3") : "#F7F8FA"}
            className={r.zone ? "zh__room" : undefined} style={{ transition: "fill .6s" }}
            onClick={r.zone ? () => toggle(r.zone!) : undefined} />
        );
      })}
      <Fittings />
      <g fill="none" stroke={W} strokeLinejoin="miter">
        <path d="M160 40 H600 V540 H160 Z M30 250 H160 M30 250 V540 H160" strokeWidth="6" />
        <path d="M360 40 V190 M490 40 V190 M360 190 H600 M160 210 H360 M380 190 V540 M430 190 V540 M430 270 H600 M430 370 H600 M160 440 H380 M270 440 V540" strokeWidth="3" />
      </g>
      <g stroke="#fff" strokeWidth="5"><path d="M392 190 h26 M380 230 v26 M430 300 v26 M430 400 v26 M380 470 v26 M300 440 h26 M200 440 h26" /></g>
      <Door x={392} y={190} r={24} rot={180} /><Door x={430} y={300} r={24} rot={90} /><Door x={430} y={400} r={24} rot={90} />
      <Door x={200} y={440} r={24} rot={0} /><Door x={300} y={540} r={28} rot={-90} />
      <Win x={200} y={40} w={80} /><Win x={390} y={40} w={70} /><Win x={515} y={40} w={60} /><Win x={600} y={290} w={60} v /><Win x={600} y={450} w={70} v /><Win x={600} y={205} w={40} v /><Win x={180} y={540} w={60} /><Win x={160} y={90} w={70} v /><Win x={160} y={214} w={32} v />

      {/* return air: grille in the hall, ø500 back up to the fan coil */}
      <path d="M405 424 V338" stroke="#7B5CC9" strokeWidth="16" strokeLinecap="round" opacity=".85" />
      <rect x="386" y="394" width="38" height="30" fill="#fff" stroke="#5E6A82" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M390 ${399 + i * 5} h30`} stroke="#5E6A82" strokeWidth="1" />)}

      {/* supply runs, coloured by size */}
      {SEGS.map((s, i) => {
        const { c, w } = SIZE[s.size];
        return (
          <g key={i} style={{ pointerEvents: "none" }}>
            <path d={s.d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
      {BTO.map(([x, y]) => <g key={`${x}${y}`}><circle cx={x} cy={y} r="8.5" fill="#C9CED6" stroke="#6B7480" strokeWidth="1.5" /><circle cx={x} cy={y} r="3.5" fill="#fff" stroke="#6B7480" /></g>)}

      {/* fan coil, the transition up into the plenum, and the plenum the zones leave from */}
      <rect x="340" y="300" width="100" height="38" rx="3" fill="#111" />
      <text x="390" y="323" textAnchor="middle" className="zh__fc">FAN COIL</text>
      <path d="M332 286 H448 L440 300 H340 Z" fill="url(#zh-galv)" stroke="#6B7480" strokeWidth="1" />
      <rect x="332" y="262" width="116" height="24" rx="2" fill="url(#zh-galv)" stroke="#6B7480" strokeWidth="1.2" />
      <text x="390" y="278" textAnchor="middle" className="zh__sz">PLENUM</text>

      <rect x="612" y="298" width="52" height="44" rx="5" fill="#fff" stroke="#5E6A82" strokeWidth="1.5" />
      <circle cx="638" cy="320" r="15" fill="#2B3247" />
      {motion && <FlowLayer live={live} />}
      {!motion && <g>{[0, 120, 240].map((a) => <ellipse key={a} cx="638" cy="312" rx="3.5" ry="7" fill="#AEB8C6" transform={`rotate(${a} 638 320)`} />)}</g>}
      {IDS.map((id) => { const [x, y, a] = DAMPERS[id]; return <Motor key={id} x={x} y={y} a={a} open={zs[id].open} moving={!!zs[id].mv} />; })}
      {IDS.flatMap((id) => VENTS[id].map(([x, y]) => <Diffuser key={`${x}${y}`} x={x} y={y} open={running ? zs[id].open : 0} air={air} motion={motion} />))}
      {SIZE_TAGS.map(([x, y, s]) => (
        <g key={`${x}${y}`} style={{ pointerEvents: "none" }}>
          <rect x={x - 16} y={y - 7} width="32" height="13" rx="3" fill="#fff" stroke="#C9D1DC" />
          <text x={x} y={y + 3} textAnchor="middle" className="zh__sz">{`ø${s}`}</text>
        </g>
      ))}
      <rect x="388" y="428" width="34" height="13" rx="3" fill="#fff" stroke="#C9D1DC" />
      <text x="405" y="438" textAnchor="middle" className="zh__sz">RA ø500</text>

      {/* refrigerant out to the outdoor unit, which works only as hard as the zones ask */}
      <path d="M440 320 H612" stroke="#C98B57" strokeWidth="2" strokeDasharray="5 4" fill="none" />
      <circle cx="638" cy="320" r="3" fill="#C9D1DC" />
      <text x="638" y="358" textAnchor="middle" className="zh__room-n" fill="#3E444D">Outdoor</text>
      <text x="638" y="372" textAnchor="middle" className="zh__room-d" fill="#8A93A0">{outdoor ? `${Math.round(load * 100)}% output` : "idle"}</text>

      {ROOMS.map((r) => {
        const z = r.zone ? zs[r.zone] : null;
        const x = r.lx ?? r.tx ?? r.x + 8, y = r.ly ?? r.y + 18;
        return (
          <g key={r.name} style={{ pointerEvents: "none" }}>
            <text x={x} y={y} textAnchor={r.lx ? "middle" : "start"} className="zh__room-n" fill="#1F2536">{r.name}</text>
            {r.dims && <text x={x} y={y + 14} className="zh__room-d" fill="#8A93A0">{r.dims}</text>}
            {z && r.zone && (
              <g transform={`translate(${x} ${y + 21})`}>
                <rect width="84" height="19" rx="9.5" fill={z.on ? "#050A30" : "#fff"} stroke={z.on ? "#050A30" : "#B8C0CA"} />
                <text x="42" y="13" textAnchor="middle" className="zh__tag" fill={z.on ? "#fff" : "#6B7480"}>{`Zone ${r.zone} · ${z.t.toFixed(1)}°`}</text>
              </g>
            )}
          </g>
        );
      })}

      <g transform="translate(160 562)">
        {[350, 300, 250, 200, 150].map((s, i) => (
          <g key={s} transform={`translate(${i * 60 - 40} 0)`}>
            <rect width="22" height="8" rx="4" fill={SIZE[s].c} y="-5" />
            <text x="28" y="2" className="zh__room-d" fill="#5D6B80">{`ø${s}`}</text>
          </g>
        ))}
        <g transform="translate(300 0)"><rect x="0" y="-7" width="10" height="13" rx="2" fill="#1F2536" /><text x="16" y="2" className="zh__room-d" fill="#5D6B80">Zone motor</text></g>
        <g transform="translate(400 0)"><circle cx="5" cy="-1" r="6" fill="#fff" stroke="#3E444D" /><circle cx="5" cy="-1" r="2.5" fill="none" stroke="#3E444D" /><text x="16" y="2" className="zh__room-d" fill="#5D6B80">Round vent</text></g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------ the controller */

const Ico = ({ d, children }: { d?: string; children?: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d && <path d={d} />}{children}</svg>
);

function Controller({ power, setPower, zs, toggle, setZone, setAll, setZones, mode, setMode, act, speed, setSpeed }: {
  power: boolean; setPower: (p: boolean) => void; zs: State; toggle: (z: ZoneId) => void; setZone: (z: ZoneId, set: number) => void;
  setAll: (set: number) => void; setZones: (ids: ZoneId[]) => void; mode: Mode; setMode: (m: Mode) => void; act: Doing; speed: number; setSpeed: (s: number) => void;
}) {
  const [screen, setScreen] = useState<"home" | "zones" | "schedule">("home");
  const tone = act === "heat" ? "#FF8A50" : act === "cool" ? "#5BC8F5" : "#C9D1DC";
  const on = IDS.filter((id) => zs[id].on);
  const master = on.length ? zs[on[0]].set : zs[1].set;
  const avg = on.length ? on.reduce((s, id) => s + zs[id].t, 0) / on.length : null;
  const state = !power ? "Off" : act === "heat" ? "Heating" : act === "cool" ? "Cooling" : act === "fan" ? "Fan only" : "Holding";
  return (
    <div className="mec" aria-label="Wall controller">
      <div className={`mec__screen${power ? "" : " mec__screen--off"}`}>
        {screen === "home" && (
          <>
            <div className="mec__top">
              <button type="button" className={power ? "on" : undefined} aria-pressed={power} onClick={() => setPower(!power)}>
                <span><Ico d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0" /></span>{power ? "on" : "off"}
              </button>
              <button type="button" onClick={() => setScreen("zones")} disabled={!power}>
                <span><Ico d="M3 11l9-7 9 7v9H3zM3 14h18M12 14v6" /></span>zones
              </button>
              <button type="button" onClick={() => setScreen("schedule")} disabled={!power}>
                <span><Ico d="M4 7h16M4 12h16M4 17h16"><circle cx="9" cy="7" r="1.6" fill="currentColor" /><circle cx="15" cy="12" r="1.6" fill="currentColor" /><circle cx="8" cy="17" r="1.6" fill="currentColor" /></Ico></span>schedule
              </button>
            </div>
            <div className="mec__temp">
              <button type="button" aria-label="Lower the set temperature" disabled={!power} onClick={() => setAll(Math.max(16, master - 0.5))}>−</button>
              <div aria-live="polite" style={{ color: power ? tone : "#4A5266" }}>
                <b>{Math.floor(master)}</b><span><i>°C</i><i>.{master % 1 ? 5 : 0}</i></span>
              </div>
              <button type="button" aria-label="Raise the set temperature" disabled={!power} onClick={() => setAll(Math.min(30, master + 0.5))}>+</button>
            </div>
            <div className="mec__modes" role="group" aria-label="Mode">
              {(["Heat", "Cool", "Auto", "Dry", "Fan"] as Mode[]).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} className={mode === m ? "on" : undefined} disabled={!power} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            <div className="mec__info">
              <button type="button" className="mec__fan" disabled={!power} aria-label={`Fan speed ${speed} of 4, tap to change`} onClick={() => setSpeed(speed % 4 + 1)}>
                <small>Fan speed</small>
                <span>{[1, 2, 3, 4].map((b) => <i key={b} className={b <= speed ? "on" : undefined} style={{ height: 6 + b * 4 }} />)}</span>
              </button>
              <div className="mec__stat">
                <small>Avg inside · {mode === "Auto" && power ? `Auto ${state.toLowerCase()}` : state}</small>
                <strong>{avg != null && power ? `${avg.toFixed(1)}°c` : "—"}</strong>
              </div>
            </div>
          </>
        )}
        {screen === "zones" && (
          <div className="mec__list">
            <div className="mec__head"><button type="button" onClick={() => setScreen("home")} aria-label="Back">‹</button><strong>Zones</strong><small>ITC: a sensor in every zone</small></div>
            {ZONES.map((z) => {
              const s = zs[z.id];
              return (
                <div key={z.id} className={`mec__zrow${s.on ? " on" : ""}`}>
                  <button type="button" aria-pressed={s.on} className="mec__zname" onClick={() => toggle(z.id)}>
                    <span>{z.name}</span><em>{s.on ? `${Math.round(s.open * 100)}% open` : "Off"}</em>
                  </button>
                  <span className="mec__ztemp" aria-label={`${z.name} is ${s.t.toFixed(1)} degrees`}>{s.t.toFixed(1)}°</span>
                  <span className="mec__zset">
                    <button type="button" aria-label={`Lower ${z.name} set point`} onClick={() => setZone(z.id, Math.max(16, s.set - 0.5))}>−</button>
                    <b>{s.set.toFixed(1)}</b>
                    <button type="button" aria-label={`Raise ${z.name} set point`} onClick={() => setZone(z.id, Math.min(30, s.set + 0.5))}>+</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {screen === "schedule" && (
          <div className="mec__list">
            <div className="mec__head"><button type="button" onClick={() => setScreen("home")} aria-label="Back">‹</button><strong>Schedule</strong></div>
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className="mec__zone" onClick={() => { setZones(p.on); setScreen("home"); }}>
                <span>{p.label}</span><em>{p.on.map((id) => zoneOf(id).name.split(" ")[0]).join(", ")}</em>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mec__brand">MITSUBISHI ELECTRIC</div>
    </div>
  );
}

/* ------------------------------------------------------------ together */

const fresh = (season: Season, onIds: ZoneId[], set = 24): State =>
  Object.fromEntries(IDS.map((id, i) => [id, { on: onIds.includes(id), t: SEASONS[season].start[i], set, open: 0 }])) as State;

export function ZoneHouse() {
  const [season, setSeason] = useState<Season>("summer");
  const [zs, setZs] = useState<State>(() => fresh("summer", [1, 2]));
  const [power, setPower] = useState(true);
  const [mode, setMode] = useState<Mode>("Auto");
  const [speed, setSpeed] = useState(3);
  const [motion, setMotion] = useState(true);
  const [act, setAct] = useState<Doing>("idle");
  const live = useRef({ power, mode, speed, season, act, zs });
  live.current = { power, mode, speed, season, act, zs };

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setMotion(false);
    // The rooms keep changing while the page is open, so the dampers can be seen easing off.
    const t = setInterval(() => {
      const { power: p, mode: m, speed: s, season: se, act: a, zs: cur } = live.current;
      const now = doing(p, m, cur, a);
      setAct(now);
      setZs(step(cur, now, SEASONS[se].out, s));
    }, 100);
    return () => clearInterval(t);
  }, []);

  const toggle = (id: ZoneId) => { if (power) setZs((z) => ({ ...z, [id]: { ...z[id], on: !z[id].on } })); };
  const setZone = (id: ZoneId, set: number) => setZs((z) => ({ ...z, [id]: { ...z[id], set } }));
  const setAll = (set: number) => setZs((z) => Object.fromEntries(IDS.map((id) => [id, { ...z[id], set }])) as State);
  const setZones = (ids: ZoneId[]) => setZs((z) => Object.fromEntries(IDS.map((id) => [id, { ...z[id], on: ids.includes(id) }])) as State);
  const pickSeason = (s: Season) => { setSeason(s); setZs((z) => { const f = fresh(s, IDS.filter((id) => z[id].on), z[1].set); return f; }); };

  const onIds = IDS.filter((id) => power && zs[id].on);
  const load = Math.round((IDS.reduce((s, id) => s + zoneOf(id).area * zs[id].open, 0) / TOTAL) * 100);
  const busiest = onIds.slice().sort((a, b) => zs[b].open - zs[a].open)[0];

  return (
    <div className="zh zh--plan">
      <div className="zh__fig">
        <Plan zs={zs} act={power ? act : "idle"} speed={speed} motion={motion} toggle={toggle} />
      </div>
      <div className="zh__panel">
        <Controller power={power} setPower={setPower} zs={zs} toggle={toggle} setZone={setZone} setAll={setAll} setZones={setZones}
          mode={mode} setMode={setMode} act={power ? act : "idle"} speed={speed} setSpeed={setSpeed} />
        <div className="zh__season" role="group" aria-label="Weather outside">
          {(Object.keys(SEASONS) as Season[]).map((s) => (
            <button key={s} type="button" aria-pressed={season === s} className={season === s ? "on" : undefined} onClick={() => pickSeason(s)}>
              {SEASONS[s].label} <small>{SEASONS[s].out}° outside</small>
            </button>
          ))}
        </div>
        <div className="zh__read" aria-live="polite">
          <div className="zh__bar"><span style={{ width: `${load}%`, background: act === "heat" ? "#F2663A" : "#1BA7E0" }} /></div>
          <p>
            {!power ? <><strong>System off.</strong> Tap on to start it.</>
              : onIds.length === 0 ? <><strong>No zones on.</strong> Open Zones on the controller, or tap a room.</>
                : act === "idle" ? <><strong>Every room is at its set point.</strong> The dampers have closed down and the outdoor unit is resting.</>
                  : <><strong>{act === "heat" ? "Heating" : act === "cool" ? "Cooling" : "Fan only"}{mode === "Auto" ? " (Auto)" : ""}, outdoor unit at about {load}%.</strong>{" "}
                    {busiest && `${zoneOf(busiest).name} is ${zs[busiest].t.toFixed(1)}°, set to ${zs[busiest].set.toFixed(1)}°, so its damper is ${Math.round(zs[busiest].open * 100)}% open. `}
                    Rooms closer to their set point get less air.</>}
          </p>
          <p className="zh__note">Each zone has its own sensor (ITC) and set point, on the controller&apos;s Zones screen. In Auto it heats when the rooms are below the set point and cools when they&apos;re above it. An illustration of a typical design: your zones and duct sizes are worked out for your home.</p>
        </div>
      </div>
    </div>
  );
}
