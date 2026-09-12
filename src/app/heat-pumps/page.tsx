import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { HeatPumpComparator } from "@/components/HeatPumpComparator";
import { HeatPumpDiagram } from "@/components/HeatPumpDiagram";
import "../detail.css";
import "./heat-pumps.css";

export const metadata: Metadata = {
  title: "Heat Pump Guide, Reclaim, Thermann, iStore",
  description:
    "The honest guide to heat pump hot water in Pakenham: the brands we install, what an installed price looks like after the VEU rebate, and what to watch for.",
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
      <section className="hp-hero">
        <div className="wrap hp-hero__grid">
          <div className="hp-hero__copy">
            <span className="hp-hero__eye"><span className="ds-dot" /> Hot water</span>
            <h1>Hot water for about a quarter of the running cost.</h1>
            <p className="hp-hero__sub">
              A heat pump doesn&rsquo;t burn anything and it doesn&rsquo;t run an element. It moves warmth out of the
              air into your tank, the way a fridge does in reverse. Same hot showers, a fraction of the power.
            </p>
            <div className="hp-hero__ctas">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a quote &rarr;</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
                Or call {site.phone}
              </a>
            </div>
            <p className="hp-hero__rebate">
              The VEU rebate comes off at the quote, not after.{" "}
              <Link href="/rebates">See what you qualify for</Link>
            </p>
          </div>
          <div className="hp-hero__photo">
            <Image
              src="/reclaim-split-stand-back-shot-left-side.webp"
              alt="A Reclaim split heat pump we installed: tank against the brick wall with the compressor beside it"
              fill
              sizes="(max-width: 900px) 100vw, 40vw"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </section>

      {/* PICK A STYLE */}
      <section className="hp-pick">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Start here</span>
            <h2>There are two kinds. Which one suits your place?</h2>
          </div>
          <div className="hp-pick__grid">
            <a className="hp-pick__card" href="#all-in-one">
              <span className="hp-pick__photo">
                <Image
                  src="/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp"
                  alt="An all-in-one heat pump, with the compressor sitting on top of the tank"
                  fill
                  sizes="(max-width: 900px) 50vw, 260px"
                  style={{ objectFit: "contain" }}
                />
              </span>
              <span className="hp-pick__body">
                <strong>All-in-one</strong>
                <span className="hp-pick__d">Tank and compressor in the one unit. Goes where the old tank was.</span>
                <span className="hp-pick__meta">From $2,610 installed</span>
              </span>
              <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
            </a>

            <a className="hp-pick__card" href="#split">
              <span className="hp-pick__photo">
                <Image
                  src="/reclaim-split-back.webp"
                  alt="A split heat pump we installed: the tank against the wall with the compressor as a separate outdoor unit beside it"
                  fill
                  sizes="(max-width: 900px) 50vw, 260px"
                  style={{ objectFit: "cover", objectPosition: "center 62%" }}
                />
              </span>
              <span className="hp-pick__body">
                <strong>Split system</strong>
                <span className="hp-pick__d">Compressor outside, on its own. Quieter at the tank and better in a cold snap.</span>
                <span className="hp-pick__meta">From $5,340 installed</span>
              </span>
              <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
            </a>

            <Link className="hp-pick__card hp-pick__card--ask" href="/quote">
              <span className="hp-pick__body">
                <strong>Not sure which one?</strong>
                <span className="hp-pick__d">
                  Tell us how many people are in the house and where the old tank sits. We&rsquo;ll size it and put
                  it in writing.
                </span>
                <span className="hp-pick__meta">Free, no obligation</span>
              </span>
              <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* THE SHORT VERSION */}
      <section className="hp-why">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> The short version</span>
            <h2>Why people change over.</h2>
            <p>A heat pump uses about 500&nbsp;W of power to deliver about 2&nbsp;kW of heating into the tank. A gas storage tank burns gas at 70&nbsp;&ndash;&nbsp;85% efficiency and loses the rest up the flue. That is the whole argument.</p>
          </div>
          <div className="hp-why__grid">
            <div className="hp-why__stat">
              <strong>~73%</strong>
              <span>Less to run than a gas storage tank</span>
            </div>
            <div className="hp-why__stat">
              <strong>$2,605</strong>
              <span>VEU rebate on an eligible unit, taken off at the quote</span>
            </div>
            <div className="hp-why__stat">
              <strong>12&ndash;15 yrs</strong>
              <span>What a properly installed unit should last</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <HeatPumpDiagram />

      {/* AIO vs SPLIT */}
      <section className="hp-styles">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The detail</span>
            <h2>All-in-one or split, side by side.</h2>
            <p>Your house layout, your budget, and how much noise you can live with at the tank end. That is what decides it.</p>
          </div>
          <div className="hp-styles__grid">
            <article className="hp-style" id="all-in-one">
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

            <article className="hp-style hp-style--feature" id="split">
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
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get my written quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
