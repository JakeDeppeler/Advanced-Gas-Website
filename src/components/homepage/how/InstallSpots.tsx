"use client";

import { useState } from "react";

/**
 * Where a Braemar Dominator goes (Jake, Nov 2026: "show that they have the
 * multi option and can be installed anywhere ... make our own animation"):
 * the same house three times, cut away, with the indoor unit in the roof,
 * under the floor, or outside against the wall, the three places a ducted
 * gas heater sits. Air runs through the ducts, so it reads as a working
 * system rather than a catalogue diagram.
 *
 * Braemar's brochure is the source for what goes where: the internal model
 * for the ceiling or under the floor, the external model (powder coated)
 * against the house, each in the gas heater's own position.
 *
 * Heating and cooling share the ducts; the switch changes the air coming out
 * of the vents. Supply and return differ in pattern (dashes against dots) as
 * well as colour, and the legend says which is which in words.
 */
type Spot = "roof" | "floor" | "outside";
type Mode = "heat" | "cool";

const SPOTS: { id: Spot; h: string; p: string }[] = [
  { id: "roof", h: "In the roof", p: "Where most gas ducted heaters sit. The internal model goes in its place and feeds the ceiling vents." },
  { id: "floor", h: "Under the floor", p: "For a house with floor vents. The same internal model, in the space under the floor." },
  { id: "outside", h: "Outside", p: "Where the heater stood against an outside wall. The external model, powder coated for the weather." },
];

const SUPPLY = { heat: "#E8542A", cool: "#1BA7E0" } as const;
const RETURN = "#8A97AB";
const GROUND = 266;

