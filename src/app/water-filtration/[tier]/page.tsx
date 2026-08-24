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

      {/* Where it goes — photos rather than the lone diagram. Jake's
          note: one drawing isn't enough here, it wants several shots of
          the thing actually on a wall. Falls back to the diagram until
          the photography lands. */}
      <section className="wf-shots">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Where it goes</span>
            <h2>{t.fitsWhere}.</h2>
          </div>
          {t.gallery && t.gallery.some((g) => hasAsset(g.src)) ? (
            <div className="wf-shots__grid">
              {t.gallery.filter((g) => hasAsset(g.src)).map((g) => (
                <figure className="wf-shot" key={g.src}>
                  <img src={g.src} alt={g.alt} loading="lazy" width="700" height="520" />
                  {g.caption && <figcaption>{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          ) : (
            <div className="wf-shots__fallback">
              <FiltrationDiagram tier={t.slug} />
              <p>
                Install photography for this one is being shot. Until it lands, here&rsquo;s the
                drawing of where the fitting sits.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* One table instead of the orange box and the two lists that
          followed it. Jake's note on both: the compare layout is what
          actually helps, so what it handles and what it doesn't now sit
          in the same grid as when to pick it and when not to. */}
      <section className="wf-verdict">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The honest version</span>
            <h2>What it does, what it doesn&rsquo;t, and when to pick it.</h2>
            <p>
              Everything worth knowing about {t.label.toLowerCase()} filtration in one table,
              including the half most product pages leave out.
            </p>
          </div>
          <div className="wf-verdict__wrap">
            <table className="wf-verdict__table">
              <thead>
                <tr>
                  <th className="is-yes">It handles</th>
                  <th className="is-no">It doesn&rsquo;t</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <ul>{t.treats.map((x) => <li key={x}>{x}</li>)}</ul>
                  </td>
                  <td>
                    <ul>{t.doesNotTreat.map((x) => <li key={x}>{x}</li>)}</ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="wf-verdict__wrap wf-verdict__wrap--fit">
            <table className="wf-verdict__table">
              <thead>
                <tr>
                  <th className="is-yes">Pick it when</th>
                  <th className="is-no">Think twice if</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <ul>{t.bestFor.map((x) => <li key={x}>{x}</li>)}</ul>
                  </td>
                  <td>
                    <ul>{t.watchOut.map((x) => <li key={x}>{x}</li>)}</ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
