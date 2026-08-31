import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { GALLERY, GALLERY_CATEGORY_LABELS, BEFORE_AFTER, type GalleryCategory } from "@/lib/gallery";
import { BeforeAfter } from "@/components/BeforeAfter";
import { InstagramCTA } from "@/components/InstagramCTA";
import { InstagramFeed } from "@/components/InstagramFeed";
import { getInstagramFeed } from "@/lib/instagram";
import { breadcrumbSchema } from "@/lib/schema";
import { ALBUMS } from "@/lib/albums";
import { AlbumGrid } from "@/components/AlbumGrid";
import { brands as allBrands } from "@/lib/brands";
import "../detail.css";
import "./gallery.css";

export const metadata: Metadata = {
  title: "Install Gallery, Real Jobs Round Here",
  description:
    "Real photos from our installs: heat pumps, split and ducted aircon, gas ducted heating and evap, across Pakenham, Berwick, Officer and Cranbourne.",
  alternates: { canonical: "/gallery" },
};

const CATEGORY_ORDER: GalleryCategory[] = ["heat-pump", "aircon", "ducted", "gas", "evap", "team"];

export default async function GalleryPage() {
  // Whole feed — see lib/instagram.ts. Empty when unconfigured.
  const igPosts = await getInstagramFeed(24);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Gallery", url: `${site.url}/gallery` },
  ]);

  const grouped = CATEGORY_ORDER
    .map((c) => ({ category: c, shots: GALLERY.filter((g) => g.category === c) }))
    .filter((g) => g.shots.length > 0);

  return (
    <div className="page-detail page-gallery">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Gallery</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> Our work, not catalogue shots
          </div>
          <h1>
            Real installs across <span className="accent">Melbourne&rsquo;s south-east</span>.
          </h1>
          <p className="dp-hero__sub">
            Every photo below is one of our own jobs, shot on site, on the day. Product
            photography elsewhere on the site is manufacturer imagery so you can see exactly which
            unit we&rsquo;re quoting; this page is the actual work.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* ---- Job albums: our own photos and videos, click-through ---- */}
      {ALBUMS.length > 0 && (
        <section className="gal-albums">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Job albums</span>
              <h2>Click any job to walk through it.</h2>
              <p>
                Whole jobs rather than single shots, photos and video together.
                Filter by brand, then click through at your own pace.
              </p>
            </div>
            <AlbumGrid
              albums={ALBUMS}
              brandLabels={Object.fromEntries(allBrands.map((b) => [b.slug, b.name]))}
            />
          </div>
        </section>
      )}

      {/* ---- Before / after swipe comparisons ---- */}
      {BEFORE_AFTER.length > 0 && (
        <section className="gal-ba">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Before &amp; after</span>
              <h2>Drag the handle. Same house, same corner.</h2>
              <p>
                The clearest way to show what a changeover actually looks like when it&rsquo;s
                finished properly: new pad, re-run pipework, nothing left hanging.
              </p>
            </div>

            <div className="gal-ba__list">
              {BEFORE_AFTER.map((ba) => (
                <article key={ba.slug} className="gal-ba__item">
                  <div className="gal-ba__media">
                    <BeforeAfter before={ba.before} after={ba.after} ratio="3 / 4" />
                  </div>
                  <div className="gal-ba__copy">
                    <h3>{ba.title}</h3>
                    <p>{ba.blurb}</p>
                    {ba.meta && (
                      <ul className="gal-ba__meta">
                        {ba.meta.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    )}
                    <Link href="/tools/hot-water-savings" className="ds-btn ds-btn--ghost ds-btn--sm">
                      Work out your own savings →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- Categorised install shots ---- */}
      <section className="gal-grid-wrap">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> On the tools</span>
            <h2>Jobs we&rsquo;ve finished.</h2>
          </div>

          {grouped.map((g) => (
            <div key={g.category} className="gal-group">
              <h3 className="gal-group__title">
                <span>{GALLERY_CATEGORY_LABELS[g.category]}</span>
                <span className="gal-group__count">{g.shots.length}</span>
              </h3>
              <div className="gal-grid">
                {g.shots.map((s) => (
                  <figure key={s.src} className="gal-cell">
                    <img src={s.src} alt={s.alt} loading="lazy" width="600" height="450" />
                    <figcaption>
                      {s.caption}
                      {s.suburb && <span className="gal-cell__suburb">{s.suburb}</span>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}

          <InstagramCTA
            heading="The full gallery lives on Instagram"
            body="We post every job as it's finished. Splits, ducted, heat pumps and gas heaters going into real houses across the south-east."
          />
        </div>
      </section>

      <InstagramFeed
        posts={igPosts}
        eyebrow="Live feed"
        heading="Everything we've finished lately."
        blurb="Pulled straight from our Instagram, so it's current, not a gallery someone forgot to update two years ago."
      />

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Want yours to look like this?</h2>
            <p>Free, no-obligation quote back within 12 business hours. VEU rebate already applied.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get my fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id="ld-crumbs-gallery" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
