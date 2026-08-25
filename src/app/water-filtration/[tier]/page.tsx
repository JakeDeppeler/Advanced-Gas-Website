import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { TIERS, tierBySlug, PROCESS } from "@/lib/waterFiltration";
import { QuoteForm } from "@/components/QuoteForm";
import { assetOrFallback, hasAsset, resolveAsset } from "@/lib/publicAsset";
import { BenefitTiles } from "@/components/BenefitTiles";
import { CtaBand } from "@/components/CtaBand";
import { SystemStyles } from "@/components/SystemStyles";
import { FinishPicker } from "@/components/FinishPicker";
import { FilterWallSelector } from "@/components/FilterWallSelector";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import "../filtration.css";

/**
 * One page per filtration tier. Same shape each time, but the content is
 * genuinely different because the three products do different jobs — the
 * "what it doesn't treat" list on the hot water page is the interesting
 * part of that page, and it has nothing in common with the under-sink one.
 */

export function generateStaticParams() {
  return TIERS.map((t) => ({ tier: t.slug }));
}

export function generateMetadata({ params }: { params: { tier: string } }): Metadata {
  const t = tierBySlug(params.tier);
  if (!t) return {};
  return {
    title: absoluteTitle(t.metaTitle),
    description: metaDescription(t.metaDescription),
    keywords: t.keywords,
    alternates: { canonical: `/water-filtration/${t.slug}` },
  };
}