export function InstallSpots() {
  const [mode, setMode] = useState<Mode>("heat");
  return (
    <div className="is">
      <div className="is__bar">
        <div className="is__modes" role="group" aria-label="Show the air for">
          {(["heat", "cool"] as const).map((m) => (
            <button key={m} type="button" className={`is__mode${mode === m ? " is-on" : ""}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "heat" ? "Heating" : "Cooling"}
            </button>
          ))}
        </div>
        <ul className="is__key" aria-label="What the lines show">
          <li><svg viewBox="0 0 34 8" aria-hidden="true"><path d="M2 4H32" stroke={SUPPLY[mode]} strokeWidth="4" strokeDasharray="8 5" /></svg>{mode === "heat" ? "Heated" : "Cooled"} air out to the rooms</li>
          <li><svg viewBox="0 0 34 8" aria-hidden="true"><path d="M3 4H32" stroke={RETURN} strokeWidth="4" strokeDasharray="1 6" strokeLinecap="round" /></svg>Room air back to the unit</li>
        </ul>
      </div>
      <div className="is__grid">
        {SPOTS.map((s) => (
          <figure key={s.id} className="is__card">
            <svg viewBox="0 0 360 300" role="img" aria-label={`A Dominator ${s.h.toLowerCase()}, on the house's ducts`}>
              <Scene spot={s.id} mode={mode} />
            </svg>
            <figcaption><h3>{s.h}</h3><p>{s.p}</p></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Scene({ spot, mode }: { spot: Spot; mode: Mode }) {
  const id = (n: string) => `is-${spot}-${n}`;
  const sup = SUPPLY[mode];
  // The vents: in the ceiling for the roof unit, in the floor for the other two.
  const ceiling = spot === "roof";
  const ventY = ceiling ? 104 : 214;
  const duct: Record<Spot, { s: string; r: string; ref: string }> = {
    roof: { s: "M142 76 H114 Q104 76 104 86 V102", r: "M244 102 V86 Q244 76 234 76 H206", ref: "M206 86 H279 V214 H298" },
    floor: { s: "M142 244 H114 Q104 244 104 234 V216", r: "M244 216 V234 Q244 244 234 244 H206", ref: "M206 254 H298" },
    outside: { s: "M58 228 H94 Q104 228 104 220 V216", r: "M244 216 V238 Q244 248 234 248 H58", ref: "M58 260 H298" },
  };
  const d = duct[spot];
  return (
    <>
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFE8FA" /><stop offset="1" stopColor="#F2F8FD" /></linearGradient>
      </defs>
      <rect width="360" height="300" fill={`url(#${id("sky")})`} />

      {/* the house, cut away: roof space, the room, the floor and the space under it */}
      <path d="M44 102 L174 18 L304 102 Z" fill="#3A4152" />
      <path d="M66 98 L174 30 L282 98 Z" fill="#F7F3EC" />
      <rect x="64" y="98" width="220" height="6" fill="#3A4152" />
      <rect x="64" y="104" width="10" height={GROUND - 104} fill="#3A4152" />
      <rect x="274" y="104" width="10" height={GROUND - 104} fill="#3A4152" />
      <rect x="74" y="104" width="200" height="110" fill="#F4EEE4" />
      <rect x="74" y="214" width="200" height="8" fill="#C8955C" />
      <rect x="74" y="222" width="200" height={GROUND - 222} fill="#E9E2D6" />
      {[96, 148, 200, 252].map((x) => <rect key={x} x={x} y="222" width="6" height={GROUND - 222} fill="#C9BFAE" />)}
      <rect x="0" y={GROUND} width="360" height={300 - GROUND} fill="#CFE3C2" />
      <rect x="0" y={GROUND} width="360" height="2" fill="#B7D2A6" />

      {/* the room: a pendant, a picture, a rug and a couch */}
      <path d="M174 104 V122" stroke="#8A97AB" strokeWidth="1.5" />
      <path d="M163 130 A11 9 0 0 1 185 130 Z" fill="#FFF7DF" stroke="#E4D6B0" />
      <rect x="148" y="140" width="52" height="30" rx="2" fill="#DCEBF5" stroke="#fff" strokeWidth="3" />
      <path d="M152 166 L166 152 L176 160 L186 148 L196 166 Z" fill="#9CC8A4" />
      <ellipse cx="174" cy="213" rx="58" ry="3" fill="#E7DCCB" />
      <rect x="132" y="178" width="84" height="18" rx="6" fill="#5B6BB0" />
      <rect x="128" y="190" width="92" height="20" rx="5" fill="#6E7EC4" />
      <rect x="124" y="186" width="12" height="24" rx="5" fill="#5B6BB0" />
      <rect x="212" y="186" width="12" height="24" rx="5" fill="#5B6BB0" />

      {/* vents: supply over the left, the return grille on the right */}
      <rect x="94" y={ceiling ? 103 : 213} width="20" height="4" rx="1" fill="#fff" stroke="#AEB7C4" />
      <rect x="232" y={ceiling ? 103 : 213} width="24" height="4" rx="1" fill="#fff" stroke="#AEB7C4" />

      {/* refrigerant pipes to the outdoor unit */}
      <path d={d.ref} stroke="#C98B57" strokeWidth="2.4" fill="none" />
      <path d={d.ref} stroke="#E0A979" strokeWidth="1" fill="none" transform="translate(0 4)" />

      {/* the ducts, with air running through them */}
      <path d={d.s} stroke={sup} strokeOpacity=".18" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d={d.s} className="is-flow" stroke={sup} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={d.r} stroke={RETURN} strokeOpacity=".18" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d={d.r} className="is-flow is-flow--ret" stroke={RETURN} strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* air into the room from the supply vent, and drawn back into the grille */}
      <g className={ceiling ? "is-puff is-puff--down" : "is-puff"}>
        {[-10, 0, 10].map((dx, i) => (
          <path key={dx} d={ceiling ? `M${104 + dx * 0.4} 110 q${dx * 0.6} 10 ${dx * 1.4} 22` : `M${104 + dx * 0.4} 208 q${dx * 0.6} -10 ${dx * 1.4} -22`}
            stroke={sup} strokeWidth="2.6" fill="none" strokeLinecap="round" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </g>
      <g className={ceiling ? "is-pull is-pull--up" : "is-pull"} fill={RETURN}>
        {[-8, 0, 8].map((dx, i) => <circle key={dx} cx={244 + dx} cy={ceiling ? 120 : 198} r="2.4" style={{ animationDelay: `${i * 0.3}s` }} />)}
      </g>

      {/* the Dominator */}
      {spot === "outside" ? <Unit x={8} y={204} w={50} h={60} external /> : <Unit x={142} y={spot === "roof" ? 58 : 226} w={64} h={spot === "roof" ? 36 : 34} />}

      {/* the outdoor unit */}
      <rect x="294" y={GROUND - 4} width="46" height="6" rx="2" fill="#B9BEC5" />
      <rect x="298" y="186" width="38" height={GROUND - 190} rx="4" fill="#F2F4F7" stroke="#AEB7C4" strokeWidth="1.4" />
      {[206, 240].map((cy) => (
        <g key={cy}>
          <circle cx="317" cy={cy} r="13" fill="#30384E" />
          <g className="hw-spin" style={{ transformOrigin: `317px ${cy}px` }}>
            {[0, 120, 240].map((a) => <ellipse key={a} cx="317" cy={cy - 6} rx="3" ry="6" fill="#9AA6B8" transform={`rotate(${a} 317 ${cy})`} />)}
          </g>
          <circle cx="317" cy={cy} r="2.4" fill="#C9D1DC" />
        </g>
      ))}

    </>
  );
}

/** The Dominator's indoor unit: a sheet-metal box with its fan showing. */
function Unit({ x, y, w, h, external }: { x: number; y: number; w: number; h: number; external?: boolean }) {
  const fx = x + w * 0.3, fy = y + h / 2, r = Math.min(h, w) * 0.3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={external ? "#E3E6EA" : "#EEF0F3"} stroke="#9AA6B8" strokeWidth="1.4" />
      <rect x={x + w * 0.58} y={y + 4} width="1.4" height={h - 8} fill="#C9D1DC" />
      <circle cx={fx} cy={fy} r={r + 2} fill="#30384E" />
      <g className="hw-spin" style={{ transformOrigin: `${fx}px ${fy}px` }}>
        {[0, 120, 240].map((a) => <ellipse key={a} cx={fx} cy={fy - r / 2} rx={r * 0.24} ry={r / 2} fill="#9AA6B8" transform={`rotate(${a} ${fx} ${fy})`} />)}
      </g>
      <rect x={x + w * 0.66} y={y + 6} width={w * 0.24} height="3" rx="1" fill="#C8102E" />
    </g>
  );
}
