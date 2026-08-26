import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { services, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import "../../../detail.css";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import { nudgeForSystem } from "@/lib/upgradeAngle";
import { systemDetail } from "@/lib/systemDetail";
import { pageTitle, metaDescription } from "@/lib/seo";
import { RangeBand } from "@/components/RangeBand";
import { BenefitTiles } from "@/components/BenefitTiles";
import { SystemAdvisor } from "@/components/SystemAdvisor";
import { ADVISORS } from "@/lib/advisor";

/** The tile palette, same five the rest of the site rotates through. */
const TILE_TINTS = ["#0B1450", "#00699A", "#2E7D6B", "#C2540F", "#5A5F7A"];
import { ReviewMarquee } from "@/components/ReviewMarquee";
import { hasAsset, resolveAsset } from "@/lib/publicAsset";


/**
 * A page per system type — /services/gas-plumbing/gas-ducted and so on.
 *
 * These used to be fragments on the parent service page, which meant the
 * header's "Split system" and "Multi-head" links landed a customer on the
 * same page twice. Each system now has somewhere of its own to rank and
 * somewhere of its own to send people.
 *
 * Content lives on serviceContent[svc].systems[] — a system without an
 * `intro` is treated as not ready for its own page and 404s rather than
 * shipping a thin one.
 */

function find(slug: string, systemId: string) {
  const content = serviceContent[slug];
  const svc = services.find((s) => s.slug === slug);
  const system = content?.systems?.find((x) => x.id === systemId);
  if (!content || !svc || !system?.intro) return null;
  return { content, svc, system };
}

export function generateStaticParams() {
  return Object.entries(serviceContent).flatMap(([slug, c]) =>
    (c.systems ?? [])
      .filter((s) => s.intro)
      .map((s) => ({ slug, system: s.id })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { slug: string; system: string };
}): Metadata {
  const found = find(params.slug, params.system);
  if (!found) return {};
  const { system } = found;
  return {
    title: pageTitle(`${system.label}, Melbourne South-East`),
    description: metaDescription(system.blurb),
    alternates: { canonical: `/services/${params.slug}/${params.system}` },
  };
}

export default function SystemPage({
  params,
}: {
  params: { slug: string; system: string };
}) {
  const found = find(params.slug, params.system);
  if (!found) notFound();
  const { content, svc, system } = found;

  const siblings = (content.systems ?? []).filter((s) => s.id !== system.id && s.intro);

  // Per-system content. Everything here is authored for this system
  // specifically; where a field is missing we fall back to the parent
  // service so a new system can ship before its detail is written.
  const detail = systemDetail(params.slug, system.id);

  // The range band shows the brands that apply to THIS system, not every
  // brand the parent service touches. A split system page listing the
  // evap brand and the ducted controller is a list of things you cannot
  // buy on this page. `system.brands` names them; without it, all of the
  // parent's.
  const systemBrands = (content.brandPods ?? []).filter(
    (b) => !system.brands || system.brands.some((n) => b.brand.toLowerCase().startsWith(n.toLowerCase())),
  );

  // Pricing: the system's own rows first. The keyword match on the
  // parent table is the old fallback and it was the reason a page with
  // no matching row silently displayed the entire service price list,
  // which is most of why these pages read as interchangeable.
  const words = system.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  const rows = content.pricing.filter((p) =>
    words.some((w) => p.tier.toLowerCase().includes(w)),
  );
  const pricing = detail?.pricing ?? (rows.length > 0 ? rows : null);
  const steps = detail?.steps ?? content.steps;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: svc.name, url: `${site.url}/services/${svc.slug}` },
    { name: system.label, url: `${site.url}/services/${svc.slug}/${system.id}` },
  ]);

  return (
    <div className="page-detail">
      {/* HEADER — the photo full bleed with the figures along the bottom,
          same as the filtration pages. The specs strip that used to sit
          in its own band under the hero is those figures now. */}
      <section
        className={`dp-hero${system.photo?.scene && hasAsset(system.photo.src) ? " dp-hero--shot" : ""}`}
        style={
          system.photo?.scene && hasAsset(system.photo.src)
            ? {
                backgroundImage:
                  `linear-gradient(180deg, rgba(9,17,52,0.45) 0%, rgba(9,17,52,0.12) 38%, rgba(9,17,52,0.72) 100%), ` +
                  `linear-gradient(100deg, rgba(9,17,52,0.95) 0%, rgba(9,17,52,0.90) 30%, rgba(9,17,52,0.36) 52%, rgba(9,17,52,0.08) 76%), ` +
                  `url("${resolveAsset(system.photo.src)}")`,
              }
            : undefined
        }
      >
        <div className={`wrap${!system.photo?.scene && hasAsset(system.photo?.src ?? "") ? " dp-hero__wrap--inset" : ""}`}>
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/services">Services</Link>
            <span className="sep">/</span>
            <Link href={`/services/${svc.slug}`}>{svc.short}</Link>
            <span className="sep">/</span>
            <span className="cur">{system.label}</span>
          </nav>

          <div className="dp-hero__copy">
            <div className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot" /> {svc.short} · Pakenham &amp; within 75 km
            </div>
            {/* The last word carries the accent, the way the filtration hub
                does it — "Split system air CONDITIONING". Breaks a long
                flat headline into something with a shape to it. */}
            <h1>
              {system.label.split(" ").slice(0, -1).join(" ")}{" "}
              <em>{system.label.split(" ").slice(-1)}</em>
            </h1>
            <p className="dp-hero__sub">{system.intro}</p>
            <div className="pg-ctas">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get my free quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                Or call {site.phone}
              </a>
            </div>
          </div>

          {/* A studio cut-out doesn't full-bleed — stretched behind the
              copy it reads as a giant letterform rather than a product.
              Those get a framed panel beside the copy instead, so every
              page still shows the thing it's about. */}
          {!system.photo?.scene && system.photo?.src && hasAsset(system.photo.src) && (
            <div className="dp-hero__inset">
              <img
                src={resolveAsset(system.photo.src)!}
                alt={system.photo.alt}
                width="760"
                height="570"
                fetchPriority="high"
              />
            </div>
          )}

          {detail?.specs && detail.specs.length > 0 && (
            <ul className="dp-hero__at">
              {detail.specs.slice(0, 4).map((sp) => (
                <li key={sp.label}>
                  <strong>{sp.value}</strong>
                  <span>{sp.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* WHAT'S IN THE PRICE — the tabbed tiles, same as everywhere else.
          A numbered grid of eight one-liners is a wall; eight tiles and
          one panel is the same content you can scan. */}
      <section className="dp-benefits">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What you get</span>
            <h2>What&rsquo;s in the price.</h2>
            <p>{system.blurb}</p>
          </div>
          {/* Tiles where the faces have been written, the checklist where
              they haven't. Deriving a face out of a `points` statement
              truncates it and leaves the panel repeating the tile, so a
              system opts in by authoring `benefitTiles`. */}
          {system.benefitTiles ? (
            <BenefitTiles
              benefits={system.benefitTiles.map((b, i) => ({
                area: b.t,
                line: b.line,
                icon: b.icon,
                tint: TILE_TINTS[i % TILE_TINTS.length],
                detail: b.detail,
              }))}
            />
          ) : (
            <ul className="syspoints">
              {system.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* IS IT RIGHT FOR YOU — three questions about the actual house.
          The right-call / think-twice columns that were here came out:
          they made the case in the abstract and the box answers it for
          the reader's own place, which is what they were reaching for. */}
      {ADVISORS[params.slug] && (
        <section className="sysfit">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Is it right for you</span>
              <h2>Where {system.label.toLowerCase()} works, and where it doesn&rsquo;t.</h2>
              <p>
                We&rsquo;d rather you read this and ring someone else than have us fit
                the wrong thing and both regret it.
              </p>
            </div>
            <SystemAdvisor service={params.slug} />
          </div>
        </section>
      )}

      {/* The spotlight came out. On a page that already says what you
          get, whether it suits you and how the job runs, a fourth block
          making the case was one too many. */}

      {/* Process for this system. Falls back to the parent service only
          where the system's own steps haven't been written yet. */}
      {steps && steps.length > 0 && (
        <section className="process">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How we do it</span>
              <h2 className="ds-h--on-dark">What happens on a {system.label.toLowerCase()} install.</h2>
            </div>
            <ol className="steps">
              {steps.map((st, n) => (
                <li key={st.title} className="step">
                  <span className="step__num">{n + 1}</span>
                  <h3>{st.title}</h3>
                  <p>{st.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Upgrade + rebate, right before the prices. Skipped on the
          systems where a ten-year rule doesn't apply — see
          nudgeForSystem(). */}
      {nudgeForSystem(system.id) && (
        <div className="wrap">
          <UpgradeNudge variant={nudgeForSystem(system.id)!} />
        </div>
      )}

      {/* Pricing. Only rendered when there are rows genuinely about this
          system — a page with no numbers of its own is better than one
          showing the whole service's price list as if it were relevant. */}
      {(pricing || detail?.pricingNote) && (
      <section className="dp-pricing">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Indicative pricing</span>
            <h2>What {system.label.toLowerCase()} costs.</h2>
            <p>Real numbers. Your final quote depends on site specifics and we confirm it in writing before any work starts.</p>
          </div>
          {/* Price cards, not a table. A three-column table of tier, price
              and inclusions had to scroll sideways on a phone and read as
              a spreadsheet on a laptop. Each row is a card now: the number
              first because it's what people came for, then what it is,
              then what's in it. */}
          {pricing && (
          <div className="pricecards">
            {pricing.map((p) => (
              <article className="pricecard" key={p.tier}>
                <span className="pricecard__price">{p.price}</span>
                <h3>{p.tier}</h3>
                <p>{p.includes}</p>
              </article>
            ))}
          </div>
          )}
          {detail?.pricingNote && (
            <p className="dp-pricing__note">{detail.pricingNote}</p>
          )}
          <p className="dp-pricing__fp">
            *Subject to eligibility, site inspection and rebate program changes. Final quote in writing.
          </p>
        </div>
      </section>
      )}


      {/* THE RANGE — every model for this system sits on the brand page,
          so this is a button each rather than a second catalogue here. */}
      {systemBrands.length > 0 && (
        <RangeBand
          heading={`See the full ${system.label.toLowerCase()} range.`}
          blurb="Models, specs and installed prices, brand by brand."
          brands={systemBrands}
        />
      )}

      {/* QUOTE — the orange panel. */}
      <section className="dp-quote quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange">
                  <span className="ds-dot ds-dot--on-orange" /> Free quote
                </span>
                <h2>Quote for {system.label.toLowerCase()}.</h2>
                <p className="quotesec__lede">
                  60 seconds, no obligation, replied within 2 business hours. Rebates applied and
                  GST included, so the number you get is the number you pay.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> Same person quotes as installs</li>
                  <li><span className="tick tick--on-orange">✓</span> Fixed price, confirmed in writing</li>
                  <li><span className="tick tick--on-orange">✓</span> Emergency? Call {site.phone} instead</li>
                </ul>
                {siblings.length > 0 && (
                  <div className="quotesec__chips">
                    {siblings.map((sib) => (
                      <Link key={sib.id} href={`/services/${svc.slug}/${sib.id}`}>{sib.label}</Link>
                    ))}
                    <Link href={`/services/${svc.slug}`}>All {svc.short.toLowerCase()}</Link>
                  </div>
                )}
              </div>
              <QuoteForm presetService={params.slug} />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — heading and a human line left, accordions right. */}
      {system.faqs && system.faqs.length > 0 && (
        <section className="dp-faq faq">
          <div className="wrap faq__grid">
            <div className="faq__left">
              <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
              <h2>Quick honest answers.</h2>
              <p>
                Anything else,{" "}
                <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>
                  call {site.phone}
                </a>
                .
              </p>
            </div>
            <div className="faq__right">
              {system.faqs.map((f, i) => (
                <details key={f.q} name="faq" {...(i === 0 ? { open: true } : {})}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <ReviewMarquee heading="Reviews from households across the south-east." />

      <Script id={`ld-crumbs-${svc.slug}-${system.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {system.faqs && system.faqs.length > 0 && (
        <Script id={`ld-faq-${svc.slug}-${system.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(system.faqs)) }} />
      )}
    </div>
  );
}
