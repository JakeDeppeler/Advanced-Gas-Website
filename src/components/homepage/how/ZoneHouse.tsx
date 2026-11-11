"use client";

import { useEffect, useState } from "react";
import "./how.css";

/**
 * Zoning, shown simply on a real floor plan: a four-bedroom single storey
 * with its hallway, entry, bathroom, garage and alfresco, and a button for
 * each zone. Turn a zone on and its rooms light up and their ceiling vents
 * blow and come to the set temperature; turn it off and they drift towards
 * the weather. Cooling or heating is a switch. The hall and entry aren't
 * zones, as in most homes; the bathroom is (Jake asked for it).
 *
 * This replaced a full simulator (duct sizes, dampers, set points, a wall
 * controller) and then a plain grid of boxes. Jake asked for "a real floor
 * plan with hallways", but only the simple idea of how zoning works (Nov
 * 2026). Both earlier versions are in git history.
 */

type ZoneId = "living" | "kitchen" | "master" | "bed2" | "bed3" | "bed4" | "study" | "bath";
type Mode = "cool" | "heat";

const ZONES: { id: ZoneId; name: string }[] = [
  { id: "living", name: "Living" },
  { id: "kitchen", name: "Kitchen & dining" },
  { id: "master", name: "Main bedroom" },
  // Each of the kids' rooms on its own (Jake, Nov 2026): the point of zoning
  // is that an empty bedroom doesn't get cooled.
  { id: "bed2", name: "Bed 2" },
  { id: "bed3", name: "Bed 3" },
  { id: "bed4", name: "Bed 4" },
  { id: "study", name: "Study" },
  { id: "bath", name: "Bathroom" },
];

const PRESETS: { label: string; on: ZoneId[] }[] = [
  { label: "All on", on: ["living", "kitchen", "master", "bed2", "bed3", "bed4", "study", "bath"] },
  { label: "Daytime", on: ["living", "kitchen", "study"] },
  { label: "Night", on: ["master", "bed2", "bed3", "bed4"] },
  { label: "All off", on: [] },
];

type Room = { name: string; x: number; y: number; w: number; h: number; zone?: ZoneId; vents?: [number, number][]; lx?: number; ly?: number };

/** The plan, in the same coordinates as the walls below. */
const ROOMS: Room[] = [
  { name: "Living", x: 160, y: 40, w: 200, h: 170, zone: "living", vents: [[190, 124], [270, 66]] },
  { name: "Bed 4", x: 360, y: 40, w: 130, h: 150, zone: "bed4", vents: [[458, 62]] },
  { name: "Bed 3", x: 490, y: 40, w: 110, h: 150, zone: "bed3", vents: [[584, 122]] },
  { name: "Kitchen / Dining", x: 160, y: 210, w: 220, h: 230, zone: "kitchen", vents: [[200, 292], [328, 296]] },
  { name: "Hall", x: 380, y: 190, w: 50, h: 350, lx: 405, ly: 470 },
  { name: "Bath", x: 430, y: 190, w: 170, h: 80, zone: "bath", vents: [[522, 206]] },
  { name: "Bed 2", x: 430, y: 270, w: 170, h: 100, zone: "bed2", vents: [[584, 290]] },
  { name: "Main bed", x: 430, y: 370, w: 170, h: 170, zone: "master", vents: [[584, 486]] },
  { name: "Study", x: 160, y: 440, w: 110, h: 100, zone: "study", vents: [[204, 518]] },
  { name: "Entry", x: 270, y: 440, w: 110, h: 100 },
];

const WALL = "#2B3140";

/** The set point, and where a room drifts to with its zone off: a 34° day or an 8° night outside. */
const SET = 22;
const MODE = {
  cool: { label: "Cooling", outside: 34, drift: 28, ink: "#1F5FBF", tint: "#E4ECF8" },
  heat: { label: "Heating", outside: 8, drift: 15, ink: "#C2521A", tint: "#FFEBDC" },
} as const;

