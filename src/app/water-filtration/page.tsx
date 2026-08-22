import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { pageTitle, metaDescription } from "@/lib/seo";
import { TIERS, IN_YOUR_WATER, STAGES, PROCESS } from "@/lib/waterFiltration";
import { QuoteForm } from "@/components/QuoteForm";
import { assetOrFallback, hasAsset } from "@/lib/publicAsset";
import "./filtration.css";

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

      {/* HERO */}
      <section className="wf-hero">
        <div className="wrap wf-hero__grid">
          <div>
            <div className="ds-eyebrow ds-eyebrow--on-dark wf-eyebrow">
              <span className="ds-dot" />
              Puretec · installed by licensed plumbers
            </div>
            <h1>
              Water filtration, <em>done at the right point</em> in the house.
            </h1>
            <p className="wf-hero__sub">
              Whole house on the incoming main is the one that changes the most for the most
              people. Then there&rsquo;s a filter that protects your hot water system, an
              under-sink unit for drinking water, softeners for hard water, and filtration plus
              UV for tank-fed properties. Most households need one of them, and which one
              depends entirely on what you&rsquo;ve actually noticed.
            </p>
            <div className="pg-ctas">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a filtration quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                Or talk it through
              </a>
            </div>
          </div>
          <ul className="wf-hero__facts">
            <li><strong>Australian brand</strong><span>Puretec, with cartridges you can actually get</span></li>
            <li><strong>Licensed plumbers</strong><span>Backflow protection done properly, not a handyman job</span></li>
            <li><strong>6-year workmanship</strong><span>Same warranty as everything else we fit</span></li>
            <li><strong>Tank &amp; rainwater</strong><span>Filtration plus UV through the hills and townships</span></li>
          </ul>
        </div>
      </section>

      {/* WHAT'S IN YOUR WATER — before we sell anything */}
      <section className="wf-water">
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
          <div className="wf-water__grid">
            {IN_YOUR_WATER.map((w) => (
              <article className="wf-water__card" key={w.what}>
                <h3>{w.what}</h3>
                <p className="wf-water__why">{w.why}</p>
                <p className="wf-water__fix"><strong>What handles it:</strong> {w.fix}</p>
              </article>
            ))}
          </div>
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

      {/* HOW IT WORKS */}
      <section className="wf-stages">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> How a whole-home unit is built</span>
            <h2>Stages, in the order the water meets them.</h2>
          </div>
          <div className="wf-stages__row">
            {STAGES.map((s) => (
              <div className="wf-stage" key={s.n}>
                <span className="wf-stage__n">{s.n}</span>
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

      {/* PROCESS */}
      <section className="wf-process">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> How the job runs</span>
            <h2>From &ldquo;the water tastes funny&rdquo; to installed.</h2>
          </div>
          <ol className="wf-process__list">
            {PROCESS.map((p, i) => (
              <li key={p.t}>
                <span className="wf-process__n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* QUOTE */}
      <section className="wf-quote">
        <div className="wrap wf-quote__grid">
          <div>
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> No pricing published yet</span>
              <h2>Tell us what you&rsquo;ve noticed.</h2>
            </div>
            <p>
              We haven&rsquo;t put prices on these pages yet, and that&rsquo;s deliberate rather
              than coy. What the right unit costs depends on your water, your pressure and
              where it physically has to go, and a &ldquo;from $X&rdquo; number with none of
              that behind it is bait.
            </p>
            <p>
              Send us the symptom — taste, smell, grit, dry skin, tank water — and you&rsquo;ll
              get a real figure with the reasoning attached. Including the times the honest
              recommendation is the cheaper unit, or nothing at all.
            </p>
          </div>
          <QuoteForm presetService="water-filtration" />
        </div>
      </section>

      {/* FAQ */}
      <section className="wf-faq">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> Straight answers</span>
            <h2>The questions people actually ask.</h2>
          </div>
          <div className="wf-faq__list">
            {HUB_FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
