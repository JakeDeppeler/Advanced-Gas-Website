import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { COMM_SCOPES } from "@/lib/commercial";
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
      <section className="comm-sub">
        <div className="wrap comm-sub__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">What we do</span>
          <h1>Ten packages, and the detail behind each one.</h1>
          <p className="comm-sub__lede">
            We&rsquo;re a specialist mechanical, gas and hot water contractor, not a builder. Every one of these is a
            package we own from the drawings through to handover, with our own crew on it. If a scope needs something
            that isn&rsquo;t on this page, the honest answer is usually that we&rsquo;re not the right outfit for it.
          </p>
          {/* Ten anchors is a lot of scrolling to find the one you came for. */}
          <nav className="comm-jump" aria-label="Jump to a package">
            {COMM_SCOPES.map((sc) => (
              <a key={sc.slug} href={`#${sc.slug}`}>{sc.title}</a>
            ))}
          </nav>
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

      <section className="comm-cta">
        <div className="wrap comm-cta__inner">
          <h2>Not sure it&rsquo;s one of ours?</h2>
          <p>
            Send it anyway. If it isn&rsquo;t something we&rsquo;re set up to do properly we&rsquo;ll say so, and usually point you
            at someone who is. That&rsquo;s cheaper for both of us than finding out halfway through.
          </p>
          <div className="comm-cta__btns">
            <Link href="/commercial/contact" className="ds-btn ds-btn--orange ds-btn--xl">Submit a scope →</Link>
            <a href={`tel:${site.phoneE164}`} className="comm-cta__phone">or call <strong>{site.phone}</strong></a>
          </div>
        </div>
      </section>
    </div>
  );
}