export default function TierPage({ params }: { params: { tier: string } }) {
  const t = tierBySlug(params.tier);
  if (!t) notFound();


  // The system cards and the F models render client-side (the range opens
  // from a button), so the paths have to be resolved before they cross.
  const styleCards = (t.systems ?? []).map((sy) => ({ ...sy, photo: resolveAsset(sy.photo) }));
  const modelCards = (t.models ?? []).map((m) => ({ ...m, photo: m.photo ? resolveAsset(m.photo) : null }));

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Water filtration", url: `${site.url}/water-filtration` },
    { name: t.label, url: `${site.url}/water-filtration/${t.slug}` },
  ]);

  return (
    <div className="page-filtration page-filtration--tier">
      <Script id={`wf-faq-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(t.faqs)) }} />
      <Script id={`wf-crumbs-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      {/* The hero is the photo. Full bleed behind the copy with a navy
          scrim over it, rather than a panel off to one side — Jake wanted
          the display shot to be the header, not an inset. */}
      <section
        className={`wf-hero wf-hero--tier${t.heroPhoto && hasAsset(t.heroPhoto) ? " wf-hero--shot" : ""}`}
        style={
          t.heroPhoto && hasAsset(t.heroPhoto)
            ? {
                // Two scrims: one across, so the copy has something to sit
                // on and the unit still reads on the right; one down, so
                // the stat row at the bottom doesn't land on foliage.
                backgroundImage:
                  `linear-gradient(180deg, rgba(9,17,52,0.45) 0%, rgba(9,17,52,0.10) 38%, rgba(9,17,52,0.70) 100%), ` +
                  `linear-gradient(100deg, rgba(9,17,52,0.95) 0%, rgba(9,17,52,0.90) 30%, rgba(9,17,52,0.34) 50%, rgba(9,17,52,0.06) 74%), ` +
                  `url("${resolveAsset(t.heroPhoto)}")`,
              }
            : undefined
        }
      >
        <div className="wrap">
          <div className="wf-hero__copy">
            <nav className="wf-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/water-filtration">Water filtration</Link>
              <span aria-hidden="true">/</span>
              <span>{t.label}</span>
            </nav>
            <div className="ds-eyebrow ds-eyebrow--on-dark wf-eyebrow">
              <span className="ds-dot" />
              Puretec · {t.tagline}
            </div>
            <h1>{t.label} water filtration</h1>
            <p className="wf-hero__sub">{t.heroSub ?? t.intro}</p>
            <p className="wf-hero__where"><strong>Where it goes:</strong> {t.fitsWhere}</p>
            <div className="pg-ctas">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                {site.phone}
              </a>
            </div>
          </div>
          {t.heroFacts && (
            <ul className="wf-hero__at">
              {t.heroFacts.map((f) => (
                <li key={f.k}>
                  <strong>{f.v}</strong>
                  <span>{f.k}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* EVERYDAY BENEFITS — where filtered water actually turns up.
          Their five tiles, our palette. Whole-home only, because it's
          the only category that reaches every room. */}
      {t.benefits && (
        <section className="wf-areas">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Everyday benefits</span>
              <h2>{t.benefitsHeading ?? "Where it turns up."}</h2>
              {t.benefitsLede && <p>{t.benefitsLede}</p>}
            </div>
            <BenefitTiles benefits={t.benefits} />
            <p className="wf-areas__more">
              <Link href="/water-filtration">
                What&rsquo;s actually in Melbourne water, and what a filter does about it &rarr;
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* CHOOSE YOUR SYSTEM — the shape of the thing on your wall, before
          anybody starts talking model numbers. Both ranges. */}
      {(t.systems || t.models) && (
        <section className="wf-styles">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot" /> Choose your system</span>
              <h2 className="ds-h--on-dark">{t.systemsHeading ?? "Choose your system."}</h2>
              {t.systemsLede && <p className="wf-styles__lede">{t.systemsLede}</p>}
            </div>
            {/* The two ranges first, so somebody who has never heard of
                either knows why there are two before they meet six
                products. Puretec leads because it's what we fit most. */}
            {t.brands && (
            <div className="wf-brands">
              {t.brands.map((b) => (
                <article className={`wf-brand${b.lead ? " is-lead" : ""}`} key={b.brand}>
                  <div className="wf-brand__head">
                    <h3>{b.brand}</h3>
                    <span>{b.role}</span>
                  </div>
                  <p>{b.blurb}</p>
                  <ul>{b.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                </article>
              ))}
            </div>
            )}

            <SystemStyles
              styles={styleCards}
              models={modelCards}
              heading={t.modelsHeading ?? "The range."}
              lede={t.modelsLede}
            />
          </div>
        </section>
      )}

      {/* The compare-systems table came out. Between "choose your
          system" above and the F range below it was a third pass at the
          same products. The full comparison lives on /water-filtration
          and /water-filtration/range, where somebody is genuinely
          choosing between categories. */}

      {/* HOW IT LOOKS — Jake's note: the old block was a huge diagram and
          the thing that actually sells this unit is that it's tidy. So
          this is about the finish, and it's deliberately compact. */}
      {t.finish && (
        <section className="wf-look wf-band wf-band--sand">
          <div className="wrap wf-look__grid">
            <div>
              <div className="ds-section-head ds-section-head--hl">
                <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> How it looks</span>
                <h2>Flat aluminium cover, ten finishes.</h2>
              </div>
              <p className="wf-look__note">{t.finish.note}</p>
              <ul className="wf-look__facts">
                <li><strong>10-year</strong><span>manufacturer warranty</span></li>
                <li><strong>Aluminium</strong><span>cover, not exposed housings</span></li>
                <li><strong>Outdoors</strong><span>mounted on the main</span></li>
              </ul>
            </div>
            <FinishPicker swatches={t.finish.swatches} />
          </div>
        </section>
      )}

      {/* The "why install one" block that used to sit here is gone. The
          everyday-benefits tiles at the top of the page make the same
          argument in the same words, and Jake spotted the double-up. */}

      {/* The F range used to be a section of its own here. It's inside
          "choose your system" now, behind a button on the FilterWall
          card, because reading about the same product twice forty lines
          apart was the double-up Jake kept pointing at. */}

      {/* The "whole house vs under sink" table used to sit here. Pulled:
          somebody reading this page has already chosen whole house, and
          offering them the alternative at this point is a wobble, not a
          service. It stays on /water-filtration where the choice is
          actually live. */}

      {/* The tiers without a model selector still want something orange
          mid-page, so they keep the boxed call-out the picker replaced. */}
      {t.slug !== "whole-home" && (
        <CtaBand
          boxed
          heading={`Not sure ${t.label.toLowerCase()} is the one you need?`}
          blurb="Tell us the symptom — taste, smell, grit, dry skin, tank water — and we'll tell you which fitting addresses it. Including when the answer is a cheaper one."
          cta="Ask us which one"
        />
      )}

      {/* THE SELECTOR, in the home page's orange panel. Same box as the
          60-second quote: copy on the left, the thing you interact with
          on a white card to the right, the whole lot inside one branded
          callout rather than a pale tinted band. */}
      {t.slug === "whole-home" && (
        <section className="wf-picker quotesec">
          <div className="wrap">
            <div className="quotesec__box">
              <div className="quotesec__grid">
                <div className="quotesec__left">
                  <span className="ds-eyebrow ds-eyebrow--on-orange">
                    <span className="ds-dot ds-dot--on-orange" /> Narrow it down
                  </span>
                  <h2>Which model is right for my&nbsp;home?</h2>
                  <p className="quotesec__lede">
                    Answer the three and the answer appears. Nothing is sent anywhere.
                  </p>
                  <ul className="quotesec__points">
                    <li><span className="tick tick--on-orange">✓</span> Bathrooms decide the flow rate</li>
                    <li><span className="tick tick--on-orange">✓</span> Scale on the kettle is the only reason to pay for ScaleProtect</li>
                    <li><span className="tick tick--on-orange">✓</span> Tank water is a different product, and we&rsquo;ll say so</li>
                  </ul>
                  <p className="quotesec__finep">
                    Runs in your browser · nothing recorded · no email asked for.
                  </p>
                </div>
                <FilterWallSelector />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CARTRIDGES. Photo carrying the point — the cover open with the
          three cartridges in it — then the heading, one paragraph, and
          the three numbers that actually answer "how much of a
          commitment is this". The card-with-a-letterboxed-diagram it
          replaces was a layout looking for content. */}
      <section className="wf-servicing">
        <div className="wrap wf-serv__grid">
          <figure className="wf-serv__shot">
            <img
              src={assetOrFallback(t.servicingPhoto ?? t.diagram, t.diagram)}
              alt={
                t.servicingPhoto && hasAsset(t.servicingPhoto)
                  ? t.servicingPhotoAlt ?? t.productPhotoAlt
                  : `Diagram: ${t.fitsWhere}`
              }
              loading="lazy"
              width="900"
              height="620"
            />
          </figure>
          <div className="wf-serv__copy">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Keeping it working</span>
            <h2>Cartridges, and why we show you rather than charge you.</h2>
            <p>{t.servicing}</p>
            <ul className="wf-serv__facts">
              <li><strong>Once a year</strong><span>on mains water, sooner on tank</span></li>
              <li><strong>Ten minutes</strong><span>start to finish, once you&rsquo;ve seen it done</span></li>
              <li><strong>No service call</strong><span>we show you on handover, on your own unit</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW THE JOB RUNS, in the home page's numbered steps — navy band,
          three across, big orange numerals, arrows between them. It was a
          row of five equal boxes, which read as a table of contents. */}
      <section className="process">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How the job runs</span>
            <h2 className="ds-h--on-dark">What happens, start to finish.</h2>
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

      <section className="wf-quote">
        <div className="wrap wf-quote__grid">
          <div>
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> No pricing published yet</span>
              <h2>Tell us what you&rsquo;ve noticed.</h2>
            </div>
            <p>
              We haven&rsquo;t put a price on this page yet, deliberately. What the right unit
              costs depends on your water, your pressure and where it physically has to go, and
              a &ldquo;from $X&rdquo; with none of that behind it is bait.
            </p>
            <p>
              Send the symptom and you&rsquo;ll get a real figure with the reasoning attached —
              including the times the honest answer is a cheaper unit than the one you asked
              about.
            </p>
          </div>
          <QuoteForm presetService="water-filtration" />
        </div>
      </section>

      {/* FAQ in the home page's shape — heading and a human line on the
          left, accordions on the right, first one open. */}
      <section className="wf-faq faq">
        <div className="wrap faq__grid">
          <div className="faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> {t.label} questions</span>
            <h2>Straight answers.</h2>
            <p>
              Still want a human?{" "}
              <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>
                Call {site.phone}
              </a>
              .
            </p>
          </div>
          <div className="faq__right">
            {t.faqs.map((f, i) => (
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
