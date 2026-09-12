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
      <section className="comm-sub">
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

      <section className="commcontact">
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
