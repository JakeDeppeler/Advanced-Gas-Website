import type { Metadata } from "next";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { RebateCalculator } from "@/components/RebateCalculator";
import "./rebates.css";

export const metadata: Metadata = {
  title:
    "VEU Rebates Pakenham — Up to $2,600 off heat pumps, $5,000 off aircon",
  description:
    "VEU-accredited installer in Pakenham. Check your eligibility for the Victorian Energy Upgrades rebate — up to $2,600 off heat pump hot water and $5,000 off split system aircon. Free 60-second check.",
  keywords: [
    "VEU rebate Pakenham",
    "Victorian energy upgrades",
    "heat pump rebate Victoria",
    "aircon rebate Pakenham",
    "VEU eligibility",
    "VEU accredited installer Berwick",
  ],
  alternates: { canonical: "/rebates" },
};

const faqs = [
  {
    q: "Who actually pays for the VEU rebate?",
    a: "Energy retailers in Victoria are required by law to fund energy-efficiency upgrades — that's the VEU program. We claim and apply the certificates on your behalf, which is why you don't pay then chase.",
  },
  {
    q: "Is the rebate guaranteed at the amount you quote?",
    a: "The rebate value can fluctuate slightly based on certificate prices, but we lock in the quoted figure once you sign — so the price you see is the price you pay. We carry any market movement, not you.",
  },
  {
    q: "Can I use VEU with solar?",
    a: "Absolutely — heat pumps run beautifully off solar PV, especially the iStore and Reclaim units with timer scheduling. Most of our customers see hot water bills drop to almost zero after a daytime-charge install.",
  },
  {
    q: "I rent — can my landlord do this?",
    a: "Yes. VEU is open to rental properties — many landlords love it because the upgrade adds property value with most of the cost offset by the rebate. We can speak to them directly if it helps.",
  },
  {
    q: "What if my old unit still works?",
    a: "Still eligible. VEU doesn't require failure — it rewards the energy-efficiency improvement. Swapping a working but inefficient gas tank or old aircon is exactly what the program is designed for.",
  },
  {
    q: "Are concession card holders eligible for more?",
    a: "Yes — concession card holders (pensioner, healthcare, etc.) can stack with additional Victorian Government top-up rebates in some cases. Worth a quick call to confirm what applies to your situation.",
  },
  {
    q: "Does VEU cover servicing or just installation?",
    a: "VEU is for the new install. We offer annual servicing separately at a flat $169 to keep your warranty intact and bills low.",
  },
];

const products = [
  {
    brand: "Reclaim · CO₂",
    name: "Reclaim 270L heat pump",
    bullets: [
      "Natural CO₂ refrigerant (R744)",
      "10-year tank warranty",
      "Quietest in class — 37 dB",
      "Best for: 3–5 person households",
    ],
    rebate: "up to $2,600",
    pill: "flagship",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Heat pump hot water unit",
  },
  {
    brand: "iStore",
    name: "iStore 270L heat pump",
    bullets: [
      "Smart Wi-Fi control + scheduling",
      "Australian designed",
      "6-year tank warranty",
      "Best for: solar-paired households",
    ],
    rebate: "up to $2,400",
    pill: "mid-range",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "iStore-class heat pump hot water",
  },
  {
    brand: "Thermann",
    name: "Thermann 270L heat pump",
    bullets: [
      "Budget-friendly entry point",
      "Stainless steel tank",
      "5-year tank warranty",
      "Best for: smaller homes / rentals",
    ],
    rebate: "up to $2,200",
    pill: "value",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Thermann 270L heat pump installed",
  },
  {
    brand: "Mitsubishi Electric",
    name: "Mitsubishi MSZ-AP series split",
    bullets: [
      "Inverter, R32 refrigerant",
      "Whisper-quiet 19 dB indoor",
      "5-year warranty",
      "2.5kW / 3.5kW / 5kW / 7kW",
    ],
    rebate: "up to $1,800",
    pill: "flagship",
    photo: "/reclaim-and-mitsubishi.jpg",
    photoAlt: "Mitsubishi split system",
  },
  {
    brand: "Kaden",
    name: "Kaden KS series split",
    bullets: [
      "Inverter, R32 refrigerant",
      "5-year warranty",
      "Australian designed",
      "Strong mid-range value",
    ],
    rebate: "up to $1,500",
    pill: "value",
    photo: "/kaden-indoor.jpg",
    photoAlt: "Kaden split system indoor head",
  },
  {
    brand: "Mitsubishi / Kaden",
    name: "Ducted aircon retrofit",
    bullets: [
      "Whole-home zoned cooling",
      "Replacement of inefficient gas heating",
      "Best for: 3+ bedroom homes",
      "5–7 year warranty",
    ],
    rebate: "up to $5,000",
    pill: "whole home",
    photo: "/ducted-condenser.jpg",
    photoAlt: "Ducted aircon condenser",
  },
];

