import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { HeatPumpSizing } from "./HeatPumpSizing";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "Heat Pump Hot Water Sizing Calculator · What Size Tank Do I Need?",
  description:
    "Work out what size heat pump hot water tank your home needs, based on real shower flow, household size and reheat time. 170 L to 400 L, with recovery rate and full reheat time for each.",
  alternates: { canonical: "/tools/heat-pump-sizing" },
};

const FAQS = [
  {
    q: "What size heat pump hot water system do I need?",
    a: "As a rough guide: 1-2 people 170-200 L, 3-4 people 250-280 L, 4-5 people 300-315 L, 6+ people 400 L. But household size alone is a poor guide, shower length and flow rate matter more. Two long showers at 15 L/min will out-draw four short ones at 9 L/min. The calculator above sizes off actual draw-off rather than a bedroom count.",
  },
  {
    q: "Why does a 9 L/min shower only use about 5 L of hot water?",
    a: "Because a shower is a mix. You store water at 60 °C (legally required to control Legionella) but shower at about 41 °C, so the tempering valve blends in cold mains at roughly 15 °C. At those temperatures around 58% of the flow comes from the tank and 42% is cold, so a 9 L/min head draws about 5.2 L/min of stored hot water and 3.8 L/min of cold. That's why a 270 L tank serves far more showering than 270 ÷ 9 would suggest.",
  },
  {
    q: "How long does a heat pump take to reheat a full tank?",
    a: "Between 3 and 6 hours for a typical residential unit heating a full tank from cold mains to 60 °C. A 1 kW compressor at COP 4.5 delivers 4.5 kW of heat, which lifts about 315 L through a 45 °C rise in roughly 4.4 hours. Heat pumps are deliberately slow and steady. That's how they hit a COP of 4+ rather than the 1.0 an electric element manages.",
  },
  {
    q: "Can you only use 80% of the tank?",
    a: "Roughly, yes. Hot water stratifies. It sits in a hot layer on top with cooler water below. As you draw off the top, cold mains enters the bottom and the boundary rises. By the time you're into the last 20% the outlet temperature has dropped enough that it no longer counts as usable hot water. All sizing should be done on usable capacity, not the number on the badge.",
  },
  {
    q: "What if two people shower at the same time?",
    a: "It halves your effective capacity and doubles the draw rate, which is the situation that most often catches out an undersized tank. If simultaneous showers are normal in your house, tell us at the quote and we'll size up a step, the extra cost of the bigger tank is far less than the cost of swapping it out later.",
  },
];

export default function HeatPumpSizingPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Tools", url: `${site.url}/tools` },
    { name: "Heat pump sizing", url: `${site.url}/tools/heat-pump-sizing` },
  ]);

  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">Heat pump sizing</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tool</div>
          <h1>
            What size <span className="accent">heat pump</span> does your home need?
          </h1>
          <p className="dp-hero__sub">
            Most sizing guides just count bedrooms. This one works off what your
            household actually draws, shower flow, length and how many
            people go through the bathroom before work, then tells you the
            tank size, the recovery rate and how long a full reheat takes.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <HeatPumpSizing />

          <div className="hps-explain">
            <h2>How the maths works</h2>
            <div className="hps-explain__grid">
              <div>
                <h3>Only part of your shower comes from the tank</h3>
                <p>
                  Hot water has to be stored at 60 °C to control Legionella, but
                  nobody showers at 60 °C. A tempering valve blends stored hot
                  with cold mains down to about 41 °C at the head.
                </p>
                <p>
                  So the hot fraction of the flow is{" "}
                  <code>(shower&nbsp;−&nbsp;mains) ÷ (tank&nbsp;−&nbsp;mains)</code>.
                  At 41 °C from a 60 °C tank and 15 °C mains that&rsquo;s
                  (41−15) ÷ (60−15) = <strong>0.58</strong>, so a 9 L/min
                  head pulls about <strong>5.2 L of hot</strong> and 3.8 L of cold
                  every minute.
                </p>
              </div>
              <div>
                <h3>You can&rsquo;t use the whole tank</h3>
                <p>
                  Water stratifies. The hot sits on top, cold mains fills from
                  the bottom, and once you&rsquo;re into the last fifth the outlet
                  temperature has fallen away. We size on <strong>80% usable</strong>,
                  which is the accepted figure.
                </p>
                <h3>Reheat time</h3>
                <p>
                  Energy to heat a tank is{" "}
                  <code>litres&nbsp;×&nbsp;4.186&nbsp;×&nbsp;ΔT&nbsp;÷&nbsp;3600</code> kWh.
                  Divide by the heat pump&rsquo;s <em>heat output</em> (input kW ×
                  COP, not input alone) and you get hours. A 1 kW unit at COP 4.5
                  is putting out 4.5 kW of heat.
                </p>
              </div>
            </div>
          </div>

          <div className="hps-cta-note">
            <h2>Where this stops and we start</h2>
            <p>
              This gets you in the right ballpark before anyone quotes you, which
              is the point. It&rsquo;s hard to tell whether a salesperson has
              oversized you if you have no reference. What it can&rsquo;t account
              for is pipe run length and dead-leg volume, whether you have a bath
              to fill, simultaneous draw-off from two bathrooms, and how cold your
              mains genuinely runs in July at your address. We check all of that
              on the site visit.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
              <Link href="/tools/heat-pump-compare" className="ds-btn ds-btn--ghost">
                Compare heat pump brands →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="dp-faq">
        <div className="wrap dp-faq__grid">
          <div className="dp-faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
            <h2>Sizing questions we get asked.</h2>
            <p>
              If yours isn&rsquo;t here, call us on{" "}
              <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)" }}>{site.phone}</a>.
            </p>
          </div>
          <div className="dp-faq__right">
            {FAQS.map((f, i) => (
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Want us to check the sizing properly?</h2>
            <p>Free site visit, fixed quote back in 2 business hours, VEU rebate already applied.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get my fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id="ld-crumbs-hps" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id="ld-faq-hps" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }} />
    </div>
  );
}
