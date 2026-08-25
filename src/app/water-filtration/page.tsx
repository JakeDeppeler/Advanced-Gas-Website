import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { pageTitle, metaDescription } from "@/lib/seo";
import { TIERS, IN_YOUR_WATER, STAGES, PROCESS, COMPARE_ROWS } from "@/lib/waterFiltration";
import { BenefitTiles } from "@/components/BenefitTiles";
import { QuoteForm } from "@/components/QuoteForm";
import { assetOrFallback, hasAsset, resolveAsset } from "@/lib/publicAsset";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import "./filtration.css";

/** The header photo. Same shot the whole-home page leads with, because it
 *  is the one that shows what a tidy install looks like. */
const HERO_PHOTO = "/puretec-filterwall-hero.webp";

/**
 * IN_YOUR_WATER, reshaped for the tabbed tiles the category pages use.
 * Same five facts, same honesty — the hardness tile still says "usually
 * nothing, and we'll tell you that" — just behind the same control the
 * rest of the section family uses instead of five flat cards.
 */
const TILE_META: Record<string, { icon: string; tint: string; line: string }> = {
  "Chlorine": { icon: "tap", tint: "#0B1450", line: "The taste and the smell, and the one people notice first" },
  "Sediment, rust and silt": { icon: "flow", tint: "#00699A", line: "Grit in the cistern, marks in the washing" },
  "Taste and odour": { icon: "kettle", tint: "#2E7D6B", line: "Almost always why somebody starts looking" },
  "Biological, on tank and rainwater": { icon: "tank", tint: "#C2540F", line: "A real consideration on tank water, not on mains" },
  "Hardness and scale": { icon: "basin", tint: "#5A5F7A", line: "The honest one — Melbourne water is soft" },
};
const WATER_TILES = IN_YOUR_WATER.map((w) => ({
  area: w.what,
  icon: TILE_META[w.what]?.icon ?? "tap",
  tint: TILE_META[w.what]?.tint ?? "#0B1450",
  line: TILE_META[w.what]?.line ?? "",
  detail: `${w.why} What handles it: ${w.fix}`,
}));

/**
 * Water filtration hub.
 *
 * Pulled out of the gas plumbing service page and given its own section
 * because it's a different kind of sale. Nothing is broken when someone
 * lands here — they noticed a taste, or read something about chlorine,
 * and they're deciding whether it's worth doing at all. So the page
 * explains what's in the water before it offers to sell anything, and
 * the three tiers come after that rather than at the top.
 */

export const metadata: Metadata = {
  title: pageTitle("Water Filtration, Puretec"),
  description: metaDescription(
    "Puretec water filtration installed by licensed plumbers across Melbourne's south-east. Whole home on the main, protection for your hot water system, or under-sink drinking water.",
  ),
  keywords: [
    "water filtration pakenham",
    "puretec installer melbourne",
    "whole house water filter melbourne",
    "under sink water filter berwick",
    "water filter for hot water system",
    "rainwater tank filtration uv",
    "chlorine water filter melbourne",
  ],
  alternates: { canonical: "/water-filtration" },
};

const HUB_FAQS = [
  {
    q: "Which water filter do I actually need?",
    a: "Work backwards from what you've noticed. Taste in your drinking water only, under-sink. Chlorine smell in the shower, grit in the cistern, or tank water, whole home. Protecting a new hot water system, the cold inlet filter. If you're not sure, tell us the symptom and we'll tell you which one addresses it — including when the answer is none of them.",
  },
  {
    q: "Is Melbourne water bad?",
    a: "No, and we're not going to pretend otherwise to sell a filter. Melbourne has some of the best mains water of any major city and it's genuinely soft, which means scale isn't the problem here it is elsewhere. What filtration changes is chlorine taste and smell, sediment, and the protection of your appliances. That's worth doing for plenty of households. It isn't a health emergency.",
  },
  {
    q: "Do I need a water softener?",
    a: "Almost certainly not on Melbourne mains water. It's soft already. Softeners get sold into this market on the back of advertising written for harder-water countries. If you're on bore water it's a genuine question and a different bit of equipment, and we'll say so.",
  },
  {
    q: "Why Puretec?",
    a: "It's an Australian brand with a range deep enough to actually match the unit to your water rather than fitting whatever's in the van, and the cartridges are easy to get, which matters more than it sounds. A filter you can't get a cartridge for in a hurry stops being a filter.",
  },
  {
    q: "Can a handyman install this?",
    a: "They shouldn't. Filtration ties into your potable water supply, which brings backflow protection into it, and getting that wrong contaminates the thing you were trying to clean up. It's licensed plumbing work and we do it as licensed plumbing work.",
  },
  {
    q: "How much does water filtration cost?",
    a: "We're not publishing prices on these yet, because the right answer depends on your water, your pressure and where the unit has to go, and a number on a page with none of that behind it is just bait. Ask for a quote and you'll get a real figure with the recommendation explained.",
  },
];

