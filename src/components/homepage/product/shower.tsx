"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PV } from "./parts";
import { Count } from "./stage";
import { HOT_PER_MIN, SHOWER_MINUTES, tankMinutes, fitOf, FIT_TEXT } from "@/lib/homepage/hotWater";

/**
 * How long the showers last on this tank. The maths (Jake's 5 L of hot a
 * minute, the reheat allowance, a gas burner's recovery) lives in
 * lib/homepage/hotWater so the finder and the size check agree with it.
 */
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

/** "145 L/h at a 45°C rise" → 145; absent for anything without a burner. */
function recoveryOf(specs: { label: string; value: string }[] | undefined): number | null {
  const row = specs?.find((s) => /^recovery/i.test(s.label));
  const n = Number(row?.value.match(/\d+/)?.[0]);
  return n > 0 ? n : null;
}

type Tank = { litres: number; rec: number | null; slug: string };

/**
 * Every tank size on offer for this option, not just the model showing, so
 * someone on the 135 L page can see what the 170 L would give them without
 * leaving the section.
 */
function tanksFor(v: PV): Tank[] {
  const all = (v.models.length ? v.models : v.model ? [v.model] : []).flatMap((m) =>
    tanksOf(m.specs).map((litres) => ({ litres, rec: recoveryOf(m.specs), slug: m.slug })));
  const seen = new Set<number>();
  return all.filter((t) => !seen.has(t.litres) && seen.add(t.litres)).sort((a, b) => a.litres - b.litres);
}

export function hasTank(v: PV): boolean {
  return tanksOf(v.model?.specs).length > 0;
}

export function ShowerTime({ v }: { v: PV }) {
  const tanks = tanksFor(v);
  const own = () => Math.max(0, tanks.findIndex((t) => t.litres === tanksOf(v.model?.specs)[0]));
  const [pick, setPick] = useState(own);
  const [people, setPeople] = useState(() => peopleOf(v.size?.label));
  // The finder's "How long are the showers?", average if it wasn't asked. No
  // control of its own here (Jake, Nov 2026): the minutes each person gets
  // already answers it.
  const len = v.ans.shw ?? 1;
  // A new model is a new tank: show its size again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPick(own()), [v.model?.slug]);
  if (!hasTank(v) || !tanks.length) return null;

  const tank = tanks[Math.min(pick, tanks.length - 1)];
  const litres = tank.litres;
  const { low, high } = tankMinutes(litres, tank.rec);
  // Litres a minute the burner puts back, when the record gives a recovery rate.
  const back = tank.rec ? tank.rec / 60 : null;
  const mins = SHOWER_MINUTES[len];
  const need = people * mins;
  const fit = fitOf(need, { low, high });
  // The smallest size in the range that covers them, when this one doesn't.
  const better = fit === "short" ? tanks.find((t) => fitOf(need, tankMinutes(t.litres, t.rec)) !== "short") : undefined;
  const eachLow = Math.floor(low / people);
  const eachHigh = Math.floor(high / people);
  const showers = Math.floor(low / TYPICAL);
  const heatPump = v.sys.slug === "heat-pump";
  const extra = heatPump ? "reheat and boost" : "the burner reheating";
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
          <Link href="/hot-water#size" className="shw__all">Compare every hot water option for your household →</Link>
          <dl className="shw__maths" aria-label="The maths">
            <div><dt>Tank</dt><dd>{litres} L</dd></div>
            <div><dt>÷ hot water a minute</dt><dd>{HOT_PER_MIN} L</dd></div>
            <div><dt>= minutes from a full tank</dt><dd>{low} min</dd></div>
            {back && <div><dt>+ burner reheat ({tank.rec} L an hour)</dt><dd>{back.toFixed(1)} L/min back</dd></div>}
            <div><dt>with {extra}</dt><dd>up to {high} min</dd></div>
          </dl>
        </header>

        <div className="shw__card">
          {tanks.length > 1 && (
            <div className="shw__row">
              <span className="shw__q" id="shw-tank">Tank size</span>
              <div className="shw__opts" role="group" aria-labelledby="shw-tank">
                {tanks.map((t, i) => (
                  <button key={t.litres} type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>{t.litres} L</button>
                ))}
              </div>
              {v.model && tank.slug !== v.model.slug && (
                <button type="button" className="shw__swap" onClick={() => v.pickModel(tank.slug)}>
                  Show the {v.models.find((m) => m.slug === tank.slug)?.chip ?? `${litres} L`} model →
                </button>
              )}
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

          {/* The verdict for this household, in words, with a mark that differs by shape as well as colour. */}
          <div className={`shw__fit shw__fit--${fit}`} aria-live="polite">
            <i aria-hidden="true">{fit === "plenty" ? "✓" : fit === "reheat" ? "≈" : "!"}</i>
            <p>
              <b>{FIT_TEXT[fit]}.</b>{" "}
              {people} {people === 1 ? "person" : "people"} × {mins} min is {need} min of showering; this {litres} L tank gives {low}–{high}.
              {better && <> The <button type="button" className="shw__swap shw__swap--in" onClick={() => setPick(tanks.indexOf(better))}>{better.litres} L</button> covers it.</>}
            </p>
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
