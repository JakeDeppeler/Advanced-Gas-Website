import Script from "next/script";
import { getReviews } from "@/lib/googleReviews";
import { site } from "@/lib/site";

/**
 * Reviews section + AggregateRating structured data.
 *
 * Async server component — pulls live reviews from the Google Places API
 * (see lib/googleReviews.ts) at build/revalidate time, so the markup and
 * the schema are both server-rendered. Falls back to the curated list if
 * the API isn't configured or errors.
 *
 * The structured data is the point: it's what makes ⭐4.9 eligible to
 * show under our result in Google. Google requires the rating to be
 * visible on the same page, which the summary strip satisfies.
 */
export async function ReviewsBlock({
  limit = 12,
  heading = "What locals actually say.",
  eyebrow = "Reviews",
  showSchema = true,
}: {
  limit?: number;
  heading?: string;
  eyebrow?: string;
  showSchema?: boolean;
}) {
  const { reviews, summary, source } = await getReviews(limit);

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    url: site.url,
    telephone: site.phone,
    // reviewCount only when it's Google's own total. Marking up an
    // estimated count is exactly the kind of thing that costs a domain
    // its rich-result eligibility.
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: summary.value,
      bestRating: summary.best,
      ...(summary.verifiedCount ? { reviewCount: summary.count } : {}),
    },
    review: reviews.slice(0, 5).map((r) => ({
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
        <div className="ds-section-head ds-section-head--center ds-section-head--hl">
          <span className="ds-eyebrow"><span className="ds-dot" /> {eyebrow}</span>
          <h2>{heading}</h2>
        </div>

        {/* Rating summary — also satisfies Google's "the rating must be
            visible on the page" requirement for the schema below. */}
        <div className="rvs__summary">
          <div className="rvs__score">
            <strong>{summary.value.toFixed(1)}</strong>
            <span className="rvs__stars" aria-hidden="true">★★★★★</span>
            <span className="rvs__count">
              {summary.verifiedCount ? `from ${summary.count}+ Google reviews` : "on Google"}
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
          {reviews.map((r) => (
            <article key={`${r.who}-${r.title}`} className="rvs__card">
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

        {/* Google's Places API terms require attribution wherever their
            review content is displayed. */}
        {source !== "curated" && (
          <p className="rvs__attrib">Reviews sourced from Google</p>
        )}
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
