"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CATS, PHOTO, ICON, SIZE_NOTE, SHOW_FINANCE, FINANCE_MONTHS, TONES, FSVC_SERVICE_INDEX,
  findSystem, answerChips, galleryFor, isHeatPump, isNewBuildHeatPump, productHref, bookHref, money, weekly,
  type Answers,
} from "@/lib/homepage/data";
import { onIntent, sendIntent, scrollToId } from "@/lib/homepage/intent";
import { Svg } from "./HeroQuote";

/**
 * "What do you need help with?": Type → System → a few questions about the
 * home, one per screen → three options side by side → a /find product page.
 *
 * Back undoes one answer at a time, and every answer so far shows as a chip,
 * so nobody has to start again to change one thing.
 */
export function Finder() {
  const [ci, setCi] = useState<number | null>(null);
  const [si, setSi] = useState<number | null>(null);
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
  const crumbs = [cat?.label, sys?.label, ...chips].filter((x): x is string => !!x);
  const size = sys && ans.size != null ? sys.sizes[ans.size] : null;

  useEffect(() => onIntent((i) => {
    if (i.kind !== "find") return false;
    if (i.system) {
      const ref = findSystem(i.system);
      if (ref) { setCi(ref.ci); setSi(ref.si); setAns(i.answers ?? {}); return true; }
    }
    const c = CATS.findIndex((x) => x.id === (i.cat ?? i.system));
    setCi(c >= 0 ? c : null); setSi(null); setAns({});
    return true;
  }), []);

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
    } else if (si != null) { setSi(null); setAns({}); }
    else setCi(null);
  }

  const steps = ["Type", "System", "Your home", "Options"];
  const toolHref = cat?.id === "air" ? "/tools/sizing-calculator" : cat?.id === "hw" ? "/tools/veu-rebate-estimator" : "/tools/heating-comparator";
  const toolText = cat?.id === "air" ? "Not sure? Try our sizing calculator" : cat?.id === "hw" ? "Estimate your VEU rebate" : "Gas vs reverse-cycle running costs";

  return (
    <section id="find" className="find" data-no-reveal>
      <div className="wrap">
        <div className="find__box" ref={boxRef}>
          <span className="glow glow--sky" aria-hidden="true" />
          <span className="glow glow--or" aria-hidden="true" />

          <div className="find__head">
            <div className="find__intro">
              <h2 className="find__h">What do you need <span>help with?</span></h2>
              <p className="find__p">
                Pick what you need, answer a few quick questions about your home, and we&apos;ll show you three options side by side
                {SHOW_FINANCE ? " with the weekly finance figure" : " with installed prices"}. Something stopped working?{" "}
                <a href="tel:+61359478000" data-call-from="finder">Call (03) 5947 8000</a>.
              </p>
            </div>
            <ol className="find__steps" aria-label="Steps">
              {steps.map((n, i) => {
                const st = i + 1 === stage ? " fstep--on" : i + 1 < stage ? " fstep--done" : "";
                return (
                  <li key={n} className={`fstep${st}`} aria-current={i + 1 === stage ? "step" : undefined}>
                    <b>{i < stage - 1 ? "✓" : i + 1}</b>{n}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="find__bar" aria-hidden="true"><span style={{ width: `${stage * 25}%` }} /></div>

          {crumbs.length > 0 && (
            <div className="find__crumbs">
              <button type="button" onClick={back} className="abtn abtn--line find__back">← Back</button>
              {crumbs.map((c, i) => <span key={`${i}-${c}`} className="crumbp pop">{c}</span>)}
              <button type="button" className="find__reset" onClick={() => { setCi(null); setSi(null); setAns({}); }}>Start over</button>
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
                <button type="button" className="atile anim" style={{ animationDelay: "0.21s" }} onClick={() => sendIntent({ kind: "quote", service: FSVC_SERVICE_INDEX }, "quote")}>
                  <CatTileBody photo={PHOTO.evapService} alt="Evaporative cooler being serviced on a roof" pos="center 45%" fg="#050A30" icon={ICON.wrench} label="Service & repairs" sub="Gas, hot water, aircon" />
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
                    {z.n ? (
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
              <h3 className="find__h3 anim">Your three options</h3>
              {isNewBuildHeatPump(sys, ans) && (
                <p className="find__veu pop">The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>
              )}
              <div className="atiers">
                {sys.tiers.map((t, i) => {
                  const known = typeof t.price === "number";
                  const href = productHref(sys, t, ans);
                  const nPhotos = galleryFor(sys, t).length;
                  return (
                    <article key={t.slug} className={`tier${i === 1 ? " tier--pop" : ""}`} style={{ animationDelay: `${(i + 1) * 0.07}s` }}>
                      {i === 1 && <span className="tier__badge pop">Most popular</span>}
                      <span className="tier__tier" style={{ color: TONES[i] }}>{t.tier}</span>
                      <Link href={href} className="tier__img" aria-label={`View ${t.brand} ${t.model}`}>
                        <Image src={t.img} alt={`${t.brand} ${t.model}`} fill sizes="(max-width: 600px) 80vw, 340px" />
                        <span className="tier__view">{SHOW_FINANCE ? "View photos & finance" : "View photos & details"}</span>
                        <span className="tier__n">{nPhotos} photos</span>
                      </Link>
                      <Link href={href} className="tier__name">
                        <span>{t.brand}</span>
                        <strong>{t.model}</strong>
                        <em>{sys.label} · {size.spec}</em>
                      </Link>
                      <ul className="ticks">
                        {t.feats.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
                      </ul>
                      <div className="tier__price">
                        <small>{known ? (SHOW_FINANCE ? "From, with Brighte finance" : "Range starts from, installed") : "Installed price"}</small>
                        <strong>{known ? (SHOW_FINANCE ? `$${weekly(t.price!, FINANCE_MONTHS)}/wk` : money(t.price!)) : "At quote"}</strong>
                        <em>{known ? (SHOW_FINANCE ? `or ${money(t.price!)} installed` : `Includes GST${isHeatPump(sys) ? " and the VEU rebate" : ""}`) : "Fixed price after a free site check"}</em>
                      </div>
                      <div className="tier__btns">
                        <Link href={href} className="abtn abtn--ghost">View details</Link>
                        <a href={bookHref(sys, t, ans)} className={`abtn ${i === 1 ? "abtn--or" : "abtn--navy"}`}
                          onClick={(e) => { e.preventDefault(); sendIntent({ kind: "book", system: sys.slug, tier: t.slug, answers: ans }, "quote"); }}>
                          Book →
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="find__fine">
                Installed prices include GST, with the VEU rebate applied where it&apos;s eligible. &ldquo;Range starts from&rdquo; is the smallest model in that range; your exact size is priced in writing after a free site check.
                {SHOW_FINANCE ? ` Weekly figures spread the installed price evenly over ${FINANCE_MONTHS} months with Brighte; finance is subject to approval and fees may apply.` : ""}{" "}
                <Link href="/pricing">Full price list</Link> · <Link href="/tools/system-comparison">Compare systems</Link>
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
