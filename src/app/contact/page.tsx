import type { Metadata } from "next";
import { site, openingHoursShort } from "@/lib/site";
import { ContactForm } from "@/components/ContactForm";
import { Head, Next } from "@/components/homepage/page/kit";
import { PageHero, CallButton } from "@/components/homepage/page/PageHero";
import { SiteModeStrip } from "@/components/Header";
import { PHOTO } from "@/lib/homepage/data";
import { EndCta } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
// The form keeps its own styles; only the page around it changed.
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact Us · Callback in 12 Business Hours",
  description: `Get a free quote with VEU rebate applied. Pakenham VIC, servicing within 50 km. ${site.phone} · ${site.email} · After hours for gas leaks and no hot water.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    // The homepage's top (PageHero), shorter and with no card: the form right
    // under it is the page, and a second form beside it would be one too many.
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <>
    <SiteModeStrip tabs={false} />
    <div className="ag ag--flat" data-no-reveal>
      <PageHero
        crumbs={[{ name: "Contact" }]}
        eye="Contact us"
        title="Tell us what you need. {We'll call back within 12 business hours.}"
        sub="A free, no-obligation quote with the VEU rebate already worked in where it applies. Quoted and installed by our own team."
        photo={PHOTO.team} pos="center 40%" short card={false}
        ctas={<><a href="#form" className="abtn abtn--or">To the form ↓</a><CallButton from="contact-hero" /></>}
        trust={[{ v: openingHoursShort(), k: "Mon – Fri" }, { v: "After hours", k: "Gas leaks & no hot water" }]}
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
              <h3>After-hours emergency</h3>
              <a className="kx__big" href={`tel:${site.phoneE164}`}>{site.phone}</a>
              <p>Gas leak or no hot water: call us after hours and we&apos;ll answer if we can, within our service area. The call-out is {site.afterHours.callout}, which covers {site.afterHours.covers}.</p>
              <p>Smell gas? Ring the gas emergency line on 132 771 as well. CO alarm going off? Get everyone outside and call 000.</p>
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
            { t: "Find your system", s: "Options, and how each one works", href: "/#find" },
            { t: "Do you come to me?", s: "Pakenham and 50 km around", href: "/service-areas" },
            { t: "What customers say", s: "Reviews from real jobs", href: "/reviews" },
          ]} />
        </div>
      </section>

      {/* The homepage's closing box. The quote form is already on this page,
          so its main button goes back up to the form rather than off to /quote. */}
      <EndCta
        title={<>Rather we <span>call you</span>?</>}
        text="Leave your number on the form and we'll call you back within 12 business hours. Your written quote comes with the VEU rebate worked in where it applies."
        from="contact-cta"
        cta={{ href: "#form", label: "Back to the form ↑" }}
      />
    </div>
    </>
  );
}
