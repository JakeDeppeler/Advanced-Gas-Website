import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { COMM_SCOPES, COMM_PROCESS } from "@/lib/commercial";
import "../commercial.css";

export const metadata: Metadata = {
  title: "Commercial Services, Fit-outs, System Replacement, Maintenance",
  description:
    "Commercial mechanical services across Melbourne's south-east and Gippsland: tenancy fit-outs, base build, system replacement on live sites, scheduled maintenance, Type A and Type B gas, commercial hot water, evaporative cooling, ventilation, air balancing and breakdown response.",
  alternates: { canonical: "/commercial/services" },
};

export default function CommercialServicesPage() {
  return (
    <div className="page-comm">
      <section className="comm-sub comm-sub--photo">
        <div className="wrap comm-sub__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">What we do</span>
          <h1>Ten packages, and the detail behind each one.</h1>
          <p className="comm-sub__lede">
            We&rsquo;re a specialist mechanical, gas and hot water contractor, not a builder. Every one of these is a
            package we own from the drawings through to handover, with our own crew on it. If a scope needs something
            that isn&rsquo;t on this page, the honest answer is usually that we&rsquo;re not the right outfit for it.
          </p>
        </div>
      </section>

      {/* The jump list rides over the seam, the way the fork does on the front
          page. Ten anchors is a lot of scrolling to find the one you came for. */}
      <section className="comm-panelsec">
        <div className="wrap">
          <div className="comm-panel">
            <span className="comm-panel__eyebrow">Go straight to</span>
            <nav className="comm-jump" aria-label="Jump to a package">
              {COMM_SCOPES.map((sc) => (
                <a key={sc.slug} href={`#${sc.slug}`}>{sc.title}</a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="comm-full">
        <div className="wrap comm-full__grid">
          {COMM_SCOPES.map((sc) => (
            <article key={sc.slug} className="commfull" id={sc.slug}>
              <div>
                <span className="commfull__n">{sc.n}</span>
                <h2>{sc.title}</h2>
                <p className="commfull__lede">{sc.lede}</p>
              </div>
              <ul className="commfull__list">
                {sc.detail.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <p className="commfull__suits">Suits {sc.suits}</p>
            </article>
          ))}
        </div>
      </section>

      {/* The same six steps as the front page, because a reader who has come
          this far is about to ask how it actually runs. */}
      <section className="comm-flow">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How every one of them runs</span>
            <h2 className="ds-h--on-dark">From your plans to a proper handover.</h2>
            <p className="comm-flow__lede">
              Whichever package it is, it goes the same way: we read the drawings, build the scope with you in writing,
              price against that, and hand over with the paperwork in one place.
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

      <section className="bigcta bigcta--photo" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <figure className="bigcta__photo">
            <img src="/commercial-v3.webp" alt="Packaged rooftop plant being craned into position on a commercial site" width="900" height="675" loading="lazy" />
          </figure>
          <div className="bigcta__copy">
            <h2>Not sure it&rsquo;s one of ours?</h2>
            <p>
              Send it anyway. If it isn&rsquo;t something we&rsquo;re set up to do properly we&rsquo;ll say so, and usually
              point you at someone who is. That&rsquo;s cheaper for both of us than finding out halfway through.
            </p>
            <div className="bigcta__btns">
              <Link href="/commercial/contact" className="ds-btn ds-btn--orange ds-btn--xl">Submit a scope →</Link>
              <a href={`tel:${site.phoneE164}`} className="bigcta__phone">or call <strong>{site.phone}</strong></a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
