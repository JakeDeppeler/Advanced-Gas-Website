import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { InstagramCTA } from "@/components/InstagramCTA";
import "../detail.css";
import "./tools.css";

/**
 * /tools hub — free calculators + reference material that pull organic
 * traffic on high-intent search queries ("aircon sizing calculator",
 * "running cost aircon", "Mitsubishi fault code E9").
 *
 * Each tool page targets one specific query cluster, then hands the
 * visitor a natural upgrade into a quote CTA.
 */

export const metadata: Metadata = {
  title: "Free Aircon & Heat Pump Tools · Sizing Calculator, Running Costs, Fault Codes",
  description:
    "Free calculators and reference material from Advanced Gas & Aircon: work out what size aircon your room needs, estimate the running cost, or look up a fault code from your existing unit.",
  alternates: { canonical: "/tools" },
};

/** Tool groups — the hub was one flat grid of 8 cards, which made it
 *  hard to tell the comparison tools from the money tools at a glance. */
type ToolGroup = "compare" | "cost" | "size" | "reference";

const TOOL_GROUPS: { key: ToolGroup; label: string; blurb: string }[] = [
  { key: "size",      label: "Size it right",      blurb: "Work out what your home actually needs before anyone quotes you." },
  { key: "cost",      label: "What it'll cost",    blurb: "Running costs, rebates and payback. Real numbers, not sales maths." },
  { key: "compare",   label: "Compare systems",    blurb: "Side-by-side on the specs that decide it." },
  { key: "reference", label: "Reference",          blurb: "Look something up." },
];

const TOOLS: {
  slug: string;
  title: string;
  tagline: string;
  blurb: string;
  ctaLabel: string;
  bullets: string[];
  group: ToolGroup;
}[] = [
  {
    slug: "sizing-calculator",
    group: "size",
    title: "Aircon Sizing Calculator",
    tagline: "What size aircon does this room need?",
    blurb:
      "Get the right kW rating for your room in seconds. Enter the room dimensions, ceiling height, orientation and insulation. The calculator handles the industry-standard heat-load formula so you don't quote the wrong size.",
    ctaLabel: "Open the sizing calculator →",
    bullets: [
      "Australian residential heat-load formula",
      "Adjusts for ceiling height, orientation, insulation, glazing, occupants",
      "Recommends a cooling capacity range (kW) + closest standard model size",
    ],
  },
  {
    slug: "heat-pump-sizing",
    group: "size",
    title: "Heat Pump Sizing Calculator",
    tagline: "What size hot water tank does my home need?",
    blurb:
      "Most guides just count bedrooms. This one sizes off what your household actually draws, shower flow, shower length, how many people go through before work, then gives you the tank size, recovery rate and full reheat time.",
    ctaLabel: "Size my heat pump →",
    bullets: [
      "Works out the real hot-water fraction of a mixed shower (a 9 L/min head only pulls ~5 L from the tank)",
      "Sizes on 80% usable capacity, not the number on the badge",
      "Reheat time + L/hr recovery for your chosen COP and compressor",
    ],
  },
  {
    slug: "veu-rebate-estimator",
    group: "cost",
    title: "VEU Rebate Estimator",
    tagline: "How much rebate can I claim?",
    blurb:
      "Enter your postcode, current system and planned upgrade, get the estimated Victorian Energy Upgrades rebate range and your net out-of-pocket install cost. Covers hot water and space heating/cooling upgrades.",
    ctaLabel: "Estimate my rebate →",
    bullets: [
      "Every VEU upgrade path (gas / electric → heat pump, gas ducted → RC)",
      "Household size + solar adjustments for hot water",
      "Rebate range + net install cost after rebate",
    ],
  },
  {
    slug: "heating-comparator",
    group: "compare",
    title: "Gas vs Reverse-Cycle Heating",
    tagline: "Which is cheaper to run this winter?",
    blurb:
      "Compare the annual winter running cost of a gas ducted heater against a reverse-cycle (heat pump) system for your home. Enter heat load, hours, star rating, COP and tariffs, get the payback if you swap.",
    ctaLabel: "Compare heating cost →",
    bullets: [
      "3 to 6-star gas efficiency + inverter reverse-cycle COP",
      "Annual saving + payback with VEU rebate applied",
      "10-year net saving projection",
    ],
  },
  {
    slug: "heat-pump-compare",
    group: "compare",
    title: "Heat Pump Compare",
    tagline: "Reclaim vs iStore vs Thermann vs Sanden vs Rheem.",
    blurb:
      "Cross-brand heat pump hot water comparison, CO₂ vs R290 vs R134a, capacity, warranty, COP, price band, made-in and our installer take. Pick 2-5 models to compare side-by-side.",
    ctaLabel: "Compare heat pumps →",
    bullets: [
      "Every major HW heat pump brand we service",
      "Refrigerant type, COP, warranty, install range",
      "Pros / cons + our default recommendations",
    ],
  },
  {
    slug: "system-comparison",
    group: "compare",
    title: "System Type Comparison",
    tagline: "Split vs multi-head vs ducted vs gas vs evap.",
    blurb:
      "Side-by-side comparison of the five main home climate-control options, install cost, running cost, zone control, lifespan, best-for scenarios and which brands we install for each. Pick 2-5 systems to compare.",
    ctaLabel: "Compare systems →",
    bullets: [
      "5 system types · toggle any 2-5 to compare",
      "Real Melbourne install-cost + running-cost ranges",
      "Pros, cons, brands and rule-of-thumb picks",
    ],
  },
  {
    slug: "hot-water-savings",
    group: "cost",
    title: "Hot Water Savings Calculator",
    tagline: "How much will a heat pump save me?",
    blurb:
      "Compare your current gas or electric hot water annual cost against a modern heat pump. Applies the Victorian VEU rebate to the install cost and projects the payback period over 10 years, the fastest way to see if the upgrade actually pays for itself.",
    ctaLabel: "See my savings →",
    bullets: [
      "Handles gas storage, gas continuous, electric peak, off-peak and solar-boost",
      "VEU rebate applied to net install cost",
      "Payback in years + 10-year total savings",
    ],
  },
  {
    slug: "running-cost-calculator",
    group: "cost",
    title: "Running Cost Calculator",
    tagline: "What will this cost me to run?",
    blurb:
      "Estimate the electricity cost of running an aircon or heat pump per day, week and year. Uses your unit's kW input (or capacity + COP), your usage hours and your electricity price to project the real running cost.",
    ctaLabel: "Estimate my running cost →",
    bullets: [
      "Works for split, multi-head, ducted and heat pump hot water",
      "COP + capacity → kW input conversion built in",
      "Shows cost per day, per week and per year at your electricity rate",
    ],
  },
  {
    slug: "fault-codes",
    group: "reference",
    title: "Aircon Fault Code Lookup",
    tagline: "What does this error code on my aircon mean?",
    blurb:
      "Searchable table of the most common fault codes across every major aircon brand we service, Mitsubishi Electric, Daikin, Fujitsu, Panasonic, LG, Kaden and more. Each entry lists the likely cause and the first thing to check.",
    ctaLabel: "Look up a fault code →",
    bullets: [
      "Every brand we service, plus the ones we don't",
      "Likely cause + first-check for each code",
      "One click to call us if it's an install-day / warranty issue",
    ],
  },
];

