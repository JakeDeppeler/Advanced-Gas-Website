import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands, findBrand, productPhoto } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import { BrandCompare } from "@/components/BrandCompare";
import { ProductTabs } from "@/components/ProductTabs";
import { BrandFacts } from "@/components/BrandFacts";
import { QuoteForm } from "@/components/QuoteForm";
import { SystemAdvisor } from "@/components/SystemAdvisor";
import { ADVISORS } from "@/lib/advisor";
import { HeatPumpDiagram } from "@/components/HeatPumpDiagram";
import { GasSavingsChart } from "@/components/GasSavingsChart";
import { installsFor } from "@/lib/brandGallery";
import { getInstagramForBrand } from "@/lib/instagram";
import { InstagramFeed } from "@/components/InstagramFeed";
import { publishedSuburbs } from "@/lib/suburbs";
import { breadcrumbSchema } from "@/lib/schema";

const INSTALLER_SUBURB_SLUGS = [
  "pakenham", "officer", "beaconsfield", "berwick", "narre-warren",
  "endeavour-hills", "hallam", "hampton-park", "cranbourne", "clyde-north",
  "drouin", "warragul",
];
import "../../detail.css";
import "./brand.css";
import { metaDescription, pageTitle, seoMeta } from "@/lib/seo";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import { BenefitTiles } from "@/components/BenefitTiles";
import { faqSchema } from "@/lib/schema";

/** The tile palette, same five every other page rotates through. */
const TILE_TINTS = ["#0B1450", "#00699A", "#2E7D6B", "#C2540F", "#5A5F7A"];


export function generateStaticParams() {
  return brands.map((b) => ({ brand: b.slug }));
}

export function generateMetadata({ params }: { params: { brand: string } }): Metadata {
  const brand = findBrand(params.brand);
  if (!brand) notFound();
  return seoMeta({
    title: `${brand.name} Installer, Melbourne South-East`,
    description: `Licensed ${brand.name} installer across Melbourne's south-east. ${brand.productLabel}. Fixed-price quotes, VEU rebates handled where eligible, 6-year workmanship warranty.`,
    canonical: `/brands/${brand.slug}`,
    image: brand.photo,
  });
}

