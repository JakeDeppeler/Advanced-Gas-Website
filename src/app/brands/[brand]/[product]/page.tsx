import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { allBrandProductPairs, findProduct, findBrand, productPhoto } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import { breadcrumbSchema } from "@/lib/schema";
import "../../../detail.css";
import "../brand.css";

export function generateStaticParams() {
  return allBrandProductPairs();
}

export function generateMetadata({
  params,
}: {
  params: { brand: string; product: string };
}): Metadata {
  const found = findProduct(params.brand, params.product);
  if (!found) return {};
  const { brand, product } = found;
  const title = `${product.name} · Installed Melbourne | ${brand.name} | Advanced Gas & Aircon`;
  const description = `${product.name} (${product.model}) installed across Melbourne's south-east. ${product.bestFor}. ${product.veuEligible ? "VEU rebate eligible." : ""} Fixed-price quote, 6-year workmanship warranty.`;
  return {
    title,
    description,
    alternates: { canonical: `/brands/${brand.slug}/${product.slug}` },
  };
}

export default function ProductPage({
  params,
}: {
  params: { brand: string; product: string };
}) {
  const found = findProduct(params.brand, params.product);
  if (!found) notFound();
  const { brand, product } = found;

  const relatedProducts =
    product.related
      ?.map((slug) => {
        // First check this brand, then check all brands (cross-brand related)
        const inBrand = brand.products.find((p) => p.slug === slug);
        if (inBrand) return { brand, product: inBrand };
        for (const b of [findBrand("mitsubishi-electric"), findBrand("reclaim"), findBrand("thermann"), findBrand("istore"), findBrand("kaden"), findBrand("zonemate")]) {
          if (!b) continue;
          const found = b.products.find((p) => p.slug === slug);
          if (found) return { brand: b, product: found };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x)) ?? [];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Brands", url: `${site.url}/brands` },
    { name: brand.name, url: `${site.url}/brands/${brand.slug}` },
    { name: product.name, url: `${site.url}/brands/${brand.slug}/${product.slug}` },
  ]);

  return (
    <div className="page-detail page-product">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <Link href={`/brands/${brand.slug}`}>{brand.name}</Link>
            <span className="sep">/</span>
            <span className="cur">{product.model}</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {brand.name} · {product.categoryLabel}
          </div>
          <h1>{product.name}</h1>
          <p className="dp-hero__sub">
            <strong>Best for:</strong> {product.bestFor}. Installed across Melbourne&rsquo;s south-east, {product.veuEligible ? "VEU rebate eligible where the property qualifies, " : ""}fixed-price quote inside 2 business hours.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Product photo + at-a-glance strip · balanced 1:1 grid so the
          photo card and the spec column are the same height. */}
      <section className="product-hero">
        <div className="wrap product-hero__grid">
          <div className="product-hero__pic">
            {product.veuEligible && (
              <span className="brand-card__pill--rebate brand-card__pill--overlay">VEU rebate eligible</span>
            )}
            {(() => { const ph = productPhoto(product, brand); return <SafeImg src={ph.src} fallback={ph.fallback} alt={ph.alt} width="800" height="600" loading="eager" />; })()}
          </div>
          <div className="product-hero__spec">
            <div className="product-hero__spec-inner">
              <div className="product-hero__spec-row">
                <div className="dp-local__lbl">Model</div>
                <p><strong>{product.model}</strong></p>
              </div>
              {product.capacity && (
                <div className="product-hero__spec-row">
                  <div className="dp-local__lbl">Capacity</div>
                  <p>{product.capacity}</p>
                </div>
              )}
              <div className="product-hero__spec-row">
                <div className="dp-local__lbl">Installed price</div>
                <p>
                  {product.installedPriceFrom
                    ? <strong>{product.installedPriceFrom}</strong>
                    : <><strong>Message for quote</strong><br /><span style={{ fontSize: 13, color: "var(--ink-3)" }}>Fixed price within 2 business hours.</span></>
                  }
                </p>
              </div>
              <div className="product-hero__spec-row">
                <div className="dp-local__lbl">VEU rebate</div>
                <p>{product.veuEligible ? "Eligible · we handle the paperwork." : "Not applicable to this unit."}</p>
              </div>
              <div className="product-hero__spec-cta">
                <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose · info-panel strip breaking the page into scannable
          chunks that answer the questions a real buyer has. */}
      <section className="product-why">
        <div className="wrap">
          <div className="product-why__grid">
            <div className="product-why__cell">
              <div className="product-why__lbl">Best for</div>
              <p>{product.bestFor}</p>
            </div>
            <div className="product-why__cell">
              <div className="product-why__lbl">Category</div>
              <p>{product.categoryLabel}</p>
            </div>
            {product.refrigerant && (
              <div className="product-why__cell">
                <div className="product-why__lbl">Refrigerant</div>
                <p>{product.refrigerant}</p>
              </div>
            )}
            {product.starRating && (
              <div className="product-why__cell">
                <div className="product-why__lbl">Star rating</div>
                <p>{product.starRating}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Our take + full specs · main body */}
      <section className="product-body">
        <div className="wrap product-body__grid">
          <div className="product-body__take">
            <span className="ds-eyebrow"><span className="ds-dot" /> Our take</span>
            <h2>Why we install the {product.name}.</h2>
            <p>{product.ourTake}</p>

            {/* Why choose this brand · leverages the brand-level context so
                the product page doesn't just talk about the unit in isolation. */}
            {brand.ourTake && (
              <>
                <h3 className="product-body__section-lbl">Why choose {brand.name}</h3>
                <p>{brand.ourTake}</p>
              </>
            )}

            {/* Key features from the brand — pulls the checklist that
                already exists on the brand hub so the product page reads
                as brand-informed, not brand-agnostic. */}
            {brand.keyFeatures && brand.keyFeatures.length > 0 && (
              <>
                <h3 className="product-body__section-lbl">What sets {brand.name} apart</h3>
                <ul className="product-body__feats">
                  {brand.keyFeatures.slice(0, 5).map((f) => <li key={f}>{f}</li>)}
                </ul>
              </>
            )}

            {/* Brand history + parts pipeline · the "will this be
                supported in 10 years" question a buyer actually cares
                about. Populated from brand.established + brand.support. */}
            {(brand.established || brand.support) && (
              <>
                <h3 className="product-body__section-lbl">Brand history &amp; parts support</h3>
                {brand.established && <p><strong>Established:</strong> {brand.established}</p>}
                {brand.support && <p>{brand.support}</p>}
              </>
            )}

            {relatedProducts.length > 0 && (
              <>
                <h3 className="product-body__related-lbl">Related models</h3>
                <div className="product-body__related">
                  {relatedProducts.map(({ brand: b, product: p }) => (
                    <Link key={`${b.slug}-${p.slug}`} href={`/brands/${b.slug}/${p.slug}`} className="product-body__related-card">
                      <span className="product-body__related-brand">{b.name}</span>
                      <span className="product-body__related-name">{p.name}</span>
                      {p.capacity && <span className="product-body__related-cap">{p.capacity}</span>}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="product-body__specs">
            <h3>Full specification</h3>
            <dl>
              {product.specs.map((s) => (
                <div key={s.label} className="product-body__specrow">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
            {brand.warranty && (
              <div className="product-body__warranty">
                <div className="dp-local__lbl">Brand warranty</div>
                <p>{brand.warranty}</p>
              </div>
            )}
            <Link href={`/brands/${brand.slug}`} className="product-body__brandlink">
              ← See full {brand.name} range
            </Link>
          </aside>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Fixed {product.name} quote.</h2>
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

      <Script id={`ld-crumbs-${brand.slug}-${product.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
