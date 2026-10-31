"use client";

import Image from "next/image";
import Link from "next/link";
import { TONES } from "@/lib/homepage/data";
import {
  type PV, Crumbs, Badges, SizePicker, Price, BuyButtons, Promise, Stage, WhyList, Glance, HowSteps, FitCards,
  SizeGuide, SpecTable, SpecLinks, BookingSteps, Faqs, Reviews, Others, Sticky, Lead,
} from "./parts";

/**
 * Ways to lay out the same product page, for Jake to choose between on the
 * preview. Same pieces, same figures; only the arrangement changes. Once one
 * is picked the others go. Magazine, Spec sheet and Bento were tried and
 * dropped (commit 4a4b7e6 has them).
 */
export const LOOKS = [
  { n: 1, name: "Guide" },
  { n: 2, name: "Showroom" },
  { n: 3, name: "Mix" },
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
  const { learn } = v;
  return (
    <div className="lk2">
      <Crumbs v={v} />
      <ShowHero v={v} />

      <section className="lk2__take" id="overview">
        <div className="wrap lk2__takein">
          <span className="aeye"><i /> Our take</span>
          <p>{v.take}</p>
        </div>
      </section>

      <ShowStats v={v} />
      <ShowStory v={v} />

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

      <ShowTimeline v={v} />
      <FaqSection v={v} />
      <section className="pxs" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>
      <OthersSection v={v} />
      <Sticky v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ 3 · Mix */
/* Showroom's first impression and its picture-led story, with Guide's tab
   bar and plainer sections for the parts people read closely: who it suits,
   sizes and specs. */
export function LookMix({ v }: { v: PV }) {
  const { t, learn } = v;
  const tabs = [
    ["overview", "Overview"], ...(learn ? [["how", "How it works"], ["fit", "Is it right for you?"]] : []),
    ["sizes", "Sizes"], ["specs", "Specs"], ["booking", "Booking"], ["faqs", "FAQs"], ["reviews", "Reviews"],
  ] as const;
  return (
    <div className="lk2 lkmix">
      <Crumbs v={v} />
      <ShowHero v={v} />

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
      </section>

      <ShowStats v={v} />
      <ShowStory v={v} />

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

      <ShowTimeline v={v} />
      <FaqSection v={v} />
      <section className="pxs" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>
      <OthersSection v={v} />
      <Sticky v={v} />
    </div>
  );
}

/* ------------------------------------------------------------ showroom pieces */

/** The dark hero and the size-and-price bar under it. */
function ShowHero({ v }: { v: PV }) {
  const { t } = v;
  return (
    <>
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
    </>
  );
}

function ShowStats({ v }: { v: PV }) {
  if (!v.glance.length) return null;
  return <section className="lk2__stats"><div className="wrap"><Glance v={v} cls="lk2__glance" /></div></section>;
}

/** How it works, one step per row with a picture, alternating sides. */
function ShowStory({ v }: { v: PV }) {
  const { learn, gal, sys } = v;
  if (!learn) return null;
  return (
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
  );
}

function ShowTimeline({ v }: { v: PV }) {
  return (
    <section className="pxs pxs--navy" id="booking">
      <div className="wrap pp__col">
        <div className="lk2__center"><span className="aeye aeye--dark"><i /> What happens next</span><h2 className="h2 h2--sm">From booking to running.</h2></div>
        <BookingSteps v={v} cls="lk2__tl" />
        <Link href={v.book} className="abtn abtn--or abtn--flat" style={{ alignSelf: "center" }}>Book this install →</Link>
      </div>
    </section>
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
