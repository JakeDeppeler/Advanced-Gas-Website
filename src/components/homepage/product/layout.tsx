"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type PV, Crumbs, Badges, SizePicker, Price, BuyButtons, Promise, WhyList, Glance, FitCards, FitFinder,
  SizeGuide, SpecTable, SpecLinks, BookingSteps, Faqs, Reviews, Others, Sticky, Lead,
} from "./parts";

/**
 * A /find product page. Chosen from five trial layouts (commit 4a4b7e6 has
 * them): Showroom's full-width header, key-figure band, picture-led story and
 * booking timeline, with Guide's tab bar and plainer sections for the parts
 * people read closely.
 */
export function ProductLayout({ v }: { v: PV }) {
  const { t, learn } = v;
  const tabs = [
    ["overview", "Overview"], ...(learn ? [["how", "How it works"], ["fit", "Is it right for you?"]] : []),
    ["sizes", "Sizes"], ["specs", "Specs"], ["booking", "Booking"], ["faqs", "FAQs"], ["reviews", "Reviews"],
  ] as const;
  return (
    <div className="pxp">
      <Crumbs v={v} />
      <Hero v={v} />

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

      {v.glance.length > 0 && (
        <section className="lk2__stats"><div className="wrap"><Glance v={v} cls="lk2__glance" /></div></section>
      )}

      <Story v={v} />

      {learn && (
        <section className="pxs" id="fit">
          <div className="wrap pxfit">
            <div className="pxfit__l">
              <Lead eye="Is it right for you?" h="Who this suits."><p>Two quick taps and we&apos;ll tell you which button to press.</p></Lead>
              <FitFinder v={v} />
            </div>
            <FitCards v={v} />
          </div>
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
 * A full-width photo with the name over it, and the size, price and Book bar
 * under it. For room-by-room systems the photo follows the size picked, and
 * the caption says which room that size is for.
 */
function Hero({ v }: { v: PV }) {
  const { t, room, roomIdx, sys } = v;
  const sized = roomIdx != null ? sys.sizes[roomIdx] : null;
  return (
    <>
      <section className="pxhero" ref={v.heroRef}>
        <Image key={room.src} src={room.src} alt={room.alt} fill priority sizes="100vw" className="pxhero__bg" style={{ objectPosition: room.pos }} />
        <span className="pxhero__scrim" aria-hidden="true" />
        {room.ours && <span className="pm__cap pxhero__cap">One of our installs</span>}
        <div className="wrap pxhero__in">
          <div className="pxhero__copy">
            <span className="lk2__eye">{t.brand} · {t.tier} option</span>
            <h1 className="pxhero__h1">{t.model}</h1>
            <p className="pxhero__best">{v.model?.bestFor ?? sys.sub}</p>
            <Badges v={v} cls="bdg--dark" />
            {sized && (
              <span className="pxhero__room" aria-live="polite">Sized for <b>{sized.sub ?? sized.label}</b> · {sized.label}</span>
            )}
          </div>
          <div className="pxhero__prod">
            <span className="pxhero__pimg"><Image src={t.img} alt={`${t.brand} ${t.model}`} fill sizes="200px" /></span>
            <span className="pxhero__pt"><small>{t.brand}</small><strong>{t.model}</strong></span>
          </div>
        </div>
      </section>
      <section className="lk2__bar">
        <div className="wrap lk2__barin">
          <SizePicker v={v} />
          <div className="lk2__buy"><Price v={v} /><BuyButtons v={v} dark /><Promise /></div>
        </div>
      </section>
    </>
  );
}

/** How it works, one step per row with a picture, alternating sides. */
function Story({ v }: { v: PV }) {
  const { learn, gal, sys } = v;
  if (!learn) return null;
  return (
    <section className="lk2__story" id="how">
      <div className="wrap">
        <div className="lk2__storyhead"><span className="aeye"><i /> How it works</span><h2 className="h2">How a {sys.label.toLowerCase()} works.</h2></div>
        {learn.how.map((x, i) => {
          const img = gal[i % gal.length];
          return (
            <div key={x.t} className={`lk2__row${i % 2 ? " lk2__row--flip" : ""}`}>
              <div className={`lk2__rowimg${img.kind === "p" ? " lk2__rowimg--prod" : ""}`}>
                <Image src={img.src} alt={img.alt} fill sizes="(max-width: 900px) 100vw, 640px" />
                {img.kind === "c" && <span className="pm__cap">One of our installs</span>}
              </div>
              <div className="lk2__rowt"><span>{String(i + 1).padStart(2, "0")}</span><h3>{x.t}</h3><p>{x.d}</p></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
