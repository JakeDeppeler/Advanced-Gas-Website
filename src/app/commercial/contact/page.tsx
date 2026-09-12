import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { CommercialScopeForm } from "@/components/CommercialScopeForm";
import "../commercial.css";

export const metadata: Metadata = {
  title: "Contact, Commercial Mechanical Services, Pakenham VIC",
  description:
    "Submit a scope for pricing, or ask for certificates of currency, SWMS and induction documentation. Commercial mechanical services across Melbourne's south-east and Gippsland.",
  alternates: { canonical: "/commercial/contact" },
};

/**
 * The commercial contact page.
 *
 * It exists because the commercial nav used to send "Contact" to the
 * residential contact page with a query string on it. The header only knows
 * the path, so the moment you clicked Contact the whole chrome flipped back to
 * the residential side: navy header, "Your home" tab lit, a form that walks
 * you through brand and size for a split system. Everything about that said
 * "wrong door". This is the right door.
 */
export default function CommercialContactPage() {
  return (
    <div className="page-comm page-commcontact">
      <section className="comm-sub comm-sub--photo">
        <div className="wrap comm-sub__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">Contact</span>
          <h1>Submit a scope, or ask a question.</h1>
          <p className="comm-sub__lede">
            Drawings, a mechanical schedule or a site address is sufficient to begin. If you need certificates of
            currency, SWMS or induction documentation before anything else, ask and they come back the same day.
          </p>
        </div>
      </section>

      {/* Three doors over the seam: the form below is for a scope; these are
          for everyone who came here to do something else. */}
      <section className="comm-panelsec">
        <div className="wrap">
          <div className="comm-panel">
            <span className="comm-panel__eyebrow">Or, right now</span>
            <div className="comm-quick">
              <a href={`tel:${site.phoneE164}`} className="commquick commquick--orange">
                <span className="commquick__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" /></svg>
                </span>
                <span className="commquick__txt"><strong>Call the office</strong><em>{site.phone}</em></span>
                <span className="commquick__go" aria-hidden="true">&rarr;</span>
              </a>
              <a href={`mailto:${site.email}`} className="commquick commquick--navy">
                <span className="commquick__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                </span>
                <span className="commquick__txt"><strong>Email the drawings</strong><em>{site.email}</em></span>
                <span className="commquick__go" aria-hidden="true">&rarr;</span>
              </a>
              <Link href="/commercial/capability" className="commquick commquick--ink">
                <span className="commquick__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
                </span>
                <span className="commquick__txt"><strong>Capability statement</strong><em>Licences, insurances, past work</em></span>
                <span className="commquick__go" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="commcontact commcontact--dark">
        <div className="wrap commcontact__grid">
          <CommercialScopeForm />

          <aside className="commcontact__side">
            <div className="commcontact__card">
              <h3>Call the office</h3>
              <a className="commcontact__phone" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <span className="commcontact__sub">{site.hours[0].day.replace("-", " to ")}, {site.hours[0].open} to {site.hours[0].close}. After hours goes to someone on the tools.</span>
            </div>

            <div className="commcontact__card">
              <h3>Email</h3>
              <a className="commcontact__mail" href={`mailto:${site.email}`}>{site.email}</a>
              <span className="commcontact__sub">Drawings and schedules can come straight through as attachments.</span>
            </div>

            <div className="commcontact__card">
              <h3>Paperwork</h3>
              <p>
                Certificates of currency, SWMS and induction documentation are returned the same day you ask. Licences,
                insurances and past projects are on the <Link href="/commercial/capability">capability statement</Link>,
                which prints as a one-page document.
              </p>
            </div>

            <div className="commcontact__card commcontact__card--quiet">
              <h3>Based at</h3>
              <p>{site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}. Standard service area 75&nbsp;km, further for rollout and contract work.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
