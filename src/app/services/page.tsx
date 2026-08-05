import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import "./services-hub.css";

export const metadata: Metadata = {
  title: "Services, Heat Pumps, Aircon, Gas & Hot Water",
  description:
    "Heat pump hot water, split system & ducted aircon, gas heating, gas servicing, hot water and commercial fit-outs. Pakenham VIC, servicing within 50 km. Free quote.",
  alternates: { canonical: "/services" },
};

type Service = {
  id: string;
  num: string;
  eyebrow: string;
  eyebrowOrange?: boolean;
  h2: string;
  lede: string;
  specs: [string, string][];
  bullets: string[];
  brands?: string[];
  photo: string;
  photoAlt: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const services: Service[] = [
  {
    id: "heatpump",
    num: "01",
    eyebrow: "01 · Heat pump hot water",
    eyebrowOrange: true,
    h2: "Save up to 73% on hot water bills with the VEU rebate applied.",
    lede: "Replace your gas or electric storage tank with a high-efficiency heat pump, we handle the VEU paperwork so the rebate is already on your quote.",
    specs: [["VEU Rebate", "up to $2,600"], ["Install time", "1 day"], ["Tank warranty", "5–10 yrs"], ["Workmanship", "6 yrs"]],
    bullets: [
      "Old gas / electric unit removed & disposed responsibly",
      "Eligibility, certificates and STCs handled by us",
      "Sizing matched to your household, no upsell",
      "Compliance certificate emailed within 24 hours",
    ],
    brands: ["Reclaim", "iStore", "Thermann"],
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Thermann heat pump hot water install in Pakenham",
    primaryCta: { label: "Get heat pump quote →", href: "/quote" },
    secondaryCta: { label: "Check rebate first", href: "/rebates" },
  },
  {
    id: "split",
    num: "02",
    eyebrow: "02 · Split system aircon",
    h2: "Whisper-quiet cooling in a single room, installed clean.",
    lede: "From bedrooms to granny flats, we size and install single-head split systems with neat, hidden pipework and tidy condensate drains.",
    specs: [["Sizes", "2.5 – 9 kW"], ["Install time", "½ day"], ["Warranty", "5 yrs"], ["Refrigerant", "R32 inverter"]],
    bullets: [
      "Mitsubishi Electric or Kaden, supplied & installed",
      "Indoor unit positioning checked for airflow",
      "Up to $1,800 VEU rebate on eligible installs",
      "Full ARC refrigeration licence, no dodgy shortcuts",
    ],
    brands: ["Mitsubishi Electric", "Kaden"],
    photo: "/kaden-indoor.webp",
    photoAlt: "Kaden split system indoor head install",
    primaryCta: { label: "Get split quote →", href: "/quote" },
    secondaryCta: { label: "Or chat to us", href: "tel:+61359478000" },
  },
  {
    id: "ducted",
    num: "03",
    eyebrow: "03 · Ducted aircon",
    eyebrowOrange: true,
    h2: "Whole-home zoned cooling, design, supply, install.",
    lede: "Replace inefficient ducted gas heating with a modern reverse-cycle ducted system. Zone controllers, app control, evaporator design, done properly the first time.",
    specs: [["Capacity", "10 – 20 kW"], ["Install time", "2–3 days"], ["Zones", "3 – 8"], ["VEU rebate", "up to $5,000"]],
    bullets: [
      "Roof-cavity survey done before quote, no surprises",
      "Modular zones, app control on most models",
      "Old ducted gas heater removed and disposed",
      "5–7 year warranty depending on system",
    ],
    brands: ["Mitsubishi Electric", "Kaden", "Daikin"],
    photo: "/duct-work.webp",
    photoAlt: "Ducted aircon ductwork install in a Pakenham home",
    primaryCta: { label: "Book a roof survey →", href: "/quote" },
  },
  {
    id: "gas-heating",
    num: "04",
    eyebrow: "04 · Gas & ducted gas heating",
    h2: "Install, replace, service, Brivis, Braemar, Rinnai.",
    lede: "Still want the warmth of gas? We install, replace and service ducted gas units, wall furnaces and space heaters with full carbon-monoxide testing.",
    specs: [["Type", "Ducted / wall"], ["Capacity", "14 – 35 MJ"], ["Service", "$280 + GST"], ["CO test", "included"]],
    bullets: [
      "Licensed gas fitter on every job",
      "Carbon monoxide testing on every service",
      "Flue inspection, return-air checks, thermostat tune",
      "Compliance certificate within 24 hours",
    ],
    brands: ["Brivis", "Braemar", "Rinnai"],
    photo: "/gas-ducted-install.webp",
    photoAlt: "Ducted gas heating install by Advanced Gas",
    primaryCta: { label: "Quote my heating →", href: "/quote" },
  },
  {
    id: "service",
    num: "05",
    eyebrow: "05 · Service & safety",
    eyebrowOrange: true,
    h2: "Annual gas appliance servicing + CO testing, $280 + GST.",
    lede: "The boring stuff that keeps your warranty intact, your bills sensible, and your family safe from carbon monoxide. One flat rate, no time-on-tools games.",
    specs: [["Price", "$280 + GST"], ["Time on site", "~60 min"], ["Report", "PDF emailed"], ["Best every", "2 yrs"]],
    bullets: [
      "Visual inspection & safety check",
      "Burner clean, flue check, gas pressure test",
      "Carbon monoxide (CO) atmospheric test",
      "Written report with photos for insurance / rental",
    ],
    photo: "/evap-cooler-service.webp",
    photoAlt: "Evaporative cooler service and CO testing",
    primaryCta: { label: "Book a service →", href: "/quote" },
  },
  {
    id: "hotwater",
    num: "06",
    eyebrow: "06 · Hot water, gas & electric",
    h2: "Same-day swaps on most common units.",
    lede: "Burst tank? Continuous flow on the blink? We carry the common Rinnai, Thermann and Rheem units on the truck for most call-outs.",
    specs: [["Tank sizes", "25L – 400L"], ["Continuous", "16 – 32 L/min"], ["Call-out", "same day"], ["Warranty", "5–12 yrs"]],
    bullets: [
      "Storage gas, instantaneous gas, electric storage",
      "Heat pump alternative quoted alongside if eligible",
      "Old unit removed and disposed",
      "Plumbing compliance cert included",
    ],
    brands: ["Rinnai", "Thermann", "Rheem"],
    photo: "/gas-hot-water-changeover.webp",
    photoAlt: "Gas hot water changeover, same day service",
    primaryCta: { label: "Call for same-day →", href: `tel:${site.phoneE164}` },
  },
  {
    id: "commercial",
    num: "07",
    eyebrow: "07 · Commercial fit-outs",
    eyebrowOrange: true,
    h2: "Cafés, gyms, offices, fit-outs, one PM, one invoice.",
    lede: "Aircon, hot water, gas. We handle the lot for SE Melbourne commercial fits, coordinated with your builder, inspected, certified, signed off.",
    specs: [["Scopes", "HVAC / gas / HW"], ["PM", "single contact"], ["Insurance", "$20M PL"], ["SWMS", "supplied"]],
    bullets: [
      "Site induction-ready paperwork in 24 hrs",
      "Builder-coordinated install windows",
      "Single line of accountability through the trade",
      "Annual service contracts available post-handover",
    ],
    photo: "/commercial.webp",
    photoAlt: "Commercial fit-out mechanical services",
    primaryCta: { label: "Get a tender →", href: "/contact" },
  },
  {
    id: "emergency",
    num: "08",
    eyebrow: "08 · 24/7 emergency",
    h2: "Gas leak? No hot water? Smoking flue? We answer the phone.",
    lede: "After-hours calls go to a real on-call tradie, not an overseas call centre. Pakenham locals only, sorry, we can't cover all of Melbourne overnight.",
    specs: [["Coverage", "Pakenham + 50km"], ["Response", "within 2 hrs"], ["After-hours", "$400 first hr · $150/hr after"], ["Call diversion", "no"]],
    bullets: [
      "Smell gas? Leave the property, open windows, then call us",
      "Hot water failure with kids in the house, priority",
      "Carbon monoxide alarm triggered, immediate response",
    ],
    photo: "/reclaim-mitsubishi.webp",
    photoAlt: "Advanced Gas team on an emergency callout",
    primaryCta: { label: `Call ${site.phone} →`, href: `tel:${site.phoneE164}` },
  },
];

export default function ServicesHubPage() {
  return (
    <div className="page-services">
      <section className="sv-hero">
        <div className="wrap">
          <div className="sv-hero__eyebrow">
            <span className="ds-dot" />
            Eight services · one trusted local crew
          </div>
          <h1>Everything gas, aircon &amp; hot water, installed, serviced, certified.</h1>
          <p>One family-run team for the whole job. Same tradies, same paperwork trail, same warranty whether you&apos;re swapping a hot water unit or fitting out a café from scratch.</p>
          <div className="sv-tabs">
            {services.map((s) => (
              <a key={s.id} className="sv-tab" href={`#${s.id}`}>
                <span>{s.num}</span> {s.eyebrow.split(" · ")[1] ?? s.eyebrow}
              </a>
            ))}
          </div>
        </div>
      </section>

      {services.map((s) => (
        <section key={s.id} className="sv" id={s.id}>
          <div className="wrap sv__grid">
            <div className="sv__copy">
              <span className="ds-eyebrow">
                <span className={`ds-dot${s.eyebrowOrange ? " ds-dot--orange" : ""}`} />
                {s.eyebrow}
              </span>
              <h2>{s.h2}</h2>
              <p className="sv__lede">{s.lede}</p>
              <div className="sv__specs">
                {s.specs.map(([l, v]) => (
                  <div key={l} className="sv-spec">
                    <span className="sv-spec__l">{l}</span>
                    <span className="sv-spec__v">{v}</span>
                  </div>
                ))}
              </div>
              <ul className="sv__bullets">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
              {s.brands && (
                <div className="sv__brands">
                  {s.brands.map((b) => <span key={b}>{b}</span>)}
                </div>
              )}
              <div className="sv__ctas">
                {s.primaryCta.href.startsWith("tel:") ? (
                  <a href={s.primaryCta.href} className="ds-btn ds-btn--orange ds-btn--lg">{s.primaryCta.label}</a>
                ) : (
                  <Link href={s.primaryCta.href} className="ds-btn ds-btn--orange ds-btn--lg">{s.primaryCta.label}</Link>
                )}
                {s.secondaryCta && (
                  s.secondaryCta.href.startsWith("tel:") ? (
                    <a href={s.secondaryCta.href} className="ds-btn ds-btn--ghost ds-btn--lg">{s.secondaryCta.label}</a>
                  ) : (
                    <Link href={s.secondaryCta.href} className="ds-btn ds-btn--ghost ds-btn--lg">{s.secondaryCta.label}</Link>
                  )
                )}
              </div>
            </div>
            <div className="sv__media">
              <div className="sv__photo">
                <Image
                  src={s.photo}
                  alt={s.photoAlt}
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>One quote. One crew. One handshake.</h2>
            <p>Free quote, VEU rebate already applied, usually back within 2 hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
