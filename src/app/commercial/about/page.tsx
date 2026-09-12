import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { COMM_STANDARD, COMM_FACTS } from "@/lib/commercial";
import "../commercial.css";

export const metadata: Metadata = {
  title: "About, Commercial Mechanical Services, Pakenham VIC",
  description:
    "Directly employed crews, a written standard and one line of accountability. Commercial mechanical services from Pakenham across Melbourne's south-east and Gippsland.",
  alternates: { canonical: "/commercial/about" },
};

export default function CommercialAboutPage() {
  return (
    <div className="page-comm">
      <section className="comm-sub">
        <div className="wrap comm-sub__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">Who you&rsquo;d be dealing with</span>
          <h1>The easy contractor to have on site.</h1>
          <p className="comm-sub__lede">
            Twelve years out of {site.address.suburb}, working across Melbourne&rsquo;s south-east and Gippsland. What
            makes a contractor easy to work with isn&rsquo;t size. It&rsquo;s whether they do the same thing every time,
            and whether the paperwork turns up without being chased.
          </p>
        </div>
      </section>

      {/* The crew, then the four figures. Both were on the front page and
          neither was here, which left the page that is actually about us as
          the one with nothing in it but paragraphs. */}
      <section className="comm-who">
        <div className="wrap">
          <div className="comm-who__top">
            <figure className="comm-who__photo">
              <img
                src="/team-photo.webp"
                alt="The Advanced Gas & Aircon crew with the vans at the Pakenham depot"
                width="900"
                height="675"
                loading="lazy"
              />
            </figure>
            <div className="comm-who__copy">
              <h2>A family business that got good at the boring part.</h2>
              <p>
                We started in a Pakenham garage in 2014 and the same family still answers the phone. What changed is
                everything around the work: the procedures got written down, the paperwork stopped being an afterthought,
                and the crews became people we employ rather than people we book.
              </p>
              <p>
                That is the whole difference on a commercial site. A builder does not need a contractor who is big. They
                need one who turns up when the program says, sends the documents before anyone asks, and does the job the
                same way on the last floor as on the first.
              </p>
            </div>
          </div>

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

      <section className="comm-std">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow"><span className="ds-dot" /> How we work</span>
            <h2>Six things we do the same way every time.</h2>
          </div>
          <div className="comm-std__grid">
            {COMM_STANDARD.map((st) => (
              <div key={st.n} className="commstd">
                <span className="commstd__n">{st.n}</span>
                <h3>{st.h}</h3>
                <p>{st.p}</p>
              </div>
            ))}
          </div>
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
