import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { COMM_SCOPES, COMM_CLIENTS, COMM_CAPABILITIES, COMM_PROCESS } from "@/lib/commercial";
import "../home.css";
import "./commercial.css";

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical Services — Melbourne & Gippsland",
  description:
    "Commercial mechanical services, Type A gas and hot water across Melbourne's south-east and Gippsland. VRV/VRF, air balancing, plant replacement and maintenance. $20M public liability, ARC AU59557, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The commercial front page, built to the same rhythm as the residential one so
 * it reads as the same company — but every section answers a different fear.
 * A homeowner is deciding whether to trust a stranger in their house. A PM is
 * deciding whether letting us on site will make work for them.
 *
 * The order is deliberate and matches how that decision actually gets made:
 * what we can do (the capability strip, scanned in two seconds) → what we take
 * on → how a job runs from plans to handover → who has already let us on site
 * → the standard we hold it all to. Proof sits after the process, not before,
 * because a logo only means something once you know what we did with it.
 */

const STANDARD = [
  {
    h: "Directly employed crews",
    p: "Our own installers and apprentices — not labour hire, not a different subcontractor each visit. The crew in week three works the way the crew in week one did, because it is the same crew.",
  },
  {
    h: "The standard is written down",
    p: "Twenty procedures covering how a van is stocked, what gets photographed, what gets certified and what happens when something goes wrong. It is not folklore held by whoever has been here longest. Ask to see it.",
  },
  {
    h: "Documented on the day",
    p: "Photos, forms and notes completed on site, not reconstructed on Friday afternoon. Compliance certificates on completion. If it is not recorded, it is not finished.",
  },
  {
    h: "We will tell you no",
    p: "If a scope needs something we are not set up to do properly, we say so while you can still do something about it. That is cheaper for both of us than finding out at the halfway mark.",
  },
];

export default function CommercialPage() {
  return (
    // page-home is the marketing-page layout scope, not the homepage itself —
    // the hero and the section rhythm hang off it. Opting in is what makes this
    // read as the same company rather than a bolted-on section.
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
              <Link href="/contact?enquiry=commercial" className="ds-btn ds-btn--orange ds-btn--lg">Send us a scope →</Link>
              <Link href="/commercial/capability" className="ds-btn ds-btn--ghost ds-btn--lg">Capability statement</Link>
            </div>

            <p className="hero__rebate">
              SWMS, certificates of currency and inductions supplied before site access — usually back the same day.
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

      {/* CAPABILITY STRIP — the vocabulary check, running under the hero.
          Two identical rows inside one track: the animation shifts it exactly
          half its width, so the second row lands where the first started and
          the loop has no seam. aria-hidden on the duplicate keeps a screen
          reader from hearing the list twice. */}
      <section className="comm-marquee" aria-label="What we work on">
        <div className="comm-marquee__track">
          {[0, 1].map((copy) => (
            <ul className="comm-marquee__row" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {COMM_CAPABILITIES.map((c) => (
                <li className="comm-marquee__item" key={c}>
                  <span className="comm-marquee__dot" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* WHAT WE TAKE ON */}
      <section className="ds-section">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">What we take on</span>
            <h2>Five packages, done properly.</h2>
            <p>
              We&rsquo;re a specialist mechanical, gas and hot water contractor — not a builder. These are the packages
              we&rsquo;re set up to carry end to end, and the only ones we&rsquo;ll quote.
            </p>
          </div>
          <div className="comm-scopegrid">
            {COMM_SCOPES.map((sc) => (
              <Link key={sc.slug} href={`/commercial/services#${sc.slug}`} className="commtile">
                <span className="commtile__n">{sc.n}</span>
                <h3>{sc.title}</h3>
                <p>{sc.lede}</p>
                <span className="commtile__suits">{sc.suits}</span>
              </Link>
            ))}
            <Link href="/commercial/capability" className="commtile commtile--dark">
              <span className="commtile__n">—</span>
              <h3>Capability statement</h3>
              <p>ABN, licences, insurances, safety systems, capacity and past projects, on one page.</p>
              <span className="commtile__suits">Everything procurement asks for</span>
            </Link>
          </div>
        </div>
      </section>

      {/* HOW WE WORK — plans in, handover out */}
      <section className="comm-flow">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">How we work</span>
            <h2>From your plans to a proper handover.</h2>
            <p>
              Most of what goes wrong on a mechanical package goes wrong before anyone picks up a tool — a scope two
              people read differently. So we build the scope with you, in writing, and price against that.
            </p>
          </div>
          <ol className="comm-flow__list">
            {COMM_PROCESS.map((s) => (
              <li key={s.n}>
                <span className="comm-flow__n">{s.n}</span>
                <div>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PROOF — who has already let us on site */}
      <section className="comm-work">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">Some of the work</span>
            <h2>Sites we&rsquo;ve been trusted with.</h2>
            <p>
              Brands with a procurement process and an auditor don&rsquo;t hand the mechanical package to whoever answers
              first. These are the ones that have put us on site.
            </p>
          </div>
          <div className="comm-logos">
            {COMM_CLIENTS.map((c) => (
              <div key={c.name} className="commlogo">
                <strong>{c.name}</strong>
                <span>{c.what}</span>
              </div>
            ))}
          </div>
          <p className="comm-scope__reach">
            Based at {site.address.street}, {site.address.suburb}. Standard service area is 75&nbsp;km, and we travel
            further for rollout and contract work — the Westpac branch was in Sale.
          </p>
        </div>
      </section>

      {/* THE STANDARD — what all of the above is held to */}
      <section className="comm-std">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark">Our standard</span>
            <h2 className="ds-h--on-dark">Size isn&rsquo;t the credential. Doing the same thing every time is.</h2>
          </div>
          <div className="comm-std__grid">
            {STANDARD.map((s) => (
              <div key={s.h}>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <p className="comm-std__close">
            A bank branch, a vet clinic and a heater changeover in someone&rsquo;s house get the same crew, the same
            procedures and the same paperwork. That is the whole idea.
          </p>
        </div>
      </section>

      {/* CLOSE */}
      <section className="comm-cta">
        <div className="wrap comm-cta__inner">
          <h2>Send us the scope and we&rsquo;ll price it.</h2>
          <p>
            Drawings, a schedule or a site address is enough to start. If you need certificates of currency, SWMS or
            induction paperwork first, ask and they&rsquo;ll come back the same day.
          </p>
          <div className="comm-cta__btns">
            <Link href="/contact?enquiry=commercial" className="ds-btn ds-btn--orange ds-btn--xl">Send us a scope →</Link>
            <a href={`tel:${site.phoneE164}`} className="comm-cta__phone">or call <strong>{site.phone}</strong></a>
          </div>
        </div>
      </section>
    </div>
  );
}
