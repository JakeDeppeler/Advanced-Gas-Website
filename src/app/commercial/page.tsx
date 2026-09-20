import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import {
  COMM_SCOPES, COMM_CLIENTS, COMM_PROCESS,
  COMM_DOORS, COMM_STANDARD, COMM_FAQS, COMM_FACTS,
} from "@/lib/commercial";
import { CommercialScopeForm } from "@/components/CommercialScopeForm";
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
  title: "Commercial HVAC, Gas & Mechanical Services, Melbourne & Gippsland",
  description:
    "Commercial mechanical services, Type A gas and hot water across Melbourne's south-east and Gippsland. VRV/VRF, air balancing, plant replacement and maintenance. $20M public liability, ARC AU59557, SWMS supplied.",
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
              <div className="trust-stat"><strong>$20M</strong><span>public liability</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>12 yrs</strong><span>trading</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>Direct</strong><span>employed crews</span></div>
            </div>
          </div>

          <div className="hero__photo" aria-hidden="true">
            <picture>
              <source media="(max-width: 760px)" srcSet="/commercial.webp" />
              <img src="/commercial.webp" alt="" width={1200} height={1400} fetchPriority="high" decoding="async" />
            </picture>
          </div>
        </div>
      </section>

      {/* WHO HAS ALREADY LET US IN — was six thousand pixels down, under three
          sections of our own claims about ourselves. It is the only thing on
          this page a reader cannot dispute, so it goes first. Names and
          figures on one rail, quietly: a logo wall shouts, a list of accounts
          states. */}
      <section className="comm-proof">
        <div className="wrap">
          <p className="comm-proof__lede">
            Brands with a procurement process and an auditor don&rsquo;t hand the mechanical package to whoever answers
            first. These are the ones that have put us on site.
          </p>
          <ul className="comm-proof__names">
            {COMM_CLIENTS.map((c) => (
              <li key={c.name}>
                <strong>{c.name}</strong>
                <span>{c.what}</span>
                <em>{c.where}</em>
              </li>
            ))}
          </ul>
          <dl className="comm-proof__figs">
            {COMM_FACTS.map((f) => (
              <div key={f.k}>
                <dt>{f.n}</dt>
                <dd>{f.k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* WHAT WE TAKE ON — a schedule, not eight cards. Each row is a package,
          who it suits, and what is in it; the detail lives on the services
          page, which every row links to. On paper rather than a navy band,
          because a reader comparing eight things needs them to be easy to read
          rather than impressive to look at. */}
      <section className="comm-packs" id="scopes">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What we do</span>
            <h2>Everything mechanical, gas and hot water, under one trade.</h2>
            <p>
              We&rsquo;re a specialist mechanical, gas and hot water contractor, not a builder. Every one of these is a
              package we own from the drawings through to handover, with our own crew on it. Nothing here gets passed
              to somebody else once you&rsquo;ve signed.
            </p>
          </div>

          <ol className="packlist">
            {COMM_SCOPES.map((sc) => (
              <li key={sc.slug}>
                <Link href={`/commercial/services#${sc.slug}`} className="packrow">
                  <span className="packrow__n">{sc.n}</span>
                  <span className="packrow__head">
                    <strong>{sc.title}</strong>
                    <span className="packrow__suits">{sc.suits}</span>
                  </span>
                  <span className="packrow__body">
                    <span className="packrow__lede">{sc.lede}</span>
                    <span className="packrow__detail">{sc.detail.join(" · ")}</span>
                  </span>
                  <span className="packrow__go" aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            ))}
          </ol>

          <Link href="/commercial/capability" className="comm-caplink">
            <span>
              <strong>Capability statement</strong>
              ABN, licences, insurances, safety systems, capacity and past projects, on one page you can file.
            </span>
            <span className="comm-caplink__go">Everything procurement asks for &rarr;</span>
          </Link>
        </div>
      </section>

      {/* SCOPE PANEL — the argument and the form. It used to sit inside a
          floor-to-ceiling orange band; the form is the most important control
          on the page and the loudest possible ground made it look like the
          least serious thing on it. Paper now, with the form in a plain
          bordered card and the licences set as a specification block. */}
      <section className="comm-scope" id="scope">
        <div className="wrap comm-scope__grid">
          <div className="comm-scope__left">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Priced against a written scope</span>
            <h2>Tell us what you&rsquo;re not being told.</h2>
            <p className="comm-scope__lede">
              Every mechanical package has a gap in it somewhere. The plans say one thing, the site says another,
              and whoever notices last pays for it. We read the drawings properly, find the gap, and put it in the
              scope in writing before anyone signs anything.
            </p>
            <ul className="comm-scope__points">
              <li>One price against one written scope</li>
              <li>Exclusions stated, not buried</li>
              <li>Variations approved before the work, not with the invoice</li>
              <li>Paperwork back before anyone turns up</li>
            </ul>
            <p className="comm-scope__note">
              Jake reads every commercial enquiry himself, and you&rsquo;ll hear back the same day on two things:
              whether it&rsquo;s one for us, and the date the priced scope will land. A breakdown is hours. A
              fit-out is not. What you won&rsquo;t get is silence while we work out which.
            </p>
            <dl className="comm-scope__creds">
              <div><dt>Refrigeration</dt><dd>{site.licences.refrigeration}</dd></div>
              <div><dt>Plumbing</dt><dd>{site.licences.plumbing}</dd></div>
              <div><dt>ABN</dt><dd>{site.abn}</dd></div>
              <div><dt>Public liability</dt><dd>$20M</dd></div>
            </dl>
            <p className="comm-scope__fine">SWMS &amp; certificates of currency on request, usually back the same day.</p>
          </div>
          <CommercialScopeForm />
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
              <img
                src="/team-photo.webp"
                alt="The Advanced Gas & Aircon crew with the vans at the Pakenham depot"
                width="900"
                height="675"
                loading="lazy"
              />
              <figcaption>Directly employed. All of them.</figcaption>
            </figure>
          </div>
          {/* A numbered list with a rule between each item, not six identical
              tiles. These are commitments you could be held to, and a list
              with rules through it reads as terms; a grid of cards reads as
              features. */}
          <ol className="stdlist">
            {COMM_STANDARD.map((st) => (
              <li key={st.n}>
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

      {/* HOW WE WORK — the homepage's process band. Six cards rather than a
          list: each step carries a paragraph, and a paragraph in a row of
          hairlines reads as terms and conditions. */}
      <section className="comm-flow">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How we work</span>
            <h2 className="ds-h--on-dark">From your plans to a proper handover.</h2>
            <p className="comm-flow__lede">
              Most of what goes wrong on a mechanical package goes wrong before anyone picks up a tool: a scope two
              people read differently. So we build the scope with you, in writing, and price against that.
            </p>
          </div>
          <ol className="comm-steps">
            {COMM_PROCESS.map((s) => (
              <li key={s.n} className="commstep">
                <span className="commstep__n">{s.n}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHERE WE WORK */}
      <section className="area" id="area">
        <div className="wrap area__grid">
          <div className="area__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Where we work</span>
            <h2>Based in Pakenham. On site across the south-east.</h2>
            <p>
              The standard service area is 75&nbsp;km, which covers Melbourne&rsquo;s south-east and most of West
              Gippsland with no travel loading.
            </p>
            <p className="comm-area__note">
              We travel further for rollout and contract work. The Westpac branch was in Sale, and the multi-site
              contracts run wider than the circle. If your sites are spread across the state, ask rather than assuming
              we&rsquo;re out of range.
            </p>
            <a href="#scope" className="ds-btn ds-btn--navy">Submit a scope →</a>
          </div>
          <div className="area__right">
            <div className="map map--live" aria-label="Service area map, 75 km radius from Pakenham 3810">
              <ServiceAreaMap />
              <div className="map__badge">
                <span className="map__badge-eye">Standard radius</span>
                <span className="map__badge-num">75&nbsp;km</span>
                <span className="map__badge-note">Further for rollout &amp; contract work</span>
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
              <details key={f.q} name="commfaq" {...(i === 0 ? { open: true } : {})}>
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
            <img
              src="/commercial-v3.webp"
              alt="Packaged rooftop plant being craned into position on a commercial site"
              width="900"
              height="675"
              loading="lazy"
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
