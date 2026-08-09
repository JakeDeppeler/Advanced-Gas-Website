import Link from "next/link";
import { getReviews } from "@/lib/googleReviews";
import { site } from "@/lib/site";

/**
 * Compact social-proof row for detail pages (brands, services).
 *
 * The full ReviewsBlock is a page in its own right — score panel, twelve
 * cards, schema. That's right for /reviews and too heavy everywhere else,
 * which is why brand and service pages ended up with no proof at all.
 * This is the short version: a score, three reviews, a way through to the
 * rest.
 *
 * Deliberately no schema.org markup — AggregateRating belongs on the
 * pages that are actually about the business, and repeating it on every
 * brand page reads as inflation to Google, not enthusiasm.
 */
export async function ProofStrip({
  eyebrow = "What locals say",
  heading = "Rated 4.9 by households across the south-east.",
  subject,
}: {
  eyebrow?: string;
  heading?: string;
  /** e.g. "Mitsubishi Electric" — narrows the blurb to the thing on the page. */
  subject?: string;
}) {
  const { reviews, summary, source } = await getReviews(3);
  if (reviews.length === 0) return null;

  return (
    <section className="proof">
      <div className="wrap">
        <div className="proof__head">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> {eyebrow}</span>
            <h2>{heading}</h2>
            <p>
              {subject
                ? `The same crew, the same standard — whether it's a ${subject} job or anything else we quote.`
                : "Every review below came from a real job across Pakenham, Berwick, Officer and Cranbourne."}
            </p>
          </div>
          <div className="proof__score">
            <strong>{summary.value.toFixed(1)}</strong>
            <span className="proof__stars" aria-hidden="true">★★★★★</span>
            <span className="proof__count">
              {summary.verifiedCount ? `from ${summary.count}+ Google reviews` : "on Google"}
            </span>
          </div>
        </div>

        <div className="proof__grid">
          {reviews.map((r) => (
            <article key={`${r.who}-${r.title}`} className="proof__card">
              <div className="proof__card-stars" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
              </div>
              <h3>{r.title}</h3>
              <p>{r.txt}</p>
              <div className="proof__by">
                <span className="proof__avatar" aria-hidden="true">{r.a}</span>
                <span className="proof__who">
                  <strong>{r.who}</strong>
                  <em>{r.what}</em>
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="proof__foot">
          <Link href="/reviews" className="ds-btn ds-btn--ghost ds-btn--sm">
            Read every review →
          </Link>
          {/* Places API terms: attribute Google wherever their copy shows. */}
          {source !== "curated" && <span className="proof__attrib">Reviews sourced from Google</span>}
          {site.social.google && (
            <a
              href={site.social.google}
              target="_blank"
              rel="noopener noreferrer"
              className="proof__glink"
            >
              See the profile on Google ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
