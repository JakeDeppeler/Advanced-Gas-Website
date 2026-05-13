import type { Metadata } from "next";
import { site } from "@/lib/site";
import { ContactForm } from "@/components/ContactForm";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact — Free quote in 2 hours",
  description: `Get a free quote with VEU rebate applied. Pakenham VIC, servicing within 75 km. ${site.phone} · ${site.email} · 24/7 emergency.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="page-contact">
      <section className="ct-hero">
        <div className="wrap">
          <span className="ds-eyebrow"><span className="ds-dot" /> Contact us</span>
          <h1>Tell us what you need. <em>We&apos;ll come back within 2 hours.</em></h1>
          <p>Free, no-obligation quote — VEU rebate already worked into the number. Pakenham &amp; within 75 km. The bloke who quotes is the bloke who installs.</p>
        </div>
      </section>

      <section className="ct-grid-wrap" id="form">
        <div className="wrap ct-grid">
          <ContactForm />

          <aside className="ct-side">
            <div className="ct-card">
              <h3>Call us</h3>
              <a className="ct-card__phone" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <span className="ct-card__sub">Mon–Fri · 7am – 6pm</span>
            </div>

            <div className="ct-card ct-card--red" id="emergency">
              <span className="ct-card__sub" style={{ color: "#fff" }}>24/7 Emergency</span>
              <a className="ct-card__phone" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <p style={{ marginTop: 8 }}>
                Gas leak, no hot water, CO alarm — we answer after hours for locals only. Make-safe call-out $500 + GST.
              </p>
            </div>

            <div className="ct-card">
              <h3>Email</h3>
              <p><a href={`mailto:${site.email}`} style={{ color: "var(--navy)", fontWeight: 600 }}>{site.email}</a></p>
              <h3 style={{ marginTop: 12 }}>Workshop</h3>
              <p>1 Sierra Cct, Pakenham VIC 3810<br />By appointment only.</p>
            </div>

            <div className="ct-card">
              <h3>Hours</h3>
              <div className="ct-hours">
                <div className="ct-hours__row"><strong>Mon – Fri</strong><span>7:00 am – 6:00 pm</span></div>
                <div className="ct-hours__row"><strong>Saturday</strong><span>8:00 am – 2:00 pm</span></div>
                <div className="ct-hours__row"><strong>Sunday</strong><span>Emergencies only</span></div>
                <div className="ct-hours__row"><strong>Public hols</strong><span>Closed (except emergency)</span></div>
              </div>
            </div>

            <div className="ct-card">
              <h3>Service area</h3>
              <p>Pakenham &amp; within 75 km. We don&apos;t quote outside that radius — keeps our response times honest.</p>
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
    </div>
  );
}
