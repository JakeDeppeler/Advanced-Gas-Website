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
import { SystemChooser } from "@/components/SystemChooser";
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

  // The keyword match against the parent service's price table is gone
  // with the section that used it. Each system's own rows now come off
  // `systemDetail` and render inside its card, so there is no longer a
  // fallback that could quietly show the whole service's price list.
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

      {/* CHOOSE YOUR SYSTEM — every shape the parent service offers,
          this one included and marked as the one you're on. Somebody
          who landed here from a search for "ducted" needs to see that
          split and evap exist before they decide, and the shape of that
          decision is the same one level up. */}
      <SystemChooser
        cards={(content.systems ?? []).map((sy) => ({
          id: sy.id,
          label: sy.label,
          blurb: sy.blurb,
          photo: resolveAsset(sy.photo.src),
          photoAlt: sy.photo.alt,
          photoScene: sy.photo.scene ?? false,
          brands: sy.brands ?? content.brands,
          priceFrom: sy.priceFrom,
          facts: (sy.benefitTiles && sy.benefitTiles.length > 0
            ? sy.benefitTiles.map((b) => ({ lead: b.t.trim(), note: b.line }))
            : sy.points.map((pt) => ({ lead: pt }))
          ).slice(0, 4),
          href: `/services/${params.slug}/${sy.id}`,
          current: sy.id === system.id,
          sizes: (systemDetail(params.slug, sy.id)?.pricing ?? []).map((z) => ({
            label: z.tier,
            price: z.price,
            includes: z.includes,
            priceKey: z.priceKey,
          })),
        }))}
        footnote="*Subject to eligibility, site inspection and rebate program changes. The final quote is in writing before anything starts."
        heading={`The ${svc.short.toLowerCase()} options, side by side.`}
        lede={`You're reading about ${system.label.toLowerCase()}. Here it is next to everything else we fit, in case it isn't the one.`}
      />

      {/* HOW IT LOOKS — what the gear looks like where it goes. The
          question people are too embarrassed to ask at the quote. */}
      {system.looks && (
        <section className="svc-look">
          <div className="wrap svc-look__grid">
            <figure className={`svc-look__shot${system.looks.photoScene ? " is-scene" : ""}`}>
              <img src={system.looks.photo} alt={system.looks.photoAlt} loading="lazy" width="900" height="900" />
            </figure>
            <div className="svc-look__copy">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> How it looks</span>
              <h2>{system.looks.heading}</h2>
              <p>{system.looks.note}</p>
              <ul className="svc-look__facts">
                {system.looks.facts.map((f) => (
                  <li key={f.k}><strong>{f.v}</strong><span>{f.k}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* NARROW IT DOWN — three questions about the actual house. The
          box carries its own head, same as on the service pages: a
          heading on sand with an orange heading asking the same thing
          below it was the question asked twice. */}
      {ADVISORS[params.slug] && (
        <section className="sysfit">
          <div className="wrap">
            <SystemAdvisor service={params.slug} />
          </div>
        </section>
      )}

      {/* KEEPING IT WORKING — the half of the argument that only matters
          after the sale, about this system rather than the service. */}
      {system.servicing && (
        <section className="svc-serv">
          <div className="wrap svc-serv__grid">
            <div className="svc-serv__copy">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Keeping it working</span>
              <h2>{system.servicing.heading}</h2>
              <p>{system.servicing.body}</p>
              <ul className="svc-serv__facts">
                {system.servicing.facts.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <figure className={`svc-serv__shot${system.servicing.photoScene ? " is-scene" : ""}`}>
              <img src={system.servicing.photo} alt={system.servicing.photoAlt} loading="lazy" width="900" height="900" />
            </figure>
          </div>
        </section>
      )}

      {/* Process for this system. Falls back to the parent service only
          where the system's own steps haven't been written yet. */}
      {steps && steps.length > 0 && (
        <section className="process">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How the job runs</span>
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

      {/* Indicative pricing was a section here. The numbers belong to
          the systems, so they moved onto the system cards above: press a
          card's button and its sizes and installed prices open under the
          grid. A price list forty lines below the thing it prices was
          two blocks describing one decision. */}
      {detail?.pricingNote && (
        <section className="dp-pricenote">
          <div className="wrap">
            <p className="dp-pricing__note">{detail.pricingNote}</p>
          </div>
        </section>
      )}

      {/* THE BRANDS — a door each into the brand page, plus one button
          into the full filterable list. Led by the brands rather than by
          "the range", because at this point the choice left is whose
          box goes on the wall, not which system. */}
      <RangeBand
        eyebrow="The brands"
        heading={`Who makes the ${system.label.toLowerCase()} we fit.`}
        blurb="Every model, spec and installed price sits on the brand page. One press each — or open the full list and filter it yourself."
        brands={systemBrands}
      />

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