export default async function BrandPage({ params }: { params: { brand: string } }) {
  const brand = findBrand(params.brand);
  if (!brand) notFound();

  // Posts whose caption mentions this brand — see lib/instagram.ts.
  // Empty when the feed isn't configured, so the page degrades cleanly.
  const igPosts = await getInstagramForBrand(params.brand, 8);

  // Real install photos for this brand, if any are wired yet. When the
  // list is empty the page falls back to the manufacturer gallery — which
  // is labelled as such — so brands can be filled in one at a time.
  const installs = installsFor(brand.slug);

  // "Founded 1971 · Melbourne · …" → "1971". No year in the sentence
  // means no figure, rather than a figure that is really a paragraph.
  const estYear = brand.established?.match(/\b(19|20)\d{2}\b/)?.[0];
  const categoryCount = new Set(brand.products.map((pr) => pr.category)).size;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Brands", url: `${site.url}/brands` },
    { name: brand.name, url: `${site.url}/brands/${brand.slug}` },
  ]);

  return (
    <div className="page-detail page-brand" style={{ ["--card-accent" as string]: brand.accent }}>
      <section className={`dp-hero brand-hero${brand.photoScene ? " brand-hero--shot" : " brand-hero--panel"}`}>
        {/* A photograph goes behind the copy. A manufacturer render does
            not: six of the seven brand photos are cut-outs, and one of
            those stretched across a hero at 40% opacity is a blurry grey
            shape with a logo floating in the corner. Those get a panel
            beside the copy instead, where they read as the product. */}
        {brand.photoScene && (
          <>
            <div className="brand-hero__pic">
              <SafeImg src={brand.photo} fallback={brand.photoFallback} alt={brand.photoAlt} width="1600" height="900" fetchPriority="high" />
            </div>
            <div className="brand-hero__scrim" aria-hidden="true" />
          </>
        )}
        <div className="wrap brand-hero__grid">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <span className="cur">{brand.name}</span>
          </nav>
          <div className="brand-hero__copy">
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {brand.name} · {brand.origin}
          </div>
          <h1>
            <span className="accent">{brand.name}</span> installer, Melbourne&rsquo;s south-east.
          </h1>
          <p className="dp-hero__sub">{brand.heroSub ?? brand.intro}</p>
          {/* "Where it goes" — the filtration header's line, and the one
              thing a brand page never used to say: which houses this
              actually ends up in. */}
          {brand.fitsWhere && (
            <p className="brand-hero__where"><strong>Where it goes:</strong> {brand.fitsWhere}</p>
          )}
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed {brand.name} quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>

          {/* The figures along the bottom, same as the filtration and
              service headers. The trust bar this replaces said the same
              three things on every brand page in the catalogue. */}
          </div>
          {!brand.photoScene && (
            <div className="brand-hero__panel">
              <SafeImg
                src={brand.photo}
                fallback={brand.photoFallback}
                alt={brand.photoAlt}
                width="900"
                height="900"
                fetchPriority="high"
              />
            </div>
          )}
          {/* Authored figures where the brand has them. The derived set
              below counts things — "1 system types in the range" was a
              real render — so it's the fallback, not the default. */}
          <ul className="dp-hero__at">
            {brand.heroFacts ? (
              brand.heroFacts.map((f) => (
                <li key={f.k}>
                  <strong>{f.v}</strong>
                  <span>{f.k}</span>
                </li>
              ))
            ) : (
            <>
            <li>
              <strong>{brand.products.length}</strong>
              <span>{brand.name} models we install</span>
            </li>
            {/* `established` is a sentence, not a year — "Designed and
                assembled in Sydney, Australia · trading since 2007". Pull
                the year out for the figure and let the sentence live in
                the at-a-glance strip below, where it has room. */}
            {estYear && (
              <li>
                <strong>Since {estYear}</strong>
                <span>{brand.name} has been going</span>
              </li>
            )}
            {/* Only where a brand genuinely has more than one system type.
                "1 system types in the range" is not a fact worth a slot. */}
            {categoryCount > 1 && (
              <li>
                <strong>{categoryCount}</strong>
                <span>System types in the range</span>
              </li>
            )}
            <li>
              <strong>6-year</strong>
              <span>Workmanship, on top of the manufacturer&rsquo;s</span>
            </li>
            </>
            )}
          </ul>
        </div>
      </section>

      {/* At-a-glance. The reason we install it leads as prose; the
          supporting facts hide behind buttons so the strip stays short. */}
      {/* At-a-glance facts. For brands on the new layout the verdict
          replaces `ourTake` and these facts move into "the long view",
          so this strip is only for brands not yet rewritten. */}
      {!brand.whyLead && (
      <section className="dp-local">
        <div className="wrap">
          <BrandFacts
            ourTake={brand.ourTake}
            facts={[
              { label: "Warranty", value: brand.warranty ?? "6-year workmanship warranty on every install." },
              // Only shown when the brand has one. A generic "Authorised
              // installer" fallback is a claim, not a fact, so an absent
              // accreditation means the row is absent.
              ...(brand.accreditation ? [{ label: "Accreditation", value: brand.accreditation }] : []),
              ...(brand.established ? [{ label: "Established", value: brand.established }] : []),
              ...(brand.support ? [{ label: "Parts & service", value: brand.support }] : []),
              ...(brand.commonInMelbourne ? [{ label: "Common in Melbourne", value: brand.commonInMelbourne }] : []),
            ]}
          />
        </div>
      </section>
      )}

      {/* WHY THIS BRAND, the brand-first version — leads with the one big
          claim and our honest verdict, carries the supporting tiles, and
          ends on the half a manufacturer's own site can't write: where
          it's NOT the right call, and which of the others we'd fit
          instead. That last part is why this page is worth reading. */}
      {brand.whyLead && (
        <section className="brand-why brand-why--lead">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why {brand.name}</span>
              <h2>{brand.whyLead.claim}</h2>
              <p className="brand-why__sub">{brand.whyLead.sub}</p>
            </div>
            {brand.verdict && <p className="brand-why__verdict">{brand.verdict}</p>}
            {brand.benefitTiles && brand.benefitTiles.length > 0 && (
              <BenefitTiles
                benefits={brand.benefitTiles.map((b, i) => ({
                  area: b.t,
                  icon: b.icon,
                  tint: TILE_TINTS[i % TILE_TINTS.length],
                  line: b.line,
                  detail: b.detail,
                }))}
              />
            )}
            {/* The honest "where it's not the pick" callout — but not on the
                heat-pump brands, where the how-it-works panel and the range
                do the persuading and the cross-brand hedge read as doubt. */}
            {(brand.notRightWhen || brand.versus) && brand.advisorService !== "heat-pump-installation" && (
              <div className="brand-honest">
                <span className="brand-honest__eye">Where it&rsquo;s not the pick</span>
                {brand.notRightWhen && <p>{brand.notRightWhen}</p>}
                {brand.versus && <p className="brand-honest__vs">{brand.versus}</p>}
              </div>
            )}
            {brand.resources && brand.resources.length > 0 && (
              <p className="brand-why__resources">
                Straight from the manufacturer:{" "}
                {brand.resources.map((r, i) => (
                  <span key={r.href}>
                    {i > 0 && " · "}
                    <a href={r.href} target="_blank" rel="noopener noreferrer">{r.label} ↗</a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>
      )}

      {/* WHY THIS BRAND — tiles where the faces have been written, the
          plain list where they haven't. `keyFeatures` are single
          statements: splitting one into a tile face and a body truncates
          it mid-thought, which is why the tiles are data rather than a
          derivation. */}
      {!brand.benefitTiles && brand.keyFeatures && brand.keyFeatures.length > 0 && (
        <section className="brand-why">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why {brand.name}</span>
              <h2>What sets it apart.</h2>
            </div>
            <ul className="brand-feats">
              {brand.keyFeatures.map((f) => (
                <li key={f} className="brand-feat">{f}</li>
              ))}
            </ul>
            {brand.resources && brand.resources.length > 0 && (
              <p className="brand-why__resources">
                Straight from the manufacturer:{" "}
                {brand.resources.map((r, i) => (
                  <span key={r.href}>
                    {i > 0 && " · "}
                    <a href={r.href} target="_blank" rel="noopener noreferrer">{r.label} ↗</a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>
      )}

      {brand.benefitTiles && brand.benefitTiles.length > 0 && !brand.whyLead && (
        <section className="brand-why">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why {brand.name}</span>
              <h2>{brand.benefitsHeading ?? "What sets it apart."}</h2>
            </div>
            <BenefitTiles
              benefits={brand.benefitTiles.map((b, i) => ({
                area: b.t,
                icon: b.icon,
                tint: TILE_TINTS[i % TILE_TINTS.length],
                line: b.line,
                detail: b.detail,
              }))}
            />
            {brand.resources && brand.resources.length > 0 && (
              <p className="brand-why__resources">
                Straight from the manufacturer:{" "}
                {brand.resources.map((r, i) => (
                  <span key={r.href}>
                    {i > 0 && " · "}
                    <a href={r.href} target="_blank" rel="noopener noreferrer">{r.label} ↗</a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>
      )}

      {/* The key-feature list and the manufacturer-resources box used
          to be a two-column band here. Once the list became the tiles
          above, the band was 340px of navy holding one small box beside
          an empty column — the gap in the screenshot. Both now sit in
          "Why this brand", which is where they were always about. */}

      {/* HOW A HEAT PUMP WORKS — the schematic + 3-step explainer, on the
          hot-water brands (Reclaim, Thermann, iStore all map to the
          heat-pump advisor). A buyer weighing a heat pump usually wants to
          know what the thing actually does before the model list. */}
      {brand.advisorService === "heat-pump-installation" && (
        <HeatPumpDiagram brandName={brand.name} variant={brand.slug === "istore" ? "all-in-one" : "both"} />
      )}

      {/* WHAT THE STARS SAVE — gas ducted only (Brivis maps to the gas
          advisor). The star rating is the whole efficiency conversation, so
          the saving gets shown, not just stated. */}
      {brand.advisorService === "gas-plumbing" && <GasSavingsChart />}

      {/* Product range.
          Single-product brands (e.g. Zonemate — the Milieu zoning system is
          their only product) get the full product detail rendered inline
          instead of a compare grid holding one lonely card. Everyone else
          gets the grouped grid with per-card compare checkboxes. */}
      {brand.products.length === 1 ? (
        <section className="brand-range brand-range--single">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> The {brand.name} system</span>
              <h2>{brand.products[0].name}</h2>
              <p>{brand.products[0].bestFor}.</p>
            </div>

            <div className="brand-single">
              <div className="brand-single__pic">
                {(() => {
                  const ph = productPhoto(brand.products[0], brand);
                  return <SafeImg src={ph.src} fallback={ph.fallback} alt={ph.alt} width="800" height="600" loading="lazy" />;
                })()}
              </div>
              <div className="brand-single__body">
                <div className="brand-single__model">{brand.products[0].model}</div>
                {brand.products[0].capacity && (
                  <div className="brand-single__cap">{brand.products[0].capacity}</div>
                )}
                <p>{brand.products[0].ourTake}</p>
                <Link href={`/brands/${brand.slug}/${brand.products[0].slug}`} className="ds-btn ds-btn--orange">
                  Full spec sheet &amp; pricing →
                </Link>
              </div>
            </div>

            <ProductTabs
              specs={brand.products[0].specs}
              features={brand.products[0].features && brand.products[0].features.length > 0
                ? brand.products[0].features
                : (brand.keyFeatures ?? [])}
              whyWeInstall={brand.products[0].whyWeInstall && brand.products[0].whyWeInstall.length > 0
                ? brand.products[0].whyWeInstall
                : [brand.products[0].ourTake, brand.ourTake].filter(Boolean) as string[]}
              brandName={brand.name}
              brandWarranty={brand.warranty}
            />
          </div>
        </section>
      ) : (
        <section className={`brand-range${brand.systems ? " brand-range--shapes" : ""}`}>
          <div className="wrap">
            <div className="ds-section-head">
              <span className={`ds-eyebrow${brand.systems ? " ds-eyebrow--on-dark" : ""}`}>
                <span className={`ds-dot${brand.systems ? "" : " ds-dot--orange"}`} />{" "}
                {brand.systems ? "Choose your system" : "Full range we install"}
              </span>
              <h2 className={brand.systems ? "ds-h--on-dark" : undefined}>
                {brand.systemsHeading ?? `The ${brand.name} models we install and support.`}
              </h2>
              <p className={brand.systems ? "brand-range__lede" : undefined}>
                {brand.systemsLede ??
                  "Every model below is a product we've installed enough of to have an opinion on. Tap through for our take, spec sheet, installed price and what it's best for. Tick Compare on any 2-4 models to see them side by side."}
              </p>
              {brand.slug === "reclaim" && (
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Link href="/brands/reclaim/compare" className="ds-btn ds-btn--orange ds-btn--sm">
                    Open the full Reclaim comparison →
                  </Link>
                  <Link href="/brands/reclaim/models" className="ds-btn ds-btn--ghost ds-btn--sm">
                    Look up a model code →
                  </Link>
                </div>
              )}
            </div>

            <BrandCompare brand={brand} />
          </div>
        </section>
      )}

      {/* NARROW IT DOWN — the three-question advisor from the service pages,
          on the brand page too. Somebody handed a quote for this brand still
          has to work out which shape suits their house; this answers that
          without making them read all sixteen models. Only renders where the
          brand maps to a service that has an advisor configured. */}
      {brand.advisorService && ADVISORS[brand.advisorService] && (
        <section className="sysfit">
          <div className="wrap">
            <SystemAdvisor service={brand.advisorService} />
          </div>
        </section>
      )}

      {/* KEEPING IT WORKING — the half of a brand argument that only
          matters after the sale, and therefore the half worth putting on
          the page before it. */}
      {brand.servicing && (
        <section className="brand-serv">
          <div className="wrap brand-serv__grid">
            <figure className="brand-serv__shot">
              <img
                src={brand.servicing.photo}
                alt={brand.servicing.photoAlt}
                loading="lazy"
                width="900"
                height="900"
              />
            </figure>
            <div className="brand-serv__copy">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Keeping it working</span>
              <h2>{brand.servicing.heading}</h2>
              <p>{brand.servicing.body}</p>
              <ul className="brand-serv__facts">
                {brand.servicing.facts.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Our own install photography, when a brand has any wired up in
          brandGallery.ts. The manufacturer-render fallback that used to
          live here is gone — the live Instagram section below shows the
          actual work, which is what that fallback was apologising for. */}
      {installs.length > 0 && (
        <section className="brand-gallery">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot" /> On the tools</span>
              <h2>Our {brand.name} installs.</h2>
              <p>Real jobs we&rsquo;ve finished across Melbourne&rsquo;s south-east, photographed on site, on the day.</p>
            </div>
            <div className="brand-gallery__grid">
              {installs.map((g) => (
                <figure key={g.src} className="brand-gallery__cell">
                  <img src={g.src} alt={g.alt} loading="lazy" width="480" height="360" />
                  {g.caption && <figcaption>{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Live Instagram — posts whose caption mentions this brand. Real
          installs, self-maintaining: post it once, it lands here. */}
      <InstagramFeed
        posts={igPosts}
        eyebrow={`${brand.name} on the tools`}
        heading={`Our latest ${brand.name} jobs.`}
        blurb={`Straight from our Instagram, real ${brand.name} installs across Melbourne's south-east, posted as we finish them.`}
      />

      {/* HOW THE JOB RUNS — the numbered navy band, brand-specific. Full
          size, matching the filtration and service pages — the compact
          strip read as an afterthought next to them. */}
      {brand.steps && brand.steps.length > 0 && (
        <section className="process">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How the job runs</span>
              <h2 className="ds-h--on-dark">How we fit a {brand.name} system.</h2>
            </div>
            <ol className="steps">
              {brand.steps.map((st, i) => (
                <li key={st.title} className="step">
                  <span className="step__num">{i + 1}</span>
                  <h3>{st.title}</h3>
                  <p>{st.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Quote form + where we install this brand.
          Brand pages used to end on suburb chips and a banner, which meant
          the one page a buyer lands on from "Brivis installer Pakenham"
          had no form on it. Same two-column shape as the service pages. */}
      <section className="dp-quote quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange">
                  <span className="ds-dot ds-dot--on-orange" /> Free quote
                </span>
                <h2>Quote for a {brand.name} system.</h2>
                <p className="quotesec__lede">
                  60 seconds, no obligation, replied within 2 business hours — with the model,
                  the installed price and any rebate you qualify for, in writing.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> Same person quotes as installs</li>
                  <li><span className="tick tick--on-orange">✓</span> Rebates applied and GST included</li>
                  <li><span className="tick tick--on-orange">✓</span> We&rsquo;ll say if another brand suits you better</li>
                </ul>
                <div className="quotesec__chips">
                  {INSTALLER_SUBURB_SLUGS
                    .map((slug) => publishedSuburbs.find((sb) => sb.slug === slug))
                    .filter((sb): sb is NonNullable<typeof sb> => Boolean(sb))
                    .map((sb) => (
                      // Was /brands/x/installers/suburb, pruned in WEB-008.
                      // The chip points at the suburb hub now.
                      <Link key={sb.slug} href={`/areas/${sb.slug}`}>
                        {sb.name}
                      </Link>
                    ))}
                </div>
              </div>
              <QuoteForm />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — one open at a time, same <details name> trick as the rest
          of the site, and the answers get FAQPage schema. */}
      {brand.faqs && brand.faqs.length > 0 && (
        <section className="brand-faq faq">
          <div className="wrap faq__grid">
            <div className="faq__left">
              <span className="ds-eyebrow"><span className="ds-dot" /> {brand.name} questions</span>
              <h2>Straight answers.</h2>
              <p>
                If your question isn&rsquo;t here,{" "}
                <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>
                  call {site.phone}
                </a>
                .
              </p>
            </div>
            <div className="faq__right">
              {brand.faqs.map((f, i) => (
                <details key={f.q} name="faq" open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <ReviewMarquee heading="Reviews from households across the south-east." />

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Get a fixed {brand.name} quote.</h2>
            <p>Free, no-obligation, replied within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id={`ld-crumbs-${brand.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {brand.faqs && brand.faqs.length > 0 && (
        <Script
          id={`ld-faq-${brand.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(brand.faqs)) }}
        />
      )}
    </div>
  );
}
