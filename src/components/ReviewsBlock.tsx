import Script from "next/script";
import { REVIEWS, RATING_SUMMARY } from "@/lib/reviews";
import { site } from "@/lib/site";

/**
 * Reviews section + AggregateRating structured data.
 *
 * The structured data is the point: it's what puts the ⭐4.9 star rating
 * under our result in Google. Emitting it requires the rating to be
 * visible on the same page, which the summary strip below satisfies.
 *
 * `limit` trims the card count for in-page use; the /reviews page passes
 * nothing and gets the lot.
 */
export function ReviewsBlock({
  limit,
  heading = "What locals actually say.",
  eyebrow = "Reviews",
  showSchema = true,
}: {
  limit?: number;
  heading?: string;
  eyebrow?: string;
  showSchema?: boolean;
}) {
  const list = typeof limit === "number" ? REVIEWS.slice(0, limit) : REVIEWS;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    url: site.url,
    telephone: site.phone,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: RATING_SUMMARY.value,
      reviewCount: RATING_SUMMARY.count,
      bestRating: RATING_SUMMARY.best,
    },
    review: list.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: { "@type": "Person", name: r.who },
      name: r.title,
      reviewBody: r.txt,
    })),
  };

  return (
    <section className="rvs">
      <div className="wrap">
        <div className="ds-section-head ds-section-head--center">
          <span className="ds-eyebrow"><span className="ds-dot" /> {eyebrow}</span>
          <h2>{heading}</h2>
        </div>

        {/* Rating summary — also satisfies Google's "the rating must be
            visible on the page" requirement for the schema below. */}
        <div className="rvs__summary">
          <div className="rvs__score">
            <strong>{RATING_SUMMARY.value.toFixed(1)}</strong>
            <span className="rvs__stars" aria-hidden="true">★★★★★</span>
            <span className="rvs__count">
              from {RATING_SUMMARY.count}+ Google reviews
            </span>
          </div>
          {site.social.google && (
            <a
              href={site.social.google}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn--ghost ds-btn--sm"
            >
              Read them all on Google →
            </a>
          )}
        </div>

        <div className="rvs__grid">
          {list.map((r) => (
            <article key={r.title} className="rvs__card">
              <div className="rvs__card-stars" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
                <span className="rvs__card-stars-dim">{"★".repeat(5 - r.rating)}</span>
              </div>
              <h3>{r.title}</h3>
              <p>{r.txt}</p>
              <div className="rvs__by">
                <span className="rvs__avatar" aria-hidden="true">{r.a}</span>
                <span className="rvs__who">
                  <strong>{r.who}</strong>
                  <em>{r.what}</em>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showSchema && (
        <Script
          id="ld-reviews"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </section>
  );
}
