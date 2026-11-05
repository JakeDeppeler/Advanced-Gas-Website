"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import "./how.css";

/**
 * Ducted zoning, in 3D and hands-on. A single-storey home seen from above
 * with the ceiling taken off: the unit in the roof, a duct to each room with
 * a damper on it, a vent in every ceiling and the outdoor unit beside the
 * house. Turning a zone off shuts its damper, the air to that room stops,
 * and the outdoor unit slows down because it is conditioning less of the
 * house. That is the whole case for zoning, and it is easier to see than to
 * read.
 *
 * Drawn as isometric SVG rather than with a 3D library: it is one house that
 * never rotates, and a few hundred KB of WebGL to draw it would be the wrong
 * trade on a page people open on their phones.
 */

type ZoneId = "A" | "B" | "C" | "D";
type Mode = "cool" | "heat";
type P3 = [number, number, number];

const ZONES: { id: ZoneId; name: string; short: string; rect: [number, number, number, number]; tone: string }[] = [
  { id: "C", name: "Main bedroom", short: "Main bed", rect: [0, 0, 6, 5], tone: "#E3EBF4" },
  { id: "D", name: "Kids' bedrooms", short: "Kids' beds", rect: [6, 0, 8, 5], tone: "#EAF0E4" },
  { id: "A", name: "Living room", short: "Living", rect: [0, 5, 8, 5], tone: "#F5EBDD" },
  { id: "B", name: "Kitchen & dining", short: "Kitchen", rect: [8, 5, 6, 5], tone: "#F1EEE8" },
];
const AREA = Object.fromEntries(ZONES.map((z) => [z.id, z.rect[2] * z.rect[3]])) as Record<ZoneId, number>;
const TOTAL = Object.values(AREA).reduce((a, b) => a + b, 0);

const PRESETS: { label: string; on: ZoneId[]; note: string }[] = [
  { label: "Daytime", on: ["A", "B"], note: "Living areas on, bedrooms off." },
  { label: "Night", on: ["C", "D"], note: "Bedrooms on, living areas off." },
  { label: "Main bedroom only", on: ["C"], note: "Just the one room." },
  { label: "Everything on", on: ["A", "B", "C", "D"], note: "The whole house." },
];

/* ------------------------------------------------------------ the projection */

const S = 25, OX = 240, OY = 86;
const iso = ([x, y, z]: P3): [number, number] => [OX + (x - y) * S * 0.866, OY + (x + y) * S * 0.5 - z * S];
const pts = (ps: P3[]) => ps.map((p) => iso(p).map((n) => n.toFixed(1)).join(",")).join(" ");
const line = (ps: P3[]) => ps.map((p, i) => `${i ? "L" : "M"}${iso(p).map((n) => n.toFixed(1)).join(" ")}`).join(" ");

type Box = { x: number; y: number; z?: number; w: number; d: number; h: number; top: string; side: string; front: string; key: string };

/** A box in 3D: the top and the two faces that face us. */
function Cuboid({ b }: { b: Box }) {
  const { x, y, w, d, h } = b, z = b.z ?? 0;
  return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={b.front} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={b.side} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={b.top} />
    </g>
  );
}

/** A wall. Brick only on the faces that are outside: the back and left walls show us their painted inside. */
const wall = (key: string, x: number, y: number, w: number, d: number, h: number, brick: "none" | "front" | "side" = "none"): Box =>
  ({ key, x, y, w, d, h, top: "#D9D2C6", side: brick === "side" ? "#B9623E" : "#E2DACD", front: brick === "front" ? "#C46E47" : "#EEE8DE" });
