import type { Metadata } from "next";
import { site, openingHoursShort } from "@/lib/site";
import { ContactForm } from "@/components/ContactForm";
import "./contact.css";
import { PageHero } from "@/components/PageHero";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact, Free quote in 12 hours",
  description: `Get a free quote with VEU rebate applied. Pakenham VIC, servicing within 75 km. ${site.phone} · ${site.email} · 24/7 emergency.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="page-contact">
      <PageHero
        eyebrow="Contact us"
        title={<>Tell us what you need. <em>We&rsquo;ll come back within 12 hours.</em></>}
        sub={<>Free, no-obligation quote, VEU rebate already worked into the number. Pakenham &amp; within 75&nbsp;km. The person who quotes it is the person who installs it.</>}
      />

      <section className="ct-grid-wrap" id="form">
        <div className="wrap ct-grid">
          <ContactForm />

          <aside className="ct-side">
            <div className="ct-card">
              <h3>Call us</h3>
              <a className="ct-card__phone" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <span className="ct-card__sub">Mon–Fri · {openingHoursShort()}</span>
            </div>

            <div className="ct-card ct-card--red" id="emergency">
              <span className="ct-card__sub">24/7 Emergency</span>
              <a className="ct-card__phone" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <p style={{ marginTop: 8 }}>
                Gas leak, no hot water, CO alarm, we answer after hours for locals only. $380 call-out, then $260/hr after.
              </p>
            </div>

            <div className="ct-card">
              <h3>Email</h3>
              <p><a href={`mailto:${site.email}`} style={{ color: "var(--navy)", fontWeight: 600 }}>{site.email}</a></p>
              <h3 style={{ marginTop: 12 }}>Workshop</h3>
              <p>1 Sierra Circuit, Pakenham VIC 3810<br />By appointment only.</p>
            </div>

            <div className="ct-card">
              <h3>Hours</h3>
              <div className="ct-hours">
                <div className="ct-hours__row"><strong>Mon – Fri</strong><span>8:00 am – 4:00 pm</span></div>
                <div className="ct-hours__row"><strong>Sat &amp; Sun</strong><span>Emergencies only</span></div>
                <div className="ct-hours__row"><strong>Public hols</strong><span>Closed (except emergency)</span></div>
              </div>
            </div>

            <div className="ct-card">
              <h3>Service area</h3>
              <p>Pakenham &amp; within 75 km. We don&apos;t quote outside that radius, keeps our response times honest.</p>
              <div className="ct-map">
                <div className="ct-map__pin">
                  <div className="ct-map__pin-ring" />
                  <div className="ct-map__pin-dot" />
                </div>
                <div className="ct-map__label">
                  <span>PAKENHAM, VIC 3810</span>
                  <span style={{ color: "var(--orange)", fontWeight: 700 }}>75 km radius</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* A contact page is a set of details, and this one had no way out of it
          at all — no link to the suburbs we cover, the emergency line or the
          quote form, which are the three things somebody on this page is
          usually one step away from wanting. */}
      <section className="ct-next">
        <div className="wrap">
          <ul className="ct-nextrow">
            <li>
              <Link href="/service-areas">
                <strong>Do you come to me?</strong>
                <span>Every suburb we work in, with drive times from Pakenham</span>
              </Link>
            </li>
            <li>
              <Link href="/contact#emergency">
                <strong>Gas leak or no hot water?</strong>
                <span>The after-hours line, answered by someone on the tools</span>
              </Link>
            </li>
            <li>
              <Link href="/quote">
                <strong>Just want a price?</strong>
                <span>A written quote back inside 12 business hours</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
