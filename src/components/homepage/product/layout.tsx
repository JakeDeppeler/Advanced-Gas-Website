"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  type PV, Crumbs, ProsCons, SavingsCalc, isHeatPumpOption, WhyList, FitFinder,
  Choose, SpecTable, SpecLinks, BookingSteps, Faqs, Reviews, Others, Sticky, Lead,
} from "./parts";
import { lowerLabel } from "@/lib/homepage/data";
import { HowItWorks } from "../how/HowItWorks";
import { InstallSpots } from "../how/InstallSpots";
import { ZoneHouse } from "../how/ZoneHouse";
import { StageHero, KeyFeatures, Resources } from "./stage";
import { ShowerTime, hasTank } from "./shower";
import { BkMotion } from "../brand/BkMotion";
import "../brand/blocks.css";

/** A heading with one part in colour, the brand page's way: the coloured part is in braces. */
function accent(text: string) {
  return text.split(/[{}]/).map((part, i) => (i % 2 ? <span key={i}>{part}</span> : part));
}

/** The brand page's section head: the heading, and a line under it. */
function Head({ h, children }: { h: string; children?: ReactNode }) {
  return (
    <header className="bk__head">
      <h2 className="h2">{accent(h)}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

/**
 * A /find product page. The header, Key features and Resources follow the
 * mock-up Jake picked; everything under the tab bar is laid out like a brand
 * page (Jake, Nov 2026): full-width bands, white between navy, cream and the
 * brand's own colour, one coloured word in each heading, photo cards, and
 * the quote in a box at the end. The parts inside each band (the size
 * cards, the spec table, the FAQs) are the ones the page already had.
 */
export function ProductLayout({ v }: { v: PV }) {
  const { t, learn } = v;
  // Ordered to teach: what it is and how it works, its strengths and limits,
  // which size (or which other option), then the details and booking.
  const tabs = [
    ["overview", "Our take"], ...(v.features.length >= 3 ? [["features", "Key features"]] : []), ...(learn ? [["how", "How it works"]] : []), ["pros", "Pros & cons"], ["choose", "Which one?"], ...(hasTank(v) ? [["showers", "Shower time"]] : []),
    ...(isHeatPumpOption(v) ? [["savings", "Savings"]] : []), ...(learn ? [["fit", "Is it right for you?"]] : []),
    ["specs", "Specs"], ...(v.brand?.tagline ? [["brand", "The brand"]] : []), ["resources", "Resources"], ["booking", "Booking"], ["faqs", "FAQs"], ["reviews", "Reviews"],
  ] as const;
  const name = v.model?.code ?? t.model;
  const acc = v.brand?.accent ?? "#C2521A";
  return (
    // .bk carries the brand page's band styles; --acc is the brand's colour, as on its brand page.
    <div className="pxp bk" style={{ ["--acc" as string]: acc, ...(v.brand?.accentLight ? { ["--acc-l" as string]: v.brand.accentLight } : {}) }}>
      <BkMotion />
      <Crumbs v={v} />
      <StageHero v={v} />

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">{tabs.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</div>
      </nav>

      <section className="bk__sec bk__sec--navy" id="overview">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="bk__two pxk__over">
            <div className="bk__txt">
              <h2 className="h2">Our <span>take</span>.</h2>
              <p className="pxk__quote">{v.take}</p>
              <span className="pxk__by">The Advanced Gas &amp; Aircon team</span>
            </div>
            <div className="pxk__why"><WhyList v={v} /></div>
          </div>
          {v.glance.length > 0 && (
            <ul className="bk__marks pxk__marks" data-n={v.glance.length} data-anim="stagger" aria-label={`${name} at a glance`}>
              {v.glance.map((x) => <li key={x.label}><b>{x.value}</b><span>{x.label}</span></li>)}
            </ul>
          )}
        </div></div>
      </section>

      {/* Our take before Key features on every page (Jake, Nov 2026): a model
          with no feature list had it first and one with a list had it second,
          so the pages of one range read in a different order. */}
      <KeyFeatures v={v} />

      <Story v={v} />

      <section className="bk__sec bk__sec--cream" id="pros">
        <div className="wrap"><div className="bk__blk bk__col">
          <Head h="The {honest} bit.">What it does well, and what&apos;s worth knowing before you choose it.</Head>
          <ProsCons v={v} />
        </div></div>
      </section>

      <section className="bk__sec bk__sec--white" id="choose">
        <div className="wrap"><div className="bk__blk bk__col">
          <Head h="This size, another size, or {something else}?">When we&apos;d recommend each one. {v.sizeNote}</Head>
          <Choose v={v} />
        </div></div>
      </section>

      {/* Hot water with a tank: how long the showers last on the size picked. */}
      <ShowerTime v={v} />

      {isHeatPumpOption(v) && (
        // The same navy box with the hot water orange as the heat pump system
        // page's calculator (Jake, Nov 2026: every savings calculator should
        // look like that one), rather than a plain band in the brand's colour.
        <section className="pxs pxs--hot" id="savings">
          <div className="wrap"><div className="pp__col pxs__hotbox">
            <Lead dark eye="Running costs" h={<>How much could the {t.model} <span>save you</span>?</>}>
              <p className="pxk__hotlede">Two taps: what you have now and how many live there. Here&apos;s what it would cost to run against it.</p>
            </Lead>
            <SavingsCalc v={v} />
          </div></div>
        </section>
      )}

      {learn && (
        <section className="bk__sec bk__sec--red" id="fit">
          <div className="wrap"><div className="bk__blk bk__pick">
            <Head h="Is it {right for you}?">A few quick questions and we&apos;ll tell you which size to choose, or point you to something that suits you better. Your answers carry through to your quote.</Head>
            <FitFinder v={v} />
          </div></div>
        </section>
      )}

      <section className="bk__sec bk__sec--white" id="specs">
        <div className="wrap"><div className="bk__blk pp__two">
          <div className="bk__head">
            <h2 className="h2">The <span>specs</span>.</h2>
            <p>{v.specNote}</p>
            <SpecLinks v={v} />
          </div>
          <SpecTable v={v} />
        </div></div>
      </section>

      <BrandBit v={v} />

      <Resources v={v} />

      <section className="bk__sec bk__sec--navy" id="booking">
        <div className="wrap"><div className="bk__blk bk__col">
          <Head h="From booking to {running}.">What happens after you ask for a quote, and how long each step takes.</Head>
          <BookingSteps v={v} cls="lk2__tl" />
        </div></div>
      </section>

      <section className="bk__sec bk__sec--white" id="faqs">
        <div className="wrap"><div className="bk__blk pp__two">
          <div className="bk__head">
            <h2 className="h2">Before you <span>book</span>.</h2>
            <p>Still want a human? <a href="tel:+61359478000" data-call-from="product-faq">Call (03) 5947 8000</a>.</p>
          </div>
          <Faqs v={v} />
        </div></div>
      </section>

      <section className="bk__sec bk__sec--cream" id="reviews">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="pp__revhead">
            <Head h="From local {households}." />
            <Link href="/reviews">{v.rating} / 5 from {v.count} Google reviews · Read all →</Link>
          </div>
          <Reviews v={v} head={false} />
        </div></div>
      </section>

      {v.others.length > 0 && <section className="bk__sec bk__sec--white">
        <div className="wrap"><div className="bk__blk bk__col">
          {/* A tier that is really another system (gas storage's "upgrade to
              continuous flow") isn't a gas storage option, so the heading only
              names the system when every tile is one. */}
          <Head h={v.others.some(([o]) => o.same) ? "Other {options} to consider." : `The other ${lowerLabel(v.sys.label)} {options}.`} />
          <Others v={v} />
        </div></div>
      </section>}

      <section className="bk__sec bk__sec--white bk__sec--end">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">See what the {t.model} <span>would cost</span>.</h2>
              <p>A free site check, then one fixed price in writing. Six years on our workmanship.</p>
            </div>
            <div className="bxh__ctas">
              <Link href={v.book} className="abtn abtn--or abtn--flat">Quote this model →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="product-cta">Call (03) 5947 8000</a>
            </div>
          </div>
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
    <section className="bk__sec bk__sec--navy" id="brand">
      <div className="wrap"><div className="bk__blk">
        <div className="bk__two pxk__brand">
          <div className="bk__txt">
            {b.origin && <span className="pxk__eye">{b.origin}</span>}
            <h2 className="h2">Who makes it: <span>{b.name}</span>.</h2>
            <p className="pxk__tag">{b.tagline}</p>
            {b.sub && <p>{b.sub}</p>}
            {b.features && b.features.length > 0 && <ul className="pp__hl">{b.features.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>}
            {b.page && <Link href={b.page} className="abtn abtn--or abtn--flat pxk__go">Why we install {b.name} →</Link>}
          </div>
          {b.photo && (
            <div className={`pxk__brimg${b.photoScene ? " pxk__brimg--scene" : ""}`}>
              <Image src={b.photo} alt={b.photoAlt ?? b.name} fill sizes="(max-width: 1000px) 90vw, 520px" />
            </div>
          )}
        </div>
      </div></div>
    </section>
  );
}

/** How it works: a moving diagram of this kind of system, one step at a time. */
function Story({ v }: { v: PV }) {
  const { learn, sys } = v;
  if (!learn) return null;
  // learn.title reads "How a heat pump works." : the last word goes in colour.
  const title = (learn.title ?? `How a ${lowerLabel(sys.label)} works.`).replace(/(\S+)\.$/, "{$1}.");
  return (
    <section className="bk__sec bk__sec--white" id="how">
      <div className="wrap"><div className="bk__blk bk__col">
        <Head h={title}>One step at a time. Press a step to see that part of the system.</Head>
        <HowItWorks kind={learn.diagram} steps={learn.how} />
        {sys.slug === "dominator" && (
          <div className="zh-wrap bk__col" id="where">
            <Head h="Goes where your {gas heater} is.">In the roof, under the floor or outside: the Dominator comes as an internal and an external model, made to go in the gas heater&apos;s own spot, on the ducts that are already there.</Head>
            <InstallSpots />
          </div>
        )}
        {(sys.slug === "ducted" || sys.slug === "zoning") && (
          <div className="zh-wrap bk__col" id="zones">
            <Head h="How {zones} work.">Tap a room to turn its zone on or off.</Head>
            <ZoneHouse />
          </div>
        )}
      </div></div>
    </section>
  );
}