const thing = (key: string, x: number, y: number, w: number, d: number, h: number, top: string, z = 0): Box =>
  ({ key, x, y, z, w, d, h, top, side: shade(top, 0.8), front: shade(top, 0.9) });

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Walls and furniture, drawn back to front so nearer things cover further ones. */
const SOLIDS: Box[] = [
  // outside walls: full height at the back, cut low at the front so you can see in
  wall("wb", 0, 0, 14, 0.25, 1.75), wall("wl", 0, 0, 0.25, 10, 1.75),
  wall("wf", 0, 9.75, 14, 0.25, 0.35, "front"), wall("wr", 13.75, 0, 0.25, 10, 0.35, "side"),
  // inside walls, with a gap for the hall
  wall("i1", 0.25, 4.9, 6.2, 0.2, 1.1), wall("i2", 7.6, 4.9, 6.15, 0.2, 1.1),
  wall("i3", 5.9, 0.25, 0.2, 4.65, 1.1), wall("i4", 9.9, 0.25, 0.2, 4.65, 1.1), wall("i5", 7.9, 5.1, 0.2, 2, 1.1),
  // main bedroom
  thing("bed1", 1.2, 1, 2.6, 2.8, 0.45, "#FFFFFF"), thing("quilt1", 1.2, 2, 2.6, 1.8, 0.08, "#9DB7D6", 0.45),
  thing("bst1", 4.1, 0.6, 0.7, 0.6, 0.5, "#B08A66"),
  // kids' rooms
  thing("bed2", 6.6, 0.8, 1.5, 2.6, 0.4, "#FFFFFF"), thing("quilt2", 6.6, 1.8, 1.5, 1.6, 0.08, "#F2B279", 0.4),
  thing("bed3", 10.8, 0.8, 1.5, 2.6, 0.4, "#FFFFFF"), thing("quilt3", 10.8, 1.8, 1.5, 1.6, 0.08, "#A9CF96", 0.4),
  thing("desk", 8.4, 3.6, 1.2, 0.6, 0.7, "#A5774F"),
  // living
  thing("tvu", 1.4, 5.4, 3.2, 0.5, 0.45, "#7B5A3E"), thing("tv", 2, 5.5, 2, 0.12, 0.9, "#1F2536", 0.45),
  thing("cof", 2.2, 6.9, 1.6, 0.8, 0.3, "#A5774F"),
  thing("sofa", 1.2, 8.2, 3.6, 1.1, 0.45, "#7194C0"), thing("sofab", 1.2, 9.1, 3.6, 0.35, 0.9, "#5E7FA8"),
  thing("chair", 5.6, 6.6, 1, 1, 0.45, "#D4C3A8"),
  // kitchen
  thing("bench", 8.6, 5.3, 4.9, 0.8, 0.9, "#F4F1EC"), thing("isl", 9.6, 7.2, 2.8, 1, 0.9, "#F4F1EC"),
  thing("st1", 9.9, 8.5, 0.45, 0.45, 0.6, "#5E6A82"), thing("st2", 11.2, 8.5, 0.45, 0.45, 0.6, "#5E6A82"),
].sort((a, b) => a.x + a.w / 2 + a.y + a.d / 2 + (a.z ?? 0) * 0.1 - (b.x + b.w / 2 + b.y + b.d / 2 + (b.z ?? 0) * 0.1));

/* ------------------------------------------------------------ the ducts */

// Just above the walls: higher, and the vents drift up the screen away from the rooms they serve.
const CEIL = 1.95;
type Run = { zone: ZoneId; path: [number, number][]; damper: [number, number]; vents: [number, number][] };
const RUNS: Run[] = [
  { zone: "C", path: [[6.1, 4.4], [3, 4.4], [3, 2.6]], damper: [4.8, 4.4], vents: [[3, 2.6]] },
  { zone: "D", path: [[7.9, 4.4], [10, 4.4], [10, 3.5]], damper: [9, 4.4], vents: [[8, 2.6], [12, 2.6]] },
  { zone: "A", path: [[6.1, 5.4], [4, 5.4], [4, 7.6]], damper: [5, 5.4], vents: [[4, 7.6]] },
  { zone: "B", path: [[7.9, 5.4], [11, 5.4], [11, 7.6]], damper: [9.4, 5.4], vents: [[11, 7.6]] },
];
// The kids' trunk splits to a vent in each bedroom.
const D_BRANCHES: [number, number][][] = [[[10, 3.5], [8, 3.5], [8, 2.6]], [[10, 3.5], [12, 3.5], [12, 2.6]]];

