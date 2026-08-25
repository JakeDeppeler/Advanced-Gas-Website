import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { TIERS, tierBySlug, PROCESS, EVERYDAY_BENEFITS, SYSTEM_STYLES, SYSTEM_COMPARE } from "@/lib/waterFiltration";
import { QuoteForm } from "@/components/QuoteForm";
import { FiltrationDiagram } from "@/components/FiltrationDiagram";
import { assetOrFallback, hasAsset } from "@/lib/publicAsset";
import { CtaBand } from "@/components/CtaBand";
import { FiltrationIcon } from "@/components/FiltrationIcons";
import { FinishPicker } from "@/components/FinishPicker";
import { FilterWallGlyph } from "@/components/FilterWallGlyph";
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


  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Water filtration", url: `${site.url}/water-filtration` },
    { name: t.label, url: `${site.url}/water-filtration/${t.slug}` },
  ]);

  return (
    <div className="page-filtration page-filtration--tier">
      <Script id={`wf-faq-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(t.faqs)) }} />
      <Script id={`wf-crumbs-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <section
        className="wf-hero wf-hero--tier"
        style={
          t.heroPhoto && hasAsset(t.heroPhoto)
            ? {
                backgroundImage:
                  `linear-gradient(180deg, rgba(19,36,84,0.78) 0%, rgba(13,25,66,0.86) 60%, rgba(11,22,60,0.92) 100%), url("${t.heroPhoto}")`,
                backgroundSize: "cover",
                backgroundPosition: "center 55%",
              }
            : t.slug === "whole-home"
            ? {
                // Our own illustration of a unit on a fence, drawn rather
                // than borrowed — same idea as the manufacturer render,
                // ours to use. Swaps out the moment a real photo lands.
                backgroundImage:
                  'linear-gradient(180deg, rgba(19,36,84,0.80) 0%, rgba(13,25,66,0.87) 58%, rgba(11,22,60,0.93) 100%), url("/water-filtration-hero.webp")',
                backgroundSize: "cover",
                backgroundPosition: "center 62%",
              }
            : undefined
        }
      >
        <div className="wrap">
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
          <p className="wf-hero__sub">{t.intro}</p>
          <p className="wf-hero__where"><strong>Where it goes:</strong> {t.fitsWhere}</p>
          <div className="pg-ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
              {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* EVERYDAY BENEFITS — where filtered water actually turns up.
          Their five tiles, our palette. Whole-home only, because it's
          the only category that reaches every room. */}
      {t.slug === "whole-home" && (
        <section className="wf-areas">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Everyday benefits</span>
              <h2>Filtered water everywhere it matters.</h2>
              <p>
                A whole-house filter goes on at the point of entry, so every one of these runs
                on treated water rather than just the kitchen tap.
              </p>
            </div>
            <div className="wf-areas__row">
              {EVERYDAY_BENEFITS.map((a) => (
                <details className="wf-area" key={a.area} style={{ ["--tint" as string]: a.tint }}>
                  <summary>
                    <span className="wf-area__icon"><FiltrationIcon name={a.icon} /></span>
                    <span className="wf-area__name">{a.area}</span>
                    <span className="wf-area__line">{a.line}</span>
                  </summary>
                  <p>{a.detail}</p>
                </details>
              ))}
            </div>
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
      {t.slug === "whole-home" && (
        <section className="wf-styles">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot" /> Choose your system</span>
              <h2 className="ds-h--on-dark">Six ways to do the same job.</h2>
              <p className="wf-styles__lede">
                From a covered unit you&rsquo;d happily have on the front fence to plain housings
                on a side passage. All of them filter; they differ on how they look, how much
                they cost and how often you touch them.
              </p>
            </div>
            <div className="wf-styles__grid">
              {SYSTEM_STYLES.map((sy) => (
                <article className={`wf-style${sy.lead ? " is-lead" : ""}`} key={sy.name}>
                  <div className="wf-style__photo">
                    {hasAsset(sy.photo)
                      ? <img src={sy.photo} alt={`${sy.brand} ${sy.name}`} loading="lazy" width="600" height="450" />
                      : <span className="wf-style__ph" aria-hidden="true">{sy.brand}</span>}
                  </div>
                  <div className="wf-style__body">
                    <span className="wf-style__tier">{sy.tier}</span>
                    <h3>{sy.name}</h3>
                    <span className="wf-style__style">{sy.brand} · {sy.style}</span>
                    <p>{sy.blurb}</p>
                    <ul>{sy.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
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
        <section className="wf-look">
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

      <CtaBand
        boxed
        heading={`Not sure ${t.label.toLowerCase()} is the one you need?`}
        blurb="Tell us the symptom — taste, smell, grit, dry skin, tank water — and we'll tell you which fitting addresses it. Including when the answer is a cheaper one."
        cta="Ask us which one"
      />

      {/* THE F RANGE — this is the whole-house product, so the range on
          this page is F3 through F6 rather than a second pass at the
          system styles above. Four reasons per model, because they
          differ on exactly two variables and a longer list is padding. */}
      {t.models && t.models.length > 0 && (
        <section className="wf-range">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The F range</span>
              <h2>Four versions, and why you&rsquo;d pick each one.</h2>
              <p>
                They differ on two things only: how much water the house pulls at once, and
                whether you want scale protection with it. Everything else is identical.
              </p>
            </div>
            <div className="wf-range__grid">
              {t.models.map((m) => (
                <article className={`wf-model${m.common ? " is-common" : ""}`} key={m.name}>
                  {m.common && <span className="wf-model__tag">Most common here</span>}
                  <div className="wf-model__shot">
                    {m.photo && hasAsset(m.photo)
                      ? <img src={m.photo} alt={m.name} loading="lazy" width="400" height="300" />
                      : <FilterWallGlyph />}
                  </div>
                  <h3>{m.name}</h3>
                  <p className="wf-model__suits">{m.suits}</p>
                  <dl className="wf-model__specs">
                    <div><dt>Flow</dt><dd>{m.flow}</dd></div>
                    <div><dt>Cartridge</dt><dd>{m.cartridge}</dd></div>
                  </dl>
                  <span className="wf-model__rl">Four reasons to pick it</span>
                  <ol className="wf-model__reasons">
                    {m.reasons.map((r) => <li key={r}>{r}</li>)}
                  </ol>
                </article>
              ))}
            </div>
            <p className="wf-range__note">
              Priced at quote rather than on the page — the number depends on where the main
              comes in and what the pipework needs, and a &ldquo;from&rdquo; figure with none of
              that behind it is bait.
            </p>
          </div>
        </section>
      )}

      {/* The "whole house vs under sink" table used to sit here. Pulled:
          somebody reading this page has already chosen whole house, and
          offering them the alternative at this point is a wobble, not a
          service. It stays on /water-filtration where the choice is
          actually live. */}

      {/* THE SELECTOR — three questions instead of a spec table. */}
      {t.models && t.models.length > 0 && (
        <section className="wf-picker">
          <div className="wrap wf-picker__grid">
            <div>
              <div className="ds-section-head ds-section-head--hl">
                <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Narrow it down</span>
                <h2>Which model is right for my home?</h2>
                <p>Answer the three and the answer appears. Nothing is sent anywhere.</p>
              </div>
              <figure className="wf-picker__shot">
                {hasAsset(t.productPhoto)
                  ? <img src={t.productPhoto} alt={t.productPhotoAlt} loading="lazy" width="700" height="520" />
                  : <FilterWallGlyph large />}
              </figure>
              <ul className="wf-picker__logic">
                <li><strong>Bathrooms</strong> decide the flow rate — two or more means simultaneous outlets.</li>
                <li><strong>Scale</strong> on the kettle or the shower screen is the only reason to pay for ScaleProtect.</li>
                <li><strong>Tank water</strong> is a different product entirely, and we&rsquo;ll say so.</li>
              </ul>
            </div>
            <FilterWallSelector />
          </div>
        </section>
      )}

      <section className="wf-servicing">
        <div className="wrap wf-servicing__inner">
          <div className="wf-servicing__photo">
            <img
              src={assetOrFallback(t.productPhoto, t.diagram)}
              alt={hasAsset(t.productPhoto) ? t.productPhotoAlt : `Diagram: ${t.fitsWhere}`}
              loading="lazy"
              width="600"
              height="400"
            />
          </div>
          <div>
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> Keeping it working</span>
              <h2>Cartridges, and why we show you rather than charge you.</h2>
            </div>
            <p>{t.servicing}</p>
            <p className="wf-servicing__note">
              A filter nobody changes is worse than no filter, because you stop thinking about
              the water while the cartridge quietly stops doing anything. That is why we&rsquo;d
              rather you could do it yourself in ten minutes than have it depend on us
              remembering.
            </p>
          </div>
        </div>
      </section>

      <section className="wf-process wf-process--tier">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> How the job runs</span>
            <h2>What happens, start to finish.</h2>
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