export default function ToolsHubPage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Tools</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tools</div>
          <h1>
            Aircon &amp; heat pump <span className="accent">tools you can use right now</span>.
          </h1>
          <p className="dp-hero__sub">
            Three free calculators and reference tools we use ourselves on quote day. Work out
            what size aircon fits your room, what it&rsquo;ll cost to run, or what that flashing
            fault code on your existing unit actually means.
          </p>
        </div>
      </section>

      <section className="tools-grid-sec">
        <div className="wrap">
          {TOOL_GROUPS.map((g) => {
            const inGroup = TOOLS.filter((t) => t.group === g.key);
            if (inGroup.length === 0) return null;
            return (
              <div key={g.key} className="tools-group">
                <div className="tools-group__head">
                  <h2 className="tools-group__title">{g.label}</h2>
                  <p className="tools-group__blurb">{g.blurb}</p>
                  <span className="tools-group__count">
                    {inGroup.length} {inGroup.length === 1 ? "tool" : "tools"}
                  </span>
                </div>
                <div className="tools-grid">
                  {inGroup.map((t) => (
                    <Link key={t.slug} href={`/tools/${t.slug}`} className="tool-card">
                      <div className="tool-card__inner">
                        <div className="tool-card__eyebrow">Free tool</div>
                        <h3>{t.title}</h3>
                        <p className="tool-card__tagline">{t.tagline}</p>
                        <p className="tool-card__blurb">{t.blurb}</p>
                        <ul className="tool-card__bullets">
                          {t.bullets.map((b) => <li key={b}>{b}</li>)}
                        </ul>
                        <span className="tool-card__cta">{t.ctaLabel}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          <InstagramCTA
            heading="Want to see the work, not just the numbers?"
            body="Our Instagram is every install we finish, splits, ducted, heat pumps and gas heaters going into real houses across Melbourne's south-east."
          />
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Rather just have us size / quote it?</h2>
            <p>Send the room dimensions or a photo of the fault code. We&rsquo;ll come back with a fixed price.</p>
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
