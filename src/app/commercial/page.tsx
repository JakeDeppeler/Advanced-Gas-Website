import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { COMM_SCOPES, COMM_CLIENTS } from "@/lib/commercial";
import "../home.css";
import "./commercial.css";

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical Services — Melbourne & Gippsland",
  description:
    "Commercial mechanical services, Type A gas and hot water across Melbourne's south-east and Gippsland. Bank branches, national retail rollouts, tier-one builders. $20M public liability, ARC AU59557, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The commercial front page, built to the same rhythm as the residential one so
 * it reads as the same company — but every section answers a different fear.
 * A homeowner is deciding whether to trust a stranger in their house. A PM is
 * deciding whether letting us on site will make work for them.
 */

const routes = [
  { href: "/commercial/services#fit-outs", n: "01", h: "A fit-out to program", p: "New tenancy or a retail rollout, delivered to the builder's dates." },
  { href: "/commercial/services#plant-replacement", n: "02", h: "Plant at end of life", p: "Swapping it out on a site that can't stop trading." },
  { href: "/commercial/services#maintenance", n: "03", h: "Sites to keep compliant", p: "Scheduled maintenance across as many sites as you have." },
  { href: "/commercial/services#breakdowns", n: "04", h: "Something's stopped", p: "Breakdown response, after hours, on contracted sites." },
];

const process = [
  ["01", "Send the scope", "Drawings, a schedule or a site address. We'll tell you quickly if it isn't one for us."],
  ["02", "Paperwork first", "SWMS, certificates of currency and inductions back within 24 hours — before anyone turns up."],
  ["03", "Priced, then built", "A price against the scope. If the scope changes, it's repriced and approved before the work happens."],
  ["04", "One contact throughout", "A single person through the trade. Not a call centre, not a ticket number."],
  ["05", "Signed off and handed over", "Commissioned, certified, as-builts and O&M. Maintenance from there if you want it."],
];

export default function CommercialPage() {
  return (
    // page-home is the marketing-page layout scope, not the homepage itself —
    // the hero, the fork and the section rhythm all hang off it. Opting in is
    // what makes this read as the same company rather than a bolted-on section.
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

      {/* WHAT'S BROUGHT YOU HERE */}
      <section className="ds-section route">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow">Start here</span>
            <h2>What&rsquo;s brought you here?</h2>
          </div>
          <div className="route__grid">
            {routes.map((r) => (
              <Link key={r.href} href={r.href} className="routecard">
                <span className="routecard__n">{r.n}</span>
                <h3>{r.h}</h3>
                <p>{r.p}</p>
                <span className="routecard__go">See how we do it →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* THE WORK — proof band */}
      <section className="comm-work">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">Some of the work</span>
            <h2>Sites we&rsquo;ve been trusted with.</h2>
            <p>
              Brands with a procurement process and an auditor don&rsquo;t hand the mechanical package to whoever answers first.
              These are the ones that have put us on site.
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
        </div>
      </section>

      {/* SCOPES — the services grid */}
      <section className="ds-section">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">What we take on</span>
            <h2>Five packages, done properly.</h2>
            <p>We&rsquo;re a specialist mechanical, gas and hot water contractor — not a builder. These are the ones we&rsquo;re set up for.</p>
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

      {/* HOW A JOB RUNS */}
      <section className="comm-creds">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">How a job runs</span>
            <h2 className="ds-h--on-dark">Five steps, and the paperwork comes first.</h2>
          </div>
          <ol className="comm-steps">
            {process.map(([n, h, p]) => (
              <li key={n}>
                <span className="comm-steps__n">{n}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHY US */}
      <section className="ds-section">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">Why us</span>
            <h2>Size isn&rsquo;t the credential. Doing the same thing every time is.</h2>
          </div>
          <div className="comm-why">
            <div>
              <h3>Directly employed</h3>
              <p>Our own installers and apprentices — not labour hire, not a different subcontractor each visit. The crew in week three works the way the crew in week one did.</p>
            </div>
            <div>
              <h3>The standard is written down</h3>
              <p>Twenty procedures covering how a van is stocked, what gets photographed, what gets certified and what happens when something goes wrong. Ask to see it.</p>
            </div>
            <div>
              <h3>Documented, every job</h3>
              <p>Photos, forms and notes completed on the day. Compliance certificates on completion. If it isn&rsquo;t recorded, it isn&rsquo;t finished.</p>
            </div>
            <div>
              <h3>We&rsquo;ll say no</h3>
              <p>If a scope needs something we&rsquo;re not set up to do properly, we&rsquo;ll say so early — cheaper for both of us than finding out at the halfway mark.</p>
            </div>
          </div>
          <p className="comm-scope__reach">
            Based at {site.address.street}, {site.address.suburb}. Standard service area is 75&nbsp;km, and we travel further for
            rollout and contract work — the Westpac branch was in Sale.
          </p>
        </div>
      </section>

      {/* CLOSE */}
      <section className="comm-cta">
        <div className="wrap comm-cta__inner">
          <h2>Send us the scope and we&rsquo;ll price it.</h2>
          <p>
            Drawings, a schedule or a site address is enough to start. If you need certificates of currency, SWMS or induction
            paperwork first, ask and they&rsquo;ll come back the same day.
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
