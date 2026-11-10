"use client";

import { useId, useState } from "react";
import "./how.css";

/**
 * Zoning, shown as simply as it can be: a floor plan and a switch for each
 * room. Tap a room or its button and it turns on or off. That is the whole
 * idea of zoning, and it's all this shows.
 *
 * It was a full simulator before (duct sizes, dampers, set points, a wall
 * controller with modes; that version is in git history). Jake asked for it
 * back to basics in Nov 2026: buttons that show you control each room.
 */

type Zone = { id: string; name: string; x: number; y: number; w: number; h: number; kind: "living" | "bed" };

/** A simple single-storey plan: living areas along the top, bedrooms along the bottom. */
const ZONES: Zone[] = [
  { id: "living", name: "Living", x: 10, y: 10, w: 230, h: 185, kind: "living" },
  { id: "kitchen", name: "Kitchen & dining", x: 240, y: 10, w: 200, h: 185, kind: "living" },
  { id: "study", name: "Study", x: 440, y: 10, w: 150, h: 185, kind: "living" },
  { id: "master", name: "Main bedroom", x: 10, y: 195, w: 230, h: 175, kind: "bed" },
  { id: "bed2", name: "Bedroom 2", x: 240, y: 195, w: 175, h: 175, kind: "bed" },
  { id: "bed3", name: "Bedroom 3", x: 415, y: 195, w: 175, h: 175, kind: "bed" },
];

const PRESETS: { label: string; on: (z: Zone) => boolean }[] = [
  { label: "All on", on: () => true },
  { label: "Living areas", on: (z) => z.kind === "living" },
  { label: "Bedrooms", on: (z) => z.kind === "bed" },
  { label: "All off", on: () => false },
];

export function ZoneHouse() {
  const hatch = `${useId().replace(/:/g, "")}-off`;
  // Starts as an evening would: the living areas on, the bedrooms off.
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(ZONES.map((z) => [z.id, z.kind === "living"])));
  const toggle = (id: string) => setOn((s) => ({ ...s, [id]: !s[id] }));
  const count = ZONES.filter((z) => on[z.id]).length;

  return (
    <div className="zs">
      <div className="zs__fig">
        {/* The plan is a picture of the buttons beside it, which are the real controls, so it's hidden from screen readers. */}
        <svg className="zs__svg" viewBox="0 0 600 380" aria-hidden="true">
          <defs>
            <pattern id={hatch} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="10" height="10" fill="#EEF0F3" /><path d="M0 0 V10" stroke="#DDE1E7" strokeWidth="4" />
            </pattern>
          </defs>
          {ZONES.map((z) => {
            const live = on[z.id];
            const cx = z.x + z.w / 2, cy = z.y + z.h / 2 + 8;
            return (
              <g key={z.id} className="zs__room" onClick={() => toggle(z.id)}>
                <rect className="zs__fill" x={z.x} y={z.y} width={z.w} height={z.h} fill={live ? "#FFF1E6" : `url(#${hatch})`} />
                {/* The ceiling vent: air rippling out of it when the room is on. */}
                {live && <>
                  <circle className="zs__ring" cx={cx} cy={cy} r="13" fill="none" stroke="#C2521A" strokeWidth="2" />
                  <circle className="zs__ring zs__ring--2" cx={cx} cy={cy} r="13" fill="none" stroke="#C2521A" strokeWidth="2" />
                </>}
                <circle cx={cx} cy={cy} r="13" fill="#fff" stroke={live ? "#C2521A" : "#B4BBC6"} strokeWidth="2.5" />
                <circle cx={cx} cy={cy} r="6" fill="none" stroke={live ? "#C2521A" : "#B4BBC6"} strokeWidth="2" />
                <text className="zs__name" x={z.x + 16} y={z.y + 32} opacity={live ? 1 : 0.55}>{z.name}</text>
                <g transform={`translate(${z.x + 16} ${z.y + 44})`}>
                  <rect width={live ? 40 : 42} height="22" rx="11" fill={live ? "#C2521A" : "#fff"} stroke={live ? "#C2521A" : "#B4BBC6"} strokeWidth="1.5" />
                  <text className="zs__state" x={live ? 20 : 21} y="15.5" textAnchor="middle" fill={live ? "#fff" : "#5D5D64"}>{live ? "On" : "Off"}</text>
                </g>
              </g>
            );
          })}
          {/* Walls over the top, so the rooms read as one house. */}
          <g fill="none" stroke="#050A30" strokeLinecap="square">
            <rect x="10" y="10" width="580" height="360" strokeWidth="7" />
            <path d="M10 195 H590 M240 10 V370 M440 10 V195 M415 195 V370" strokeWidth="4" />
          </g>
        </svg>
      </div>

      <div className="zs__panel">
        <div className="zs__head">
          <strong>Your zones</strong>
          <span aria-live="polite">{count} of {ZONES.length} rooms on</span>
        </div>
        <div className="zs__list">
          {ZONES.map((z) => (
            <button key={z.id} type="button" className={`zs__btn${on[z.id] ? " on" : ""}`} aria-pressed={on[z.id]} onClick={() => toggle(z.id)}>
              {z.name}<em aria-hidden="true">{on[z.id] ? "On" : "Off"}</em>
            </button>
          ))}
        </div>
        <div className="zs__presets" role="group" aria-label="Quick settings">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => setOn(Object.fromEntries(ZONES.map((z) => [z.id, p.on(z)])))}>{p.label}</button>
          ))}
        </div>
        <p className="zs__note">Each room is its own zone. Turn on the ones you&apos;re using and leave the rest off, from the wall controller, or your phone with a Wi-Fi controller.</p>
      </div>
    </div>
  );
}
