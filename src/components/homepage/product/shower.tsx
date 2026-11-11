"use client";

import { useEffect, useState } from "react";
import type { PV } from "./parts";
import { Count } from "./stage";

/**
 * How long the showers last on this tank, worked the way Jake works it out
 * for customers (Nov 2026):
 *
 *   a 9 L/min shower head draws about 5 L cold and 4 L hot,
 *   plus about 1 L a minute lost as heat on the way (pipes, the tank cooling),
 *   so the tank gives up 5 L of hot water a minute in the shower.
 *   200 L / 5 = 40 minutes, and the tank reheating while it's in use (and
 *   boost, where the model has it) stretches that to about 50.
 *
 * Kept to his figures rather than a flow-and-temperature model: they are the
 * numbers the team quotes on the phone, so the page and the call agree. The
 * reheat allowance is a quarter on top (40 → 50) for every size, because the
 * reheat runs for as long as the showers do. Showers only: the kitchen tap,
 * dishwasher and washing machine all come out of the same tank and aren't
 * counted, which the page says.
 */
const HOT_PER_MIN = 4 + 1;
const REHEAT = 1.25;
/** A typical shower, for the "that's about N showers" line. */
const TYPICAL = 8;
const MAX_PEOPLE = 6;

/** Every litre figure the tank row gives: "250 L" is one, "160 / 250 / 315 L" a choice. */
function tanksOf(specs: { label: string; value: string }[] | undefined): number[] {
  const row = specs?.find((s) => /^tank capacity/i.test(s.label));
  if (!row) return [];
  return [...row.value.matchAll(/(\d{2,3})\s*(?=\/|L|·|,|$)/g)].map((m) => Number(m[1])).filter((n) => n >= 50 && n <= 1000);
}

/** The people count the finder answer implies: "3–4 people" → 4. */
function peopleOf(label?: string): number {
  const ns = (label?.match(/\d+/g) ?? []).map(Number);
  return ns.length ? Math.min(MAX_PEOPLE, Math.max(...ns)) : 4;
}

export function hasTank(v: PV): boolean {
  return tanksOf(v.model?.specs).length > 0;
}

export function ShowerTime({ v }: { v: PV }) {
  const tanks = tanksOf(v.model?.specs);
  const [pick, setPick] = useState(0);
  const [people, setPeople] = useState(() => peopleOf(v.size?.label));
  // A new model is a new tank: start from its first size again.
  useEffect(() => setPick(0), [v.model?.slug]);
  if (!tanks.length) return null;

  const litres = tanks[Math.min(pick, tanks.length - 1)];
  const low = Math.round(litres / HOT_PER_MIN);
  const high = Math.round(low * REHEAT);
  const eachLow = Math.floor(low / people);
  const eachHigh = Math.floor(high / people);
  const showers = Math.floor(low / TYPICAL);
  const heatPump = v.sys.slug === "heat-pump";
  const extra = heatPump ? "reheat and boost" : "reheat";
  const pct = Math.round((low / high) * 100);

  return (
    <section className="bk__sec bk__sec--cream" id="showers">
      <div className="wrap"><div className="bk__blk shw">
        <header className="bk__head shw__head">
          <h2 className="h2">How long are the <span>showers</span>?</h2>
          <p>
            A 9 L a minute shower head runs about 5 L cold and 4 L hot. Add a litre a minute lost as heat
            on the way, and the tank gives up about 5 L of hot water for every minute someone&apos;s in the shower.
          </p>
          <dl className="shw__maths" aria-label="The maths">
            <div><dt>Tank</dt><dd>{litres} L</dd></div>
            <div><dt>÷ hot water a minute</dt><dd>{HOT_PER_MIN} L</dd></div>
            <div><dt>= minutes from a full tank</dt><dd>{low} min</dd></div>
            <div><dt>with {extra}</dt><dd>up to {high} min</dd></div>
          </dl>
        </header>

        <div className="shw__card">
          {tanks.length > 1 && (
            <div className="shw__row">
              <span className="shw__q" id="shw-tank">Tank size</span>
              <div className="shw__opts" role="group" aria-labelledby="shw-tank">
                {tanks.map((n, i) => (
                  <button key={n} type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>{n} L</button>
                ))}
              </div>
            </div>
          )}

          <div className="shw__total" aria-live="polite">
            <span className="shw__lbl">A full {litres} L tank gives</span>
            <b><Count text={String(low)} />–<Count text={String(high)} /><small> min</small></b>
            <span className="shw__sub">of showering: about {showers} showers of {TYPICAL} minutes, one after another</span>
          </div>

          <div className="shw__bar" aria-hidden="true">
            <i className="shw__fill" style={{ width: `${pct}%` }} />
            <i className="shw__more" style={{ left: `${pct}%` }} />
          </div>
          <div className="shw__key" aria-hidden="true">
            <span><i className="shw__sw" /> From a full tank: {low} min</span>
            <span><i className="shw__sw shw__sw--more" /> With {extra}: up to {high} min</span>
          </div>

          <div className="shw__row">
            <span className="shw__q" id="shw-people">People showering one after another</span>
            <div className="shw__opts" role="group" aria-labelledby="shw-people">
              {Array.from({ length: MAX_PEOPLE }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-pressed={n === people} onClick={() => setPeople(n)}>{n}{n === MAX_PEOPLE ? "+" : ""}</button>
              ))}
            </div>
          </div>

          <div className="shw__each" aria-live="polite">
            <ul className="shw__ppl" aria-hidden="true" data-n={people}>
              {Array.from({ length: people }, (_, i) => <li key={i} />)}
            </ul>
            <p>
              <b>{eachLow === eachHigh ? eachLow : <><Count text={String(eachLow)} />–<Count text={String(eachHigh)} /></>} min</b>
              {" "}{people === 1 ? "of hot shower" : "each"}
            </p>
          </div>

          <p className="shw__note">
            Showers only, back to back. The kitchen tap, dishwasher and washing machine come out of the same
            tank and aren&apos;t counted here.
          </p>
        </div>
      </div></div>
    </section>
  );
}
