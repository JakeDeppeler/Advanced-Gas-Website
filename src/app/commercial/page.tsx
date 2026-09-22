import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import { COMM_DOORS, COMM_FAQS } from "@/lib/commercial";
import { CommercialScopeForm } from "@/components/CommercialScopeForm";
import { CommercialJourney } from "@/components/CommercialJourney";
import { CountUp } from "@/components/CountUp";
import { DoorIcon } from "@/components/DoorIcon";
import "../home.css";
import "./commercial.css";

// Same treatment as the homepage: the map is below several full sections on
// every viewport, so its Leaflet chunk and 15KB of CSS stay off the first paint.
const ServiceAreaMap = dynamic(
  () => import("@/components/ServiceAreaMap").then((m) => m.ServiceAreaMap),
  { ssr: false, loading: () => <div className="map__leaflet" aria-hidden="true" /> }
);

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical, Melbourne",
  description:
    "Commercial mechanical, Type A gas and hot water across Melbourne's south-east. Fit-outs, plant replacement, maintenance. $20M public liability, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The commercial front page.
 *
 * It used to be the homepage's layout beat for beat, which was the wrong
 * instinct twice over. Structurally it meant eight sections in a row of
 * eyebrow, enormous heading, paragraph, grid of identical cards — the same
 * shape eight times, so nothing on the page had any rank. Visually it meant
 * alternating full-bleed colour bands, including a floor-to-ceiling orange one
 * wrapped around the enquiry form. Orange at that area is the loudest thing a
 * page can do, and doing it behind the single most important control on the
 * page made the most serious moment look like the least serious.
 *
 * A facility manager or a head contractor is not browsing. They are checking
 * whether putting us on site will make work for them, and they read in a
 * specific order: who else has let you in, what exactly do you take on, what
 * are your insurances, how do you handle variations. So the page is built as a
 * capability document rather than a brochure:
 *
 *   · The client names move from six thousand pixels down to directly under
 *     the hero. They are the strongest thing on the page and they were filed
 *     below three sections of our own claims about ourselves.
 *   · The eight packages become a specification list rather than eight cards
 *     with nested bullets. A schedule reads as a schedule.
 *   · The standard becomes a numbered list with rules between the items, so
 *     it reads as terms rather than as more marketing tiles.
 *   · One dark band on the page — the process — instead of four.
 *   · No orange grounds anywhere. Orange is a rule, a numeral and one button.
 *
 * The "What's the job?" fork is gone. Four doors to four anchors on
 * /commercial/services, directly above a section that lists all eight packages
 * and links to the same anchors, was the page asking the same question twice.
 * It earns its place on the residential side, where the visitor genuinely may
 * not know what they want.
 */

