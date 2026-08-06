import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { brands } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import "../detail.css";
import "./[brand]/brand.css";

export const metadata: Metadata = {
  title: "Brands We Install — Mitsubishi Electric, Reclaim, Thermann, iStore, Kaden, Zonemate",
  description:
    "Every brand and model we install across Melbourne's south-east. Mitsubishi Electric splits and ducted, Reclaim CO₂ heat pumps, Thermann range, iStore, Kaden, Zonemate zoning. Installed prices from Advanced Gas & Aircon.",
  alternates: { canonical: "/brands" },
};

export default function BrandsIndex() {
  return (
    <div className="page-detail page-brand">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Brands</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Brands we install</div>
          <h1>
            Six brands, <span className="accent">68 models</span> — every one we install, honestly reviewed.
          </h1>
          <p className="dp-hero__sub">
            We install what works, not what we&rsquo;re paid to install. Every brand below is one
            we&rsquo;ve put into enough Melbourne homes to have a real opinion on. Tap a brand
            for the full range and our take on each individual model.
          </p>
        </div>
      </section>

      <section className="brand-range">
        <div className="wrap">
          <div className="brand-hub__grid">
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={`/brands/${b.slug}`}
                className="brand-hub-card"
                style={{ ["--card-accent" as string]: b.accent }}
              >
                <div className="brand-hub-card__photo">
                  <SafeImg src={b.photo} fallback={b.photoFallback} alt={b.photoAlt} loading="lazy" width="640" height="400" />
                </div>
                <div className="brand-hub-card__inner">
                  <div className="brand-hub-card__head">
                    <h2>{b.name}</h2>
                    <span>{b.origin}</span>
                  </div>
                  <p className="brand-hub-card__tagline">{b.tagline}</p>
                  <p className="brand-hub-card__intro">{b.intro}</p>
                  <div className="brand-hub-card__foot">
                    <span className="brand-hub-card__count">{b.products.length} models</span>
                    <span className="brand-hub-card__cta">View range →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Not sure which brand suits your job?</h2>
            <p>Give us the room, the household, and the budget — we&rsquo;ll quote three real options.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get honest advice →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
