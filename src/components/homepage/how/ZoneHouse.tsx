"use client";

import { useEffect, useState, type ReactNode } from "react";
import "./how.css";

/**
 * Ducted zoning, hands-on: a real floor plan with the ductwork laid over it
 * the way our duct designs are drawn (fan coil in the hall, flex runs out to
 * a ceiling vent in each room, a damper on each zone, return air beside the
 * fan coil), driven by a wall controller laid out like the Mitsubishi
 * Electric touch controller we fit. Turn zones on and off on the controller
 * or by tapping a room, and the dampers, the air and the outdoor unit follow.
 *
 * Plain SVG and CSS: one plan that never moves doesn't need a 3D library.
 */

type ZoneId = 1 | 2 | 3 | 4 | 5;
type Mode = "Heat" | "Cool" | "Auto" | "Dry" | "Fan";

const ZONES: { id: ZoneId; name: string; color: string; tint: string; area: number }[] = [
  { id: 1, name: "Living", color: "#E3A92E", tint: "#FBEFD6", area: 21.3 },
  { id: 2, name: "Kitchen & dining", color: "#5DAE45", tint: "#E3F2DC", area: 31.6 },
  { id: 3, name: "Master", color: "#D9503C", tint: "#F8E1DC", area: 18.1 },
  { id: 4, name: "Kids' rooms", color: "#4F74CF", tint: "#DEE6F7", area: 33.1 },
  { id: 5, name: "Study", color: "#E07B24", tint: "#FCE6D2", area: 6.9 },
];
const TOTAL = ZONES.reduce((s, z) => s + z.area, 0);
const zoneOf = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

const PRESETS: { label: string; on: ZoneId[] }[] = [
  { label: "Daytime", on: [1, 2] },
  { label: "Night", on: [3, 4] },
  { label: "Working from home", on: [2, 5] },
  { label: "Everyone home", on: [1, 2, 3, 4, 5] },
];

/* ------------------------------------------------------------ the plan */

type Room = { name: string; dims?: string; x: number; y: number; w: number; h: number; zone?: ZoneId; lx?: number; ly?: number };
const ROOMS: Room[] = [
  { name: "Living", dims: "5.0 × 4.3", x: 160, y: 40, w: 200, h: 170, zone: 1 },
  { name: "Bed 4", dims: "3.3 × 3.8", x: 360, y: 40, w: 130, h: 150, zone: 4 },
  { name: "Bed 3", dims: "2.8 × 3.8", x: 490, y: 40, w: 110, h: 150, zone: 4 },
  { name: "Kitchen / Dining", dims: "5.5 × 5.8", x: 160, y: 210, w: 220, h: 230, zone: 2, ly: 228 },
  { name: "Hall", x: 380, y: 190, w: 50, h: 350, lx: 405, ly: 214 },
  { name: "Bath", x: 430, y: 190, w: 170, h: 80 },
  { name: "Bed 2", dims: "4.3 × 2.5", x: 430, y: 270, w: 170, h: 100, zone: 4 },
  { name: "Master", dims: "4.3 × 4.3", x: 430, y: 370, w: 170, h: 170, zone: 3 },
  { name: "Study", dims: "2.8 × 2.5", x: 160, y: 440, w: 110, h: 100, zone: 5 },
  { name: "Entry", x: 270, y: 440, w: 110, h: 100 },
];

