import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { HeroQuote } from "@/components/homepage/HeroQuote";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "@/components/homepage/page/kit";
import { REVIEWS, RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";

export const metadata: Metadata = {
  title: "Get a Free Quote, Pakenham VEU-applied",
  description:
    "Free, no-obligation quote in 60 seconds from licensed Pakenham aircon and heat pump installers. A free site check, then one fixed price in writing.",
  alternates: { canonical: "/quote" },
  robots: { index: true, follow: true },
};

/**
 * The quote page. The form stays in the header, beside the promise, so it's
 * the first thing on the screen: plenty of people arrive already decided.
 * Below it, the page is for the ones who aren't yet, and its job (Jake, Nov
 * 2026) is trust: exactly what happens after they send it, what the written
 * quote will contain, who prices it, what we promise about that price, the
 * licences behind it, and other customers on how their quote went.
 *
 * Every claim here is one the site already makes elsewhere. The example
 * quote shows the layout only, never a dollar figure, because prices are
 * off across the site until Jake's are in.
 */
const PROMISES: [string, string][] = [
  ["VEU rebate handled for you.", "For eligible homes we apply it at the quote, so you never chase it."],
  ["Licensed plumbing & refrigeration.", "Compliance certificate on completion."],
  ["6-year workmanship warranty", "on every install."],
  ["Same-week installation.", "Most jobs scheduled within 5–7 days of approval."],
];

const STEPS = [
  { when: "Now", t: "Tell us what you need", d: "A few taps on the form above, or a call. About a minute, and no obligation." },
  { when: "Within 12 business hours", t: "We call you back", d: "To ask anything the form didn't and book a time that suits you." },
  { when: "At your place", t: "A free site check", d: "We look at the space, confirm the size and check for anything that changes the price, before we price it." },
  { when: "After the visit", t: "Your written quote", d: "One fixed price, with the model, the work and the warranty spelled out. Take your time with it." },
];

/** What the written quote spells out, in the order it appears on the page. */
const INCLUDES: [string, string][] = [
  ["The exact model and size", "Brand, model number and capacity, sized from the site check, not guessed from a phone call."],
  ["Everything the job includes", "The install, the materials, taking the old system away where there is one, and the compliance certificate."],
  ["The rebate, already off", "For eligible homes the VEU rebate comes straight off the price, so the figure you see is the figure you pay."],
  ["Both warranties", "The manufacturer's on the unit, plus six years on our workmanship."],
  ["One fixed total", "It only changes if the job does, and we ask you first."],
];

const PRICE_PROMISE: [string, string][] = [
  ["Free, and no obligation", "The quote and the site check cost nothing, and there's no pressure to go ahead."],
  ["The price quoted is the price paid", "One fixed figure in writing, so the invoice matches the quote."],
  ["It only changes if the job does", "And if it does, we tell you why and ask before any work is done."],
];

/** Answers drawn from what the rest of the site already promises, nothing new. */
const FAQS = [
  { q: "Is the quote really free?", a: "Yes. The quote and the site check are free, and there's no obligation to go ahead." },
  { q: "How quickly will I hear back?", a: "Within 12 business hours. If it's urgent, call (03) 5947 8000: after hours goes to someone on the tools." },
  { q: "Why do you need a site check?", a: "So the price is right the first time. We confirm the size and look for anything that affects the work, then put one fixed price in writing." },
  { q: "Will the price change after the site check?", a: "The written quote that follows the site check is one fixed price, with the model, the work and the warranty spelled out. It only changes if the job does, and we ask you first." },
  { q: "Do you handle the VEU rebate?", a: "Yes. For eligible homes we apply it at the quote, so it comes straight off the price and you never chase it." },
  { q: "How soon can you install?", a: "Most jobs are scheduled within 5 to 7 days of the quote being approved." },
  { q: "What warranty do I get?", a: "The manufacturer's warranty on the unit, plus 6 years on our workmanship, and a compliance certificate on completion." },
  { q: "Who will come to my home?", a: "Our own crew. Every installer and apprentice works for us; we don't use labour hire or subcontractors." },
];

const CREDENTIALS: [string, string][] = [
  ["Plumbing licence", "46828"],
  ["ARC refrigeration", "AU59557"],
  ["Public liability", "$20M"],
  ["VEU provider", "Accredited"],
];

export default function QuotePage() {
  // Reviews that talk about the quote, the price or the invoice first.
  const onQuote = REVIEWS.filter((r) => !/family/i.test(r.title + r.txt) && /quot|price|invoice|rebate/i.test(r.title + r.txt));
  const reviews = [...onQuote, ...REVIEWS.filter((r) => !onQuote.includes(r) && !/family/i.test(r.title + r.txt))].slice(0, 3);
  const pull = REVIEWS.find((r) => /invoice/i.test(r.txt));

  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    // Two boxes: the blocks styles hang off .bk sitting inside .ag.
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />
      <Crumbs trail={[{ name: "Get a quote" }]} />
      <section className="qpg" id="form" data-hide-sticky-cta>
        <div className="wrap qpg__in">
          <div className="qpg__copy">
            <span className="lk2__eye cx__eye">Free quote · usually back within 12 hrs</span>
            <h1 className="qpg__h1">Tell us what you need. Get a <em>written price.</em></h1>
            <p className="qpg__sub">A few quick taps, no obligation and no spam. We call you back within 12 business hours to book a free site check, then put one fixed price in writing.</p>
            <ul className="qpg__list">
              {PROMISES.map(([b, t]) => <li key={b}><span aria-hidden="true">✓</span><p><strong>{b}</strong> {t}</p></li>)}
            </ul>
            <p className="qpg__call">Prefer to talk? <a href="tel:+61359478000" data-call-from="quote-page">Call (03) 5947 8000</a>, {openingHours()}. After hours goes to someone on the tools.</p>
          </div>
          <div className="qpg__form"><HeroQuote /></div>
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">
          {[["how", "How it works"], ["inside", "What's in your quote"], ["who", "Who prices it"], ["promise", "Our price promise"], ["reviews", "Reviews"], ["faqs", "FAQs"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </div>
      </nav>

      {/* 1. What happens after you send it */}
      <section className="bk__sec bk__sec--white" id="how">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">What happens <span>after you send it</span>.</h2>
            <p>No call centre. Four steps from your request to a price you can hold us to.</p>
          </header>
          <ol className="qpg__steps" data-anim="stagger">
            {STEPS.map((x, i) => (
              <li key={x.t}>
                <span className="qpg__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <small className="qpg__when">{x.when}</small>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </li>
            ))}
          </ol>
          <p className="qpg__more">Say yes and most jobs are scheduled within 5 to 7 days. Not sure what you need yet? <Link href="/#find">Find your system</Link> or <Link href="/tools/sizing-calculator">work out the size</Link>.</p>
        </div></div>
      </section>

      {/* 2. What the written quote contains */}
      <section className="bk__sec bk__sec--navy" id="inside">
        <div className="wrap"><div className="bk__blk qx__in">
          <div className="bk__col">
            <header className="bk__head">
              <h2 className="h2">What&apos;s in <span>your quote</span>.</h2>
              <p>Not a number on the back of a business card. Every quote is written down, line by line, so you can compare it with anyone else&apos;s.</p>
            </header>
            <ul className="qx__list" data-anim="stagger">
              {INCLUDES.map(([h, p]) => <li key={h}><span aria-hidden="true">✓</span><div><strong>{h}</strong><p>{p}</p></div></li>)}
            </ul>
          </div>
          {/* The layout of a real quote, with no figures: an illustration, not an offer. */}
          <figure className="qx__doc" aria-label="Example of how a written quote is laid out">
            <div className="qx__dhead">
              <span className="qx__logo"><Image src="/advanced-gas-logo-clear.webp" alt="Advanced Gas &amp; Aircon" width={132} height={44} /></span>
              <span className="qx__tag">Example layout</span>
            </div>
            <div className="qx__drow qx__drow--title"><strong>Written quote</strong><small>Lic. 46828 · ARC AU59557</small></div>
            <ol className="qx__lines">
              <li><b>The system</b><span>Brand, model and capacity, sized at the site check</span></li>
              <li><b>Installation</b><span>The work, the materials and commissioning</span></li>
              <li><b>Old system</b><span>Removed and disposed of, where there is one</span></li>
              <li><b>VEU rebate</b><span>Already taken off, for eligible homes</span></li>
              <li><b>Warranty</b><span>Manufacturer&apos;s, plus 6 years on our workmanship</span></li>
              <li><b>Compliance</b><span>Certificate emailed within 24 hours</span></li>
            </ol>
            <div className="qx__total"><span>Your total</span><strong>One fixed price</strong></div>
            <figcaption>Changes only if the job does, and we ask you first.</figcaption>
          </figure>
        </div></div>
      </section>

      {/* 3. Who prices it */}
      <section className="bk__sec bk__sec--cream" id="who">
        <div className="wrap"><div className="bk__blk qx__who">
          <div className="bk__col">
            <header className="bk__head">
              <h2 className="h2">Priced by the people <span>who answer for it</span>.</h2>
              <p>Your quote comes from Jake, who runs estimating and quoting. The person who quotes your job is on the same team as the person who installs it.</p>
            </header>
            <p className="qpg__more">More about the team, our licences and our insurance on the <Link href="/about">About us</Link> page.</p>
          </div>
          <div className="qx__people" data-anim="stagger">
            <article>
              <span className="qx__ph"><Image src="/jake.webp" alt="Jake Deppeler, director" fill sizes="(max-width: 700px) 100vw, 300px" /></span>
              <strong>Jake Deppeler</strong><small>Director · estimating &amp; quoting</small>
              <p>Makes sure every customer gets one clear price in writing, with any rebate worked in, and that the price quoted is the price paid.</p>
            </article>
            <article>
              <span className="qx__ph"><Image src="/dean.webp" alt="Dean Winbanks, director" fill sizes="(max-width: 700px) 100vw, 300px" /></span>
              <strong>Dean Winbanks</strong><small>Director · Plumbing Lic. 46828</small>
              <p>Sets the technical standard every job is measured against, trains the crew to it, and signs off the work.</p>
            </article>
          </div>
        </div></div>
      </section>

      {/* 4. The promise about the price */}
      <section className="bk__sec bk__sec--red" id="promise">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">Our promise <span>on price</span>.</h2>
            <p>Three things that hold for every quote we write.</p>
          </header>
          <ul className="qx__promise" data-anim="stagger">
            {PRICE_PROMISE.map(([h, p], i) => <li key={h}><b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b><strong>{h}</strong><span>{p}</span></li>)}
          </ul>
          {pull && (
            <blockquote className="qx__pull">
              <p>&ldquo;{pull.txt}&rdquo;</p>
              <footer><span className="stars" aria-label="5 out of 5 stars">★★★★★</span> {pull.who}, {pull.what}</footer>
            </blockquote>
          )}
        </div></div>
      </section>

      {/* 5. Licences, the short version */}
      <section className="bk__sec bk__sec--white">
        <div className="wrap"><div className="bk__blk bk__boxed qx__cred">
          <header className="bk__head">
            <h2 className="h2">Licensed, insured <span>and on record</span>.</h2>
            <p>Every number can be checked. Certificates of currency on request.</p>
          </header>
          <dl className="qx__creds">{CREDENTIALS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </div></div>
      </section>

      {/* 6. How other people's quotes went */}
      <section className="bk__sec bk__sec--white" id="reviews">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="pp__revhead">
            <header className="bk__head">
              <h2 className="h2">How their <span>quote went</span>.</h2>
              <p>{RATING_TEXT} from {RATING_SUMMARY.count} Google reviews by local households.</p>
            </header>
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

      <section className="bk__sec bk__sec--cream" id="faqs">
        <div className="wrap"><div className="bk__blk pp__two">
          <div className="bk__head">
            <h2 className="h2">Questions about <span>the quote</span>.</h2>
            <p>Still want a human? <a href="tel:+61359478000" data-call-from="quote-faq">Call (03) 5947 8000</a>.</p>
          </div>
          <div className="afaqs">
            {FAQS.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
        </div></div>
      </section>

      <section className="bk__sec bk__sec--white">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">Ready? It takes <span>about a minute</span>.</h2>
              <p>Free, no obligation, and a written price you can hold us to.</p>
            </div>
            <div className="bxh__ctas">
              <a href="#form" className="abtn abtn--or abtn--flat">Start my free quote ↑</a>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="quote-cta">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div></div>
  );
}
