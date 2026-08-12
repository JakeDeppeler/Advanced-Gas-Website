import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { RATING_SUMMARY, REVIEWS } from "@/lib/reviews";
import { publishedSuburbs } from "@/lib/suburbs";
import { SafeImg } from "@/components/SafeImg";
import { LpLeadForm } from "@/components/LpLeadForm";
import "./lp.css";

/**
 * Paid-traffic landing page for hot water.
 *
 * This is a different animal from the rest of the site and the
 * differences are all deliberate:
 *
 *   No navigation. Every link out of a landing page is a way to not
 *   convert. The only outbound routes are the phone number, the form,
 *   and a single "see the full site" link right at the bottom for
 *   anyone who genuinely wants to browse.
 *
 *   noindex. This competes with /services/heat-pump-installation for
 *   the same organic terms and would split them. Google Ads does not
 *   need a page indexed to serve it. If we ever want it in organic,
 *   flip robots below and give it its own keyword angle.
 *
 *   Short form. Four fields, not a wizard. Someone whose tank died this
 *   morning is not filling in a wizard.
 *
 *   Situation first, product second. The ad clicked was "hot water",
 *   not "heat pump". Sorting them by what has happened qualifies the
 *   lead and tells us what to bring on the truck, before anyone has to
 *   care what a COP is.
 *
 * The site header and footer live in the root layout, which a nested
 * layout can't remove. `body:has(.lp)` in lp.css hides them for this
 * route only.
 */

export const metadata: Metadata = {
  title: "Hot Water Systems Pakenham, Same-Day Changeover",
  description:
    "Hot water repaired or replaced across Melbourne's south-east. Heat pump, gas continuous flow, gas storage and electric. VEU rebate applied at the quote, most changeovers same day.",
  alternates: { canonical: "/lp/hot-water" },
  // Ad traffic only. See the note at the top of this file.
  robots: { index: false, follow: true },
};

/* ---------------- content ---------------- */

const SITUATIONS = [
  {
    t: "No hot water at all",
    d: "Cold shower this morning, or a pilot light that won't stay in. We keep changeover stock on the truck and most of these are back on the same day.",
    tag: "Same-day",
  },
  {
    t: "Runs out halfway through",
    d: "The tank is undersized, the element has gone, or the thermostat has drifted. Sometimes a repair, often a sign the tank is near the end. We'll tell you which.",
    tag: "Diagnose first",
  },
  {
    t: "Leaking or rusty at the base",
    d: "A tank weeping at the seam is finished, and it will not get better. This one is a replacement, and the sooner it's booked the less water damage there is.",
    tag: "Replace",
  },
  {
    t: "Still works, but it's old",
    d: "The best time to do this. No emergency, no premium, and you get to choose the system rather than take whatever fits today.",
    tag: "Planned",
  },
];

const SYSTEMS = [
  {
    name: "Heat pump",
    line: "The one the rebate is written for",
    body: "Runs on a quarter of the electricity of an old electric tank because it moves heat rather than making it. Takes the full VEU rebate, applied at the quote. Needs a spot outside, or an all-in-one where the old tank stood.",
    points: ["Reclaim, Thermann, iStore", "160 L to 400 L", "VEU rebate applied at quote"],
  },
  {
    name: "Gas continuous flow",
    line: "Never runs out",
    body: "Heats on demand, so there's no tank losing heat overnight and no running out at the third shower. Wall-mounted outside, about the size of a briefcase. Sized on how many outlets could run at once, not on people.",
    points: ["Thermann G-series, Rinnai", "16, 20, 26 and 32 L/min", "Most swaps done same day"],
  },
  {
    name: "Gas storage",
    line: "The straight like-for-like",
    body: "If a gas tank is what's there and a gas tank is what you want back, this is the quickest, least disruptive job on the list. 135 L and 170 L, 4-star.",
    points: ["Thermann 135 L and 170 L", "Natural gas or LPG", "Same pad, same pipework"],
  },
  {
    name: "Electric storage",
    line: "When nothing else fits",
    body: "Body corporate rules, a rental, or simply nowhere outside for a heat pump. It doesn't attract the VEU rebate and it's the dearest fuel to run, and we'll say so, but sometimes it's the only thing that goes in.",
    points: ["80 L to 400 L", "Twin element available", "Emergency same-day swap"],
  },
];

