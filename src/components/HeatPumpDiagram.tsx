"use client";

import { useState } from "react";
import Link from "next/link";
import "./HeatPumpDiagram.css";

/**
 * "How a heat pump makes hot water" — the interactive blue panel on the
 * hot-water brand pages (Reclaim, Thermann, iStore) and the heat-pump
 * service page. Three tabs: the animated schematic(s), the running-cost
 * chart, and a quick tank-size calculator.
 *
 * `split` is false for brands that only make an all-in-one (iStore), which
 * hides the split diagram. Inline SVG + CSS animation rather than a GIF, so
 * it stays crisp, scales, and pauses under prefers-reduced-motion.
 */

const COST = [
  { label: "3-star gas storage (LPG)", amount: 1344, tone: "c1" },
  { label: "Electric storage", amount: 1320, tone: "c1" },
  { label: "4-star gas storage", amount: 868, tone: "c2" },
  { label: "5-star gas continuous flow", amount: 792, tone: "c3" },
  { label: "Heat pump (grid power)", amount: 273, tone: "c4" },
  { label: "Solar + electric boost", amount: 240, tone: "c5" },
  { label: "Heat pump on solar PV", amount: 42, tone: "c6" },
];
const COST_MAX = 1344;

const SIZES = [
  { people: "1–2 people", litres: "160–200 L", note: "A couple or a unit — a smaller tank recovers fast enough to keep up." },
  { people: "3–4 people", litres: "250–280 L", note: "The usual family, and the size we fit most." },
  { people: "4–5 people", litres: "315 L", note: "A busy household, or back-to-back showers in the morning." },
  { people: "6+ people", litres: "400 L", note: "A big family or acreage — the most stored volume in the range." },
];

function SplitSvg() {
  return (
    <svg viewBox="0 0 440 320" role="img" aria-label="Split heat pump: an outdoor unit passes heat through pipes to a separate tank" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="hpd-tank-a" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2ea3d6" /><stop offset="48%" stopColor="#6bbf8f" /><stop offset="100%" stopColor="#f0803a" />
        </linearGradient>
      </defs>
      <path className="hpd-flow hpd-flow--hot" d="M210 112 H302" fill="none" stroke="#f36722" strokeWidth="8" strokeLinecap="round" />
      <path className="hpd-flow hpd-flow--cold" d="M302 240 H210" fill="none" stroke="#00a0df" strokeWidth="8" strokeLinecap="round" />
      <polygon points="302,104 320,112 302,120" fill="#f36722" />
      <polygon points="210,232 192,240 210,248" fill="#00a0df" />
      {/* outdoor unit */}
      <rect x="22" y="74" width="188" height="168" rx="16" fill="#eef1f6" stroke="#c7cfdc" strokeWidth="2" />
      <circle cx="82" cy="158" r="46" fill="#fff" stroke="#c3cbd9" strokeWidth="3" />
      <g className="hpd-fan" fill="#9aa4b8">
        <path d="M82 158 L82 118 A40 40 0 0 1 111 135 Z" />
        <path d="M82 158 L117 181 A40 40 0 0 1 78 198 Z" />
        <path d="M82 158 L47 181 A40 40 0 0 1 53 140 Z" />
      </g>
      <circle cx="82" cy="158" r="9" fill="#5a6377" />
      {/* evaporator coils */}
      <g stroke="#f3b53a" strokeWidth="3" fill="none" opacity="0.9"><path d="M142 106 h58" /><path d="M142 124 h58" /><path d="M142 142 h58" /></g>
      {/* compressor + condenser + heat exchanger */}
      <rect x="142" y="156" width="58" height="30" rx="8" fill="#f36722" />
      <text x="171" y="176" textAnchor="middle" className="hpd__chip">COMP</text>
      <ellipse cx="171" cy="200" rx="14" ry="9" fill="#f6923a" />
      <rect className="hpd-pulse" x="142" y="214" width="58" height="16" rx="6" fill="#ec1c22" />
      {/* tank */}
      <rect x="302" y="48" width="98" height="216" rx="14" fill="url(#hpd-tank-a)" stroke="#c3cbd9" strokeWidth="2" />
      <rect x="302" y="48" width="98" height="26" rx="14" fill="#d7dde6" />
      <path d="M351 94 v156" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <g className="hpd__lbl">
        <text x="171" y="100" textAnchor="middle">Evaporator</text>
        <text x="171" y="150" textAnchor="middle">Compressor</text>
        <text x="171" y="248" textAnchor="middle">Heat exchanger</text>
        <text x="351" y="284" textAnchor="middle">Tank</text>
        <text x="256" y="104" textAnchor="middle" className="hpd__lbl-hot">hot</text>
        <text x="256" y="262" textAnchor="middle" className="hpd__lbl-cold">cold</text>
      </g>
    </svg>
  );
}

