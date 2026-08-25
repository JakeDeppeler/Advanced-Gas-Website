import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { TIERS, tierBySlug, PROCESS, SYSTEM_STYLES } from "@/lib/waterFiltration";
import { QuoteForm } from "@/components/QuoteForm";
import { assetOrFallback, hasAsset, resolveAsset } from "@/lib/publicAsset";
import { CtaBand } from "@/components/CtaBand";
import { BenefitTiles } from "@/components/BenefitTiles";
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


  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Water filtration", url: `${site.url}/water-filtration` },
    { name: t.label, url: `${site.url}/water-filtration/${t.slug}` },
  ]);

  return (
    <div className="page-filtration page-filtration--tier">
      <Script id={`wf-faq-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(t.faqs)) }} />
      <Script id={`wf-crumbs-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      {/* The hero. The display photo sits in a panel beside the copy
          rather than behind it — as a background under the navy gradient
          it read as a photo that had half failed to load. Until the file
          lands the panel carries the at-a-glance facts instead. */}
      <section className="wf-hero wf-hero--tier">
        <div className={`wrap${t.heroFacts ? " wf-hero__grid" : ""}`}>
          <div>
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
          {t.heroFacts && (
            <aside className="wf-hero__panel">
              {t.heroPhoto && hasAsset(t.heroPhoto) ? (
                <img
                  className="wf-hero__shot"
                  src={resolveAsset(t.heroPhoto)!}
                  alt={t.heroPhotoAlt ?? t.productPhotoAlt}
                  width="640"
                  height="640"
                />
              ) : (
                <>
                  <span className="wf-hero__panel-lbl">At a glance</span>
                  <ul className="wf-hero__at">
                    {t.heroFacts.map((f) => (
                      <li key={f.k}>
                        <strong>{f.v}</strong>
                        <span>{f.k}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          )}
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
            <BenefitTiles />
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
                  {/* Only draw the photo frame when there's a photo to put in
                      it. Six empty 4:3 boxes with a brand name floating in the
                      middle doubled the height of the section and said nothing. */}
                  {hasAsset(sy.photo) && (
                    <div className="wf-style__photo">
                      <img src={resolveAsset(sy.photo)!} alt={`${sy.brand} ${sy.name}`} loading="lazy" width="600" height="450" />
                    </div>
                  )}
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
        <section className="wf-look wf-band wf-band--sky">
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
        <section className="wf-range wf-band wf-band--sand">
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
                  {/* Photo when there is one; otherwise the designation on a
                      coloured strip. A drawn stand-in floating in a 4:3 box
                      just read as a photo that failed to load. */}
                  {m.photo && hasAsset(m.photo) ? (
                    <div className="wf-model__shot">
                      <img src={resolveAsset(m.photo)!} alt={m.name} loading="lazy" width="400" height="300" />
                    </div>
                  ) : (
                    <div className="wf-model__code" aria-hidden="true">
                      {m.name.split(" ").pop()}
                    </div>
                  )}
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
              <strong>Priced at quote, not on the page.</strong> What it costs depends on where
              the main comes in and what the pipework needs, and a &ldquo;from&rdquo; figure with
              none of that behind it is bait.
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
        <section className="wf-picker wf-band wf-band--peach">
          <div className="wrap wf-picker__grid">
            <div>
              <div className="ds-section-head ds-section-head--hl">
                <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Narrow it down</span>
                <h2>Which model is right for my home?</h2>
                <p>Answer the three and the answer appears. Nothing is sent anywhere.</p>
              </div>
              {/* No photo here on purpose. Every candidate is already on
                  this page — the hero, the system card, the model cards —
                  and a fourth outing for one of them is just height. */}
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

      <section className="wf-servicing wf-band wf-band--paper">
        <div className="wrap">
          <div className="wf-servicing__inner wf-card">
            <div className="wf-servicing__photo">
              <img
                src={assetOrFallback(t.servicingPhoto ?? t.productPhoto, t.diagram)}
                alt={
                  t.servicingPhoto && hasAsset(t.servicingPhoto)
                    ? t.servicingPhotoAlt ?? t.productPhotoAlt
                    : hasAsset(t.productPhoto)
                    ? t.productPhotoAlt
                    : `Diagram: ${t.fitsWhere}`
                }
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
