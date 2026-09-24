import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { CommercialScopeForm } from "@/components/CommercialScopeForm";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "Submit a Commercial Scope, Pakenham VIC",
  description:
    "Submit a scope for pricing, or ask for certificates of currency, SWMS and induction docs. Commercial mechanical across Melbourne's south-east and Gippsland.",
  alternates: { canonical: "/commercial/contact" },
};

/**
 * The commercial contact page.
 *
 * It exists because the commercial nav used to send "Contact" to the
 * residential contact page with a query string on it. The header only knows
 * the path, so the moment you clicked Contact the whole chrome flipped back
 * to the residential side: navy header, "Your home" tab lit, a form that
 * walks you through brand and size for a split system. Everything about that
 * said "wrong door". This is the right door.
 *
 * The three cards over the seam are for everyone who came here to do
 * something other than send a scope — ring, email the drawings, or take the
 * capability statement away. The form below is the same component and the
 * same orange panel the front page asks on.
 */
export default function CommercialContactPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="Contact"
        title={<>Submit a scope, or ask a <em>question.</em></>}
        lede={
          <>
            Drawings, a mechanical schedule or a site address is sufficient to begin. If you need certificates of
            currency, SWMS or induction documentation before anything else, ask and they come back the same day.
          </>
        }
        photo="/comm/fitout-floor.jpg"
      />

      <div className="cx-shelf">
        <div className="wrap">
          <div className="cx-shelf__card">
            <span className="cx-eye">Or, right now</span>
            <div className="cx-doors">
              <a href={`tel:${site.phoneE164}`} className="cx-door cx-door--call">
                <span className="cx-door__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" /></svg>
                </span>
                <span className="cx-door__txt">
                  <strong>Call the office</strong>
                  <em>{site.phone}</em>
                </span>
                <span className="cx-door__go" aria-hidden="true">→</span>
              </a>

              <a href={`mailto:${site.email}`} className="cx-door">
                <span className="cx-door__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                </span>
                <span className="cx-door__txt">
                  <strong>Email the drawings</strong>
                  <em>{site.email}</em>
                </span>
                <span className="cx-door__go" aria-hidden="true">→</span>
              </a>

              <Link href="/commercial/capability" className="cx-door">
                <span className="cx-door__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
                </span>
                <span className="cx-door__txt">
                  <strong>Capability statement</strong>
                  <em>Licences, insurances, past work</em>
                </span>
                <span className="cx-door__go" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="cx-sec" id="scope" data-hide-sticky-cta>
        <div className="wrap">
          <div className="cx-scope cx-rv">
            <div className="cx-side">
              <div className="cx-side__card">
                <h2>Call the office</h2>
                <a className="cx-side__big" href={`tel:${site.phoneE164}`}>{site.phone}</a>
                <p>
                  {site.hours[0].day.replace("-", " to ")}, {site.hours[0].open} to {site.hours[0].close}. After hours
                  goes to someone on the tools.
                </p>
              </div>

              <div className="cx-side__card">
                <h2>Email</h2>
                <a className="cx-side__mail" href={`mailto:${site.email}`}>{site.email}</a>
                <p>Drawings and schedules can come straight through as attachments.</p>
              </div>

              <div className="cx-side__card">
                <h2>Paperwork</h2>
                <p>
                  Certificates of currency, SWMS and induction documentation are returned the same day you ask.
                  Licences, insurances and past projects are on the{" "}
                  <Link href="/commercial/capability">capability statement</Link>, which prints as a one-page
                  document.
                </p>
              </div>

              <div className="cx-side__card">
                <h2>Based at</h2>
                <p>
                  {site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}. Standard
                  service area 75&nbsp;km, further for rollout and contract work.
                </p>
              </div>
            </div>

            <div className="cx-scope__form">
              <CommercialScopeForm headingLevel="h2" badge="Read by the person who prices it" />
            </div>
          </div>
        </div>
      </section>

      <CommReveal />
    </div>
  );
}