function AllInOneSvg() {
  return (
    <svg viewBox="0 0 320 360" role="img" aria-label="All-in-one heat pump: the compressor sits on top of the tank in a single shell" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="hpd-tank-b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2ea3d6" /><stop offset="50%" stopColor="#6bbf8f" /><stop offset="100%" stopColor="#f0803a" />
        </linearGradient>
      </defs>
      <g stroke="#7c8698" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M44 44 q8 -6 16 0 q8 6 16 0" /><path d="M44 58 q8 -6 16 0 q8 6 16 0" />
        <path d="M244 44 q8 -6 16 0 q8 6 16 0" /><path d="M244 58 q8 -6 16 0 q8 6 16 0" />
      </g>
      <rect x="90" y="28" width="140" height="298" rx="16" fill="#4b5364" />
      {/* head */}
      <rect x="100" y="38" width="120" height="88" rx="9" fill="#eef1f6" />
      <circle cx="134" cy="82" r="27" fill="#fff" stroke="#c3cbd9" strokeWidth="2.5" />
      <g className="hpd-fan" fill="#9aa4b8">
        <path d="M134 82 L134 58 A24 24 0 0 1 152 68 Z" />
        <path d="M134 82 L155 93 A24 24 0 0 1 132 104 Z" />
        <path d="M134 82 L113 93 A24 24 0 0 1 116 70 Z" />
      </g>
      <circle cx="134" cy="82" r="6" fill="#5a6377" />
      <g stroke="#f3b53a" strokeWidth="2.5" fill="none" opacity="0.9"><path d="M174 56 h38" /><path d="M174 70 h38" /></g>
      <rect x="174" y="80" width="38" height="14" rx="5" fill="#f36722" />
      <rect className="hpd-pulse" x="174" y="100" width="38" height="14" rx="5" fill="#ec1c22" />
      {/* tank */}
      <rect x="104" y="132" width="112" height="184" rx="10" fill="url(#hpd-tank-b)" />
      <path className="hpd-flow hpd-flow--hot" d="M160 126 V306" fill="none" stroke="#f3b53a" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M116 146 V302" stroke="#f3b53a" strokeWidth="3" opacity="0.55" />
      <path d="M204 146 V302" stroke="#f3b53a" strokeWidth="3" opacity="0.55" />
      <path className="hpd-flow hpd-flow--hot" d="M216 156 H258" fill="none" stroke="#f36722" strokeWidth="7" strokeLinecap="round" />
      <polygon points="258,148 276,156 258,164" fill="#f36722" />
      <path className="hpd-flow hpd-flow--cold" d="M258 290 H216" fill="none" stroke="#00a0df" strokeWidth="7" strokeLinecap="round" />
      <polygon points="216,282 198,290 216,298" fill="#00a0df" />
      <path d="M108 322 l14 14 M212 322 l-14 14" stroke="#4b5364" strokeWidth="6" strokeLinecap="round" />
      <g className="hpd__lbl">
        <text x="160" y="24" textAnchor="middle">Heat pump head</text>
        <text x="278" y="150" textAnchor="middle" className="hpd__lbl-hot">hot</text>
        <text x="276" y="296" textAnchor="middle" className="hpd__lbl-cold">cold</text>
      </g>
    </svg>
  );
}

