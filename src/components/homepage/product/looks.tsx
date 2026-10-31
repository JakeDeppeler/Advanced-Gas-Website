"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { productHref, money, TONES, WORKMANSHIP } from "@/lib/homepage/data";
import {
  type PV, Crumbs, Badges, SizePicker, Price, BuyButtons, Promise, Stage, WhyList, Glance, HowSteps, FitCards,
  SizeGuide, SpecTable, SpecLinks, BookingSteps, Faqs, Reviews, Others, Sticky, Lead, otherPrice,
} from "./parts";

/**
 * Five ways to lay out the same product page, for Jake to choose between on
 * the preview. Same pieces, same figures; only the arrangement changes. Once
 * one is picked the other four go.
 */
export const LOOKS = [
  { n: 1, name: "Guide" },
  { n: 2, name: "Showroom" },
  { n: 3, name: "Magazine" },
  { n: 4, name: "Spec sheet" },
  { n: 5, name: "Bento" },
] as const;

const best = (v: PV) => v.model?.bestFor ?? v.sys.sub;

/* ------------------------------------------------------------ 1 · Guide */
/* Product and gallery up top, a tab bar, then one section per question. */
export function LookGuide({ v }: { v: PV }) {
  const { t, ti, sys, learn } = v;
  const tabs = [
    ["overview", "Overview"], ...(learn ? [["how", "How it works"], ["fit", "Is it right for you?"]] : []),
    ["sizes", "Sizes"], ["specs", "Specs"], ["booking", "Booking"], ["faqs", "FAQs"], ["reviews", "Reviews"],
  ] as const;
  return (
    <div className="lk1">
      <Crumbs v={v} />
      <section className="pxh" ref={v.heroRef}>
        <div className="wrap pxh__in">
          <div className="pxh__copy">
            <span className="pxh__eye"><i style={{ background: TONES[ti] }} />{t.tier} option · {sys.label}</span>
            <span className="pxh__brand">{t.brand}</span>
            <h1 className="pxh__h1">{t.model}</h1>
            <p className="pxh__best">{best(v)}</p>
            <Badges v={v} />
            <div className="pk--card"><SizePicker v={v} /></div>
            <div className="pxh__buy"><Price v={v} /><BuyButtons v={v} /><Promise /></div>
          </div>
          <Stage v={v} />
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">{tabs.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</div>
      </nav>

      <section className="pxs pxo" id="overview">
        <div className="wrap pxo__in">
          <div className="pxo__take">
            <span className="aeye"><i /> Our take</span>
            <p className="pxo__quote">{v.take}</p>
            <span className="pxo__by">The Advanced Gas &amp; Aircon team</span>
          </div>
          <div className="pxo__why"><WhyList v={v} /></div>
        </div>
        <div className="wrap"><Glance v={v} /></div>
      </section>

      {learn && (
        <section className="pxs pxs--cream" id="how">
          <div className="wrap pxw">
            <div className="pxw__lead">
              <Lead eye="How it works" h={`How a ${sys.label.toLowerCase()} works.`} />
              <HowImg v={v} />
            </div>
            <HowSteps v={v} />
          </div>
        </section>
      )}

      {learn && (
        <section className="pxs" id="fit">
          <div className="wrap pp__col"><Lead eye="Is it right for you?" h="Who this suits." /><FitCards v={v} /></div>
        </section>
      )}

      <section className="pxs pxs--sky" id="sizes">
        <div className="wrap pp__two"><Lead eye="Sizes" h="Which size do you need?"><p>{v.sizeNote}</p></Lead><SizeGuide v={v} /></div>
      </section>

      <section className="pxs" id="specs">
        <div className="wrap pp__two">
          <Lead eye="Specifications" h={v.model ? v.model.name : `${t.brand} ${t.model}`}><p>{v.specNote}</p><SpecLinks v={v} /></Lead>
          <SpecTable v={v} />
        </div>
      </section>

      <section className="pxs pxs--navy" id="booking">
        <div className="wrap pp__col">
          <div className="pxb__head"><Lead dark eye="What happens next" h="From booking to running." /><Link href={v.book} className="abtn abtn--or abtn--flat">Book this install →</Link></div>
          <BookingSteps v={v} />
        </div>
      </section>

      <FaqSection v={v} />
      <section className="pxs" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>
      <OthersSection v={v} />
      <Sticky v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ 2 · Showroom */
/* Dark and cinematic, like a car or phone launch page: the product centred
   and large, then a story told one step at a time with a picture each. */
export function LookShowroom({ v }: { v: PV }) {
  const { t, sys, learn, gal } = v;
  return (
    <div className="lk2">
      <Crumbs v={v} />
      <section className="lk2__hero" ref={v.heroRef}>
        <div className="wrap lk2__heroin">
          <span className="lk2__eye">{t.brand} · {t.tier} option</span>
          <h1 className="lk2__h1">{t.model}</h1>
          <p className="lk2__best">{best(v)}</p>
          <Badges v={v} cls="bdg--dark" />
          <Stage v={v} cls="stg--dark" sizes="(max-width: 900px) 100vw, 1100px" />
        </div>
      </section>
      <section className="lk2__bar">
        <div className="wrap lk2__barin">
          <SizePicker v={v} />
          <div className="lk2__buy"><Price v={v} /><BuyButtons v={v} dark /></div>
        </div>
      </section>

      <section className="lk2__take" id="overview">
        <div className="wrap lk2__takein">
          <span className="aeye"><i /> Our take</span>
          <p>{v.take}</p>
        </div>
      </section>

      {v.glance.length > 0 && (
        <section className="lk2__stats"><div className="wrap"><Glance v={v} cls="lk2__glance" /></div></section>
      )}

      {learn && (
        <section className="lk2__story" id="how">
          <div className="wrap">
            <div className="lk2__storyhead"><span className="aeye"><i /> How it works</span><h2 className="h2">How a {sys.label.toLowerCase()} works.</h2></div>
            {learn.how.map((x, i) => {
              const img = gal[(i + 1) % gal.length];
              return (
                <div key={x.t} className={`lk2__row${i % 2 ? " lk2__row--flip" : ""}`}>
                  <div className={`lk2__rowimg${img.kind === "p" ? " lk2__rowimg--prod" : ""}`}><Image src={img.src} alt={img.alt} fill sizes="(max-width: 900px) 100vw, 640px" /></div>
                  <div className="lk2__rowt"><span>{String(i + 1).padStart(2, "0")}</span><h3>{x.t}</h3><p>{x.d}</p></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {learn && (
        <section className="lk2__fit" id="fit">
          <div className="lk2__fityes"><div><h2>A good fit if</h2><ul>{learn.good.map((x) => <li key={x}>{x}</li>)}</ul></div></div>
          <div className="lk2__fitalt"><div><h2>Or look at</h2><ul>{learn.alt.map((x) => <li key={x.if}><span>…{x.if}</span><Link href={`/?find=${x.go}#find`}>{x.label} →</Link></li>)}</ul></div></div>
        </section>
      )}

      <section className="pxs" id="sizes">
        <div className="wrap lk2__narrow">
          <div className="lk2__center"><span className="aeye"><i /> Sizes</span><h2 className="h2 h2--sm">Which size do you need?</h2><p>{v.sizeNote}</p></div>
          <SizeGuide v={v} />
          <details className="lk2__specs" id="specs">
            <summary>Full specifications</summary>
            <SpecTable v={v} />
            <SpecLinks v={v} />
          </details>
        </div>
      </section>

      <section className="pxs pxs--navy" id="booking">
        <div className="wrap pp__col">
          <div className="lk2__center"><span className="aeye aeye--dark"><i /> What happens next</span><h2 className="h2 h2--sm">From booking to running.</h2></div>
          <BookingSteps v={v} cls="lk2__tl" />
          <Link href={v.book} className="abtn abtn--or abtn--flat" style={{ alignSelf: "center" }}>Book this install →</Link>
        </div>
      </section>

      <FaqSection v={v} />
      <section className="pxs" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>
      <OthersSection v={v} />
      <Sticky v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ 3 · Magazine */
/* Reads like an article, with the buy box riding alongside the whole way
   down, so the price and Book button are never more than a glance away. */
export function LookMagazine({ v }: { v: PV }) {
  const { t, ti, sys, learn } = v;
  const box = (id: string) => (
    <div className="lk3__box">
      <span className="lk3__boxb">{t.brand}</span>
      <strong className="lk3__boxm">{t.model}</strong>
      <Badges v={v} />
      <SizePicker v={v} uid={id} />
      <Price v={v} />
      <BuyButtons v={v} />
      <Promise />
    </div>
  );
  return (
    <div className="lk3">
      <Crumbs v={v} />
      <div className="wrap lk3__grid">
        <article className="lk3__main">
          <header className="lk3__head" ref={v.heroRef}>
            <span className="lk3__kicker" style={{ color: TONES[ti] }}>{t.tier} option · {sys.label}</span>
            <h1 className="lk3__h1">{t.brand} {t.model}</h1>
            <p className="lk3__dek">{best(v)}</p>
          </header>
          <Stage v={v} cls="stg--wide" sizes="(max-width: 900px) 100vw, 860px" />
          <div className="lk3__mbox">{box("pm-size-m")}</div>

          <section className="lk3__sec" id="overview">
            <h2>Our take</h2>
            <p className="lk3__drop">{v.take}</p>
            <Glance v={v} cls="lk3__glance" />
          </section>
          <section className="lk3__sec"><h2>{v.whyTitle}</h2><WhyList v={v} title={false} /></section>
          {learn && <section className="lk3__sec" id="how"><h2>How a {sys.label.toLowerCase()} works</h2><HowSteps v={v} cls="lk3__how" /></section>}
          {learn && <section className="lk3__sec" id="fit"><h2>Is it right for you?</h2><FitCards v={v} /></section>}
          <section className="lk3__sec" id="sizes"><h2>Which size?</h2><p className="lk3__p">{v.sizeNote}</p><SizeGuide v={v} /></section>
          <section className="lk3__sec" id="specs"><h2>Specifications</h2><p className="lk3__p">{v.specNote}</p><SpecTable v={v} /><SpecLinks v={v} /></section>
          <section className="lk3__sec" id="booking"><h2>What happens next</h2><BookingSteps v={v} cls="lk3__steps" /></section>
          <section className="lk3__sec" id="faqs"><h2>Before you book</h2><Faqs v={v} /></section>
        </article>
        <aside className="lk3__aside">{box("pm-size")}</aside>
      </div>
      <section className="pxs pxs--cream" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>
      <OthersSection v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ 4 · Spec sheet */
/* A manufacturer's product page: gallery and details side by side, round
   badges, everything else behind tabs, and the whole range in one table. */
export function LookSpecSheet({ v }: { v: PV }) {
  const { t, sys, learn } = v;
  const tabs = [
    ["overview", "Overview"], ...(learn ? [["how", "How it works"]] : []), ["specs", "Specifications"],
    ["sizes", "Sizes"], ["booking", "Booking"], ["faqs", "FAQs"],
  ] as const;
  const [tab, setTab] = useState<string>("overview");
  return (
    <div className="lk4">
      <Crumbs v={v} />
      <section className="lk4__hero" ref={v.heroRef}>
        <div className="wrap lk4__heroin">
          <Stage v={v} cls="stg--side" />
          <div className="lk4__info">
            <span className="lk4__brand">{t.brand}</span>
            <h1 className="lk4__h1">{t.model}</h1>
            <p className="lk4__best">{best(v)}</p>
            <Badges v={v} cls="bdg--round" />
            <SizePicker v={v} />
            <Price v={v} />
            <BuyButtons v={v} />
            <div className="lk4__dl"><span>Downloads &amp; links</span><SpecLinks v={v} /></div>
          </div>
        </div>
      </section>

      <section className="lk4__tabsec" id="details">
        <div className="wrap">
          <div className="lk4__tabs" role="tablist" aria-label="Product details">
            {tabs.map(([id, l]) => (
              <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls="lk4-panel" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="lk4__panel" role="tabpanel" id="lk4-panel" aria-labelledby={`tab-${tab}`} key={tab}>
            {tab === "overview" && (
              <div className="lk4__two">
                <div><h2 className="lk4__h2">Our take</h2><p className="lk4__p">{v.take}</p><Glance v={v} cls="lk4__glance" /></div>
                <div className="lk4__card"><WhyList v={v} /></div>
              </div>
            )}
            {tab === "how" && learn && (
              <div className="lk4__two">
                <div><h2 className="lk4__h2">How a {sys.label.toLowerCase()} works</h2><HowImg v={v} /></div>
                <div><HowSteps v={v} cls="lk4__how" /><FitCards v={v} /></div>
              </div>
            )}
            {tab === "specs" && <div className="lk4__two"><div><h2 className="lk4__h2">{v.model ? v.model.name : `${t.brand} ${t.model}`}</h2><p className="lk4__p">{v.specNote}</p></div><SpecTable v={v} /></div>}
            {tab === "sizes" && <div className="lk4__two"><div><h2 className="lk4__h2">Which size?</h2><p className="lk4__p">{v.sizeNote}</p></div><SizeGuide v={v} /></div>}
            {tab === "booking" && <div><h2 className="lk4__h2">From booking to running</h2><BookingSteps v={v} cls="lk4__steps" /></div>}
            {tab === "faqs" && <div className="lk4__two"><div><h2 className="lk4__h2">Before you book</h2><p className="lk4__p">Still want a human? <a href="tel:+61359478000">Call (03) 5947 8000</a>.</p></div><Faqs v={v} /></div>}
          </div>
        </div>
      </section>

      <section className="pxs pxs--sky" id="compare">
        <div className="wrap pp__col">
          <Lead eye="Compare the range" h={`Every ${sys.label.toLowerCase()} option, side by side.`} />
          <div className="lk4__tablewrap">
            <table className="lk4__table">
              <thead>
                <tr><th scope="col"><span className="sr-only">Option</span></th>{sys.tiers.map((o, i) => (
                  <th key={o.slug} scope="col" className={o.slug === t.slug ? "on" : ""}>
                    <span className="lk4__tier" style={{ color: TONES[i] }}>{o.tier}</span>
                    <span className="lk4__timg"><Image src={o.img} alt="" fill sizes="160px" /></span>
                    <strong>{o.brand} {o.model}</strong>
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                <tr><th scope="row">Installed price</th>{sys.tiers.map((o) => <td key={o.slug} className={o.slug === t.slug ? "on" : ""}>{otherPrice(o)}</td>)}</tr>
                <tr><th scope="row">What stands out</th>{sys.tiers.map((o) => <td key={o.slug} className={o.slug === t.slug ? "on" : ""}><ul>{(o.slug === t.slug ? v.optionLines : o.feats.filter((f) => f !== WORKMANSHIP)).map((f) => <li key={f}>{f}</li>)}</ul></td>)}</tr>
                <tr><th scope="row">Workmanship</th>{sys.tiers.map((o) => <td key={o.slug} className={o.slug === t.slug ? "on" : ""}>6 years</td>)}</tr>
                <tr><th scope="row"><span className="sr-only">Open</span></th>{sys.tiers.map((o) => (
                  <td key={o.slug} className={o.slug === t.slug ? "on" : ""}>
                    {o.slug === t.slug ? <span className="lk4__here">You&apos;re viewing this one</span> : <Link href={productHref(sys, o, v.ans)} className="lk4__view">View {o.tier} →</Link>}
                  </td>
                ))}</tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pxs" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>
      <Sticky v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ 5 · Bento */
/* Everything as tiles in one grid: quick to scan, each fact in its own box. */
export function LookBento({ v }: { v: PV }) {
  const { t, ti, sys, learn } = v;
  const tones = ["bt--navy", "bt--sky", "bt--cream", "bt--or"];
  return (
    <div className="lk5">
      <Crumbs v={v} />
      <section className="lk5__sec" ref={v.heroRef}>
        <div className="wrap lk5__grid">
          <div className="bt bt--img"><Stage v={v} cls="stg--fill" sizes="(max-width: 900px) 100vw, 840px" /></div>
          <div className="bt bt--title">
            <span className="pxh__eye"><i style={{ background: TONES[ti] }} />{t.tier} option · {sys.label}</span>
            <span className="pxh__brand">{t.brand}</span>
            <h1 className="lk5__h1">{t.model}</h1>
            <p className="lk5__best">{best(v)}</p>
            <Badges v={v} />
          </div>
          <div className="bt bt--buy"><Price v={v} /><BuyButtons v={v} /><Promise /></div>
          <div className="bt bt--size"><SizePicker v={v} /></div>

          {v.glance.map((x, i) => (
            <div key={x.label + (v.model?.slug ?? "")} className={`bt bt--stat ${tones[i % tones.length]}`}><span>{x.label}</span><strong>{x.value}</strong></div>
          ))}

          <div className="bt bt--take" id="overview"><span className="aeye"><i /> Our take</span><p>{v.take}</p></div>
          <div className="bt bt--why"><WhyList v={v} /></div>

          {learn && <div className="bt bt--howh" id="how"><span className="aeye"><i /> How it works</span><h2>How a {sys.label.toLowerCase()} works</h2></div>}
          {learn?.how.map((x, i) => (
            <div key={x.t} className="bt bt--step"><span>{String(i + 1).padStart(2, "0")}</span><h3>{x.t}</h3><p>{x.d}</p></div>
          ))}

          {learn && (
            <div className="bt bt--fit" id="fit"><h2>A good fit if</h2><ul>{learn.good.map((x) => <li key={x}>{x}</li>)}</ul></div>
          )}
          {learn && (
            <div className="bt bt--alt"><h2>Look at another option if</h2><ul>{learn.alt.map((x) => <li key={x.if}><span>…{x.if}</span><Link href={`/?find=${x.go}#find`}>{x.label} →</Link></li>)}</ul></div>
          )}

          <div className="bt bt--sizes" id="sizes"><h2>Which size?</h2><SizeGuide v={v} /><p className="bt__fine">{v.sizeNote}</p></div>
          <div className="bt bt--specs" id="specs"><h2>Specifications</h2><SpecTable v={v} /><SpecLinks v={v} /></div>

          <div className="bt bt--book" id="booking">
            <div className="bt__bookhead"><h2>From booking to running</h2><Link href={v.book} className="abtn abtn--or abtn--flat">Book this install →</Link></div>
            <BookingSteps v={v} cls="lk5__steps" />
          </div>

          <div className="bt bt--faq" id="faqs"><h2>Before you book</h2><Faqs v={v} /></div>
          <div className="bt bt--revs" id="reviews"><Reviews v={v} /></div>
          {v.others.map(([o, i]) => (
            <Link key={o.slug} href={productHref(sys, o, v.ans)} className="bt bt--other">
              <span className="lk5__oimg"><Image src={o.img} alt="" fill sizes="200px" /></span>
              <span className="lk5__ot"><span style={{ color: TONES[i] }}>{o.tier}</span><strong>{o.brand} {o.model}</strong><em>{typeof o.price === "number" ? `From ${money(o.price)}` : "Priced at your site check"}</em></span>
              <i aria-hidden="true">→</i>
            </Link>
          ))}
        </div>
      </section>
      <Sticky v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ shared sections */

function HowImg({ v }: { v: PV }) {
  const x = v.howImg;
  return (
    <div className={`pxw__img${x.kind === "c" ? " pxw__img--photo" : ""}`}>
      <Image src={x.src} alt={x.alt} fill sizes="(max-width: 900px) 90vw, 560px" />
      {x.kind === "c" && <span className="pm__cap">One of our installs</span>}
    </div>
  );
}

function FaqSection({ v }: { v: PV }) {
  return (
    <section className="pxs pxs--sky" id="faqs">
      <div className="wrap pp__two">
        <Lead eye="Questions about this one" h="Before you book."><p>Still want a human? <a href="tel:+61359478000" data-call-from="product-faq" style={{ color: "#050A30" }}>Call (03) 5947 8000</a>.</p></Lead>
        <Faqs v={v} />
      </div>
    </section>
  );
}

function OthersSection({ v }: { v: PV }) {
  return (
    <section className="pxs pxs--cream">
      <div className="wrap pp__col">
        <div className="pxb__head"><h2 className="h2 h2--sm">The other {v.sys.label.toLowerCase()} options</h2></div>
        <Others v={v} />
      </div>
    </section>
  );
}