const STEPS = [
  { n: "1", t: "Call or send the form", d: "Tell us what's happened and where you are. If you can, send a photo of the old unit and its plate." },
  { n: "2", t: "Fixed price back in 2 hours", d: "Model, capacity, warranty and the installed price with the rebate already taken off. The number on the quote is the number on the invoice." },
  { n: "3", t: "We fit it, usually same day", d: "Old unit drained, disconnected and taken away. Tempering valve, isolation valves, dedicated circuit, all to standard." },
  { n: "4", t: "Certificate in 24 hours", d: "Plumbing compliance certificate emailed, manufacturer warranty registered in your name, VEU paperwork lodged by us." },
];

const WHY = [
  { t: "The bloke who quotes it fits it", d: "No sales rep, no subcontractor you've never met turning up on the day." },
  { t: "6-year workmanship warranty", d: "On top of the manufacturer's tank and compressor cover, whatever brand goes in." },
  { t: "We do the rebate paperwork", d: "Eligibility, certificates, lodgement. You don't front the cash and chase it back." },
  { t: "VBA-licensed plumbers", d: "Licence 46828, full Type-A gas endorsement, $20M public liability." },
  { t: "Old unit gone the same day", d: "Off the pad, out the gate, to a recycler. No hard-rubbish wait." },
  { t: "We'll talk you out of it", d: "If your tank has five good years left, we'll service it and tell you to ring us in 2031." },
];

const FAQS = [
  {
    q: "My hot water died this morning. How fast can you get here?",
    a: "Same day across Pakenham, Officer, Berwick, Beaconsfield, Narre Warren, Cranbourne and out to Drouin and Warragul, if you ring in the morning. We carry changeover stock, so in most cases it's fixed or replaced on the first visit rather than diagnosed on one and repaired on another.",
  },
  {
    q: "Repair or replace?",
    a: "Under about eight years old and it's a component, repair it. Past twelve, or leaking from the tank itself rather than a fitting, replace it. Between the two it depends on what failed, and we'll give you both numbers rather than deciding for you.",
  },
  {
    q: "How much is the rebate and do I have to chase it?",
    a: "You don't chase anything. We're an accredited installer, so the Victorian Energy Upgrades rebate is worked out at the quote and taken off the price before you pay. The amount depends on your address, your existing system and the unit going in, which is why we confirm it before you commit rather than advertising a figure.",
  },
  {
    q: "Do I have to switch to a heat pump?",
    a: "No. If you want gas back, we'll fit gas. Heat pumps get recommended because the running cost and the rebate usually make them the cheaper option over a few years, not because we're pushing them. Where there's genuinely nowhere to put one, we'll say so.",
  },
  {
    q: "What size do I need?",
    a: "It depends on when your household showers, not just how many people live there. Four people spread across the day need far less stored water than four people inside one hour. We do that sum before quoting a size, and there's a calculator on the main site if you want to run it yourself.",
  },
  {
    q: "Is the price on the quote the price I pay?",
    a: "Yes. Fixed price, rebate already applied, GST included. If something on site turns out to be different from what we were told, we stop and requote before doing the work. We don't discover extra cost halfway through and bill you afterwards.",
  },
];

/* ---------------- page ---------------- */