export default function WaterFiltrationPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Water filtration", url: `${site.url}/water-filtration` },
  ]);

  return (
    <div className="page-filtration">
      <Script id="wf-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(HUB_FAQS)) }} />
      <Script id="wf-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      {/* HERO — the display shot full bleed, same as the category pages.
          Copy on a scrim, the figures along the bottom. */}
      <section
        className={`wf-hero${hasAsset(HERO_PHOTO) ? " wf-hero--shot" : ""}`}
        style={
          hasAsset(HERO_PHOTO)
            ? {
                backgroundImage:
                  `linear-gradient(180deg, rgba(9,17,52,0.45) 0%, rgba(9,17,52,0.10) 38%, rgba(9,17,52,0.70) 100%), ` +
                  `linear-gradient(100deg, rgba(9,17,52,0.95) 0%, rgba(9,17,52,0.90) 30%, rgba(9,17,52,0.34) 50%, rgba(9,17,52,0.06) 74%), ` +
                  `url("${resolveAsset(HERO_PHOTO)}")`,
              }
            : undefined
        }
      >
        <div className="wrap">
          <div className="wf-hero__copy">
            <div className="ds-eyebrow ds-eyebrow--on-dark wf-eyebrow">
              <span className="ds-dot" />
              Puretec &amp; BWT · installed by licensed plumbers
            </div>
            <h1>
              Water filtration, <em>done at the right point</em> in the house.
            </h1>
            <p className="wf-hero__sub">
              Whole house on the incoming main is the one that changes the most for the most
              people. The other four solve narrower problems, and which one you want depends
              entirely on what you&rsquo;ve actually noticed.
            </p>
            <div className="pg-ctas">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a filtration quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                Or talk it through
              </a>
            </div>
          </div>
          <ul className="wf-hero__at">
            <li><strong>Puretec &amp; BWT</strong><span>Cartridges you can actually get</span></li>
            <li><strong>Licensed plumbers</strong><span>Backflow protection done properly</span></li>
            <li><strong>6-year workmanship</strong><span>Same warranty as everything else we fit</span></li>
            <li><strong>Tank &amp; rainwater</strong><span>Filtration plus UV through the hills</span></li>
          </ul>
        </div>
      </section>

      {/* WHAT'S IN YOUR WATER — before we sell anything */}
      <section className="wf-water wf-band wf-band--sand">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> First, the honest part</span>
            <h2>What&rsquo;s actually in Melbourne water.</h2>
            <p>
              Plenty of filtration gets sold on vague worry. We&rsquo;d rather you bought one
              knowing exactly what it changes. Melbourne has some of the best mains water of any
              major city, and it is genuinely soft. Here is what filtration is and isn&rsquo;t for.
            </p>
          </div>
          <BenefitTiles benefits={WATER_TILES} />
        </div>
      </section>

      {/* THREE TIERS */}
      <section className="wf-tiers" id="options">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot" /> Five ways to treat it</span>
            <h2 className="ds-h--on-dark">Whole house first, then the rest.</h2>
            <p className="wf-tiers__lede">
              Whole-house filtration on the incoming main is the one that changes the most for
              the most people, so start there. The others solve narrower problems, and most
              households only need one of them.
            </p>
          </div>
          <div className="wf-tiers__grid">
            {TIERS.map((t) => (
              <article className="wf-tier" key={t.slug}>
                {/* Manufacturer shot where we have one; our own diagram of
                    where the fitting goes while we don't. */}
                <div className={`wf-tier__photo${hasAsset(t.productPhoto) ? " wf-tier__photo--real" : ""}`}>
                  <img
                    src={assetOrFallback(t.productPhoto, t.diagram)}
                    alt={hasAsset(t.productPhoto) ? t.productPhotoAlt : `Diagram: ${t.fitsWhere}`}
                    loading="lazy"
                    width="600"
                    height="400"
                  />
                </div>
                <div className="wf-tier__body">
                  <h3>{t.label}</h3>
                  <p className="wf-tier__tag">{t.tagline}</p>
                  <p className="wf-tier__where"><strong>Fits:</strong> {t.fitsWhere}</p>
                  <p className="wf-tier__blurb">{t.blurb}</p>
                  <ul className="wf-tier__list">
                    {t.treats.slice(0, 3).map((x) => <li key={x}>{x}</li>)}
                  </ul>
                  <Link href={`/water-filtration/${t.slug}`} className="wf-tier__cta">
                    {t.cta} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="wf-tiers__more">
            <Link href="/water-filtration/range">
              Or see the full range and exactly what each type removes →
            </Link>
          </p>
        </div>
      </section>

      {/* THE COMPARISON — the thing Jake liked most about the reference,
          and the thing a reader actually wants: the versions side by side
          without having to open five pages. The deep matrix lives on
          /range; this is the shallow one that belongs here. */}
      <section className="wf-compare">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Side by side</span>
            <h2>The five, compared.</h2>
            <p>
              Read the last column first. It&rsquo;s the one that tells you which row you&rsquo;re
              actually in.
            </p>
          </div>
          <div className="wf-compare__wrap">
            <table className="wf-compare__table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Where it fits</th>
                  <th>What it covers</th>
                  <th>What it handles</th>
                  <th>Servicing</th>
                  <th className="wf-compare__pickcol">Pick it when</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.tier} className={"lead" in r && r.lead ? "is-lead" : undefined}>
                    <th scope="row">
                      <Link href={`/water-filtration/${r.tier}`}>{r.label}</Link>
                      {"lead" in r && r.lead && <span className="wf-compare__tag">Start here</span>}
                    </th>
                    <td>{r.fits}</td>
                    <td>{r.covers}</td>
                    <td>{r.handles}</td>
                    <td>{r.service}</td>
                    <td className="wf-compare__pick">{r.pick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="wf-compare__more">
            <Link href="/water-filtration/range">
              The deep version: six product families against ten contaminants →
            </Link>
          </p>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="wf-stages wf-band wf-band--sand">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> How a whole-home unit is built</span>
            <h2>Stages, in the order the water meets them.</h2>
          </div>
          <div className="wf-stages__row">
            {STAGES.map((s) => (
              <div className="wf-stage" key={s.n}>
                <span className="wf-stage__n">{Number(s.n)}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
          <p className="wf-stages__note">
            Order matters and it isn&rsquo;t arbitrary. Sediment goes first so it doesn&rsquo;t
            clog the carbon behind it. UV goes last because ultraviolet light can&rsquo;t work
            through cloudy water — a UV lamp fitted ahead of the filters is a lamp doing very
            little.
          </p>
        </div>
      </section>

      {/* PROCESS — the home page's numbered steps, same as the category
          pages use. */}
      <section className="process">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How the job runs</span>
            <h2 className="ds-h--on-dark">From &ldquo;the water tastes funny&rdquo; to installed.</h2>
          </div>
          <ol className="steps">
            {PROCESS.map((p, i) => (
              <li key={p.t} className="step">
                <span className="step__num">{i + 1}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
                <span className="step__time">{p.when}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* QUOTE — the home page's orange panel: copy left, the form on a
          white card right, the whole lot in one branded callout. */}
      <section className="wf-quote quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange">
                  <span className="ds-dot ds-dot--on-orange" /> No pricing published yet
                </span>
                <h2>Tell us what you&rsquo;ve noticed.</h2>
                <p className="quotesec__lede">
                  What the right unit costs depends on your water, your pressure and where it
                  physically has to go. A &ldquo;from $X&rdquo; with none of that behind it is bait.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> Taste, smell, grit, dry skin, tank water — the symptom is the useful part</li>
                  <li><span className="tick tick--on-orange">✓</span> A real figure with the reasoning attached</li>
                  <li><span className="tick tick--on-orange">✓</span> Including the times the answer is a cheaper unit, or nothing at all</li>
                </ul>
                <p className="quotesec__finep">
                  Licensed plumbers · backflow protection to standard · 6-year workmanship warranty.
                </p>
              </div>
              <QuoteForm presetService="water-filtration" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — heading and a human line left, accordions right, same as
          the home page and the category pages. */}
      <section className="wf-faq faq">
        <div className="wrap faq__grid">
          <div className="faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Straight answers</span>
            <h2>The questions people actually ask.</h2>
            <p>
              Still want a human?{" "}
              <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>
                Call {site.phone}
              </a>
              .
            </p>
          </div>
          <div className="faq__right">
            {HUB_FAQS.map((f, i) => (
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ReviewMarquee heading="Reviews from households across the south-east." />
    </div>
  );
}
