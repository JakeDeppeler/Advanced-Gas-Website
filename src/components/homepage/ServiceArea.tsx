"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PHOTO } from "@/lib/homepage/data";

/**
 * The service-area map: a static OpenStreetMap render (public/aga-service-map.webp)
 * with the suburbs laid over it, and a checker that draws the drive from the
 * workshop to whatever suburb is typed.
 *
 * The image covers lng 145.05–146.00 and lat −37.80 to −38.32 in Web Mercator
 * at zoom 11, which is what the projection below has to match. It's a static
 * image rather than Leaflet because the section is decoration plus one
 * question; a 140 KB tile library to answer "do you come to Drouin?" is the
 * wrong trade.
 */

export type AreaSuburb = { name: string; slug: string; lat: number; lng: number; page: boolean; dot: 0 | 1 | 2 | null };

const HQ = { lat: -38.078, lng: 145.487 };
const W = 1384, H = 962;
const mY = (la: number) => { const s = Math.sin((la * Math.PI) / 180); return Math.log((1 + s) / (1 - s)); };
const xPct = (lng: number) => ((lng - 145.05) / 0.95) * 100;
const yPct = (lat: number) => ((mY(-37.8) - mY(lat)) / (mY(-37.8) - mY(-38.32))) * 100;
function km(lat: number, lng: number) {
  const r = Math.PI / 180, dLa = (lat - HQ.lat) * r, dLo = (lng - HQ.lng) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(HQ.lat * r) * Math.cos(lat * r) * Math.sin(dLo / 2) ** 2;
  return Math.max(1, Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

/** A quadratic curve from HQ to the suburb, bowed upward so it reads as a drive, not a ruler line. */
function routeTo(s: AreaSuburb) {
  const x0 = (xPct(HQ.lng) / 100) * W, y0 = (yPct(HQ.lat) / 100) * H;
  const x1 = (xPct(s.lng) / 100) * W, y1 = (yPct(s.lat) / 100) * H;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, bend = 0.22 * len;
  let cx = (x0 + x1) / 2 - (dy / len) * bend, cy = (y0 + y1) / 2 + (dx / len) * bend;
  if (cy > (y0 + y1) / 2 + 1) { cx = (x0 + x1) / 2 + (dy / len) * bend; cy = (y0 + y1) / 2 - (dx / len) * bend; }
  const f = (n: number) => n.toFixed(1);
  return { d: `M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`, x1, y1, left: x1 < x0 };
}

/**
 * One of our vans, side on and facing right, drawn in map units with its
 * wheels on the origin so it drives along the line rather than over it.
 * Kept upright the whole way: rotating to follow the curve turns it upside
 * down on any drive heading west, so it flips instead.
 */
function Van({ left }: { left: boolean }) {
  return (
    <g transform={left ? "scale(-1,1)" : undefined}>
      <ellipse cx="2" cy="1" rx="38" ry="5" fill="rgba(2,6,26,.45)" />
      <path d="M-38 -7 V-33 Q-38 -40 -31 -40 H15 Q21 -40 25 -35 L36 -22 Q42 -20 42 -14 V-7 Q42 -2 37 -2 H-33 Q-38 -2 -38 -7 Z" fill="#fff" stroke="#050A30" strokeWidth="2" />
      <path d="M17 -35 L30 -21 H17 Z" fill="#0B1450" />
      <rect x="-38" y="-20" width="55" height="6" fill="#FF7A36" />
      <rect x="-32" y="-34" width="40" height="9" rx="2" fill="#E6F5FC" />
      <circle cx="-22" cy="-2" r="7.5" fill="#050A30" /><circle cx="-22" cy="-2" r="3" fill="#C9D1E6" />
      <circle cx="26" cy="-2" r="7.5" fill="#050A30" /><circle cx="26" cy="-2" r="3" fill="#C9D1E6" />
    </g>
  );
}

export function ServiceArea({ suburbs }: { suburbs: AreaSuburb[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hit = useMemo(() => (query.length >= 3 ? suburbs.find((s) => s.name.toLowerCase().startsWith(query)) ?? null : null), [query, suburbs]);
  const route = hit && hit.slug !== "pakenham" ? routeTo(hit) : null;
  const hx = xPct(HQ.lng), hy = yPct(HQ.lat);
  // An inline SVG's clock starts with the page, so begin="0s" would mean the
  // drive was over before anyone typed. Start it when the suburb appears.
  const drive = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => { drive.current?.beginElement(); }, [hit?.slug]);
  // SMIL ignores prefers-reduced-motion, so the van is parked rather than driven.
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dots = suburbs.filter((s) => s.dot != null && s.slug !== "pakenham");

  return (
    <section id="areas" className="areas" data-no-reveal>
      <span className="glow areas__glow" aria-hidden="true" />
      <div className="wrap arv" style={{ position: "relative" }}>
        <div className="areagrid">
          <div className={`amap${hit ? " amap--hit" : ""}`} role="img" aria-label="Map of the suburbs we service around Pakenham">
            <div className="amap__in">
              {/* eslint-disable-next-line @next/next/no-img-element -- sized by the aspect-ratio box around it, which next/image's fill fights */}
              <img className="amap__img" src={PHOTO.map} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              {[36, 72, 108].map((w) => <span key={w} className="aring" style={{ left: `${hx}%`, top: `${hy}%`, width: `${w}%` }} />)}
              <span className="maptag" style={{ left: `${hx}%`, top: `calc(${hy}% - 13%)` }}>15 km</span>
              <span className="maptag" style={{ left: `${hx}%`, top: `calc(${hy}% - 26%)` }}>30 km</span>
              <span className="asweep" aria-hidden="true" style={{ left: `${hx}%`, top: `${hy}%` }} />
              {dots.map((s, i) => {
                const on = hit?.slug === s.slug;
                const x = xPct(s.lng);
                const cls = `mapdot${on ? " mapdot--hit" : s.dot ? " mapdot--lbl" : ""}${s.dot === 2 || (on && x > 78) ? " mapdot--left" : ""}`;
                return (
                  <span key={s.slug} className={cls} style={{ left: `${x.toFixed(2)}%`, top: `${yPct(s.lat).toFixed(2)}%`, animationDelay: `${(0.3 + i * 0.03).toFixed(2)}s` }}>
                    <span className="mapdot__lbl">{on ? `${s.name} · ${km(s.lat, s.lng)} km` : s.name}</span>
                  </span>
                );
              })}
              {route && (
                <svg key={hit!.slug} className="aroute" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                  <path className="aroute__glow" d={route.d} />
                  <path className="aroute__line" d={route.d} pathLength={1} />
                  <path className="aroute__dash" d={route.d} />
                  {still ? (
                    <g transform={`translate(${route.x1.toFixed(1)} ${route.y1.toFixed(1)})`}><Van left={route.left} /></g>
                  ) : (
                    <g className="aroute__van">
                      <Van left={route.left} />
                      {/* Drives once, easing in and out, and parks on the suburb. Chrome drops keySplines written without leading zeros, and the van then jumps straight to the end. */}
                      <animateMotion ref={drive} dur="1.6s" begin="indefinite" fill="freeze" path={route.d} calcMode="spline" keyTimes="0;1" keyPoints="0;1" keySplines="0.45 0 0.2 1" />
                    </g>
                  )}
                </svg>
              )}
              <span className="hq" style={{ left: `${hx}%`, top: `${hy}%` }}>
                <span>
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /></svg>
                  Pakenham HQ
                </span>
              </span>
            </div>
            <span className="amap__fade" aria-hidden="true" />
            <span className="amap__attr">© <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap</a> contributors</span>
          </div>

          <div className="areatext">
            <h2 className="h2" style={{ color: "#fff" }}>Every town within <span style={{ color: "#2CC5FF" }}>75 km of Pakenham.</span></h2>
            <p>From Dandenong to Warragul and up into the Dandenong Ranges. Type your suburb to check.</p>
            <label htmlFor="area-q">Your suburb</label>
            <div className="area__q">
              <input id="area-q" className="ainput" type="text" autoComplete="address-level2" placeholder="e.g. Clyde North" value={q} onChange={(e) => setQ(e.target.value)} />
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5D5D64" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </div>
            <div className="area__res" aria-live="polite">
              {query.length < 3 && (
                <p className="area__hint">Start typing and we&apos;ll draw the drive from our workshop. Or <Link href="/service-areas">see every area we cover →</Link></p>
              )}
              {hit && (
                <div className="area__msg area__msg--yes pop">
                  <span style={{ background: "#0C6F96" }}>✓</span>
                  <span><strong>Yes, we cover {hit.name}.</strong> About {km(hit.lat, hit.lng)} km from our Pakenham workshop.
                    {hit.page && <> <Link href={`/areas/${hit.slug}`}>See our {hit.name} page →</Link></>}
                  </span>
                </div>
              )}
              {query.length >= 3 && !hit && (
                <div className="area__msg area__msg--no pop">
                  <span style={{ background: "#C2521A" }}>?</span>
                  <span>Not on our list yet. Call <a href="tel:+61359478000" data-call-from="area-checker" style={{ color: "#050A30" }}>(03) 5947 8000</a> and we&apos;ll tell you straight.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
