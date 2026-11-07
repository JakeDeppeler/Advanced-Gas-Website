import type { Metadata } from "next";
import { site, openingHoursShort } from "@/lib/site";
import { ContactForm } from "@/components/ContactForm";
import { Crumbs, Hero, Head, Next } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
// The form keeps its own styles; only the page around it changed.
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact, Free quote in 12 hours",
  description: `Get a free quote with VEU rebate applied. Pakenham VIC, servicing within 75 km. ${site.phone} · ${site.email} · 24/7 emergency.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Contact" }]} />
      <Hero
        eye="Contact us"
        title={<>Tell us what you need. <em>We&apos;ll come back within 12 hours.</em></>}
        sub="A free, no-obligation quote with the VEU rebate already worked in where it applies. The person who quotes it is the person who installs it."
        ctas={false}
      />

      <section className="pxs" id="form">
        <div className="wrap kx2">
          <div className="page-contact kx__form"><ContactForm /></div>
          <aside className="pp__col" style={{ gap: 12 }}>
            <div className="kx__card">
              <h3>Call us</h3>
              <a className="kx__big" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <p>Mon–Fri · {openingHoursShort()}</p>
            </div>
            <div className="kx__card kx__card--alert" id="emergency">
              <h3>24/7 emergency</h3>
              <a className="kx__big" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <p>Gas leak, no hot water or a CO alarm: we answer after hours for locals. $380 call-out, then $260/hr after.</p>
            </div>
            <div className="kx__card">
              <h3>Hours</h3>
              <dl className="kxl">
                <div><dt>Mon – Fri</dt><dd>{openingHoursShort()}</dd></div>
                <div><dt>Sat &amp; Sun</dt><dd>Emergencies only</dd></div>
                <div><dt>Public holidays</dt><dd>Emergencies only</dd></div>
              </dl>
            </div>
            <div className="kx__card">
              <h3>Email &amp; workshop</h3>
              <p><a href={`mailto:${site.email}`}>{site.email}</a></p>
              <p>1 Sierra Circuit, Pakenham VIC 3810. By appointment only.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="pxs pxs--sky">
        <div className="wrap pp__col">
          <Head eye="Where next" h="Or go straight to it." />
          <Next items={[
            { t: "Find your system", s: "Options, prices and how each one works", href: "/#find" },
            { t: "Do you come to me?", s: "Pakenham and 75 km around", href: "/service-areas" },
            { t: "What customers say", s: "Reviews from real jobs", href: "/reviews" },
          ]} />
        </div>
      </section>
    </div>
  );
}
