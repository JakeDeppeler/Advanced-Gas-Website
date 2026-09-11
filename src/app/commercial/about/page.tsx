import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "../commercial.css";

export const metadata: Metadata = {
  title: "About, Commercial Mechanical Services, Pakenham VIC",
  description:
    "Directly employed crews, a written standard and one line of accountability. Commercial mechanical services from Pakenham across Melbourne's south-east and Gippsland.",
  alternates: { canonical: "/commercial/about" },
};

const points = [
  {
    n: "01",
    h: "Directly employed, not brokered out",
    p: "Our own installers and apprentices. Not a labour hire roster and not a different subcontractor each visit, which means the crew on week three works the way the crew on week one did, and the person you complained to has authority over the person who caused it.",
  },
  {
    n: "02",
    h: "The standard is written down",
    p: "Twenty procedures covering how a van is stocked, how a job is set up, what gets photographed, what gets certified and what happens when something goes wrong. Most contractors will tell you they have standards. Ask to see ours.",
  },
  {
    n: "03",
    h: "One person accountable",
    p: "A single contact through the trade. Not a call centre, not a ticket number, and not three people who each think one of the others has it.",
  },
  {
    n: "04",
    h: "Paperwork treated as part of the job",
    p: "SWMS before site access, inductions back within 24 hours, compliance certificates on completion, photographs and forms against every job and retained. If it isn't recorded, we don't consider it finished.",
  },
  {
    n: "05",
    h: "We say no to work we're not right for",
    p: "We're a specialist mechanical, gas and hot water contractor, not a builder. If a scope needs something we're not set up to do properly we'll say so early, which is cheaper for everyone than finding out at the halfway mark.",
  },
];

export default function CommercialAboutPage() {
  return (
    <div className="page-comm">
      <section className="comm-hero comm-hero--sub">
        <div className="wrap comm-hero__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">Who you&rsquo;d be dealing with</span>
          <h1>The easy contractor to have on site.</h1>
          <p className="comm-hero__sub">
            Twelve years out of {site.address.suburb}, working across Melbourne&rsquo;s south-east and Gippsland. What makes a
            contractor easy to work with isn&rsquo;t size. It&rsquo;s whether they do the same thing every time, and whether the
            paperwork turns up without being chased.
          </p>
        </div>
      </section>

      <section className="comm-how">
        <div className="wrap">
          <ol className="comm-how__list">
            {points.map((pt) => (
              <li key={pt.n}>
                <span className="comm-how__n">{pt.n}</span>
                <div>
                  <h2>{pt.h}</h2>
                  <p>{pt.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="comm-cta">
        <div className="wrap comm-cta__inner">
          <h2>Submit a scope for pricing.</h2>
          <p>Drawings, a mechanical schedule or a site address is sufficient to begin. Licences, insurances and certificates are on the capability statement.</p>
          <div className="comm-cta__btns">
            <Link href="/commercial/contact" className="ds-btn ds-btn--orange ds-btn--xl">Submit a scope →</Link>
            <Link href="/commercial/capability" className="comm-cta__phone">or read the <strong>capability statement</strong></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
