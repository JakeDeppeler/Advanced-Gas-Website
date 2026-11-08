import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CATS, PHOTO, SERVICES } from "@/lib/homepage/data";
import { REVIEWS, RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import { CATEGORY_COPY } from "@/components/homepage/page/categoryCopy";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "@/components/homepage/page/kit";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";

export const metadata: Metadata = {
  title: "Services, Heat Pumps, Aircon, Gas & Hot Water",
  description:
    "Heat pump hot water, split and ducted aircon, gas heating, servicing and commercial fit-outs. Pakenham VIC, servicing within 75 km. Free quote.",
  alternates: { canonical: "/services" },
};

/**
 * Everything we do, in the brand pages' block layout: the three ways in by
 * system (the Cooling, Heating and Hot water pages), every service as the
 * homepage's photo cards, the emergency line, why us, reviews and the quote.
 * Built from the same records as the homepage, so the two can't disagree.
 */
export default function ServicesPage() {
  const reviews = REVIEWS.slice(0, 3);
  return (
    <div className="ag ag--flat" data-no-reveal>
      <div className="bx bk cx" style={{ ["--acc" as string]: "#C2521A" }}>
        <BkMotion />
        <Crumbs trail={[{ name: "Services" }]} back={{ label: "Find your system →", href: "/#find" }} />

        <section className="bxh">
          <div className="wrap bxh__in">
            <div className="bxh__copy">
              <span className="lk2__eye cx__eye">Services</span>
              <h1 className="bxh__h1 cx__h1">Heating, cooling, gas and hot water, <span>one licensed crew.</span></h1>
              <p className="bxh__sub">Installs, servicing and repairs, from a bedroom split to a whole-home ducted system, by our own team out of Pakenham.</p>
              <div className="bxh__ctas">
                <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
                <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="services-hero">Call (03) 5947 8000</a>
              </div>
            </div>
            <div className="bxh__img bxh__img--scene">
              <Image src={PHOTO.team} alt="The Advanced Gas team with their vans outside the Pakenham workshop" fill priority sizes="(max-width: 900px) 100vw, 640px" />
            </div>
          </div>
        </section>

        <nav className="pxt" aria-label="On this page">
          <div className="wrap pxt__in">
            {[["systems", "By system"], ["all", "Everything we do"], ["emergency", "24/7"], ["why", "Why us"], ["reviews", "Reviews"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
          </div>
        </nav>

        {/* 1. The three ways in, by system */}
        <section className="bk__sec bk__sec--white" id="systems">
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head">
              <h2 className="h2">Start with <span>what you need</span>.</h2>
              <p>Each one shows the systems we install, side by side, with the brands behind them.</p>
            </header>
            <div className="sv__cats" data-anim="stagger">
              {CATS.map((c) => {
                const copy = CATEGORY_COPY[c.id];
                return (
                  <Link key={c.id} href={copy.path} className="sv__cat" style={{ ["--c" as string]: copy.acc }}>
                    <span className="sv__cimg"><Image src={c.photo} alt={c.alt} fill sizes="(max-width: 900px) 100vw, 440px" style={{ objectPosition: c.pos }} /></span>
                    <span className="sv__ctxt">
                      <strong>{c.label}</strong>
                      <span>{c.systems.map((s) => s.label).join(" · ")}</span>
                      <em>See {c.label.toLowerCase()} <i aria-hidden="true">→</i></em>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div></div>
        </section>

        {/* 2. Every service, as the homepage's photo cards */}
        <section className="bk__sec bk__sec--cream" id="all">
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head">
              <h2 className="h2">Everything we do, <span>under one roof</span>.</h2>
              <p>Installs, servicing and repairs for homes and businesses across the south-east. Same crew and the same standard, whichever job it is.</p>
            </header>
            <div className="sg">
              {SERVICES.map((v) => {
                const body = (
                  <>
                    <Image src={v.photo} alt={v.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 420px" style={{ objectPosition: v.pos }} />
                    <span className="sg__shade" aria-hidden="true" />
                    <span className="sg__body">
                      <strong>{v.t}</strong>
                      <span className="sg__more"><span>{v.s}</span><em>{v.cta} →</em></span>
                    </span>
                  </>
                );
                return v.href.startsWith("tel:") ? (
                  <a key={v.t} href={v.href} data-call-from="services-page-card" className="sg__card">{body}</a>
                ) : (
                  <Link key={v.t} href={v.href} className="sg__card">{body}</Link>
                );
              })}
            </div>
          </div></div>
        </section>

        {/* 3. The emergency line */}
        <section className="bk__sec bk__sec--red" id="emergency" style={{ ["--acc" as string]: "#C83A2B" }}>
          <div className="wrap"><div className="bk__blk sv__sos">
            <div className="bk__head">
              <h2 className="h2">Gas leak, no hot water <span>or no heat?</span></h2>
              <p>Call any time. After hours goes to someone on the tools, not a call centre.</p>
            </div>
            <a href="tel:+61359478000" className="sv__call" data-call-from="services-emergency">
              <small>24/7 emergency</small>
              <strong>(03) 5947 8000</strong>
            </a>
          </div></div>
        </section>

        {/* 4. Why us */}
        <section className="bk__sec bk__sec--navy" id="why">
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head">
              <h2 className="h2">The same crew, <span>every job</span>.</h2>
              <p>The person who quotes your job is on the same team as the person who installs it.</p>
            </header>
            <ul className="cx__why" data-anim="stagger">
              <li><b>12 yrs</b><strong>On the tools</strong><span>Across Pakenham and the south-east.</span></li>
              <li><b>6 yrs</b><strong>Workmanship warranty</strong><span>On every install, on top of the manufacturer&apos;s.</span></li>
              <li><b>In writing</b><strong>One fixed price</strong><span>It only changes if the job does, and you approve it first.</span></li>
              <li><b>{RATING_TEXT}</b><strong>On Google</strong><span>From {RATING_SUMMARY.count} reviews by local households.</span></li>
            </ul>
          </div></div>
        </section>

        {/* 5. Reviews */}
        <section className="bk__sec bk__sec--white" id="reviews">
          <div className="wrap"><div className="bk__blk bk__col">
            <div className="pp__revhead">
              <header className="bk__head"><h2 className="h2">From local <span>households</span>.</h2></header>
              <Link href="/reviews">Read every review →</Link>
            </div>
            <div className="pp__revs" data-anim="stagger">
              {reviews.map((r) => (
                <article key={r.who + r.title} className="rev">
                  <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                  <h3>{r.title}</h3>
                  <p>&ldquo;{r.txt}&rdquo;</p>
                  <div className="rev__who">
                    <span aria-hidden="true">{r.a}</span>
                    <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                  </div>
                </article>
              ))}
            </div>
          </div></div>
        </section>

        <section className="bk__sec bk__sec--white">
          <div className="wrap">
            <div className="bk__box bk__box--acc bk__cta">
              <div>
                <h2 className="bk__boxh">Not sure which one <span>you need</span>?</h2>
                <p>Tell us what&apos;s going on and we&apos;ll point you at the right job, with a fixed price in writing.</p>
              </div>
              <div className="bxh__ctas">
                <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
                <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="services-cta">Call (03) 5947 8000</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