export default function CommercialPage() {
  return (
    // page-home is the marketing-page layout scope, not the homepage itself —
    // the hero and the section rhythm hang off it.
    <div className="page-home page-comm page-framed">
      {/* HERO */}
      <section className="hero hero--split comm-top" data-stop="hero">
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <span className="hero__badge">
              <span className="ds-dot" />
              Commercial &amp; industrial
            </span>
            <h1 className="hero__h1">One standard. Every site.</h1>
            <p className="hero__sub">
              Mechanical services, Type A gas and commercial hot water across Melbourne&rsquo;s south-east and Gippsland.
              Directly employed crews, a written standard, and one person accountable for the package.
            </p>

            <div className="hero__ctas" data-hide-sticky-cta>
              <a href="#scope" className="ds-btn ds-btn--orange ds-btn--lg">Submit a scope →</a>
              <Link href="/commercial/capability" className="ds-btn ds-btn--ghost ds-btn--lg">Capability statement</Link>
            </div>

            <p className="hero__rebate">
              SWMS, certificates of currency and inductions supplied before site access, usually back the same day.
            </p>

            <div className="hero__trust">
              <div className="trust-stat"><strong><CountUp value="$20M" /></strong><span>public liability</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong><CountUp value="12 yrs" /></strong><span>trading</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>Direct</strong><span>employed crews</span></div>
            </div>
          </div>

          <div className="hero__photo" aria-hidden="true">
            <Image
              src="/commercial.webp"
              alt=""
              width={1200}
              height={1400}
              sizes="(max-width: 980px) 100vw, 46vw"
              priority
            />
          </div>
        </div>
      </section>

      {/* START HERE — the home page's fork, in the home page's markup, so the
          two sides of the business read as one company. It was pulled out when
          this page was rebuilt as a capability document, on the grounds that
          the four doors pointed at four anchors the package list already
          linked. True, and beside the point: the fork is the first thing a
          reader meets on the residential side, and crossing over to find it
          missing makes the commercial side feel like somebody else's site. */}
      <section className="route" data-stop="fork">
        <div className="wrap">
          <div className="route__panel">
            <div className="ds-section-head ds-section-head--center">
              <span className="ds-eyebrow">Start here</span>
              <h2>What&rsquo;s the job?</h2>
            </div>
            <div className="routebtns">
              {COMM_DOORS.map((d, i) => (
                <Link key={d.href} href={d.href} className={`routebtn routebtn--${d.tone}`} style={{ ["--i" as string]: i }}>
                  <span className="routebtn__ico"><DoorIcon name={d.icon} /></span>
                  <span className="routebtn__txt">
                    <strong>{d.label}</strong>
                    <em>{d.sub}</em>
                  </span>
                  <span className="routebtn__go" aria-hidden="true">&rarr;</span>
                </Link>
              ))}
            </div>
            <p className="route__urgent">
              Plant down on a contracted site? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>. After hours goes
              to someone on the tools.
            </p>
          </div>
        </div>
      </section>

      {/* THE PAGE.

          Not a section any more. Four bands that used to sit around this one
          — who already lets us on site, what we take on, the four things
          procurement writes down, and why we get asked back — are beats
          inside it now, so the credentials arrive at the point in the job
          where they matter rather than as a stack of boxes somebody has to
          assemble into an argument themselves.

          Twelve beats, hero to handover to open doors. The drawing holds
          while they move past it, and each one ends on the line that says
          why it matters that we are the ones doing it.

          What is left outside it is what cannot be a drawing: the fork at
          the top, the map, the scope form, the questions and the close. */}
      <section className="comm-flow" data-stop="journey">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How we work</span>
            <h2 className="ds-h--on-dark">From your plans to a proper handover.</h2>
            <p className="comm-flow__lede">
              Who already lets us on site, what we take on, and then the whole job from the first email to the day
              the doors open. Everything we are holding ourselves to, at the point in the job where it matters.
            </p>
          </div>
          <CommercialJourney />
        </div>
      </section>

      {/* WHERE WE WORK */}
      <section className="area" id="area" data-stop="area">
        <div className="wrap area__grid">
          <div className="area__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Where we work</span>
            <h2>Based in Pakenham. On site anywhere in Victoria.</h2>
            <p>
              <strong>For the right job we travel.</strong> Rollouts, multi-site contracts and packages worth putting a
              crew on the road for &mdash; the Westpac branch was in Sale, and the contract work runs the width of the
              state. If your sites are spread, ask. The answer is usually yes.
            </p>
            <p className="comm-area__note">
              The circle is where the vans are every day: Melbourne&rsquo;s south-east and most of West Gippsland, no
              travel loading, same-week response. It is where we are cheapest to have on site, not the edge of where
              we&rsquo;ll go.
            </p>
            <a href="#scope" className="ds-btn ds-btn--primary">Submit a scope →</a>
          </div>
          <div className="area__right">
            <div className="map map--live" aria-label="Map of Victoria, with the 75 km daily service radius marked around Pakenham 3810">
              <ServiceAreaMap view="victoria" />
              <div className="map__badge">
                <span className="map__badge-eye">Vans here daily</span>
                <span className="map__badge-num">75&nbsp;km</span>
                <span className="map__badge-note">Anywhere in Victoria for the right job</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCOPE PANEL — the home page's orange quote box, with a scope form in
          it instead of a quote form.
      
          This has now been both things. It started orange, I made it paper on
          the grounds that the loudest colour on the site behind the most
          serious control read as a sales pitch, and that was the wrong call
          for a reason I should have seen: on the residential side the orange
          box IS the ask. It is the one band on the page that changes colour,
          and it changes colour precisely where the page stops explaining and
          starts asking. Taking it out of the commercial page did not make that
          page more serious, it made it a wall of cream with no beat in it. */}
      <section className="quotesec comm-scopesec" id="scope" data-stop="scope">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange"><span className="ds-dot ds-dot--on-orange" /> Priced against a written scope</span>
                <h2>Tell us what you&rsquo;re not being told.</h2>
                <p className="quotesec__lede">
                  Every mechanical package has a gap in it somewhere. The plans say one thing, the site says another,
                  and whoever notices last pays for it. We find the gap and put it in the scope, in writing, before
                  anyone signs.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">&#10003;</span> One price against one written scope</li>
                  <li><span className="tick tick--on-orange">&#10003;</span> Exclusions stated, not buried</li>
                  <li><span className="tick tick--on-orange">&#10003;</span> Variations approved before the work, not with the invoice</li>
                  <li><span className="tick tick--on-orange">&#10003;</span> SWMS and certificates back before anyone turns up</li>
                  <li><span className="tick tick--on-orange">&#10003;</span> Jake reads every commercial enquiry himself</li>
                </ul>
                {/* Four hundred pixels of empty orange sat under the ticks,
                    because the form column is much the taller of the two. The
                    gap is worth something: what happens after you press the
                    button is the thing somebody wants to know at the moment
                    they are deciding whether to. */}
                <div className="scopenext">
                  <span className="scopenext__lbl">After you send it</span>
                  <ol>
                    <li><b>Today</b><span>Read by the person who will price it, not a queue.</span></li>
                    <li><b>Inside a day</b><span>Questions back if the scope has a gap in it.</span></li>
                    <li><b>Then</b><span>One price against one written scope, exclusions stated.</span></li>
                  </ol>
                </div>
                <p className="quotesec__finep">
                  {site.licences.refrigeration} &middot; {site.licences.plumbing} &middot;
                  ABN {site.abn.replace(/ /g, "\u00a0")} &middot; $20M public liability
                </p>
              </div>
              <CommercialScopeForm />
            </div>
          </div>
        </div>
      </section>

      {/* QUESTIONS — the ones that decide whether we get on site. */}
      <section className="faq" data-stop="faq">
        <div className="wrap faq__grid">
          <div className="faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Before you put us on a site</span>
            <h2>Insurances, program, variations and the paperwork.</h2>
            <p>
              The questions that actually arrive before a first job. Want the lot on one page?{" "}
              <Link href="/commercial/capability">Read the capability statement</Link>.
            </p>
          </div>
          <div className="faq__right">
            {COMM_FAQS.map((f, i) => (
              <details key={f.q} name="commfaq" style={{ ["--i" as string]: i }} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSE */}
      <section className="bigcta bigcta--photo" data-stop="close" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <figure className="bigcta__photo">
            <Image
              src="/commercial-v3.webp"
              alt="Packaged rooftop plant being craned into position on a commercial site"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          </figure>
          <div className="bigcta__copy">
            <h2>Submit a scope for pricing.</h2>
            <p>
              Drawings, a mechanical schedule or a site address is sufficient to begin. Certificates of currency, SWMS
              and induction documentation are available on request and returned the same day.
            </p>
            <div className="bigcta__btns">
              <a href="#scope" className="ds-btn ds-btn--orange ds-btn--xl">Submit a scope →</a>
              <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
                or call <strong>{site.phone}</strong>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Script
        id="ld-commercial-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(COMM_FAQS)) }}
      />
    </div>
  );
}
