import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { COMM_SCOPES } from "@/lib/commercial";
import "../commercial.css";

export const metadata: Metadata = {
  title: "Commercial Services — Fit-outs, Plant Replacement, Maintenance",
  description:
    "Commercial mechanical services across Melbourne's south-east and Gippsland: tenancy fit-outs, plant replacement on live sites, scheduled maintenance contracts, Type A gas and breakdown response.",
  alternates: { canonical: "/commercial/services" },
};

export default function CommercialServicesPage() {
  return (
    <div className="page-comm">
      <section className="comm-hero comm-hero--sub">
        <div className="wrap comm-hero__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">What we take on</span>
          <h1>Five things, done properly.</h1>
          <p className="comm-hero__sub">
            We don&rsquo;t claim to be a mechanical contractor that does everything. These are the packages we take, the ones
            we&rsquo;re set up for, and the ones we&rsquo;ll price honestly or tell you we&rsquo;re not the right outfit for.
          </p>
        </div>
      </section>

      <section className="comm-how">
        <div className="wrap">
          <div className="comm-scopes">
            {COMM_SCOPES.map((sc) => (
              <article key={sc.slug} className="commscope" id={sc.slug}>
                <div className="commscope__head">
                  <span className="commscope__n">{sc.n}</span>
                  <div>
                    <h2>{sc.title}</h2>
                    <p className="commscope__lede">{sc.lede}</p>
                  </div>
                </div>
                <ul className="commscope__list">
                  {sc.detail.map((d) => <li key={d}>{d}</li>)}
                </ul>
                <p className="commscope__suits"><strong>Suits</strong> {sc.suits}</p>
              </article>
            ))}
          </div>
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
            <Link href="/contact?enquiry=commercial" className="ds-btn ds-btn--orange ds-btn--xl">Submit a scope →</Link>
            <a href={`tel:${site.phoneE164}`} className="comm-cta__phone">or call <strong>{site.phone}</strong></a>
          </div>
        </div>
      </section>
    </div>
  );
}