export function HeatPumpDiagram({ brandName, split = true }: { brandName?: string; split?: boolean }) {
  const [tab, setTab] = useState<"how" | "cost" | "size">("how");
  const [size, setSize] = useState(1); // index into SIZES (default 3–4 people)
  const who = brandName
    ? `${/^[aeiou]/i.test(brandName) ? "An" : "A"} ${brandName} heat pump`
    : "A heat pump";

  return (
    <section className="hpd">
      <div className="wrap">
        <div className="hpd__box">
          <div className="ds-section-head hpd__head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How it works</span>
            <h2 className="ds-h--on-dark">How a heat pump makes your hot water.</h2>
            <p>
              {who} doesn&rsquo;t burn anything or run an element &mdash; it moves heat that&rsquo;s already in
              the air into your tank, which is why it does the same job on a fraction of the power.
            </p>
          </div>

          <div className="hpd__tabs" role="tablist" aria-label="Heat pump explainer">
            <button type="button" role="tab" aria-selected={tab === "how"} className={`hpd__tab${tab === "how" ? " is-on" : ""}`} onClick={() => setTab("how")}>How it works</button>
            <button type="button" role="tab" aria-selected={tab === "cost"} className={`hpd__tab${tab === "cost" ? " is-on" : ""}`} onClick={() => setTab("cost")}>Running cost</button>
            <button type="button" role="tab" aria-selected={tab === "size"} className={`hpd__tab${tab === "size" ? " is-on" : ""}`} onClick={() => setTab("size")}>Size my tank</button>
          </div>

          {tab === "how" && (
            <div className="hpd__panel" role="tabpanel">
              <div className={`hpd__pair${split ? "" : " hpd__pair--single"}`}>
                <figure className="hpd__unit">
                  <span className="hpd__tag">All-in-one</span>
                  <div className="hpd__svg"><AllInOneSvg /></div>
                  <p className="hpd__cap">Tank and heat pump in one shell &mdash; nothing to place outside.</p>
                </figure>
                {split && (
                  <figure className="hpd__unit">
                    <span className="hpd__tag">Split system</span>
                    <div className="hpd__svg"><SplitSvg /></div>
                    <p className="hpd__cap">Outdoor heat pump plumbed to a separate tank indoors.</p>
                  </figure>
                )}
              </div>

              <div className="hpd__legend">
                <span><i className="hpd__key hpd__key--ref" /> Refrigerant carries the heat</span>
                <span><i className="hpd__key hpd__key--hot" /> Hot water out the top</span>
                <span><i className="hpd__key hpd__key--cold" /> Cold water in the bottom</span>
              </div>

              <ol className="hpd__steps">
                <li><span className="hpd__num">1</span><div><strong>Pull heat from the air</strong><p>A fan draws air across the evaporator, where the refrigerant soaks up the warmth &mdash; even a cold morning has heat to give.</p></div></li>
                <li><span className="hpd__num">2</span><div><strong>Concentrate it</strong><p>The compressor squeezes that refrigerant, and squeezing it makes it hot &mdash; hotter than shower temperature.</p></div></li>
                <li><span className="hpd__num">3</span><div><strong>Pass it to the water</strong><p>The heat exchanger hands the heat to the water. Cold in the bottom, hot out the top.</p></div></li>
              </ol>
            </div>
          )}

          {tab === "cost" && (
            <div className="hpd__panel" role="tabpanel">
              <div className="hpd__cost">
                <div className="hpd__cost-head">
                  <h3>What it costs to run</h3>
                  <span>Per year &middot; 200 L/day</span>
                </div>
                <div className="hpd__cost-chart" role="img" aria-label="Running cost per year: 3-star gas storage LPG $1344, electric storage $1320, 4-star gas storage $868, 5-star gas continuous flow $792, heat pump on grid power $273, solar with electric boost $240, heat pump on solar PV $42">
                  {COST.map((c) => (
                    <div key={c.label} className="hpd__cost-col">
                      <div className="hpd__cost-bar-wrap">
                        <span className="hpd__cost-amt">${c.amount.toLocaleString()}</span>
                        <div className={`hpd__cost-bar hpd__cost-bar--${c.tone}`} style={{ height: `${Math.round((c.amount / COST_MAX) * 100)}%` }} />
                      </div>
                      <span className="hpd__cost-lbl">{c.label}</span>
                    </div>
                  ))}
                </div>
                <p className="hpd__cost-note">
                  Indicative running cost per year on 200 L/day, current Victorian tariffs. Your figure depends on
                  usage, tariff and whether you have solar &mdash; we run the numbers for your place at the quote.
                </p>
              </div>
            </div>
          )}

          {tab === "size" && (
            <div className="hpd__panel" role="tabpanel">
              <div className="hpd__size">
                <p className="hpd__size-q">How many people in the house?</p>
                <div className="hpd__size-opts">
                  {SIZES.map((s, i) => (
                    <button key={s.people} type="button" className={`hpd__size-opt${size === i ? " is-on" : ""}`} aria-pressed={size === i} onClick={() => setSize(i)}>
                      {s.people}
                    </button>
                  ))}
                </div>
                <div className="hpd__size-out" aria-live="polite">
                  <div className="hpd__size-litres">{SIZES[size].litres}</div>
                  <p>{SIZES[size].note}</p>
                </div>
                <div className="hpd__size-cta">
                  <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
                  <Link href="/tools/heat-pump-sizing" className="hpd__size-link">Full sizing calculator →</Link>
                </div>
                <p className="hpd__size-note">A guide off household size. We confirm it on the site visit against how you actually use hot water.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
