"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CATS, PHOTO, ICON, SIZE_NOTE, SHOW_PRICES, SHOW_FINANCE, FINANCE_SOON, FINANCE_SOON_TEXT, FINANCE_MONTHS, FINANCE_NOTE, TONES,
  findSystem, answerChips, hpPick, galleryFor, isHeatPump, isNewBuildHeatPump, productHref, bookHref, money, weekly,
  type Answers,
} from "@/lib/homepage/data";
import { onIntent, sendIntent, scrollToId } from "@/lib/homepage/intent";
import { Svg } from "./HeroQuote";
import { SHOWER_MINUTES, peopleIn, tankFor, tanksOf, FIT_TEXT } from "@/lib/homepage/hotWater";

/**
 * "What do you need help with?": Type → System → a few questions about the
 * home, one per screen → three options side by side → a /find product page.
 *
 * Back undoes one answer at a time, and every answer so far shows as a chip,
 * so nobody has to start again to change one thing.
 */
/**
 * `only` opens it on one system's questions, for that system's own page (the
 * heat pump page, Jake, Nov 2026): the same finder as the homepage's, without
 * the type and system steps.
 */
export function Finder({ only }: { only?: string } = {}) {
  const fixed = only ? findSystem(only) : null;
  const [ci, setCi] = useState<number | null>(fixed?.ci ?? null);
  const [si, setSi] = useState<number | null>(fixed?.si ?? null);
  const [ans, setAns] = useState<Answers>({});
  const boxRef = useRef<HTMLDivElement>(null);

  const cat = ci == null ? null : CATS[ci];
  const sys = cat && si != null ? cat.systems[si] : null;
  const qList = sys?.qs ?? [];
  let qIdx = 0;
  while (qIdx < qList.length && ans[qList[qIdx].id] != null) qIdx++;
  const curQ = qList[qIdx] ?? null;
  const stage = ci == null ? 1 : si == null ? 2 : curQ ? 3 : 4;
  const chips = sys ? answerChips(sys, ans) : [];
  const crumbs = (fixed ? chips : [cat?.label, sys?.label, ...chips]).filter((x): x is string => !!x);
  // "What matters most?" marks the option it points to as our pick, in place of "Most popular".
  const pick = sys?.qs.some((q) => q.id === "want") ? hpPick(ans) : null;
  const pickTier = pick?.tier ?? null;
  const size = sys && ans.size != null ? sys.sizes[ans.size] : null;
  // The shower check, for a tank system once its people and shower length
  // are in: everyone back to back, at Jake's 5 L of hot a minute.
  const showerQ = !!sys?.qs.some((q) => q.id === "shw");
  const need = showerQ && size && ans.shw != null ? peopleIn(size.label) * SHOWER_MINUTES[ans.shw] : null;

  useEffect(() => onIntent((i) => {
    if (i.kind !== "find" || only) return false;
    if (i.system) {
      const ref = findSystem(i.system);
      if (ref) { setCi(ref.ci); setSi(ref.si); setAns(i.answers ?? {}); return true; }
    }
    const c = CATS.findIndex((x) => x.id === (i.cat ?? i.system));
    setCi(c >= 0 ? c : null); setSi(null); setAns({});
    return true;
  }), [only]);

  // A new screen of choices: keep its top in view on a phone, where the
  // previous screen's tiles can run well past the fold.
  function stepTo(fn: () => void) {
    fn();
    const el = boxRef.current;
    if (el && el.getBoundingClientRect().top < -80) scrollToId("find");
  }

  function back() {
    if (stage === 4 || qIdx > 0) {
      const last = qList[(stage === 4 ? qList.length : qIdx) - 1];
      setAns((a) => { const n = { ...a }; delete n[last.id]; return n; });
    } else if (fixed) return;
    else if (si != null) { setSi(null); setAns({}); }
    else setCi(null);
  }

  const steps = fixed ? ["Your home", "Options"] : ["Type", "System", "Your home", "Options"];
  // With the first two steps skipped, the step shown is two behind.
  const shown = fixed ? stage - 2 : stage;
  const toolHref = cat?.id === "air" ? "/tools/sizing-calculator" : cat?.id === "hw" ? "/hot-water#size" : "/tools/heating-comparator";
  const toolText = cat?.id === "air" ? "Not sure? Try our sizing calculator" : cat?.id === "hw" ? "Not sure? Check the size your showers need" : "Gas vs reverse-cycle running costs";

  return (
    <section id="find" className="find" data-no-reveal>
      <div className="wrap">
        <div className="find__box" ref={boxRef}>
          <span className="glow glow--sky" aria-hidden="true" />
          <span className="glow glow--or" aria-hidden="true" />

          <div className="find__head">
            <div className="find__intro">
              <h2 className="find__h">Find your <span>{fixed ? fixed.sys.label.toLowerCase() : "system"}</span></h2>
              <p className="find__p">
                {fixed ? "Answer a few quick questions and we'll show you every option side by side, with the one we'd pick for you, at the size that covers your showers" : "Pick what you need, answer a few quick questions about your home, and we'll show you three options side by side"}
                {fixed ? "" : SHOW_PRICES ? (SHOW_FINANCE ? " with the weekly finance figure" : " with installed prices") : ", then a free written quote for the one you like"}. Something stopped working?{" "}
                <a href="tel:+61359478000" data-call-from="finder">Call (03) 5947 8000</a>.
              </p>
            </div>
            <ol className="find__steps" aria-label="Steps">
              {steps.map((n, i) => {
                const st = i + 1 === shown ? " fstep--on" : i + 1 < shown ? " fstep--done" : "";
                return (
                  <li key={n} className={`fstep${st}`} aria-current={i + 1 === shown ? "step" : undefined}>
                    <b>{i < shown - 1 ? "✓" : i + 1}</b>{n}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="find__bar" aria-hidden="true"><span style={{ width: `${(shown / steps.length) * 100}%` }} /></div>

          {crumbs.length > 0 && (
            <div className="find__crumbs">
              {!(fixed && stage === 3 && qIdx === 0) && <button type="button" onClick={back} className="abtn abtn--line find__back">← Back</button>}
              {crumbs.map((c, i) => <span key={`${i}-${c}`} className="crumbp pop">{c}</span>)}
              <button type="button" className="find__reset" onClick={() => { setCi(fixed?.ci ?? null); setSi(fixed?.si ?? null); setAns({}); }}>Start over</button>
            </div>
          )}

          {stage === 1 && (
            <div className="find__stage find__stage--first">
              <h3 className="find__h3 anim">Start with what you need</h3>
              <div className="grid-cats">
                {CATS.map((k, i) => (
                  <button key={k.id} type="button" className="atile anim" style={{ animationDelay: `${i * 0.07}s` }} onClick={() => stepTo(() => { setCi(i); setSi(null); setAns({}); })}>
                    <CatTileBody photo={k.photo} alt={k.alt} pos={k.pos} fg={k.fg} icon={k.icon} label={k.label} sub={k.sub} />
                  </button>
                ))}
                <button type="button" className="atile anim" style={{ animationDelay: "0.21s" }} onClick={() => sendIntent({ kind: "quote" }, "quote")}>
                  <CatTileBody photo={PHOTO.evapService} alt="Evaporative cooler being serviced on a roof" pos="center 45%" fg="#050A30" icon={ICON.wrench} label="Services" sub="Repairs, gas & plumbing, commercial" />
                </button>
              </div>
            </div>
          )}

          {stage === 2 && cat && (
            <div className="find__stage">
              <h3 className="find__h3 anim">Which kind of {cat.label.toLowerCase()}?</h3>
              <div className="grid-sys">
                {cat.systems.map((y, i) => (
                  <button key={y.slug} type="button" className="atile anim" style={{ animationDelay: `${i * 0.07}s` }} onClick={() => stepTo(() => { setSi(i); setAns({}); })}>
                    <span className="atile__img"><Image src={y.img} alt={y.label} fill sizes="(max-width: 600px) 90vw, 300px" /></span>
                    <span className="atile__sys"><strong>{y.label}</strong><span>{y.sub}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === 3 && sys && curQ && (
            <div className="find__stage" key={`${sys.slug}-${qIdx}`}>
              <div className="find__qhead">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="find__qcount">Question {qIdx + 1} of {qList.length}</span>
                  <h3 className="find__h3 anim">{curQ.q}</h3>
                </div>
                {curQ.size && <Link href={toolHref} className="find__tool">{toolText} →</Link>}
              </div>
              <div className={`fqgrid${curQ.size ? " fqgrid--size" : ""}`}>
                {curQ.opts.map((z, i) => (
                  <button key={z.label} type="button" className="atile anim" style={{ animationDelay: `${i * 0.07}s` }}
                    onClick={() => stepTo(() => setAns((a) => ({ ...a, [curQ.id]: i })))}>
                    {z.img ? (
                      // A photo across the top of the tile. On the household question, a
                      // figure per person pops in over it; product shots sit on white.
                      <span className={`atile__photo${z.fit === "contain" ? " atile__photo--prod" : ""}`} aria-hidden="true">
                        {/* A drawing goes through as is: the image optimiser refuses SVGs. */}
                        <Image src={z.img} alt="" fill sizes="(max-width: 600px) 90vw, 360px" unoptimized={z.img.endsWith(".svg")} style={{ objectFit: z.fit ?? "cover", objectPosition: z.pos ?? "center" }} />
                        {/* Over a photo, a figure per person; a drawing has its people in it already. */}
                        {curQ.size && z.n && !z.img.endsWith(".svg") ? (
                          <span className="atile__ppl">
                            {Array.from({ length: z.n * 2 }, (_, k) => (
                              <svg key={k} viewBox="0 0 12 20" width="12" height="20" style={{ animationDelay: `${0.25 + k * 0.09}s` }}>
                                <circle cx="6" cy="4" r="3.4" fill="#fff" />
                                <path d="M1.2 19 V12.5 C1.2 9.6 3.2 8.4 6 8.4 S10.8 9.6 10.8 12.5 V19 Z" fill="#fff" />
                              </svg>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    ) : curQ.id === "shw" ? (
                      // How long each answer is, as a timer that runs round to it.
                      <span className="atile__timer" aria-hidden="true">
                        <svg viewBox="0 0 80 80" width="92" height="92">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#DCEEF8" strokeWidth="8" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#0C6F96" strokeWidth="8" strokeLinecap="round" pathLength="100"
                            strokeDasharray={`${(SHOWER_MINUTES[i] / 15) * 100} 100`} transform="rotate(-90 40 40)" className="atile__run" />
                          <text x="40" y="45" textAnchor="middle" className="atile__min">{SHOWER_MINUTES[i]}</text>
                        </svg>
                        <small>min</small>
                      </span>
                    ) : z.n ? (
                      <span className="atile__bars" aria-hidden="true">
                        {Array.from({ length: z.n + 1 }, (_, b) => (
                          <span key={b} style={{ width: 26 + b * 4, height: 30 + b * 16, background: b === z.n ? "#0C6F96" : "#9FD9F0", animationDelay: `${0.1 + b * 0.08}s` }} />
                        ))}
                      </span>
                    ) : null}
                    <span className={`fqrow${z.n ? " fqrow--size" : ""}`}>
                      <span className="fqrow__t"><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</span>
                      {z.spec && <span className="fqrow__spec">{z.spec}</span>}
                      {!z.n && <span aria-hidden="true" className="atile__go atile__go--sm">→</span>}
                    </span>
                  </button>
                ))}
              </div>
              {curQ.size && <p className="find__note">{SIZE_NOTE}</p>}
            </div>
          )}

          {stage === 4 && sys && size && (
            <div className="find__stage" style={{ gap: 18 }}>
              <h3 className="find__h3 anim">Your {sys.tiers.length === 3 ? "three" : sys.tiers.length === 4 ? "four" : sys.tiers.length} options</h3>
              {isNewBuildHeatPump(sys, ans) && (
                <p className="find__veu pop">The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>
              )}
              {need != null && (
                <p className="find__shw pop">
                  <b>{peopleIn(size.label)} people × {SHOWER_MINUTES[ans.shw!]} min showers = {need} min</b> of hot water back to back.
                  Under each option: how long its tank lasts at your size.
                </p>
              )}
              {pick && (() => {
                const t = sys.tiers.find((x) => x.slug === pick.tier);
                const real = t?.same ? t.same.split(".") : [sys.slug, pick.tier];
                const tk = need != null ? tankFor(real[0], real[1], need, size.min) : null;
                return t && (
                  <p className="find__why pop">
                    <b>Our pick: {t.brand} {t.model}{tk ? `, ${tk.chip}` : ""}.</b> For {pick.why}.
                  </p>
                );
              })()}
              <div className={`atiers${sys.tiers.length > 3 ? " atiers--4" : ""}`}>
                {sys.tiers.map((t, i) => {
                  const known = typeof t.price === "number";
                  // The exact model: the smallest tank in the option that covers the showers.
                  const real = t.same ? t.same.split(".") : [sys.slug, t.slug];
                  const exact = need != null ? tankFor(real[0], real[1], need, size.min) : null;
                  const base = productHref(sys, t, ans);
                  const href = exact ? `${base}${base.includes("?") ? "&" : "?"}model=${exact.id}` : base;
                  const nPhotos = galleryFor(sys, t).length;
                  return (
                    <article key={t.slug} className={`tier${(pickTier ? t.slug === pickTier : i === 1) ? " tier--pop" : ""}`} style={{ animationDelay: `${(i + 1) * 0.07}s` }}>
                      {(pickTier ? t.slug === pickTier : i === 1) && <span className="tier__badge pop">{pickTier ? "Our pick for you" : "Most popular"}</span>}
                      <span className="tier__tier" style={{ color: TONES[i] }}>{t.tier}</span>
                      <Link href={href} className="tier__img" aria-label={`View ${t.brand} ${t.model}`}>
                        <Image src={t.img} alt={`${t.brand} ${t.model}`} fill sizes="(max-width: 600px) 80vw, 340px" />
                        <span className="tier__view">{SHOW_FINANCE ? "View photos & finance" : "View photos & details"}</span>
                        <span className="tier__n">{nPhotos} photos</span>
                      </Link>
                      <Link href={href} className="tier__name">
                        <span>{t.brand}</span>
                        <strong>{t.model}</strong>
                        <em>{sys.label} · {exact ? exact.chip : size.spec}</em>
                      </Link>
                      {need != null && (() => {
                        const tk = exact;
                        if (!tk) return tanksOf(real[0], real[1]).length ? null : <p className="tier__shw tier__shw--plenty"><i aria-hidden="true">✓</i><span><b>No tank to run out</b>Heats as it flows</span></p>;
                        return (
                          <p className={`tier__shw tier__shw--${tk.fit}`}>
                            <i aria-hidden="true">{tk.fit === "plenty" ? "✓" : tk.fit === "reheat" ? "≈" : "!"}</i>
                            <span><b>{tk.chip}: {tk.m.low}–{tk.m.high} min of showers</b>{tk.fit === "short" ? "Short even at its biggest size" : FIT_TEXT[tk.fit]}</span>
                          </p>
                        );
                      })()}
                      <ul className="ticks">
                        {t.feats.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
                      </ul>
                      <div className="tier__price">
                        <small>{known ? (SHOW_FINANCE ? "From, with finance" : "Range starts from, installed") : "Installed price"}</small>
                        <strong>{known ? (SHOW_FINANCE ? `$${weekly(t.price!, FINANCE_MONTHS)}/wk` : money(t.price!)) : "Price on quote"}</strong>
                        <em>{known ? (SHOW_FINANCE ? `or ${money(t.price!)} installed` : `Includes GST${isHeatPump(sys) ? " and the VEU rebate" : ""}`) : "Fixed price after a free site check"}</em>
                        {!SHOW_FINANCE && FINANCE_SOON && <span className="tier__soon">{FINANCE_SOON_TEXT}</span>}
                      </div>
                      <div className="tier__btns">
                        <Link href={href} className="abtn abtn--ghost">View details</Link>
                        <a href={bookHref(sys, t, ans, exact?.id)} className={`abtn ${(pickTier ? t.slug === pickTier : i === 1) ? "abtn--or" : "abtn--navy"}`}
                          onClick={(e) => { e.preventDefault(); sendIntent({ kind: "book", system: sys.slug, tier: t.slug, answers: ans }, "quote"); }}>
                          Book →
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="find__fine">
                {SHOW_PRICES
                  ? <>Installed prices include GST, with the VEU rebate applied where it&apos;s eligible. &ldquo;Range starts from&rdquo; is the smallest model in that range; your exact size is priced in writing after a free site check.</>
                  : <>Every option is priced in writing after a free site check, GST included, with the VEU rebate taken off where it&apos;s eligible.</>}
                {SHOW_FINANCE ? ` Weekly figures are over ${FINANCE_MONTHS} months. ${FINANCE_NOTE}` : ""}{" "}
                <Link href="/tools/system-comparison">Compare systems</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CatTileBody({ photo, alt, pos, fg, icon, label, sub }: { photo: string; alt: string; pos: string; fg: string; icon: string; label: string; sub: string }) {
  return (
    <>
      <span className="atile__photo">
        <Image src={photo} alt={alt} fill sizes="(max-width: 600px) 90vw, 300px" style={{ objectPosition: pos }} />
        <span className="atile__shade" aria-hidden="true" />
        <span className="atile__ico bob" style={{ color: fg }}><Svg d={icon} size={26} width={1.8} /></span>
      </span>
      <span className="atile__foot">
        <span className="atile__txt"><strong>{label}</strong><span>{sub}</span></span>
        <span className="atile__go" aria-hidden="true">→</span>
      </span>
    </>
  );
}