export default function HotWaterLandingPage() {
  const reviews = REVIEWS.slice(0, 3);
  const suburbs = publishedSuburbs.slice(0, 24);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="lp">
      <Script id="lp-hw-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ---------- slim header, no nav ---------- */}
      <header className="lph">
        <div className="lp-wrap lph__row">
          {/* Not a link. On a landing page the logo is a trust mark, not
              a way back to a site with twelve other things to read. */}
          <div className="lph__brand">
            <img
              src="/advanced-gas-logo.webp"
              alt={`${site.name} logo`}
              width="280"
              height="140"
              className="lph__logo"
              fetchPriority="high"
            />
            <span className="lph__lic">VBA Lic. 46828 · ARCtick certified</span>
          </div>
          <a href={`tel:${site.phoneE164}`} className="lph__call">
            <span className="lph__call-lbl">Call now</span>
            <strong>{site.phone}</strong>
          </a>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true">
          <SafeImg src="/team-photo.webp" alt="" width="1600" height="900" fetchPriority="high" />
        </div>
        <div className="lp-wrap lp-hero__grid">
          <div className="lp-hero__copy">
            <span className="lp-eyebrow">Pakenham &amp; Melbourne&rsquo;s south-east · within 75 km</span>
            <h1>
              No hot water? <em>We&rsquo;ll have it back on today.</em>
            </h1>
            <p className="lp-hero__sub">
              Heat pump, gas continuous flow, gas storage or electric, repaired or replaced
              by licensed plumbers. Fixed price back in two business hours, VEU rebate
              applied at the quote, and the old unit gone the same day.
            </p>

            <ul className="lp-hero__ticks">
              <li>Same-day changeovers, stock on the truck</li>
              <li>Fixed price, rebate already taken off</li>
              <li>6-year workmanship warranty on every install</li>
              <li>The bloke who quotes it is the bloke who fits it</li>
            </ul>

            <div className="lp-hero__ctas">
              <a href={`tel:${site.phoneE164}`} className="lp-btn lp-btn--orange lp-btn--lg">
                Call {site.phone}
              </a>
              <a href="#lp-form" className="lp-btn lp-btn--ghost lp-btn--lg">
                Or get a fixed price →
              </a>
            </div>

            <div className="lp-trust">
              <div className="lp-trust__item">
                <strong>{RATING_SUMMARY.value}★</strong>
                <span>on Google</span>
              </div>
              <div className="lp-trust__item">
                <strong>1,200+</strong>
                <span>installs since 2014</span>
              </div>
              <div className="lp-trust__item">
                <strong>6 yr</strong>
                <span>workmanship warranty</span>
              </div>
              <div className="lp-trust__item">
                <strong>$20M</strong>
                <span>public liability</span>
              </div>
            </div>
          </div>

          <div className="lp-hero__form">
            <LpLeadForm id="lp-form" />
          </div>
        </div>
      </section>

      {/* ---------- credential strip ---------- */}
      <section className="lp-creds">
        <div className="lp-wrap lp-creds__row">
          <span>VBA-licensed plumbers</span>
          <span>Type-A gas endorsed</span>
          <span>ARCtick refrigeration</span>
          <span>VEU accredited installer</span>
          <span>Family-owned, Pakenham</span>
        </div>
      </section>

      {/* ---------- situation ---------- */}
      <section className="lp-sec lp-sit">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">Start here</span>
            <h2>Which one is you?</h2>
            <p>
              Four things send people looking for a plumber at 7am. What we bring on the
              truck depends on which one it is, so this is the first question we ask.
            </p>
          </div>
          <div className="lp-sit__grid">
            {SITUATIONS.map((s) => (
              <article key={s.t} className="lp-sit__card">
                <span className="lp-sit__tag">{s.tag}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <a href="#lp-form" className="lp-sit__go">That&rsquo;s me →</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- rebate strip ---------- */}
      <section className="lp-rebate">
        <div className="lp-wrap lp-rebate__row">
          <div>
            <h2>The VEU rebate comes off before you pay.</h2>
            <p>
              We&rsquo;re an accredited installer, so eligibility, certificates and lodgement
              are ours to deal with. Your quote shows the price after the rebate, not a
              price you claim back six months later and hope for.
            </p>
          </div>
          <a href="#lp-form" className="lp-btn lp-btn--orange lp-btn--lg">
            Check what I&rsquo;m eligible for →
          </a>
        </div>
      </section>

      {/* ---------- systems ---------- */}
      <section className="lp-sec lp-sys">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">Your options</span>
            <h2>Four ways to heat water, and who each one suits.</h2>
            <p>
              We fit all four. Which one you end up with depends on your house, your
              household and what&rsquo;s already there, not on what we&rsquo;d rather sell.
            </p>
          </div>
          <div className="lp-sys__grid">
            {SYSTEMS.map((s) => (
              <article key={s.name} className="lp-sys__card">
                <div className="lp-sys__top">
                  <h3>{s.name}</h3>
                  <span>{s.line}</span>
                </div>
                <p>{s.body}</p>
                <ul>
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <a href="#lp-form" className="lp-sys__go">Price this for my place →</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="lp-sec lp-steps">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">How it goes</span>
            <h2>Call in the morning, hot water by the evening.</h2>
          </div>
          <ol className="lp-steps__grid">
            {STEPS.map((s) => (
              <li key={s.n} className="lp-steps__item">
                <span className="lp-steps__n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- why us ---------- */}
      <section className="lp-sec lp-why">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">Why us</span>
            <h2>You&rsquo;ll get three quotes. Two will look the same.</h2>
            <p>This is the part that isn&rsquo;t on the paper.</p>
          </div>
          <div className="lp-why__grid">
            {WHY.map((w) => (
              <div key={w.t} className="lp-why__item">
                <h3>{w.t}</h3>
                <p>{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- reviews ---------- */}
      <section className="lp-sec lp-rev">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">What people say</span>
            <h2>{RATING_SUMMARY.value} out of 5 on Google.</h2>
          </div>
          <div className="lp-rev__grid">
            {reviews.map((r) => (
              <figure key={r.who} className="lp-rev__card">
                <div className="lp-rev__stars" aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(Math.round(r.rating))}
                </div>
                <blockquote>{r.txt}</blockquote>
                <figcaption>
                  <span className="lp-rev__av">{r.a}</span>
                  <span>
                    <strong>{r.who}</strong>
                    <em>{r.what}</em>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- area ---------- */}
      <section className="lp-sec lp-area">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">Where we work</span>
            <h2>Pakenham, and everywhere within 75 km.</h2>
          </div>
          <ul className="lp-area__chips">
            {suburbs.map((s) => (
              <li key={s.slug}>{s.name}</li>
            ))}
            <li className="lp-area__more">and everywhere between</li>
          </ul>
        </div>
      </section>

      {/* ---------- faq ---------- */}
      <section className="lp-sec lp-faq">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow lp-eyebrow--dark">Before you call</span>
            <h2>The questions we get every week.</h2>
          </div>
          <div className="lp-faq__list">
            {FAQS.map((f) => (
              <details key={f.q} className="lp-faq__item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- closing form ---------- */}
      <section className="lp-close">
        <div className="lp-wrap lp-close__grid">
          <div>
            <h2>Get your fixed price.</h2>
            <p>
              Two business hours, no obligation, and a real person on the other end of
              it. If it&rsquo;s an emergency, skip the form and ring, we answer our own
              phone.
            </p>
            <a href={`tel:${site.phoneE164}`} className="lp-btn lp-btn--orange lp-btn--lg">
              Call {site.phone}
            </a>
          </div>
          <div className="lp-close__form">
            <LpLeadForm id="lp-form-2" compact />
          </div>
        </div>
      </section>

      {/* ---------- minimal footer ---------- */}
      <footer className="lpf-foot">
        <div className="lp-wrap lpf-foot__row">
          <span>
            {site.legalName} · ABN {site.abn} · Plumbing Lic. 46828
          </span>
          <span className="lpf-foot__links">
            <Link href="/">Full website</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </span>
        </div>
      </footer>

      {/* ---------- sticky call bar, mobile ---------- */}
      <div className="lp-sticky">
        <a href={`tel:${site.phoneE164}`} className="lp-sticky__call">
          Call {site.phone}
        </a>
        <a href="#lp-form" className="lp-sticky__form">
          Fixed price
        </a>
      </div>
    </div>
  );
}
