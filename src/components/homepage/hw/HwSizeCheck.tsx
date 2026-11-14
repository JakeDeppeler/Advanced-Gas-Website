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
    const tk = tankFor(sys.slug, t.slug, need);
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
