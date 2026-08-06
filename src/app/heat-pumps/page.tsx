import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { HeatPumpComparator } from "@/components/HeatPumpComparator";
import "../detail.css";
import "./heat-pumps.css";

export const metadata: Metadata = {
  title: "Heat Pump Guide, Compare Reclaim, Thermann, iStore & Dux",
  description:
    "The honest guide to heat pump hot water in Pakenham. Compare the five brands we install, what a real installed price looks like after the VEU rebate, and the warning signs of no-name importer brands that ghost you after purchase.",
  alternates: { canonical: "/heat-pumps" },
};

const warningSigns = [
  {
    n: "01",
    t: "Brand you've never heard of on a marketplace listing",
    d: "If the brand only exists on Amazon, eBay or an obscure Facebook Marketplace ad, walk away. Reclaim, Thermann, iStore and Dux all have real Australian offices, distributors and service networks. Random importer brands typically don't.",
  },
  {
    n: "02",
    t: "Warranty length under 5 years on the tank",
    d: "Any serious brand backs the tank for at least 5 years (7–10 for premium). A 2-year or 3-year tank warranty is a red flag, the manufacturer doesn't expect the unit to last.",
  },
  {
    n: "03",
    t: "No VEU listing / not accredited",
    d: "If the unit isn't on the Victorian Essential Services Commission's approved product list, you can't claim the VEU rebate. That's a $1,205 straight-up loss, plus you're stuck with an untested unit. Check the ESC register before you buy.",
  },
  {
    n: "04",
    t: "Parts sourced from overseas only",
    d: "When the compressor fails at year 4, you don't want to wait 6 weeks for a part from a warehouse in Guangzhou. Ask before you buy: \"Where does the nearest spare compressor live, and how fast can it be here?\" A proper brand can answer in 30 seconds.",
  },
  {
    n: "05",
    t: "Installer isn't a proper tradesperson",
    d: "Cheap deals often come with cheaper installs, an unlicensed 'handyman' plugging in the unit and pocketing the difference. VEU requires an accredited installer with plumbing and electrical licences, and a compliance certificate at handover. No certificate = no protection when something goes wrong.",
  },
  {
    n: "06",
    t: "Pricing that seems 'too good to be true'",
    d: "A $999 heat pump ad is a $2,000 heat pump plus $800 of hidden installation extras. Legitimate installers show the fully-installed inc-GST price with the VEU rebate already applied, no surprises. If the ad only says 'from $X' it's marketing, not a real quote.",
  },
];

