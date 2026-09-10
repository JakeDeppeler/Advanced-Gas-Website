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
 * The commercial front page, built to the homepage's layout beat for beat so
 * both sides read as one company: hero, four doors, a trust strip, the enquiry
 * panel, the work, the standard, the process, where we work, questions, close.
 *
 * What changes is what each band is *for*. A homeowner is deciding whether to
 * trust a stranger in their house, so the residential page answers with a face,
 * a rebate and a review. A PM is deciding whether letting us on site will make
 * work for them, so the same slots carry insurances, a written scope, paperwork
 * turnaround and the names of people who have already had us through the gate.
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

      {/* START HERE — four doors, the commercial half of the homepage fork. */}
      <section className="route">
        <div className="wrap">
          <div className="route__panel">
            <div className="ds-section-head ds-section-head--center">
              <span className="ds-eyebrow">Start here</span>
              <h2>What&rsquo;s the job?</h2>
            </div>
            <div className="routebtns">
              {COMM_DOORS.map((d) => (
                <Link key={d.href} href={d.href} className={`routebtn routebtn--${d.tone}`}>
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

      {/* SCOPE PANEL — the homepage's orange quote box. */}
      <section className="scopesec" id="scope">
        <div className="wrap">
          <div className="scopesec__box">
            <div className="scopesec__grid">
              <div className="scopesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Priced against a written scope</span>
                <h2 className="ds-h--on-dark">We read the drawings before we quote.</h2>
                <p className="scopesec__lede">
                  Send through what you have: drawings, a mechanical schedule or a site address. If something is
                  missing or doesn&rsquo;t add up, we come back and ask rather than pricing around it and arguing about it
                  later.
                </p>
                <ul className="scopesec__points">
                  <li><span className="tick">✓</span> One price against one written scope</li>
                  <li><span className="tick">✓</span> Exclusions stated, not buried</li>
                  <li><span className="tick">✓</span> Variations approved before the work, not with the invoice</li>
                  <li><span className="tick">✓</span> Paperwork back before anyone turns up</li>
                </ul>
                <p className="scopesec__note">
                  Jake reads every commercial enquiry himself. If it&rsquo;s one for us you&rsquo;ll hear back the same
                  day with either a price or the two questions we need answered first. If it isn&rsquo;t one for us,
                  you&rsquo;ll hear that just as quickly, while you&rsquo;ve still got time to go elsewhere.
                </p>

                <p className="scopesec__finep">
                  {site.licences.refrigeration} · {site.licences.plumbing} ·
                  ABN {site.abn.replace(/ /g, " ")} · $20M public liability ·
                  SWMS &amp; certificates of currency on request
                </p>
              </div>
              <CommercialScopeForm />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE TAKE ON — the homepage's services bento, on a dark ground so
          the photographs carry the section rather than sitting in cream. */}
      <section className="comm-take" id="scopes">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> What we take on</span>
            <h2 className="ds-h--on-dark">Five packages, carried end to end.</h2>
            <p className="comm-take__lede">
              We&rsquo;re a specialist mechanical, gas and hot water contractor, not a builder. These are the packages
              we&rsquo;re set up to own from drawings to handover, and the only ones we&rsquo;ll quote.
            </p>
          </div>
          <div className="comm-bento">
            {COMM_SCOPES.map((sc, i) => (
              <Link
                key={sc.slug}
                href={`/commercial/services#${sc.slug}`}
                className={`combento ${i === 0 ? "combento--xl" : ""} ${sc.slug === "breakdowns" ? "combento--urgent" : ""}`}
              >
                <div className={`combento__block combento__block--${sc.slug}`} aria-hidden="true">
                  <span>{sc.n}</span>
                </div>
                <div className="combento__body">
                  <h3>{sc.title}</h3>
                  <p>{sc.lede}</p>
                  <ul className="combento__list">
                    {sc.detail.slice(0, i === 0 ? 4 : 2).map((d) => <li key={d}>{d}</li>)}
                  </ul>
                  <span className="combento__suits">{sc.suits}</span>
                </div>
              </Link>
            ))}
            {/* Spans the full width so the bento closes flush, and orange on the
                navy ground because this is the tile procurement goes looking for. */}
            <Link href="/commercial/capability" className="combento combento--cap">
              <div className="combento__body combento__body--wide">
                <div>
                  <h3>Capability statement</h3>
                  <p>ABN, licences, insurances, safety systems, capacity and past projects, on one page you can file.</p>
                </div>
                <span className="combento__go">Everything procurement asks for &rarr;</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* THE WORK — where the homepage puts reviews. A facility manager doesn't
          want five stars from a household; they want the name of somebody with
          a procurement process who already let us on site. So: the names, big. */}
      <section className="comm-work">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow"><span className="ds-dot" /> Some of the work</span>
            <h2>Sites we&rsquo;ve been trusted with.</h2>
            <p>
              Brands with a procurement process and an auditor don&rsquo;t hand the mechanical package to whoever answers
              first. These are the ones that have put us on site.
            </p>
          </div>
          <div className="comm-wall">
            {COMM_CLIENTS.map((c) => (
              <div key={c.name} className="commwall">
                <strong>{c.name}</strong>
                <span>{c.what}</span>
                <em>{c.where}</em>
              </div>
            ))}
          </div>

          {/* The four figures procurement actually writes down. Deliberately not
              the residential numbers — installs done and a star rating answer a
              homeowner's question, not a builder's. */}
          <div className="comm-facts">
            {COMM_FACTS.map((f) => (
              <div key={f.k} className="commfact">
                <strong>{f.n}</strong>
                <span>{f.k}</span>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE STANDARD — the homepage's "why us", with the crew in the picture.
          Six claims about who turns up are stronger next to a photograph of
          who turns up. */}
      <section className="comm-std">
        <div className="wrap comm-std__grid">
          <figure className="comm-std__photo">
            <img
              src="/team-photo.webp"
              alt="The Advanced Gas & Aircon crew with the vans at the Pakenham depot"
              width="900"
              height="675"
              loading="lazy"
            />
            <figcaption className="comm-std__chip">Directly employed. All of them.</figcaption>
          </figure>
          <div className="comm-std__copy">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> Why we get asked back</span>
              <h2>Size isn&rsquo;t the credential. Doing the same thing every time is.</h2>
            </div>
            <ol className="comm-std__list">
              {COMM_STANDARD.map((s) => (
                <li key={s.n}>
                  <span className="comm-std__n">{s.n}</span>
                  <div>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
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