function Door({ x, y, r, rot = 0 }: { x: number; y: number; r: number; rot?: number }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`} fill="none" stroke="#A0A8B3" strokeWidth="1">
      <path d={`M${x} ${y} h${r}`} strokeWidth="1.6" stroke="#6B7480" />
      <path d={`M${x + r} ${y} A${r} ${r} 0 0 1 ${x} ${y + r}`} strokeDasharray="3 3" />
    </g>
  );
}

const Win = ({ x, y, w, v = false }: { x: number; y: number; w: number; v?: boolean }) =>
  v ? <rect x={x - 3} y={y} width="6" height={w} fill="#fff" stroke="#8A93A0" strokeWidth="1.2" />
    : <rect x={x} y={y - 3} width={w} height="6" fill="#fff" stroke="#8A93A0" strokeWidth="1.2" />;

/** Furniture and fittings in light outline, as a plan draws them, so the rooms read as rooms. */
function Fittings() {
  const f = { fill: "#fff", stroke: "#CBD2DB", strokeWidth: 1 };
  return (
    <g style={{ pointerEvents: "none" }}>
      <path d="M180 150 h90 v40 h-20 v-20 h-70z" {...f} /><rect x="300" y="60" width="44" height="14" rx="2" {...f} />
      {[[404, 96, 76, 78], [500, 104, 62, 74], [512, 304, 64, 58], [452, 440, 90, 88]].map(([x, y, w, h], i) => (
        <g key={i}><rect x={x} y={y} width={w} height={h} rx="3" {...f} /><rect x={x + 6} y={y + 5} width={w / 2 - 9} height="14" rx="3" {...f} /><rect x={x + w / 2 + 3} y={y + 5} width={w / 2 - 9} height="14" rx="3" {...f} /></g>
      ))}
      <rect x="166" y="402" width="120" height="32" {...f} /><rect x="182" y="408" width="26" height="18" rx="4" {...f} />
      {[[236, 412], [252, 412], [236, 426], [252, 426]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" {...f} />)}
      <rect x="300" y="380" width="60" height="26" rx="2" {...f} />
      <rect x="200" y="350" width="64" height="34" rx="4" {...f} />
      {[[208, 344], [236, 344], [208, 384], [236, 384]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="18" height="7" rx="2" {...f} />)}
      <rect x="540" y="198" width="54" height="64" rx="10" {...f} /><rect x="440" y="244" width="44" height="22" rx="3" {...f} /><ellipse cx="505" cy="250" rx="9" ry="12" {...f} />
      <path d="M520 370 v60 h80" fill="none" stroke={WALL} strokeWidth="3" />
      <rect x="534" y="380" width="26" height="16" rx="3" {...f} /><ellipse cx="582" cy="392" rx="8" ry="10" {...f} />
      <rect x="236" y="490" width="28" height="46" {...f} />
    </g>
  );
}

/** A round ceiling vent, with air rippling out of it while its zone is on. */
function Vent({ x, y, on, ink }: { x: number; y: number; on: boolean; ink: string }) {
  const c = on ? ink : "#B4BBC6";
  return (
    <g style={{ pointerEvents: "none" }}>
      {on && <>
        <circle className="zs__ring" cx={x} cy={y} r="11" fill="none" stroke={ink} strokeWidth="2" />
        <circle className="zs__ring zs__ring--2" cx={x} cy={y} r="11" fill="none" stroke={ink} strokeWidth="2" />
      </>}
      <circle cx={x} cy={y} r="11" fill="#fff" stroke={c} strokeWidth="2.2" />
      <circle cx={x} cy={y} r="5" fill="none" stroke={c} strokeWidth="1.8" />
    </g>
  );
}

export function ZoneHouse() {
  // Starts as a weekday afternoon would: the living areas on, the bedrooms off.
  const [on, setOn] = useState<Record<ZoneId, boolean>>({ living: true, kitchen: true, master: false, bed2: false, bed3: false, bed4: false, study: true, bath: false });
  const [mode, setMode] = useState<Mode>("cool");
  const m = MODE[mode];
  const [temp, setTemp] = useState<Record<ZoneId, number>>(() => Object.fromEntries(ZONES.map((z) => [z.id, on[z.id] ? SET : MODE.cool.drift])) as Record<ZoneId, number>);
  const toggle = (id: ZoneId) => setOn((s) => ({ ...s, [id]: !s[id] }));
  const count = ZONES.filter((z) => on[z.id]).length;

  // Each room walks a degree at a time towards where it's heading, so turning
  // a zone on shows the room coming to temperature rather than jumping there.
  // With reduced motion asked for, it simply shows where each room ends up.
  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(() => {
      setTemp((cur) => {
        let moved = false;
        const next = { ...cur };
        for (const z of ZONES) {
          const goal = on[z.id] ? SET : MODE[mode].drift;
          if (cur[z.id] !== goal) {
            moved = true;
            next[z.id] = still ? goal : cur[z.id] + Math.sign(goal - cur[z.id]);
          }
        }
        return moved ? next : cur;
      });
    }, 650);
    return () => clearInterval(t);
  }, [on, mode]);

  return (
    <div className="zs">
      <div className="zs__fig">
        {/* A picture of the buttons beside it, which are the real controls, so screen readers skip it. */}
        <svg className="zs__svg" viewBox="20 30 600 520" aria-hidden="true">
          <defs>
            <pattern id="zs-off" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="10" height="10" fill="#EFF1F4" /><path d="M0 0 V10" stroke="#E2E6EB" strokeWidth="4" />
            </pattern>
            <pattern id="zs-pave" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#F4F5F7" /><path d="M0 .5H22M.5 0V22" stroke="#E0E3E7" /></pattern>
          </defs>
          <rect x="20" y="30" width="600" height="520" fill="#fff" />
          {/* outside the living space: alfresco and garage */}
          <rect x="30" y="40" width="130" height="210" fill="url(#zs-pave)" />
          <text x="95" y="150" textAnchor="middle" className="zs__room zs__room--out">Alfresco</text>
          <rect x="30" y="250" width="130" height="290" fill="#ECEDF0" />
          {[[48, 300], [100, 300]].map(([x, y]) => (
            <g key={x} fill="#F7F8FA" stroke="#B4BBC6" strokeWidth="1.2"><rect x={x} y={y} width="44" height="92" rx="14" /><path d={`M${x + 6} ${y + 26} h32 M${x + 6} ${y + 62} h32`} fill="none" /></g>
          ))}
          <text x="95" y="440" textAnchor="middle" className="zs__room zs__room--out">Garage</text>

          {ROOMS.map((r) => (
            <rect key={r.name} x={r.x} y={r.y} width={r.w} height={r.h}
              fill={r.zone ? (on[r.zone] ? m.tint : "url(#zs-off)") : "#FAFAFB"}
              className={r.zone ? "zs__hit" : undefined} style={{ transition: "fill .3s" }}
              onClick={r.zone ? () => toggle(r.zone!) : undefined} />
          ))}
          <Fittings />
          <g fill="none" stroke={WALL} strokeLinejoin="miter">
            <path d="M160 40 H600 V540 H160 Z M30 250 H160 M30 250 V540 H160" strokeWidth="6" />
            <path d="M360 40 V190 M490 40 V190 M360 190 H600 M160 210 H360 M380 190 V540 M430 190 V540 M430 270 H600 M430 370 H600 M160 440 H380 M270 440 V540" strokeWidth="3" />
          </g>
          <g stroke="#fff" strokeWidth="5"><path d="M392 190 h26 M380 230 v26 M430 300 v26 M430 400 v26 M380 470 v26 M300 440 h26 M200 440 h26 M430 228 v24" /></g>
          <Door x={392} y={190} r={24} rot={180} /><Door x={430} y={300} r={24} rot={90} /><Door x={430} y={400} r={24} rot={90} />
          <Door x={200} y={440} r={24} rot={0} /><Door x={300} y={540} r={28} rot={-90} />
          <Win x={200} y={40} w={80} /><Win x={420} y={40} w={64} /><Win x={600} y={92} w={60} v /><Win x={600} y={278} w={58} v /><Win x={600} y={450} w={70} v /><Win x={600} y={205} w={40} v /><Win x={180} y={540} w={60} /><Win x={160} y={90} w={70} v />

          {/* Vents by the windows, where the heat comes in or goes out (Jake, Nov
              2026), and two in the big living and kitchen/dining rooms. The
              beds, desk and a couple of windows moved to make room. */}
          {ROOMS.flatMap((r) => (r.vents ?? []).map(([x, y]) => <Vent key={`${r.name}${x}`} x={x} y={y} on={on[r.zone!]} ink={m.ink} />))}

          {ROOMS.map((r) => {
            const live = r.zone ? on[r.zone] : null;
            const x = r.lx ?? r.x + 10, y = r.ly ?? r.y + 22;
            const mid = r.lx != null;
            return (
              <g key={r.name} style={{ pointerEvents: "none" }}>
                <text x={x} y={y} textAnchor={mid ? "middle" : "start"} className={`zs__room${r.zone ? "" : " zs__room--plain"}`} opacity={live === false ? 0.6 : 1}>{r.name}</text>
                {live != null && (
                  <g transform={`translate(${mid ? x - 18 : x} ${y + 8})`}>
                    <rect width="36" height="18" rx="9" fill={live ? m.ink : "#fff"} stroke={live ? m.ink : "#B4BBC6"} strokeWidth="1.2" />
                    <text x="18" y="12.5" textAnchor="middle" className="zs__state" fill={live ? "#fff" : "#5D5D64"}>{live ? "On" : "Off"}</text>
                    <text x="42" y="13.5" className="zs__temp" fill={live ? m.ink : "#6B7480"}>{`${temp[r.zone!]}°`}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="zs__panel">
        <div className="zs__head">
          <strong>Your zones</strong>
          <span aria-live="polite">{count} of {ZONES.length} on · set to {SET}°</span>
        </div>
        <div className="zs__mode" role="group" aria-label="Cooling or heating">
          {(["cool", "heat"] as const).map((k) => (
            <button key={k} type="button" className={mode === k ? "on" : ""} aria-pressed={mode === k} onClick={() => setMode(k)}>
              {MODE[k].label}<small>{MODE[k].outside}° outside</small>
            </button>
          ))}
        </div>
        <div className="zs__list">
          {ZONES.map((z) => (
            <button key={z.id} type="button" className={`zs__btn${on[z.id] ? " on" : ""}`} style={on[z.id] ? { background: m.ink, borderColor: m.ink } : undefined} aria-pressed={on[z.id]} onClick={() => toggle(z.id)}>
              <span>{z.name}<small>{temp[z.id]}°</small></span><em aria-hidden="true" style={on[z.id] ? { color: m.ink } : undefined}>{on[z.id] ? "On" : "Off"}</em>
            </button>
          ))}
        </div>
        <div className="zs__presets" role="group" aria-label="Quick settings">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => setOn(Object.fromEntries(ZONES.map((z) => [z.id, p.on.includes(z.id)])) as Record<ZoneId, boolean>)}>{p.label}</button>
          ))}
        </div>
        <p className="zs__note">Each zone has its own button. Run the rooms you&apos;re using and leave the rest off, from the wall controller, or your phone with a Wi-Fi controller. Rooms that are off drift towards the weather outside; turn one on and it comes back to {SET}°.</p>
      </div>
    </div>
  );
}
