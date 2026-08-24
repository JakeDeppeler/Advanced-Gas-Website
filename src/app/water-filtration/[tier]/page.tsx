import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { TIERS, tierBySlug, PROCESS } from "@/lib/waterFiltration";
import { QuoteForm } from "@/components/QuoteForm";
import { FiltrationDiagram } from "@/components/FiltrationDiagram";
import { assetOrFallback, hasAsset } from "@/lib/publicAsset";
import { CtaBand } from "@/components/CtaBand";
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
            : {
                // Until the manufacturer render is in /public, our own
                // workshop photo behind the scrim beats a flat gradient.
                backgroundImage:
                  'linear-gradient(180deg, rgba(19,36,84,0.82) 0%, rgba(13,25,66,0.88) 60%, rgba(11,22,60,0.93) 100%), url("/team-photo.webp")',
                backgroundSize: "cover",
                backgroundPosition: "center 30%",
              }
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
            <div className="wf-look__swatches">
              <span className="wf-look__swlbl">Ten finishes</span>
              <div className="wf-look__swrow">
                {t.finish.swatches.map((sw) => (
                  <span key={sw.name} className="wf-swatch" title={sw.name}>
                    <i style={{ background: sw.hex }} aria-hidden="true" />
                    <em>{sw.name}</em>
                  </span>
                ))}
              </div>
              <p className="wf-look__swnote">
                Indicative only — we bring the real colour chart to the quote.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* WHY INSTALL ONE — what it does, not what it doesn't. Jake was
          blunt about the old block: compare the models, don't run a list
          of shortcomings. Copy is Puretec's own product material. */}
      {t.whyInstall && (
        <section className="wf-why">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why people put one in</span>
              <h2>What a whole-house filter actually changes.</h2>
            </div>
            <div className="wf-why__grid">
              {t.whyInstall.map((w, i) => (
                <article className="wf-whycard" key={w.t}>
                  <span className="wf-whycard__n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{w.t}</h3>
                  <ul>{w.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand
        heading={`Not sure ${t.label.toLowerCase()} is the one you need?`}
        blurb="Tell us the symptom — taste, smell, grit, dry skin, tank water — and we'll tell you which fitting addresses it. Including when the answer is a cheaper one."
        cta="Ask us which one"
      />

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

      {/* THE RANGE — the versions side by side, which is what Jake liked
          most about the Puretec page. Pricing stays off until he's ready. */}
      {t.models && t.models.length > 0 && (
        <section className="wf-range">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The range</span>
              <h2>Four versions of the same idea.</h2>
              <p>
                They differ on two things only: how much water the house pulls at once, and
                whether you want scale protection with it.
              </p>
            </div>
            <div className="wf-range__grid">
              {t.models.map((m) => (
                <article className={`wf-model${m.common ? " is-common" : ""}`} key={m.name}>
                  {m.common && <span className="wf-model__tag">Most common here</span>}
                  <h3>{m.name}</h3>
                  <p className="wf-model__suits">{m.suits}</p>
                  <dl>
                    <div><dt>Handles</dt><dd>{m.handles}</dd></div>
                    <div><dt>Flow rate</dt><dd>{m.flow}</dd></div>
                    <div><dt>Cartridge</dt><dd>{m.cartridge}</dd></div>
                  </dl>
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

      {/* THIS ONE AGAINST THE OBVIOUS ALTERNATIVE — the layout Jake sent
          from Puretec, where the choice is the whole point of the table. */}
      {t.versus && (
        <section className="wf-vs">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The choice</span>
              <h2>{t.versus.heading}</h2>
              <p>The honest split. Plenty of households end up with both, and that&rsquo;s fine.</p>
            </div>
            <div className="wf-vs__wrap">
              <table className="wf-vs__table">
                <thead>
                  <tr>
                    <th />
                    <th className="is-mine">{t.versus.thisLabel}</th>
                    <th>
                      {t.versus.otherHref
                        ? <Link href={t.versus.otherHref}>{t.versus.otherLabel}</Link>
                        : t.versus.otherLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.versus.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      <td className="is-mine">
                        {r.mine === "yes" ? <span className="wf-vs__tick">✓</span>
                          : r.mine === "no" ? <span className="wf-vs__dash">—</span>
                          : r.mine}
                      </td>
                      <td>
                        {r.theirs === "yes" ? <span className="wf-vs__tick">✓</span>
                          : r.theirs === "no" ? <span className="wf-vs__dash">—</span>
                          : r.theirs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

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