export default function HeatPumpsPage() {
  return (
    <div className="page-heatpumps page-detail">
      {/* HERO */}
      <section className="dp-hero">
        <div className="wrap">
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> The honest heat pump guide · Pakenham locals
          </div>
          <h1>
            Every heat pump we install, <span className="accent">compared honestly</span>, plus what to avoid.
          </h1>
          <p className="dp-hero__sub">
            Five brands, real installed prices, warranty length, refrigerant type and where the parts actually come from. Plus six red flags for the fly-by-night importer brands that sell you a &ldquo;bargain&rdquo; on Facebook Marketplace and disappear before the warranty kicks in.
          </p>
          <div className="dp-hero__ctas" style={{ marginTop: 20 }}>
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed-price quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* WHY HEAT PUMP */}
      <section className="hp-why">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> The short version</span>
            <h2>Heat pumps beat gas storage tanks on running cost, by a factor of 4.</h2>
            <p>A modern heat pump moves heat instead of making it. It uses ~500 W of power to deliver ~2 kW of hot-water heating: a coefficient of performance around 4:1. A gas storage tank burns gas at 70&ndash;85% efficiency. That&rsquo;s the whole story.</p>
          </div>
          <div className="hp-why__grid">
            <div className="hp-why__stat">
              <strong>~73%</strong>
              <span>Cut in hot water running cost vs gas storage</span>
            </div>
            <div className="hp-why__stat">
              <strong>$2,605</strong>
              <span>Combined rebate stack (VEEC + STC + Aus-Made + Solar Homes)</span>
            </div>
            <div className="hp-why__stat">
              <strong>2–4 yrs</strong>
              <span>Payback vs like-for-like gas tank replacement</span>
            </div>
            <div className="hp-why__stat">
              <strong>12–15 yr</strong>
              <span>Typical unit lifespan on a properly installed system</span>
            </div>
          </div>
        </div>
      </section>

      {/* AIO vs SPLIT */}
      <section className="hp-styles">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> First fork in the road</span>
            <h2>All-in-one or split, what&rsquo;s the difference?</h2>
            <p>Every heat pump comes in one of two configurations. Your house layout, your budget and the noise you can tolerate at the tank end are the deciding factors.</p>
          </div>
          <div className="hp-styles__grid">
            <article className="hp-style">
              <div className="hp-style__head">
                <span className="hp-style__eye">All-in-one (plug-in)</span>
                <h3>Tank + compressor in one unit</h3>
              </div>
              <ul className="hp-style__pros">
                <li>Smallest footprint, fits where the old tank was</li>
                <li>Simplest install, plug into an existing power point</li>
                <li>Lowest up-front cost ($2,610 fully installed)</li>
                <li>Every AIO we install comes with Wi-Fi built in</li>
              </ul>
              <ul className="hp-style__cons">
                <li>Compressor sits on top of the tank, slightly noisier close-up</li>
                <li>Fewer size options (200 L or 300 L for most brands)</li>
                <li>R290 refrigerant, works well but derates below 5&nbsp;°C</li>
              </ul>
              <div className="hp-style__foot">
                <span>Best for</span>
                <strong>1–4 person households where the current tank sits somewhere the family doesn&rsquo;t hang around at 3&nbsp;am.</strong>
              </div>
            </article>

            <article className="hp-style hp-style--feature">
              <span className="hp-style__badge">Premium</span>
              <div className="hp-style__head">
                <span className="hp-style__eye">Split system</span>
                <h3>Compressor separated from the tank</h3>
              </div>
              <ul className="hp-style__pros">
                <li>Compressor sits outside, the tank end is silent</li>
                <li>CO₂ refrigerant runs hot even in Melbourne winters</li>
                <li>Stainless steel tank option carries a 15-year warranty</li>
                <li>Sizes from 250 L up to 400 L, Wi-Fi standard</li>
                <li>Reclaim CO₂ split is the quietest heat pump we sell, 37 dB</li>
              </ul>
              <ul className="hp-style__cons">
                <li>~$2,500 more expensive up front vs AIO</li>
                <li>Two units to place, needs an outdoor spot for the compressor</li>
                <li>Only Reclaim offers this style in the brands we install</li>
              </ul>
              <div className="hp-style__foot">
                <span>Best for</span>
                <strong>3+ person households, solar-paired homes, luxury builds and anyone who wants the quietest, longest-lived option.</strong>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* INTERACTIVE COMPARATOR */}
      <section className="hp-compare hp-compare--interactive">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> The brands we install</span>
            <h2>Line them up side by side.</h2>
            <p>Every unit here is on the VEU approved product list with a real Australian support network. Pick any two or three below to see the specs stacked next to each other, cheapest price and longest warranty get highlighted automatically.</p>
          </div>
          <HeatPumpComparator />
        </div>
      </section>

      {/* WARNING */}
      <section className="hp-warn">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot ds-dot--orange" /> Save your money
            </span>
            <h2 className="ds-h--on-dark">Six red flags of the &ldquo;bargain&rdquo; heat pump.</h2>
            <p style={{ color: "rgba(255,255,255,0.78)" }}>
              Every year we get called out to fix (or replace) heat pumps from importer brands that sell out and vanish. Someone bought a &ldquo;$999 special&rdquo; on Facebook, it dies at year three, and there&rsquo;s nobody to warranty it because the ABN was cancelled 18 months ago. Here&rsquo;s what to look for before you hand anyone money.
            </p>
          </div>

          <div className="hp-warn__grid">
            {warningSigns.map((w) => (
              <div key={w.n} className="hp-warn__card">
                <span className="hp-warn__num">/{w.n}</span>
                <h3>{w.t}</h3>
                <p>{w.d}</p>
              </div>
            ))}
          </div>

          <div className="hp-warn__foot">
            <p>
              We&rsquo;re not saying every unfamiliar brand is bad. But if any two of the six above apply, it&rsquo;s <strong>not worth the $500 saving</strong>, you&rsquo;ll pay it back three times over when the unit fails and the importer is unreachable.
            </p>
          </div>
        </div>
      </section>

      {/* SIZING GUIDE */}
      <section className="hp-sizing">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Sizing guide</span>
            <h2>How big a tank do you actually need?</h2>
            <p>Undersize and you&rsquo;ll run out of hot water in the middle of the third shower. Oversize and you&rsquo;re paying to heat water you never use. Here&rsquo;s the rough rule.</p>
          </div>

          <div className="hp-sizing__grid">
            <div className="hp-sizing__card">
              <span className="hp-sizing__lbl">1–2 people</span>
              <strong>180 – 200 L</strong>
              <ul>
                <li>Reclaim R290 200 L</li>
                <li>Thermann 200 L R290</li>
                <li>iStore 180 L</li>
              </ul>
            </div>
            <div className="hp-sizing__card">
              <span className="hp-sizing__lbl">3–4 people</span>
              <strong>275 – 300 L</strong>
              <ul>
                <li>Reclaim R290 300 L</li>
                <li>Thermann 285 L R290</li>
                <li>iStore 275 L</li>
              </ul>
            </div>
            <div className="hp-sizing__card">
              <span className="hp-sizing__lbl">4–5 people</span>
              <strong>315 L</strong>
              <ul>
                <li>Reclaim CO₂ split 315 L (glass or stainless)</li>
                <li>Dux Airoheat 315 L</li>
              </ul>
            </div>
            <div className="hp-sizing__card">
              <span className="hp-sizing__lbl">Big households</span>
              <strong>400 L</strong>
              <ul>
                <li>Reclaim CO₂ split 400 L (glass or stainless)</li>
                <li>Only Reclaim carries a 400 L</li>
              </ul>
            </div>
          </div>

          <p className="hp-sizing__note">
            Rule of thumb: 40&nbsp;–&nbsp;60 L of tank per person, depending on how many showers per day. Runs a bath every night? Round up.
          </p>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready for a straight-talking quote?</h2>
            <p>Free, no obligation, VEU rebate applied at the quote. Usually back within 12 hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get my fixed-price quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
