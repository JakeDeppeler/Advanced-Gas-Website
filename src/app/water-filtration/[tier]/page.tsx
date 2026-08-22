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

  const others = TIERS.filter((x) => x.slug !== t.slug);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Water filtration", url: `${site.url}/water-filtration` },
    { name: t.label, url: `${site.url}/water-filtration/${t.slug}` },
  ]);

  return (
    <div className="page-filtration page-filtration--tier">
      <Script id={`wf-faq-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(t.faqs)) }} />
      <Script id={`wf-crumbs-${t.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <section className="wf-hero wf-hero--tier">
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

      {/* Where the fitting physically goes. The single thing a reader
          needs to picture, and the thing a product photo can't show. */}
      <section className="wf-where">
        <div className="wrap wf-where__grid">
          <div>
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> Where it goes</span>
              <h2>{t.fitsWhere}.</h2>
            </div>
          </div>
          <div className="wf-where__diagram">
            <FiltrationDiagram tier={t.slug} />
          </div>
        </div>
      </section>

      {/* Treats vs doesn't. The second column is why the first is believable. */}
      <section className="wf-does">
        <div className="wrap wf-does__grid">
          <div className="wf-does__col wf-does__col--yes">
            <span className="ds-eyebrow"><span className="ds-dot" /> What it handles</span>
            <ul>{t.treats.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="wf-does__col wf-does__col--no">
            <span className="ds-eyebrow"><span className="ds-dot" /> What it doesn&rsquo;t</span>
            <ul>{t.doesNotTreat.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="wf-does__note">
              This half matters more than the other one. A filter sold as doing everything is a
              filter someone will be disappointed by.
            </p>
          </div>
        </div>
      </section>

      <section className="wf-fit">
        <div className="wrap wf-fit__grid">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> Where it&rsquo;s the right call</span>
            <ul className="wf-fit__list wf-fit__list--for">
              {t.bestFor.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> Worth knowing first</span>
            <ul className="wf-fit__list wf-fit__list--watch">
              {t.watchOut.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </div>
      </section>

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

      <section className="wf-faq">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> {t.label} questions</span>
            <h2>Straight answers.</h2>
          </div>
          <div className="wf-faq__list">
            {t.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="wf-others">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> The other two</span>
            <h2>Not the one you need?</h2>
          </div>
          <div className="wf-others__row">
            {others.map((o) => (
              <Link key={o.slug} href={`/water-filtration/${o.slug}`} className="wf-other">
                <b>{o.label}</b>
                <span>{o.tagline}</span>
              </Link>
            ))}
            <Link href="/water-filtration" className="wf-other wf-other--hub">
              <b>Compare all three</b>
              <span>What&rsquo;s in Melbourne water, and which fitting handles it</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