const steps = [
  {
    n: 1,
    t: "You request a quote",
    d: "Online form (60 seconds) or call. Snap a photo of your current unit if you can — speeds things up.",
  },
  {
    n: 2,
    t: "We assess eligibility",
    d: "Free 20-minute site visit. We check your existing system, hot water usage, electrical & gas setup against VEU rules.",
  },
  {
    n: 3,
    t: "We apply the rebate",
    d: "Your quote arrives with the rebate already deducted. You sign off — no separate claim, no waiting weeks for refund.",
  },
  {
    n: 4,
    t: "We install & certify",
    d: "One-day install on most jobs. Old gear removed, compliance certificate emailed within 24 hours.",
  },
];

export default function RebatesPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "VEU Rebates", url: `${site.url}/rebates` },
  ]);

  return (
    <div className="page-rebates">
      {/* HERO */}
      <section className="rb-hero">
        <div className="wrap">
          <div className="hero__eyebrow">
            <span className="eyebrow-dot" />
            Victorian Energy Upgrades · Accredited installer
          </div>
          <h1>
            The VEU rebate is real. <em>We do the paperwork.</em> You get the hot water.
          </h1>
          <p className="rb-hero__sub">
            The Victorian Government pays you to swap old gas, electric or inefficient cooling for clean,
            efficient gear. We're a VEU-accredited installer in Pakenham — we apply the rebate at quote
            stage so there's no chase, no claim form, no waiting.
          </p>

          <div className="hero__ctas">
            <a href="#calc" className="btn btn--orange btn--lg">Check my rebate →</a>
            <a
              href={`tel:${site.phoneE164}`}
              className="btn btn--ghost btn--lg"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
            >
              Or talk to a human
            </a>
          </div>

          <div className="rb-stats">
            <div className="rb-stat">
              <strong>up to $2,600</strong>
              <span>heat pump hot water</span>
            </div>
            <div className="rb-stat">
              <strong>up to $5,000</strong>
              <span>split &amp; ducted aircon</span>
            </div>
            <div className="rb-stat rb-stat--sky">
              <strong>~73%</strong>
              <span>cut to running costs</span>
            </div>
            <div className="rb-stat rb-stat--sky">
              <strong>$0 chase</strong>
              <span>we apply at quote</span>
            </div>
          </div>
        </div>
      </section>

      {/* ELIGIBILITY + CALC */}
      <section className="rb-tool" id="calc">
        <div className="wrap rb-tool__grid">
          <div className="rb-tool__copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Eligibility check</span>
            <h2>Am I eligible? Answer 4 things, find out in 30 seconds.</h2>
            <p>
              The VEU program is open to most Victorian households — owner-occupied, rental, and units.
              We've designed this rough calculator to give you a real ballpark before you commit to a
              site visit.
            </p>
            <ul>
              <li>No personal details needed for the estimate</li>
              <li>Real numbers, not "from $XXX" marketing fluff</li>
              <li>Final figure confirmed at the free 20-min site check</li>
            </ul>
          </div>

          <RebateCalculator />
        </div>
      </section>

      {/* HOW VEU WORKS */}
      <section className="rb-how">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow"><span className="eyebrow-dot" /> How VEU works</span>
            <h2>Four steps from "thinking about it" to rebate-applied install.</h2>
            <p>We handle every step that involves paperwork. You're really only doing step 1.</p>
          </div>

          <div className="rb-howsteps">
            {steps.map((s) => (
              <div key={s.n} className="rb-howstep">
                <div className="rb-howstep__n">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ELIGIBLE PRODUCTS */}
      <section className="rb-prods">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow"><span className="eyebrow-dot" /> Eligible products</span>
            <h2>Heat pumps &amp; aircon we install under the VEU program.</h2>
            <p>
              Each of these is VEU-listed, in stock through our Reece partnership, and proven in
              1,200+ Pakenham-area installs. Pricing shown is the indicative VEU rebate range — your
              actual figure depends on your old unit and home.
            </p>
          </div>

          <div className="rb-prodgrid">
            {products.map((p) => (
              <article key={p.name} className="rb-prod">
                <div
                  className="rb-prod__photo"
                  role="img"
                  aria-label={p.photoAlt}
                  style={{ backgroundImage: `url(${p.photo})` }}
                />
                <div className="rb-prod__body">
                  <span className="rb-prod__brand">{p.brand}</span>
                  <h3>{p.name}</h3>
                  <ul className="rb-prod__bullets">
                    {p.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <div className="rb-prod__foot">
                    <div className="rb-prod__rebate">
                      <strong>{p.rebate}</strong>
                      <span>VEU rebate</span>
                    </div>
                    <span className="rb-prod__pill">{p.pill}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="rb-faq" id="faq">
        <div className="wrap rb-faq__grid">
          <div className="rb-faq__left">
            <span className="eyebrow"><span className="eyebrow-dot" /> Common rebate questions</span>
            <h2>The fine print, in plain English.</h2>
            <p>If your question isn't here, call us. We've handled hundreds of VEU jobs and seen the curly cases.</p>
          </div>
          <div className="rb-faq__right">
            {faqs.map((f, i) => (
              <details key={f.q} name="rebates-faq" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>One free site visit. One quote with the rebate already applied. One handshake.</h2>
            <p>Pakenham locals — usually replied within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <a href="/quote" className="btn btn--orange btn--xl">Start my free quote →</a>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script
        id="ld-rebates-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }}
      />
      <Script
        id="ld-rebates-crumbs"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
    </div>
  );
}
