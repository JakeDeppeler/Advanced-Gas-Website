import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { RebateCalculator } from "@/components/RebateCalculator";
import "./rebates.css";

export const metadata: Metadata = {
  title:
    "VEU Rebates Pakenham, Up to $2,600 off heat pumps, $5,000 off aircon",
  description:
    "VEU-accredited installer in Pakenham. Check your eligibility for the Victorian Energy Upgrades rebate, up to $2,600 off heat pump hot water and $5,000 off split system aircon. Free 60-second check.",
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
    a: "Energy retailers in Victoria are required by law to fund energy-efficiency upgrades, that's the VEU program. We claim and apply the certificates on your behalf, which is why you don't pay then chase.",
  },
  {
    q: "Is the rebate guaranteed at the amount you quote?",
    a: "The rebate value can fluctuate slightly based on certificate prices, but we lock in the quoted figure once you sign, so the price you see is the price you pay. We carry any market movement, not you.",
  },
  {
    q: "Can I use VEU with solar?",
    a: "Absolutely, heat pumps run beautifully off solar PV, especially the iStore and Reclaim units with timer scheduling. Most of our customers see hot water bills drop to almost zero after a daytime-charge install.",
  },
  {
    q: "I rent, can my landlord do this?",
    a: "Yes. VEU is open to rental properties, many landlords love it because the upgrade adds property value with most of the cost offset by the rebate. We can speak to them directly if it helps.",
  },
  {
    q: "What if my old unit still works?",
    a: "Still eligible. VEU doesn't require failure, it rewards the energy-efficiency improvement. Swapping a working but inefficient gas tank or old aircon is exactly what the program is designed for.",
  },
  {
    q: "Are concession card holders eligible for more?",
    a: "Yes, concession card holders (pensioner, healthcare, etc.) can stack with additional Victorian Government top-up rebates in some cases. Worth a quick call to confirm what applies to your situation.",
  },
  {
    q: "Does VEU cover servicing or just installation?",
    a: "VEU is for the new install. We offer annual servicing separately at $280 + GST to keep your warranty intact and bills low.",
  },
];

const products = [
  {
    brand: "Reclaim · CO₂ Split",
    name: "Reclaim CO₂ split heat pump",
    bullets: [
      "Compressor split from tank, quieter, longer life",
      "Stainless steel 15-year warranty option",
      "315 L or 400 L, Wi-Fi smart control",
      "Best for: premium installs & solar pairing",
    ],
    price: "from $5,340",
    rebate: "$2,605 rebate applied",
    pill: "premium",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Reclaim CO₂ split heat pump install",
  },
  {
    brand: "Reclaim · R290 AIO",
    name: "Reclaim R290 all-in-one 300 L",
    bullets: [
      "Plug-in all-in-one, tank + compressor in one unit",
      "R290 refrigerant, low GWP",
      "Compact footprint, fast, simple installs",
      "Best for: 3–4 person homes",
    ],
    price: "$2,610",
    rebate: "$2,605 rebate applied",
    pill: "value",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Reclaim R290 all-in-one heat pump",
  },
  {
    brand: "iStore",
    name: "iStore 275 L heat pump",
    bullets: [
      "Smart Wi-Fi control + scheduling",
      "Australian designed",
      "6-year tank warranty",
      "Best for: solar-paired households",
    ],
    price: "$2,910",
    rebate: "$2,205 rebate applied",
    pill: "mid-range",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "iStore heat pump install",
  },
  {
    brand: "Thermann · R290",
    name: "Thermann 285 L R290 all-in-one",
    bullets: [
      "Australian made, extra $400 rebate",
      "R290 refrigerant, low GWP",
      "5-year tank warranty",
      "Best for: 3–4 person homes",
    ],
    price: "$2,610",
    rebate: "$2,605 rebate applied",
    pill: "value",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Thermann 285 L R290 heat pump",
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
    price: "custom quote",
    rebate: "up to $1,800 rebate",
    pill: "flagship",
    photo: "/reclaim-mitsubishi.webp",
    photoAlt: "Mitsubishi Electric split system install",
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
    price: "custom quote",
    rebate: "up to $1,500 rebate",
    pill: "value",
    photo: "/kaden-indoor.webp",
    photoAlt: "Kaden split system indoor head install",
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
    price: "from $11,000",
    rebate: "up to $5,000 rebate",
    pill: "whole home",
    photo: "/ducted-condenser.webp",
    photoAlt: "Ducted aircon condenser install",
  },
];

const steps = [
  {
    n: 1,
    t: "You request a quote",
    d: "Online form (60 seconds) or call. Snap a photo of your current unit if you can, speeds things up.",
  },
  {
    n: 2,
    t: "We assess eligibility",
    d: "Free 20-minute site visit. We check your existing system, hot water usage, electrical & gas setup against VEU rules.",
  },
  {
    n: 3,
    t: "We apply the rebate",
    d: "Your quote arrives with the rebate already deducted. You sign off, no separate claim, no waiting weeks for refund.",
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
            efficient gear. We're a VEU-accredited installer in Pakenham, we apply the rebate at quote
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
              The VEU program is open to most Victorian households, owner-occupied, rental, and units.
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
              1,200+ Pakenham-area installs. Pricing shown is the indicative VEU rebate range, your
              actual figure depends on your old unit and home.
            </p>
          </div>

          <div className="rb-prodgrid">
            {products.map((p) => (
              <article key={p.name} className="rb-prod">
                <div className="rb-prod__photo" style={{ position: "relative" }}>
                  <Image
                    src={p.photo}
                    alt={p.photoAlt}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    style={{ objectFit: "contain", padding: "16px" }}
                  />
                </div>
                <div className="rb-prod__body">
                  <span className="rb-prod__brand">{p.brand}</span>
                  <h3>{p.name}</h3>
                  <ul className="rb-prod__bullets">
                    {p.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <div className="rb-prod__foot">
                    <div className="rb-prod__price">
                      <strong>{p.price}</strong>
                      <span>fully installed, inc GST</span>
                      <span className="rb-prod__price-rebate">{p.rebate}</span>
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
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
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
            <p>Pakenham locals, usually replied within 2 business hours.</p>
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