function Flow({ d, c, n = 5, dur = 2.4, r = 2.4, on }: { d: string; c: string; n?: number; dur?: number; r?: number; on: boolean }) {
  if (!on) return null;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const begin = `${(-(i * dur) / n).toFixed(2)}s`;
        return (
          <circle key={i} r={r} fill={c}>
            <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={d} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

function Duct({ d, on, c, motion }: { d: string; on: boolean; c: string; motion: boolean }) {
  return (
    <g>
      <path d={d} stroke="#8E9AAB" strokeWidth="11" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} stroke="#E4E8EE" strokeWidth="8.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} stroke="#7F8B9C" strokeOpacity=".3" strokeWidth="8.5" fill="none" strokeLinejoin="round" strokeDasharray="1.2 3.6" />
      <Flow d={d} c={c} on={on && motion} />
    </g>
  );
}

function Vent({ x, y, on, c, motion }: { x: number; y: number; on: boolean; c: string; motion: boolean }) {
  const ring = (r: number, z: number) => pts(Array.from({ length: 16 }, (_, i) => [x + r * Math.cos((i / 16) * Math.PI * 2), y + r * Math.sin((i / 16) * Math.PI * 2), z] as P3));
  const [tx, ty] = iso([x, y, CEIL - 0.2]);
  const [bx, by] = iso([x, y, 0.1]);
  return (
    <g>
      {on && <polygon points={`${tx - 11},${ty} ${tx + 11},${ty} ${bx + 34},${by} ${bx - 34},${by}`} fill={`url(#zh-plume-${c === "#F2663A" ? "h" : "c"})`} />}
      {on && motion && [-14, 0, 14].map((o, i) => (
        <Flow key={o} d={`M${tx + o * 0.4} ${ty + 2} L${bx + o * 1.4} ${by - 4}`} c={c} n={2} dur={1.6 + i * 0.2} r={2} on />
      ))}
      <polygon points={ring(0.5, CEIL - 0.2)} fill="#fff" stroke={on ? "#5E6A82" : "#B8C4D4"} strokeWidth="1.2" />
      <polygon points={ring(0.28, CEIL - 0.2)} fill="none" stroke={on ? "#8E9AAB" : "#C9D2DE"} strokeWidth="1" />
    </g>
  );
}

function Damper({ x, y, on, along }: { x: number; y: number; on: boolean; along: "x" | "y" }) {
  const [cx, cy] = iso([x, y, CEIL]);
  // Open, the blade lies along the duct; shut, it turns across it.
  const a = iso([x + (along === "x" ? 0.3 : 0), y + (along === "y" ? 0.3 : 0), CEIL]);
  const ang = (Math.atan2(a[1] - cy, a[0] - cx) * 180) / Math.PI + (on ? 0 : 90);
  return (
    <g>
      <circle cx={cx} cy={cy} r="8.5" fill="#fff" stroke="#050A30" strokeWidth="1.8" />
      <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke={on ? "#050A30" : "#C2521A"} strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${ang} ${cx} ${cy})`} style={{ transition: "transform .5s" }} />
      <rect x={cx + 6} y={cy - 15} width="11" height="8" rx="2" fill="#050A30" />
      <circle cx={cx + 11.5} cy={cy - 11} r="1.8" fill={on ? "#4ADE80" : "#8A97AB"} />
    </g>
  );
}

function Pill({ x, y, children, dim = false }: { x: number; y: number; children: ReactNode; dim?: boolean }) {
  const text = String(children);
  const w = text.length * 6.3 + 16;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x - w / 2} y={y - 13} width={w} height="19" rx="9.5" fill={dim ? "#E3E9F2" : "#fff"} stroke="#D3DBE6" />
      <text x={x} y={y + 1} textAnchor="middle" className="zh__lbl" fill={dim ? "#5D6B80" : "#050A30"}>{text}</text>
    </g>
  );
}

/* ------------------------------------------------------------ the house */

export function ZoneHouse() {
  const uid = useId().replace(/:/g, "");
  const [on, setOn] = useState<Record<ZoneId, boolean>>({ A: true, B: true, C: false, D: false });
  const [mode, setMode] = useState<Mode>("cool");
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setMotion(false);
  }, []);

  const air = mode === "cool" ? "#1BA7E0" : "#F2663A";
  const area = ZONES.reduce((s, z) => s + (on[z.id] ? AREA[z.id] : 0), 0);
  const pct = Math.round((area / TOTAL) * 100);
  const count = ZONES.filter((z) => on[z.id]).length;
  const toggle = (id: ZoneId) => setOn((o) => ({ ...o, [id]: !o[id] }));
  const preset = PRESETS.find((p) => ZONES.every((z) => on[z.id] === p.on.includes(z.id)));

  const unit: Box = thing("unit", 6.1, 4.3, 1.8, 1.4, 0.6, "#EEF1F5", CEIL - 0.3);
  const fanDur = count ? (1.4 / Math.max(0.3, area / TOTAL)).toFixed(2) : "0";
  // The outdoor unit's fan, a circle drawn on the face that looks our way.
  const fan = (r: number) => pts(Array.from({ length: 20 }, (_, i) => [15.25, 6.8 + r * Math.cos((i / 20) * Math.PI * 2), 0.65 + r * Math.sin((i / 20) * Math.PI * 2)] as P3));
  const [fx, fy] = iso([15.25, 6.8, 0.65]);

  return (
    <div className="zh">
      <div className="zh__fig">
        <svg viewBox="0 0 620 440" className="zh__svg" role="img" aria-label={`A ducted home from above with ${count} of 4 zones on: ${ZONES.filter((z) => on[z.id]).map((z) => z.name).join(", ") || "none"}.`}>
          <defs>
            <linearGradient id="zh-plume-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3DBBEE" stopOpacity=".4" /><stop offset="1" stopColor="#3DBBEE" stopOpacity="0" /></linearGradient>
            <linearGradient id="zh-plume-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF8A50" stopOpacity=".42" /><stop offset="1" stopColor="#FF8A50" stopOpacity="0" /></linearGradient>
            <pattern id={`zh-boards-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="skewX(-30) scale(1 .58)"><rect width="10" height="10" fill="#D8B486" /><path d="M0 5 H10" stroke="#BF9663" strokeWidth="1" /></pattern>
          </defs>
          <rect width="620" height="440" fill="#EAF4FB" />
          {/* the block: lawn, path, and the slab the house sits on */}
          <polygon points={pts([[-1.5, -1.5, 0], [17.5, -1.5, 0], [17.5, 12, 0], [-1.5, 12, 0]])} fill="#8FC07B" />
          <polygon points={pts([[4, 10, 0], [6, 10, 0], [6, 12, 0], [4, 12, 0]])} fill="#D9D4CB" />
          <polygon points={pts([[14.2, 5.8, 0], [16.4, 5.8, 0], [16.4, 7.9, 0], [14.2, 7.9, 0]])} fill="#D2CEC6" />
          <Cuboid b={{ key: "slab", x: 0, y: 0, z: -0.2, w: 14, d: 10, h: 0.2, top: "#CFC9BE", side: "#B9B2A6", front: "#C4BDB1" }} />
          {/* each zone's floor: click a room to turn it on or off */}
          {ZONES.map((z) => {
            const [x, y, w, d] = z.rect;
            return (
              <g key={z.id} className="zh__room" onClick={() => toggle(z.id)}>
                <polygon points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill={z.id === "A" || z.id === "C" || z.id === "D" ? `url(#zh-boards-${uid})` : "#E9E4DC"} />
                <polygon points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill={on[z.id] ? air : "#050A30"} opacity={on[z.id] ? 0.1 : 0.2} style={{ transition: "opacity .4s, fill .4s" }} />
              </g>
            );
          })}
          <polygon points={pts([[1.6, 6.4, 0], [4.6, 6.4, 0], [4.6, 8.1, 0], [1.6, 8.1, 0]])} fill="#D9B79A" opacity=".8" style={{ pointerEvents: "none" }} />
          <g style={{ pointerEvents: "none" }}>{SOLIDS.map((b) => <Cuboid key={b.key} b={b} />)}</g>

          {/* the ceiling line, see-through, so the ducts above it show */}
          <polygon points={pts([[0, 0, CEIL], [14, 0, CEIL], [14, 10, CEIL], [0, 10, CEIL]])} fill="#fff" fillOpacity=".08" stroke="#8E9AAB" strokeDasharray="5 5" strokeWidth="1" style={{ pointerEvents: "none" }} />

          <g style={{ pointerEvents: "none" }}>
            {RUNS.map((r) => (
              <g key={r.zone}>
                <Duct d={line(r.path.map(([x, y]) => [x, y, CEIL] as P3))} on={on[r.zone]} c={air} motion={motion} />
                {r.zone === "D" && D_BRANCHES.map((b, i) => <Duct key={i} d={line(b.map(([x, y]) => [x, y, CEIL] as P3))} on={on.D} c={air} motion={motion} />)}
              </g>
            ))}
            {/* return air: up through a grille in the hall ceiling */}
            <polygon points={pts([[6.5, 5.3, CEIL - 0.2], [7.5, 5.3, CEIL - 0.2], [7.5, 6.1, CEIL - 0.2], [6.5, 6.1, CEIL - 0.2]])} fill="#fff" stroke="#5E6A82" />
            {count > 0 && motion && <Flow d={line([[7, 6.6, 0.6], [7, 5.7, CEIL - 0.3]])} c="#8A97AB" n={3} dur={2.2} r={2} on />}
            <Cuboid b={unit} />
            <polygon points={pts([[7.9, 4.5, CEIL - 0.25], [7.9, 5.5, CEIL - 0.25], [7.9, 5.5, CEIL + 0.2], [7.9, 4.5, CEIL + 0.2]])} fill="#C9D1DC" />
            {RUNS.map((r) => <Damper key={r.zone} x={r.damper[0]} y={r.damper[1]} on={on[r.zone]} along={r.path[0][1] === r.path[1][1] ? "x" : "y"} />)}
            {RUNS.flatMap((r) => r.vents.map(([x, y]) => <Vent key={`${x}-${y}`} x={x} y={y} on={on[r.zone]} c={air} motion={motion} />))}

            {/* refrigerant pipes from the unit out to the outdoor unit */}
            <path d={line([[7.9, 4.8, CEIL], [14.8, 4.8, CEIL], [14.8, 6.2, CEIL], [14.8, 6.2, 1.1]])} stroke="#C98B57" strokeWidth="3" fill="none" />
            <path d={line([[7.9, 5.1, CEIL], [14.6, 5.1, CEIL], [14.6, 6.2, CEIL], [14.6, 6.2, 1.1]])} stroke="#E8EDF3" strokeWidth="4" fill="none" />
            <Cuboid b={{ key: "odu", x: 14.5, y: 6, w: 0.75, d: 1.6, h: 1.3, top: "#F4F6F9", side: "#E4E8EE", front: "#D5DBE3" }} />
            <polygon points={fan(0.55)} fill="#30384E" />
            <g className={count ? "zh__fan" : undefined} style={{ transformOrigin: `${fx}px ${fy}px`, animationDuration: `${fanDur}s` }}>
              {[0, 120, 240].map((a) => <ellipse key={a} cx={fx} cy={fy - 6} rx="3" ry="6.5" fill="#9AA6B8" transform={`rotate(${a} ${fx} ${fy})`} />)}
            </g>
            <polygon points={fan(0.55)} fill="none" stroke="#E8EDF3" strokeOpacity=".7" />
          </g>

          {ZONES.map((z) => {
            const [x, y, w, d] = z.rect;
            const [lx, ly] = iso([x + w / 2, y + d - 0.6, 0]);
            return <Pill key={z.id} x={lx} y={ly + 4} dim={!on[z.id]}>{`${z.short} · ${on[z.id] ? "On" : "Off"}`}</Pill>;
          })}
          <Pill x={iso([5.2, 2.6, CEIL + 1.5])[0]} y={iso([5.2, 2.6, CEIL + 1.5])[1]}>Unit in the roof</Pill>
          <path d={line([[6.3, 4, CEIL + 1.3], [6.8, 4.6, CEIL + 0.45]])} stroke="#050A30" strokeWidth="1.2" />
          <Pill x={iso([15.6, 7.6, 0])[0] + 8} y={iso([15.6, 7.6, 0])[1] + 26}>Outdoor unit</Pill>
        </svg>
      </div>

      <div className="zh__panel">
        <div className="zh__mode" role="group" aria-label="Cooling or heating">
          {(["cool", "heat"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} className={mode === m ? "on" : undefined} onClick={() => setMode(m)}>
              {m === "cool" ? "❄ Cooling" : "☀ Heating"}
            </button>
          ))}
        </div>

        <fieldset className="zh__zones">
          <legend>Zones: tap to turn on or off</legend>
          {ZONES.map((z) => (
            <button key={z.id} type="button" aria-pressed={on[z.id]} className={`zh__zone${on[z.id] ? " on" : ""}`} onClick={() => toggle(z.id)}>
              <span className="zh__sw" aria-hidden="true"><i /></span>
              <span><strong>{z.name}</strong><small>{on[z.id] ? `On · ${mode === "cool" ? "22°" : "21°"}` : "Off · damper shut"}</small></span>
            </button>
          ))}
        </fieldset>

        <div className="zh__presets" role="group" aria-label="Try a setting">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" aria-pressed={preset === p} className={preset === p ? "on" : undefined}
              onClick={() => setOn({ A: p.on.includes("A"), B: p.on.includes("B"), C: p.on.includes("C"), D: p.on.includes("D") })}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="zh__read" aria-live="polite">
          <div className="zh__bar"><span style={{ width: `${pct}%`, background: air }} /></div>
          <p>
            {count === 0
              ? <><strong>All zones off.</strong> The system is idle.</>
              : <><strong>{count} of 4 zones on, about {pct}% of the house.</strong> The outdoor unit only works as hard as the rooms you&apos;re using{pct < 100 ? ", so it runs slower and uses less power than heating or cooling the whole home." : "."}</>}
          </p>
          <p className="zh__note">How it works: each duct has a damper. Turn a zone off and its damper shuts, so the air goes only to the rooms that are on. An illustration, not a measurement of your home.</p>
        </div>
      </div>
    </div>
  );
}
