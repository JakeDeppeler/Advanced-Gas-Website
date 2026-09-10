import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "./commercial.css";

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical Services — Melbourne & Gippsland",
  description:
    "Commercial HVAC, Type A gas, hot water and mechanical services across Melbourne's south-east and Gippsland. Bank branches, national retail rollouts, tier-one builders. $20M public liability, ARC AU59557, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The commercial page exists because a facility manager and a homeowner are
 * afraid of different things. A homeowner worries about being ripped off and
 * about who is in their house. A commercial buyer worries about compliance,
 * delays and having to manage you. Same company, same standard, different
 * evidence — so this page leads with the work and the paperwork, not the
 * reviews.
 */

const work = [
  { client: "Westpac", what: "Branch fit-out", where: "Sale, Gippsland", note: "Full mechanical services on an operating bank branch — staged so the branch kept trading." },
  { client: "Petbarn", what: "National retail rollout", where: "Multi-site", note: "Store fit-outs to a national brand's specification, delivered to the builder's programme." },
  { client: "Greencross", what: "Vet clinics", where: "Multi-site", note: "Climate control for clinics, where temperature stability is a welfare requirement, not a comfort one." },
  { client: "Commonwealth Bank", what: "Branch fit-out", where: "Victoria", note: "Mechanical services on a branch refurbishment." },
  { client: "Kane Constructions", what: "Tier-one builder", where: "Victoria", note: "Subcontract mechanical packages, coordinated to a head contractor's programme." },
  { client: "Reece Group", what: "Multi-site service contract", where: "Victoria", note: "Scheduled maintenance across branches." },
  { client: "Reliance Worldwide", what: "Industrial service contract", where: "Victoria", note: "Planned maintenance on an operating manufacturing site." },
  { client: "Retirement Villages Constructions", what: "Aged care", where: "Victoria", note: "Heat-pump hot water upgrades across village stock." },
];

const credentials: [string, string][] = [
  ["Public liability", "$20M"],
  ["Refrigerant handling", site.licences.refrigeration],
  ["Plumbing licence", site.licences.plumbing],
  ["Type A gas", "Appliance servicing & installation"],
  ["SWMS", "Supplied before site access"],
  ["Site inductions", "Paperwork back within 24 hrs"],
  ["Workers compensation", "Current, certificate on request"],
  ["ABN", site.abn],
];

const how = [
  {
    n: "01",
    h: "One number, one line of accountability",
    p: "A single point of contact through the trade — not a call centre and not a different subcontractor each visit. If it goes wrong, one person owns it.",
  },
  {
    n: "02",
    h: "Directly employed, not brokered out",
    p: "Our own installers and apprentices, working to a written standard. Every van carries the same stock list and the same tools, so the crew that turns up on week three works the same way as the crew in week one.",
  },
  {
    n: "03",
    h: "Documented, every job",
    p: "Photos, forms and notes completed on the day, against the job. Compliance certificates issued on completion. If it isn't recorded, it isn't finished.",
  },
  {
    n: "04",
    h: "Programmed around your build",
    p: "Install windows coordinated with the builder and the other trades. Staged works for sites that have to keep trading while we're in them.",
  },
  {
    n: "05",
    h: "Maintenance after handover",
    p: "Scheduled preventative maintenance contracts, so the site stays compliant and the plant lasts what it's supposed to.",
  },
];

const scopes = [
  "Ducted and split system air conditioning",
  "Mechanical services and ventilation",
  "Type A gas — installation, servicing and compliance",
  "Commercial hot water, including heat pump plant",
  "Tenancy and retail fit-outs",
  "Plant replacement on operating sites",
  "Scheduled preventative maintenance",
  "Breakdown response on contracted sites",
];

export default function CommercialPage() {
  return (
    <div className="page-comm">
      <section className="comm-hero">
        <div className="wrap comm-hero__inner">
          <span className="ds-eyebrow">Commercial &amp; industrial</span>
          <h1>Bank branches, national retail, tier-one builders.</h1>
          <p className="comm-hero__sub">
            We do mechanical services, Type A gas and commercial hot water across Melbourne&rsquo;s south-east and Gippsland.
            Directly employed crews working to a written standard, full compliance paperwork, and one person accountable for the
            package.
          </p>
          <div className="comm-hero__ctas">
            <Link href="/contact?enquiry=commercial" className="ds-btn ds-btn--orange ds-btn--lg">Send us a scope →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">Or call {site.phone}</a>
          </div>
          <p className="comm-hero__note">
            Certificates of currency, SWMS and induction paperwork supplied on request — usually back the same day.
          </p>
        </div>
      </section>

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
          <div className="comm-work__grid">
            {work.map((w) => (
              <article key={w.client} className="commcard">
                <h3>{w.client}</h3>
                <div className="commcard__meta">
                  <span>{w.what}</span>
                  <span>{w.where}</span>
                </div>
                <p>{w.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="comm-creds">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">The paperwork</span>
            <h2 className="ds-h--on-dark">Everything you&rsquo;ll be asked to file before we set foot on site.</h2>
          </div>
          <dl className="comm-creds__grid">
            {credentials.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="comm-how">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">How we run a job</span>
            <h2>One standard, every van, every visit.</h2>
            <p>
              The thing that makes a contractor easy to work with isn&rsquo;t size, it&rsquo;s whether they do the same thing every
              time. Ours is written down.
            </p>
          </div>
          <ol className="comm-how__list">
            {how.map((h) => (
              <li key={h.n}>
                <span className="comm-how__n">{h.n}</span>
                <div>
                  <h3>{h.h}</h3>
                  <p>{h.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="comm-scope">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow">Scopes we take</span>
            <h2>What we can price.</h2>
          </div>
          <ul className="comm-scope__list">
            {scopes.map((sc) => <li key={sc}>{sc}</li>)}
          </ul>
          <p className="comm-scope__reach">
            Based at {site.address.street}, {site.address.suburb}. Standard service area is 75 km, and we travel further for
            rollout and contract work — the Westpac branch was in Sale.
          </p>
        </div>
      </section>

      <section className="comm-cta">
        <div className="wrap comm-cta__inner">
          <h2>Send us the scope and we&rsquo;ll price it.</h2>
          <p>
            Drawings, a schedule or a site address is enough to start. If you need our certificates of currency, SWMS or
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
