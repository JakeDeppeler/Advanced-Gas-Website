"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { findSystem, productHref, bookHref } from "@/lib/homepage/data";
import { SHOWER_MINUTES, tankFor, FIT_TEXT } from "@/lib/homepage/hotWater";
import "./hwsize.css";

const MAX_PEOPLE = 6;
const LENGTHS = ["Quick", "Average", "Long"];

/**
 * "Which heat pump?" (Jake, Nov 2026: there are a lot of different options).
 * Four questions, then one option recommended at the size that covers the
 * household, with the others beside it at their own sizes.
 *
 * What decides the option is the one thing each is our pick for, as the
 * options' own lines and the "Which one?" advice already say: price → iStore,
 * Australian made → Reclaim ECO, a German brand → Viessmann, quiet and frosty
 * mornings → the Reclaim CO₂ split. Size comes from the shared shower maths.
 */
const MATTERS: { label: string; sub: string; tier: string }[] = [
  { label: "The lowest price", sub: "And the rebate going furthest", tier: "essential" },
  { label: "Australian made", sub: "Reclaim, designed and assembled in Sydney", tier: "premium" },
  { label: "A German brand", sub: "Viessmann, since 1917", tier: "german" },
  { label: "Quiet, and frosty mornings", sub: "Compressor away from the tank", tier: "signature" },
];

export function HpFinder() {
  const ref = findSystem("heat-pump");
  const [people, setPeople] = useState<number | null>(null);
  const [len, setLen] = useState<number | null>(null);
  const [matter, setMatter] = useState<number | null>(null);
  const [solar, setSolar] = useState<boolean | null>(null);
  if (!ref) return null;
  const sys = ref.sys;
  const done = people != null && len != null && matter != null && solar != null;
  const need = people != null && len != null ? people * SHOWER_MINUTES[len] : 0;
  const size = people == null ? 1 : people <= 2 ? 0 : people <= 4 ? 1 : 2;
  const ans = { size, ...(len != null ? { shw: len } : {}) };

  const pick = matter != null ? sys.tiers.find((t) => t.slug === MATTERS[matter].tier) : undefined;
  const rows = sys.tiers.filter((t) => !t.same).map((t) => ({ t, tk: tankFor(sys.slug, t.slug, need) })).filter((r) => r.tk);
  const top = rows.find((r) => r.t === pick);
  const rest = rows.filter((r) => r.t !== pick);
  // When the pick can't cover them, say which option has a tank that does.
  const bigger = top?.tk?.fit === "short" ? rows.find((r) => r.tk!.fit !== "short") : undefined;

  const Chips = ({ id, q, opts, on, set }: { id: string; q: string; opts: { l: string; s?: string }[]; on: number | null; set: (i: number) => void }) => (
    <div className="hws__row">
      <span className="hws__q" id={id}>{q}</span>
      <div className={`hws__opts${opts.some((o) => o.s) ? " hws__opts--big" : ""}`} role="group" aria-labelledby={id}>
        {opts.map((o, i) => (
          <button key={o.l} type="button" aria-pressed={on === i} onClick={() => set(i)}>
            {o.l}{o.s && <small>{o.s}</small>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="hpf">
      <div className="hws__ask">
        <Chips id="hpf-people" q="1. How many people shower?" on={people == null ? null : people - 1} set={(i) => setPeople(i + 1)}
          opts={Array.from({ length: MAX_PEOPLE }, (_, i) => ({ l: `${i + 1}${i + 1 === MAX_PEOPLE ? "+" : ""}` }))} />
        <Chips id="hpf-len" q="2. How long are the showers?" on={len} set={setLen}
          opts={LENGTHS.map((l, i) => ({ l: `${l} · ${SHOWER_MINUTES[i]} min` }))} />
        <Chips id="hpf-matter" q="3. What matters most?" on={matter} set={setMatter}
          opts={MATTERS.map((m) => ({ l: m.label, s: m.sub }))} />
        <Chips id="hpf-solar" q="4. Solar panels on the roof?" on={solar == null ? null : solar ? 0 : 1} set={(i) => setSolar(i === 0)}
          opts={[{ l: "Yes" }, { l: "No" }]} />
      </div>

      <div className="hpf__out" aria-live="polite">
        {!done || !top ? (
          <div className="hpf__wait">
            <b>Four quick taps.</b>
            <p>Answer the four questions and we&apos;ll show the heat pump we&apos;d fit for you, at the size that covers your showers.</p>
          </div>
        ) : (
          <>
            <article className={`hpf__top hws__opt--${top.tk!.fit}`}>
              <span className="hpf__img"><Image src={top.t.img} alt={`${top.t.brand} ${top.t.model}`} fill sizes="180px" /></span>
              <div className="hpf__txt">
                <small>Our pick for you</small>
                <strong>{top.t.brand} {top.t.model}</strong>
                <p className="hpf__size"><b>{top.tk!.chip}</b> · {top.tk!.m.low}–{top.tk!.m.high} min of showers for {need} min needed</p>
                <p className="hpf__fit"><i aria-hidden="true">{top.tk!.fit === "plenty" ? "✓" : top.tk!.fit === "reheat" ? "≈" : "!"}</i>{FIT_TEXT[top.tk!.fit]}{bigger ? `. The ${bigger.t.brand} ${bigger.t.model} at ${bigger.tk!.chip} covers it.` : ""}</p>
                <ul className="ticks">{top.t.feats.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>
                {solar && <p className="hpf__solar">{top.t.slug === "essential" ? "On solar: its PV diverter runs the compressor on power your panels would otherwise export." : "On solar: set it to heat in the middle of the day, on your panels' power."}</p>}
                <div className="hpf__btns">
                  <Link href={productHref(sys, top.t, ans)} className="abtn abtn--or abtn--flat">See this heat pump →</Link>
                  <Link href={bookHref(sys, top.t, ans)} className="abtn abtn--line">Get a quote</Link>
                </div>
              </div>
            </article>
            <p className="hws__q">The others, at your size</p>
            <ul className="hws__list">
              {rest.map(({ t, tk }) => (
                <li key={t.slug} className={`hws__opt hws__opt--${tk!.fit}`}>
                  <i aria-hidden="true">{tk!.fit === "plenty" ? "✓" : tk!.fit === "reheat" ? "≈" : "!"}</i>
                  <span className="hws__name"><small>{t.tier}</small><strong>{t.brand} {t.model}</strong></span>
                  <span className="hws__size"><b>{tk!.chip}</b><small>{tk!.m.low}–{tk!.m.high} min</small></span>
                  <span className="hws__fit">{FIT_TEXT[tk!.fit]}</span>
                  <Link href={productHref(sys, t, ans)} className="hws__go">See it →</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
