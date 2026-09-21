import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import {
  COMM_SCOPES, COMM_CLIENTS,
  COMM_DOORS, COMM_STANDARD, COMM_FAQS, COMM_FACTS,
} from "@/lib/commercial";
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
    <div className="page-home page-comm">
      {/* HERO */}
      <section className="hero hero--split comm-top">
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
      <section className="route">
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

      {/* WHO HAS ALREADY LET US IN — the home page's brand strip, carrying
          client names instead of manufacturer names. Same slot, same
          treatment: the thing directly under the fork on both sides of the
          business is the row of names that says other people already trust
          this. It was a bare list of text on white with hairlines under it,
          which read as an unstyled table rather than a credential. */}
      <section className="brands comm-clients">
        <div className="wrap">
          <div className="brands__lead">
            <span className="brands__label">On site for</span>
            <span className="brands__rule" />
            <span className="brands__partner">
              Brands with a procurement process and an auditor
            </span>
          </div>
          <div className="brands__grid">
            {COMM_CLIENTS.map((c, i) => (
              <div key={c.name} className="brand-chip" style={{ ["--i" as string]: i }}>
                <span className="brand-chip__name">{c.name}</span>
                <span className="brand-chip__type">{c.what}</span>
              </div>
            ))}
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
      <section className="quotesec comm-scopesec" id="scope">
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

      {/* WHAT WE TAKE ON — a schedule, not eight cards. Each row is a package,
          who it suits, and what is in it; the detail lives on the services
          page, which every row links to. On paper rather than a navy band,
          because a reader comparing eight things needs them to be easy to read
          rather than impressive to look at. */}
      <section className="comm-packs" id="scopes">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What we do</span>
            <h2>Everything mechanical, gas and hot water, under one trade.</h2>
            <p>
              We&rsquo;re a specialist mechanical, gas and hot water contractor, not a builder. Every one of these is a
              package we own from the drawings through to handover, with our own crew on it. Nothing here gets passed
              to somebody else once you&rsquo;ve signed.
            </p>
          </div>

          {/* The home page's card grid, in the home page's classes — this page
              carries `page-home` as its layout scope, so .bcard is already
              styled. No photographs on them: there are three genuinely
              commercial shots on this site and ten packages, and filling the
              gap with domestic install photos would be the one thing a
              facility manager would notice. The number does the work the
              photograph does on the home page. */}
          <div className="bento bento--packs">
            {COMM_SCOPES.map((sc, i) => (
              <Link key={sc.slug} href={`/commercial/services#${sc.slug}`} className="bcard bcard--pack" style={{ ["--i" as string]: i }}>
                <div className="bcard__body">
                  <span className="bcard__num">{sc.n}</span>
                  <h3>{sc.title}</h3>
                  <p>{sc.lede}</p>
                  <span className="packcard__suits">{sc.suits}</span>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* THE FIGURES — where the home page puts its rebate band: one dark
          band of big numbers in the middle of the page, so the eye has
          somewhere to land between two runs of cards. The four figures were
          four hairline items at the bottom of a text list, which is where a
          number goes to be ignored. */}
      <section className="comm-figs">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Before you put us on a site</span>
            <h2 className="ds-h--on-dark">The four things procurement writes down.</h2>
          </div>
          <div className="comm-figs__grid">
            {COMM_FACTS.map((f, i) => (
              <div key={f.k} className="commfig" style={{ ["--i" as string]: i }}>
                <strong><CountUp value={f.n} /></strong>
                <span>{f.k}</span>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
          <Link href="/commercial/capability" className="comm-caplink comm-caplink--dark">
            <span>
              <strong>Capability statement</strong>
              ABN, licences, insurances, safety systems, capacity and past projects, on one page you can file.
            </span>
            <span className="comm-caplink__go">Everything procurement asks for &rarr;</span>
          </Link>
        </div>
      </section>

      {/* THE STANDARD — the homepage's "why us". The crew photograph sits
          beside the argument rather than inside the grid of points: it is the
          evidence for the first claim, so it belongs next to the sentence that
          makes it, not filed as one card among six. */}
      <section className="comm-std">
        <div className="wrap">
          <div className="comm-std__top">
            <div className="comm-std__intro">
              <span className="ds-eyebrow"><span className="ds-dot" /> Why we get asked back</span>
              <h2>Size isn&rsquo;t the credential. Doing the same thing every time is.</h2>
              <p>
                Every one of these is checkable. Ask for the procedures, ask who is turning up, ask for the paperwork
                before we are on site. The answer should be the same one you got last time.
              </p>
            </div>
            <figure className="comm-std__photo">
              <Image
                src="/team-photo.webp"
                alt="The Advanced Gas &amp; Aircon crew with the vans at the Pakenham depot"
                fill
                sizes="(max-width: 980px) 100vw, 520px"
                style={{ objectFit: "cover" }}
              />
              <figcaption>Directly employed. All of them.</figcaption>
            </figure>
          </div>
          {/* A numbered list with a rule between each item, not six identical
              tiles. These are commitments you could be held to, and a list
              with rules through it reads as terms; a grid of cards reads as
              features. */}
          <ol className="stdlist">
            {COMM_STANDARD.map((st, i) => (
              <li key={st.n} style={{ ["--i" as string]: i }}>
                <span className="stdlist__n">{st.n}</span>
                <div>
                  <h3>{st.h}</h3>
                  <p>{st.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* THE JOURNEY — the centre of the page.

          This was six cards in a grid. A grid hands the reader a pile of
          features and asks them to assemble the story; the people reading
          this run programs for a living, so they get one. The drawing holds
          while the beats move past it, and each beat ends on the single line
          that says why it matters that we are the ones doing it. That is the
          "why us" argument, distributed through the job rather than stacked
          in a box of its own. */}
      <section className="comm-flow">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How we work</span>
            <h2 className="ds-h--on-dark">From your plans to a proper handover.</h2>
            <p className="comm-flow__lede">
              Most of what goes wrong on a mechanical package goes wrong before anyone picks up a tool: a scope two
              people read differently. Here is the whole job, start to open doors, and what we are holding ourselves
              to at each stage.
            </p>
          </div>
          <CommercialJourney />
        </div>
      </section>

      {/* WHERE WE WORK */}
      <section className="area" id="area">
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

      {/* QUESTIONS — the ones that decide whether we get on site. */}
      <section className="faq">
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
      <section className="bigcta bigcta--photo" data-hide-sticky-cta>
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
