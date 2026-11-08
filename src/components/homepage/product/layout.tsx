"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type PV, Crumbs, ProsCons, SavingsCalc, isHeatPumpOption, WhyList, Glance, FitFinder,
  Choose, SpecTable, SpecLinks, BookingSteps, Faqs, Reviews, Others, Sticky, Lead,
} from "./parts";
import { HowItWorks } from "../how/HowItWorks";
import { ZoneHouse } from "../how/ZoneHouse";
import { StageHero, KeyFeatures, Resources } from "./stage";

/**
 * A /find product page. Chosen from five trial layouts (commit 4a4b7e6 has
 * them): Showroom's full-width header, key-figure band, picture-led story and
 * booking timeline, with Guide's tab bar and plainer sections for the parts
 * people read closely.
 */
export function ProductLayout({ v }: { v: PV }) {
  const { t, learn } = v;
  // Ordered to teach: what it is and how it works, its strengths and limits,
  // which size (or which other option), then the details and booking.
  const tabs = [
    ...(v.features.length >= 3 ? [["features", "Key features"]] : []), ["overview", "Overview"], ...(learn ? [["how", "How it works"]] : []), ["pros", "Pros & cons"], ["choose", "Which one?"],
    ...(isHeatPumpOption(v) ? [["savings", "Savings"]] : []), ...(learn ? [["fit", "Is it right for you?"]] : []),
    ["specs", "Specs"], ["resources", "Resources"], ...(v.brand?.tagline ? [["brand", "The brand"]] : []), ["booking", "Booking"], ["faqs", "FAQs"], ["reviews", "Reviews"],
  ] as const;
  return (
    <div className="pxp">
      <Crumbs v={v} />
      <StageHero v={v} />

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">{tabs.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</div>
      </nav>

      <KeyFeatures v={v} />

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

      {v.glance.length > 0 && (
        <section className="lk2__stats"><div className="wrap"><Glance v={v} cls="lk2__glance" /></div></section>
      )}

      <Story v={v} />

      <section className="pxs" id="pros">
        <div className="wrap pp__col">
          <Lead eye="Pros & cons" h="The honest bit." />
          <ProsCons v={v} />
        </div>
      </section>

      <section className="pxs pxs--cream" id="choose">
        <div className="wrap pp__col">
          <Lead eye="Which one?" h="This size, another size, or something else?"><p>When we&apos;d recommend each one. {v.sizeNote}</p></Lead>
          <Choose v={v} />
        </div>
      </section>

      {isHeatPumpOption(v) && (
        <section className="pxs pxs--sky" id="savings">
          <div className="wrap">
            <div className="pbox pp__col">
              <Lead eye="Running costs" h="How much could you save?"><p>Two taps and we&apos;ll compare what you pay now with what this heat pump costs to run.</p></Lead>
              <SavingsCalc v={v} />
            </div>
          </div>
        </section>
      )}

      {learn && (
        <section className="pxs" id="fit">
          <div className="wrap pxfit">
            <Lead eye="Is it right for you?" h="Who this suits."><p>A few quick questions and we&apos;ll tell you which size to choose, or point you to something that suits you better. Your answers carry through to your quote.</p></Lead>
            <FitFinder v={v} />
          </div>
        </section>
      )}

      <section className="pxs pxs--cream" id="specs">
        <div className="wrap">
          <div className="pbox pp__two">
            <Lead eye="Specifications" h={v.model ? v.model.name : `${t.brand} ${t.model}`}><p>{v.specNote}</p><SpecLinks v={v} /></Lead>
            <SpecTable v={v} />
          </div>
        </div>
      </section>

      <Resources v={v} />

      <BrandBit v={v} />

      <section className="pxs pxs--navy" id="booking">
        <div className="wrap pp__col">
          <div className="lk2__center"><span className="aeye aeye--dark"><i /> What happens next</span><h2 className="h2 h2--sm">From booking to running.</h2></div>
          <BookingSteps v={v} cls="lk2__tl" />
          <Link href={v.book} className="abtn abtn--or abtn--flat" style={{ alignSelf: "center" }}>Book this install →</Link>
        </div>
      </section>

      <section className="pxs pxs--sky" id="faqs">
        <div className="wrap pp__two">
          <Lead eye="Questions about this one" h="Before you book."><p>Still want a human? <a href="tel:+61359478000" data-call-from="product-faq" style={{ color: "#050A30" }}>Call (03) 5947 8000</a>.</p></Lead>
          <Faqs v={v} />
        </div>
      </section>

      <section className="pxs" id="reviews"><div className="wrap pp__col"><Reviews v={v} /></div></section>

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <h2 className="h2 h2--sm">The other {v.sys.label.toLowerCase()} options</h2>
          <Others v={v} />
        </div>
      </section>
      <Sticky v={v} />
    </div>
  );
}

/**
 * A little about who makes it, after the product and before booking, with
 * the way through to the brand's own page for anyone who wants the full
 * "why we use them".
 */
function BrandBit({ v }: { v: PV }) {
  const b = v.brand;
  if (!b?.tagline) return null;
  return (
    <section className="pxs pxs--cream" id="brand">
      <div className="wrap pxbr">
        {b.photo && (
          <div className={`pxbr__img${b.photoScene ? " pxbr__img--scene" : ""}`}>
            <Image src={b.photo} alt={b.photoAlt ?? b.name} fill sizes="(max-width: 900px) 100vw, 560px" />
          </div>
        )}
        <div className="pxbr__t">
          <span className="aeye"><i /> The brand{b.origin ? ` · ${b.origin}` : ""}</span>
          <h2 className="h2 h2--sm">{b.name}</h2>
          <p className="pxbr__tag">{b.tagline}</p>
          {b.sub && <p className="pxbr__sub">{b.sub}</p>}
          {b.features && b.features.length > 0 && <ul className="pp__hl">{b.features.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>}
          {b.page && <Link href={b.page} className="abtn abtn--navy abtn--flat pxbr__go">Why we install {b.name} →</Link>}
        </div>
      </div>
    </section>
  );
}

/** How it works: a moving diagram of this kind of system, one step at a time. */
function Story({ v }: { v: PV }) {
  const { learn, sys } = v;
  if (!learn) return null;
  return (
    <section className="pxs pxs--sky" id="how">
      <div className="wrap pp__col">
        <div className="lk2__storyhead"><span className="aeye"><i /> How it works</span><h2 className="h2">{learn.title ?? `How a ${sys.label.toLowerCase()} works.`}</h2></div>
        <HowItWorks kind={learn.diagram} steps={learn.how} />
        {(sys.slug === "ducted" || sys.slug === "zoning") && (
          <div className="zh-wrap" id="zones">
            <div className="lk2__storyhead"><span className="aeye"><i /> Try it</span><h2 className="h2 h2--sm">How zones work.</h2></div>
            <ZoneHouse />
          </div>
        )}
      </div>
    </section>
  );
}
