import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { COMM_AREA_TOWNS } from "@/lib/commercialSite";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { ContactRouter } from "@/components/commercial/ContactRouter";
import { ServiceRadar } from "@/components/commercial/ServiceRadar";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "Contact Us, Commercial Mechanical Pakenham",
  description:
    "Submit a scope, book a service, ask for a home quote or request certificates of currency and SWMS. Based in Pakenham, on site within 75 km and further for contract work.",
  alternates: { canonical: "/commercial/contact" },
};

/**
 * The commercial contact page.
 *
 * Four kinds of person arrive here and they do not want the same form, so
 * the first thing on the page is which one you are — see ContactRouter.
 * Everything else is a way of not using the form at all: the emergency
 * number first and largest, then the two inboxes, then where we actually
 * are.
 *
 * The page carries no opening hours. On the commercial side the answer that
 * matters is that the emergency line is answered at any hour, and putting
 * office hours beside it invites somebody with plant down on a Saturday to
 * conclude we are shut.
 */
export default function CommercialContactPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="Get in touch"
        title={<>Talk to the person who&rsquo;ll <em>price the job.</em></>}
        lede={
          <>
            Tell us about your site, scope and timing. We&rsquo;ll talk it through and put together a clear,
            itemised quote.
          </>
        }
        crumb="Contact us"
        photo="/comm/fitout-floor.jpg"
        ctas={
          <span className="cx-live">
            <i aria-hidden="true" />
            <span>Emergency line open 24/7</span>
          </span>
        }
      />

      <div className="wrap">
        <div className="cx-cmain" id="scope" data-hide-sticky-cta>
          <Suspense fallback={<div className="cx-formcard" style={{ minHeight: 520 }} />}>
            <ContactRouter />
          </Suspense>

          <aside className="cx-cside">
            <a className="cx-cc cx-cc--em cx-rv" href={`tel:${site.phoneE164}`}>
              <span className="cx-mono">Phone · 24/7 emergency</span>
              <b>{site.phone}</b>
              <small>
                Gas, hot water and plant down on a contracted site. After hours goes to someone on the tools.
              </small>
            </a>

            <div className="cx-cc2">
              <a className="cx-cc cx-rv" style={{ ["--i" as string]: "1" }} href={`mailto:${site.email}`}>
                <span className="cx-mono">Office</span>
                <b>admin@</b>
                <small>{site.email}</small>
              </a>
              <a className="cx-cc cx-rv" style={{ ["--i" as string]: "2" }} href="mailto:jake@advancedgas.com.au">
                <span className="cx-mono">Estimating &amp; quotes</span>
                <b>jake@</b>
                <small>jake@advancedgas.com.au</small>
              </a>
            </div>

            <div className="cx-cc cx-rv" style={{ ["--i" as string]: "3" }}>
              <span className="cx-mono">Address</span>
              <b>{site.address.street}</b>
              <small>{site.address.suburb} {site.address.state} {site.address.postcode}</small>
            </div>

            {/* Not opening hours: on a commercial page the useful promise is
                how fast the paperwork comes back, and the emergency line
                above already answers "can I reach you". */}
            <div className="cx-cc cx-rv" style={{ ["--i" as string]: "4" }}>
              <span className="cx-mono">Paperwork</span>
              <b>Same day</b>
              <small>
                Certificates of currency, SWMS and inductions.{" "}
                <Link href="/commercial/capability">See the capability statement</Link>.
              </small>
            </div>
          </aside>
        </div>
      </div>

      {/* ========================= SERVICE AREA ========================= */}
      <section className="cx-sec cx-sec--navy" id="area" style={{ marginTop: "clamp(72px, 9vw, 120px)" }}>
        <div className="wrap">
          <div className="cx-area">
            <div className="cx-rv">
              <span className="cx-eye cx-eye--sky">Service area</span>
              <h2>Melbourne&rsquo;s south-east &amp; Gippsland.</h2>
              <p>Based in {site.address.suburb} and servicing within 75 km, and further for contract work.</p>
              <ul className="cx-chips">
                {COMM_AREA_TOWNS.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <ServiceRadar />
          </div>
        </div>
      </section>

      <CommReveal />
    </div>
  );
}
