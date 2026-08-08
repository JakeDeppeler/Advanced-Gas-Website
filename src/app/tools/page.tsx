import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
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

const TOOLS: {
  slug: string;
  title: string;
  tagline: string;
  blurb: string;
  ctaLabel: string;
  bullets: string[];
}[] = [
  {
    slug: "sizing-calculator",
    title: "Aircon Sizing Calculator",
    tagline: "What size aircon does this room need?",
    blurb:
      "Get the right kW rating for your room in seconds. Enter the room dimensions, ceiling height, orientation and insulation — the calculator handles the industry-standard heat-load formula so you don't quote the wrong size.",
    ctaLabel: "Open the sizing calculator →",
    bullets: [
      "Australian residential heat-load formula",
      "Adjusts for ceiling height, orientation, insulation, glazing, occupants",
      "Recommends a cooling capacity range (kW) + closest standard model size",
    ],
  },
  {
    slug: "running-cost-calculator",
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
    title: "Aircon Fault Code Lookup",
    tagline: "What does this error code on my aircon mean?",
    blurb:
      "Searchable table of the most common fault codes across every major aircon brand we service — Mitsubishi Electric, Daikin, Fujitsu, Panasonic, LG, Kaden and more. Each entry lists the likely cause and the first thing to check.",
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
          <div className="tools-grid">
            {TOOLS.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="tool-card">
                <div className="tool-card__inner">
                  <div className="tool-card__eyebrow">Free tool</div>
                  <h2>{t.title}</h2>
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
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Rather just have us size / quote it?</h2>
            <p>Send the room dimensions or a photo of the fault code — we&rsquo;ll come back with a fixed price.</p>
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
