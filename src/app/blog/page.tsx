import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { blogPosts, blogCategories } from "@/lib/blogPosts";
import { NewsletterForm } from "@/components/NewsletterForm";
import "./blog.css";

export const metadata: Metadata = {
  title: "Guides & Articles — VEU rebates, heat pumps & aircon",
  description:
    "Plain-English guides on VEU rebates, heat pump sizing, aircon selection, gas safety and saving on energy bills. Written by Pakenham tradies, not marketers.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="page-blog">
      <section className="bl-hero">
        <div className="wrap">
          <span className="ds-eyebrow"><span className="ds-dot" /> Guides &amp; articles</span>
          <h1>Plain-English answers, <em>written by tradies.</em></h1>
          <p>Real questions we get on jobs, written up properly. No fluff, no SEO slop — actual answers from people who&apos;ve fitted the unit on your neighbour&apos;s roof.</p>
          <div className="bl-cats">
            {blogCategories.map((c, i) => (
              <span key={c} className={`bl-cat${i === 0 ? " is-active" : ""}`}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-feat">
        <div className="wrap">
          <Link href={`/blog/${featured.slug}`} className="bl-feat__card">
            <div
              className="bl-feat__photo"
              role="img"
              aria-label={featured.photoAlt}
              style={{ backgroundImage: `url(${featured.photo})` }}
            />
            <div className="bl-feat__copy">
              <span className="bl-feat__tag">Featured · {featured.category}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <span className="bl-feat__meta">{featured.readingMinutes} min read · {featured.date} · By the team</span>
              <span className="bl-feat__cta">Read the guide →</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="bl-grid-wrap">
        <div className="wrap">
          <div className="bl-grid">
            {rest.map((p, i) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className={`bl-card${i % 2 === 1 ? " bl-card--alt" : ""}`}
              >
                <div
                  className="bl-card__photo"
                  role="img"
                  aria-label={p.photoAlt}
                  style={{ backgroundImage: `url(${p.photo})` }}
                >
                  <span className="bl-card__photo-tag">{p.category}</span>
                </div>
                <div className="bl-card__body">
                  <span className="bl-card__meta">{p.readingMinutes} min · {p.date}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <div className="bl-card__foot">
                    <span className="bl-card__read">Read article →</span>
                    <span>{p.categoryShort}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-news">
        <div className="wrap bl-news__grid">
          <div>
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Get the heads-up</span>
            <h2>Be the first to know when the VEU rules change.</h2>
            <p>The government tweaks rebate values every year. We send a short email when it happens — plus seasonal tips for keeping your gear running.</p>
            <p style={{ marginTop: 0, fontSize: 13, color: "#fff" }}>
              One email a month, max. Local stuff only. Unsubscribe anytime.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready when you are.</h2>
            <p>Free quote with the rebate already applied. Usually back within 2 hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
