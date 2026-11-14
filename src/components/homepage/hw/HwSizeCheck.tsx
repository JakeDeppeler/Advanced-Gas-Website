"use client";

import Link from "next/link";
import { useState } from "react";
import { productHref, findSystem } from "@/lib/homepage/data";
import { SHOWER_MINUTES, TANK_SYSTEMS, tankFor, FIT_TEXT } from "@/lib/homepage/hotWater";
import "./hwsize.css";

const MAX_PEOPLE = 6;
const LENGTHS = ["Quick", "Average", "Long"];

/**
 * "How much hot water do you need?" (Jake, Nov 2026): how many people and how
 * long the showers run, then every tank option we fit with the size that
 * covers them and how long it lasts. The same maths as the product pages'
 * shower section and the finder, so the three never disagree.
 *
 * Each option links to its product page with the size and shower answers
 * already filled in, the way the finder would have sent them.
 */
export function HwSizeCheck() {
  const [people, setPeople] = useState(4);
  const [len, setLen] = useState(1);
  const need = people * SHOWER_MINUTES[len];
  // The finder's size answers are bands: 1–2, 3–4 and 5+ people.
  const size = people <= 2 ? 0 : people <= 4 ? 1 : 2;

  const rows = TANK_SYSTEMS().flatMap((sys) => sys.tiers.filter((t) => !t.same).map((t) => {
    // The heat pump's size floors (a 4-bedroom home gets 270–300 L) apply
    // here too, so this and the finder name the same tank.
    const tk = tankFor(sys.slug, t.slug, need, sys.slug === "heat-pump" ? sys.sizes[size]?.min : 0);
    return tk ? { sys, t, tk } : null;
  })).filter((r): r is NonNullable<typeof r> => !!r);
  const cf = findSystem("gas-continuous-flow");

  return (
    <div className="hws">
      <div className="hws__ask">
        <div className="hws__row">
          <span className="hws__q" id="hws-people">How many people shower at your place?</span>
          <div className="hws__opts" role="group" aria-labelledby="hws-people">
            {Array.from({ length: MAX_PEOPLE }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" aria-pressed={n === people} onClick={() => setPeople(n)}>{n}{n === MAX_PEOPLE ? "+" : ""}</button>
            ))}
          </div>
        </div>
        <div className="hws__row">
          <span className="hws__q" id="hws-len">How long are the showers?</span>
          <div className="hws__opts" role="group" aria-labelledby="hws-len">
            {LENGTHS.map((l, i) => (
              <button key={l} type="button" aria-pressed={i === len} onClick={() => setLen(i)}>{l} · {SHOWER_MINUTES[i]} min</button>
            ))}
          </div>
        </div>
        {/* The showers one after another, a person each: what the total is made
            of, drawn. It also fills the card down to the bottom of the list
            beside it, where there used to be a blank gap. */}
        <div className="hws__run" aria-hidden="true">
          <span className="hws__runh">Back to back</span>
          <ol key={`${people}-${len}`} style={{ ["--n" as string]: Math.max(people, 3) }}>
            {Array.from({ length: people }, (_, i) => (
              <li key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <svg viewBox="0 0 40 48">
                  <path d="M8 6 H22 Q28 6 28 12 V14" fill="none" stroke="#8A97AB" strokeWidth="2.6" strokeLinecap="round" />
                  <path d="M21 14 H35 L33 18 H23 Z" fill="#8A97AB" />
                  <g stroke="#1BA7E0" strokeWidth="2" strokeLinecap="round" className="hws__drops">
                    <path d="M25 21 V25" /><path d="M29 21 V27" /><path d="M33 21 V25" />
                  </g>
                  <circle cx="20" cy="30" r="4.6" fill="#050A30" />
                  <path d="M12.5 48 V42 C12.5 38.5 15.6 36.6 20 36.6 S27.5 38.5 27.5 42 V48 Z" fill="#050A30" />
                </svg>
                <b>{SHOWER_MINUTES[len]} min</b>
              </li>
            ))}
          </ol>
        </div>
        <p className="hws__need" aria-live="polite">
          <b>{need} min</b> of hot showers, one after another
          <small>{people} {people === 1 ? "person" : "people"} × {SHOWER_MINUTES[len]} min. At about 5 L of hot water a minute, that&apos;s around {need * 5} L.</small>
        </p>
      </div>

      <ul className="hws__list" aria-live="polite">
        {rows.map(({ sys, t, tk }) => (
          <li key={`${sys.slug}.${t.slug}`} className={`hws__opt hws__opt--${tk.fit}`}>
            <i aria-hidden="true">{tk.fit === "plenty" ? "✓" : tk.fit === "reheat" ? "≈" : "!"}</i>
            <span className="hws__name"><small>{sys.label}</small><strong>{t.brand} {t.model}</strong></span>
            <span className="hws__size"><b>{tk.chip}</b><small>{tk.m.low}–{tk.m.high} min</small></span>
            <span className="hws__fit">{FIT_TEXT[tk.fit]}</span>
            <Link href={productHref(sys, t, { size, shw: len })} className="hws__go">See it →</Link>
          </li>
        ))}
        {cf && (
          <li className="hws__opt hws__opt--plenty">
            <i aria-hidden="true">✓</i>
            <span className="hws__name"><small>{cf.sys.label}</small><strong>No tank to run out</strong></span>
            <span className="hws__size"><b>Endless</b><small>sized by bathrooms</small></span>
            <span className="hws__fit">Heats as it flows, so back-to-back showers never run it dry</span>
            <Link href={`/find/${cf.sys.slug}`} className="hws__go">See it →</Link>
          </li>
        )}
      </ul>
      <p className="hws__note">
        Each size allows a quarter on top of the showers for the kitchen tap, dishwasher and washing machine, which use the
        same hot water. We confirm the size at the free site check.
      </p>
    </div>
  );
}