type Run = { zone: ZoneId; d: string; damper: [number, number, number]; vents: [number, number][] };
// Each run leaves the fan coil in a straight stub (where its damper sits), then bends away in flex.
const RUNS: Run[] = [
  { zone: 1, d: "M385 312 L360 300 C322 282 272 200 252 126", damper: [360, 300, 25], vents: [[250, 118]] },
  { zone: 2, d: "M385 332 L352 336 Q328 338 306 340 M306 340 C272 332 244 312 226 298 M306 340 C276 360 252 380 236 392", damper: [352, 336, 5], vents: [[222, 292], [232, 396]] },
  { zone: 5, d: "M396 352 L390 382 C372 440 282 480 226 490", damper: [390, 382, 80], vents: [[218, 492]] },
  { zone: 3, d: "M414 352 L424 382 C440 430 470 455 496 466", damper: [424, 382, 70], vents: [[504, 470]] },
  { zone: 4, d: "M425 306 L444 290 C454 272 458 252 458 234 M458 234 C440 192 430 152 425 120 M458 234 C490 200 530 152 545 120 M458 234 C480 262 505 300 518 316", damper: [444, 290, -40], vents: [[425, 112], [545, 112], [520, 322]] },
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
  const f = { fill: "#fff", stroke: "#A7AFBA", strokeWidth: 1 };
  return (
    <g style={{ pointerEvents: "none" }}>
      {/* living */}
      <path d="M180 150 h90 v40 h-20 v-20 h-70z" {...f} /><rect x="300" y="60" width="44" height="14" rx="2" {...f} />
      <rect x="200" y="96" width="70" height="40" rx="4" fill="#F3E6CF" stroke="#D9C6A5" />
      {/* beds */}
      {[[380, 70, 80, 96], [512, 70, 66, 92], [470, 290, 92, 62], [470, 440, 96, 86]].map(([x, y, w, h], i) => (
        <g key={i}><rect x={x} y={y} width={w} height={h} rx="3" {...f} /><rect x={x + 6} y={y + 5} width={w / 2 - 9} height="14" rx="3" {...f} /><rect x={x + w / 2 + 3} y={y + 5} width={w / 2 - 9} height="14" rx="3" {...f} /></g>
      ))}
      <path d="M462 190 v-60 M600 130 h-24" stroke="#A7AFBA" strokeDasharray="4 3" />
      {/* kitchen: bench, sink, cooktop, island, table */}
      <rect x="166" y="402" width="120" height="32" {...f} /><rect x="182" y="408" width="26" height="18" rx="4" {...f} />
      {[[236, 412], [252, 412], [236, 426], [252, 426]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" {...f} />)}
      <rect x="300" y="380" width="60" height="26" rx="2" {...f} />
      <rect x="196" y="320" width="64" height="40" rx="4" {...f} />
      {[[204, 314], [232, 314], [204, 360], [232, 360]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="18" height="7" rx="2" {...f} />)}
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

function Flow({ d, c, dur, n = 4 }: { d: string; c: string; dur: number; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const begin = `${(-(i * dur) / n).toFixed(2)}s`;
        return (
          <circle key={i} r="2.6" fill={c} stroke="#fff" strokeWidth="1">
            <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={d} />
          </circle>
        );
      })}
    </g>
  );
}

function Plan({ on, power, mode, speed, motion, toggle }: { on: Record<ZoneId, boolean>; power: boolean; mode: Mode; speed: number; motion: boolean; toggle: (z: ZoneId) => void }) {
  const air = mode === "Heat" ? "#F2663A" : mode === "Fan" ? "#8A97AB" : "#1BA7E0";
  const live = (z: ZoneId) => power && on[z];
  const dur = [3.4, 2.7, 2.1, 1.6][speed - 1];
  const share = ZONES.reduce((s, z) => s + (live(z.id) ? z.area : 0), 0) / TOTAL;
  const outdoor = power && share > 0 && mode !== "Fan";
  return (
    <svg viewBox="0 0 680 580" className="zh__svg" role="img" aria-label={`Floor plan with ${ZONES.filter((z) => live(z.id)).map((z) => z.name).join(", ") || "no zones"} on.`}>
      <defs>
        <pattern id="zh-pave" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#F3F4F6" /><path d="M0 .5H22M.5 0V22" stroke="#DADDE2" /></pattern>
        <pattern id="zh-conc" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#E6E7EA" /><circle cx="2" cy="3" r=".8" fill="#CDD0D5" /><circle cx="6" cy="6" r=".6" fill="#D6D8DC" /></pattern>
      </defs>
      <rect width="680" height="580" fill="#fff" />
      {/* outside: paved alfresco and the garage */}
      <rect x="30" y="40" width="130" height="210" fill="url(#zh-pave)" />
      <text x="95" y="150" textAnchor="middle" className="zh__room-n" fill="#A7AFBA">Alfresco</text>
      <rect x="30" y="250" width="130" height="290" fill="url(#zh-conc)" />
      {[[48, 300], [100, 300]].map(([x, y]) => (
        <g key={x} fill="none" stroke="#A7AFBA" strokeWidth="1.2"><rect x={x} y={y} width="44" height="92" rx="14" fill="#F7F8FA" /><path d={`M${x + 6} ${y + 26} h32 M${x + 6} ${y + 62} h32`} /></g>
      ))}
      <text x="95" y="430" textAnchor="middle" className="zh__room-n" fill="#A7AFBA">Garage</text>

      {/* rooms: tinted by zone when it's on; tap one to switch it */}
      {ROOMS.map((r) => {
        const z = r.zone ? zoneOf(r.zone) : null;
        return (
          <rect key={r.name} x={r.x} y={r.y} width={r.w} height={r.h}
            fill={z ? (live(z.id) ? z.tint : "#EEF0F3") : "#F7F8FA"}
            className={z ? "zh__room" : undefined} style={{ transition: "fill .4s" }}
            onClick={z ? () => toggle(z.id) : undefined} />
        );
      })}
      <Fittings />

      {/* walls: outside thick, inside thin */}
      <g fill="none" stroke={W} strokeLinejoin="miter">
        <path d="M160 40 H600 V540 H160 Z M30 250 H160 M30 250 V540 H160" strokeWidth="6" />
        <path d="M360 40 V190 M490 40 V190 M360 190 H600 M160 210 H360 M380 190 V540 M430 190 V540 M430 270 H600 M430 370 H600 M160 440 H380 M270 440 V540" strokeWidth="3" />
      </g>
      {/* doorways cut through and swings */}
      <g stroke="#fff" strokeWidth="5">
        <path d="M392 190 h26 M380 230 v26 M430 300 v26 M430 400 v26 M380 470 v26 M300 440 h26 M200 440 h26 M400 190 h1" />
        <path d="M372 190 v-1" />
      </g>
      <Door x={392} y={190} r={24} rot={180} /><Door x={430} y={300} r={24} rot={90} /><Door x={430} y={400} r={24} rot={90} />
      <Door x={200} y={440} r={24} rot={0} /><Door x={300} y={540} r={28} rot={-90} />
      {/* windows */}
      <Win x={200} y={40} w={80} /><Win x={390} y={40} w={70} /><Win x={515} y={40} w={60} /><Win x={600} y={290} w={60} v /><Win x={600} y={450} w={70} v /><Win x={600} y={205} w={40} v /><Win x={180} y={540} w={60} /><Win x={160} y={90} w={70} v />

      {/* return air in the hall, and the fan coil above it */}
      <rect x="386" y="392" width="38" height="30" fill="#fff" stroke="#5E6A82" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M390 ${397 + i * 5} h30`} stroke="#5E6A82" strokeWidth="1" />)}
      <path d="M405 392 V356" stroke="#7B5CC9" strokeWidth="13" strokeLinecap="round" opacity=".85" />
      {RUNS.map((r) => {
        const z = zoneOf(r.zone);
        const lit = live(r.zone);
        return (
          <g key={r.zone} style={{ pointerEvents: "none" }}>
            <path d={r.d} stroke={lit ? z.color : "#C3CAD3"} strokeWidth="11" fill="none" strokeLinecap="round" style={{ transition: "stroke .4s" }} />
            <path d={r.d} stroke="#000" strokeOpacity=".14" strokeWidth="11" fill="none" strokeDasharray="1.5 4" />
            {lit && motion && <Flow d={r.d.split(" M")[0]} c={air} dur={dur} />}
            {lit && motion && r.d.split(" M").slice(1).map((seg, i) => <Flow key={i} d={`M${seg}`} c={air} dur={dur * 0.8} n={3} />)}
            {/* the damper: a blade across the duct, shut when the zone is off */}
            <g transform={`translate(${r.damper[0]} ${r.damper[1]}) rotate(${r.damper[2]})`}>
              <rect x="-3" y="-9" width="6" height="18" rx="1.5" fill={lit ? "#1F2536" : "#C2521A"} transform={lit ? "rotate(90)" : undefined} style={{ transition: "transform .4s" }} />
            </g>
            {r.vents.map(([x, y]) => (
              <g key={`${x}${y}`}>
                {lit && <circle cx={x} cy={y} r="22" fill={air} opacity=".18" className="zh__glow" />}
                <rect x={x - 9} y={y - 9} width="18" height="18" rx="2" fill="#fff" stroke={lit ? "#3E444D" : "#B8C0CA"} strokeWidth="1.4" />
                <path d={`M${x - 5} ${y - 4} h10 M${x - 5} ${y} h10 M${x - 5} ${y + 4} h10`} stroke={lit ? "#3E444D" : "#B8C0CA"} strokeWidth="1" />
              </g>
            ))}
          </g>
        );
      })}
      <rect x="385" y="296" width="40" height="58" rx="3" fill="#111" />
      <text x="405" y="325" textAnchor="middle" transform="rotate(90 405 325)" className="zh__fc">FAN COIL</text>

      {/* refrigerant out to the outdoor unit */}
      <path d="M425 320 H612" stroke="#C98B57" strokeWidth="2" strokeDasharray="5 4" fill="none" />
      <rect x="612" y="298" width="52" height="44" rx="5" fill="#fff" stroke="#5E6A82" strokeWidth="1.5" />
      <circle cx="638" cy="320" r="15" fill="#2B3247" />
      <g className={outdoor ? "zh__fan" : undefined} style={{ transformOrigin: "638px 320px", animationDuration: `${(1.2 / Math.max(0.3, share)).toFixed(2)}s` }}>
        {[0, 120, 240].map((a) => <ellipse key={a} cx="638" cy="312" rx="3.5" ry="7" fill="#AEB8C6" transform={`rotate(${a} 638 320)`} />)}
      </g>
      <text x="638" y="358" textAnchor="middle" className="zh__room-n" fill="#3E444D">Outdoor</text>

      {/* room names, sizes and zone tags, last so nothing covers them */}
      {ROOMS.map((r) => {
        const z = r.zone ? zoneOf(r.zone) : null;
        const x = r.lx ?? r.x + 8, y = r.ly ?? r.y + 18;
        return (
          <g key={r.name} style={{ pointerEvents: "none" }}>
            <text x={x} y={y} textAnchor={r.lx ? "middle" : "start"} className="zh__room-n" fill="#1F2536">{r.name}</text>
            {r.dims && <text x={x} y={y + 14} className="zh__room-d" fill="#8A93A0">{r.dims}</text>}
            {z && (
              <g transform={`translate(${x + 62} ${y + 21})`}>
                <rect x="-62" y="0" width="62" height="18" rx="9" fill={live(z.id) ? z.color : "#fff"} stroke={live(z.id) ? z.color : "#B8C0CA"} />
                <text x="-31" y="12.5" textAnchor="middle" className="zh__tag" fill={live(z.id) ? "#fff" : "#6B7480"}>{`Zone ${z.id} · ${live(z.id) ? "On" : "Off"}`}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------ the controller */

const Ico = ({ d, children }: { d?: string; children?: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d && <path d={d} />}{children}</svg>
);

function Controller({ power, setPower, on, toggle, setZones, mode, setMode, temp, setTemp, speed, setSpeed }: {
  power: boolean; setPower: (p: boolean) => void; on: Record<ZoneId, boolean>; toggle: (z: ZoneId) => void; setZones: (ids: ZoneId[]) => void;
  mode: Mode; setMode: (m: Mode) => void; temp: number; setTemp: (t: number) => void; speed: number; setSpeed: (s: number) => void;
}) {
  const [screen, setScreen] = useState<"home" | "zones" | "schedule">("home");
  const tone = mode === "Heat" ? "#FF8A50" : mode === "Fan" ? "#C9D1DC" : "#5BC8F5";
  const count = ZONES.filter((z) => on[z.id]).length;
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
              <button type="button" aria-label="Lower the set temperature" disabled={!power} onClick={() => setTemp(Math.max(16, temp - 0.5))}>−</button>
              <div aria-live="polite" style={{ color: power ? tone : "#4A5266" }}>
                <b>{Math.floor(temp)}</b><span><i>°C</i><i>.{temp % 1 ? 5 : 0}</i></span>
              </div>
              <button type="button" aria-label="Raise the set temperature" disabled={!power} onClick={() => setTemp(Math.min(30, temp + 0.5))}>+</button>
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
                <small>Zones on</small><strong>{power ? `${count} of 5` : "—"}</strong>
              </div>
            </div>
          </>
        )}
        {screen === "zones" && (
          <div className="mec__list">
            <div className="mec__head"><button type="button" onClick={() => setScreen("home")} aria-label="Back">‹</button><strong>Zones</strong></div>
            {ZONES.map((z) => (
              <button key={z.id} type="button" aria-pressed={on[z.id]} className={`mec__zone${on[z.id] ? " on" : ""}`} onClick={() => toggle(z.id)}>
                <i style={{ background: z.color }} aria-hidden="true" />
                <span>{z.name}</span>
                <em>{on[z.id] ? "On" : "Off"}</em>
              </button>
            ))}
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

export function ZoneHouse() {
  const [on, setOn] = useState<Record<ZoneId, boolean>>({ 1: true, 2: true, 3: false, 4: false, 5: false });
  const [power, setPower] = useState(true);
  const [mode, setMode] = useState<Mode>("Cool");
  const [temp, setTemp] = useState(24);
  const [speed, setSpeed] = useState(3);
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setMotion(false);
  }, []);

  const toggle = (id: ZoneId) => setOn((o) => ({ ...o, [id]: !o[id] }));
  const setZones = (ids: ZoneId[]) => setOn({ 1: ids.includes(1), 2: ids.includes(2), 3: ids.includes(3), 4: ids.includes(4), 5: ids.includes(5) });
  const live = ZONES.filter((z) => power && on[z.id]);
  const pct = Math.round((live.reduce((s, z) => s + z.area, 0) / TOTAL) * 100);

  return (
    <div className="zh zh--plan">
      <div className="zh__fig">
        <Plan on={on} power={power} mode={mode} speed={speed} motion={motion} toggle={(z) => { if (power) toggle(z); }} />
      </div>
      <div className="zh__panel">
        <Controller power={power} setPower={setPower} on={on} toggle={toggle} setZones={setZones} mode={mode} setMode={setMode} temp={temp} setTemp={setTemp} speed={speed} setSpeed={setSpeed} />
        <div className="zh__read" aria-live="polite">
          <div className="zh__bar"><span style={{ width: `${pct}%`, background: mode === "Heat" ? "#F2663A" : "#1BA7E0" }} /></div>
          <p>
            {!power ? <><strong>System off.</strong> Tap on to start it.</>
              : live.length === 0 ? <><strong>No zones on.</strong> Open Zones on the controller, or tap a room.</>
                : <><strong>{live.length} of 5 zones on, about {pct}% of the home.</strong> Each zone that&apos;s off has its damper shut, so the air only goes where you are, and the outdoor unit works {pct < 100 ? "less hard and uses less power" : "at full output"}.</>}
          </p>
          <p className="zh__note">Use the controller (zones, schedule, mode, fan) or tap a room on the plan. An illustration of a typical design: your zones and duct sizes are worked out for your home at the site check.</p>
        </div>
      </div>
    </div>
  );
}
