import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { RATING_SUMMARY } from "@/lib/reviews";
import { getReviews } from "@/lib/googleReviews";
import { ReviewsBlock } from "@/components/ReviewsBlock";
import { breadcrumbSchema } from "@/lib/schema";
import "../detail.css";
import "./reviews.css";

export const metadata: Metadata = {
  title: `Reviews · ${RATING_SUMMARY.value}/5 from ${RATING_SUMMARY.count}+ Locals | Advanced Gas & Aircon`,
  description:
    `What customers across Pakenham, Berwick, Officer and Cranbourne say about our heat pump, aircon and gas heating installs. ${RATING_SUMMARY.value}/5 from ${RATING_SUMMARY.count}+ Google reviews.`,
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  // Live summary for the hero. getReviews is fetch-memoised within a
  // render pass, so calling it here and inside ReviewsBlock is one request.
  const { summary } = await getReviews();

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Reviews", url: `${site.url}/reviews` },
  ]);

  return (
    <div className="page-detail page-reviews">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Reviews</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {summary.value.toFixed(1)}/5 from {summary.count}+ locals
          </div>
          <h1>
            What our <span className="accent">customers</span> say.
          </h1>
          <p className="dp-hero__sub">
            Every review below is from a real job across Melbourne&rsquo;s south-east. No paid
            placements, no filtered feedback &mdash; if a job goes wrong we&rsquo;d rather fix it
            than bury the review.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      <ReviewsBlock heading="Every review, in full." eyebrow="The full list" />

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Want the same experience?</h2>
            <p>Free, no-obligation quote back within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id="ld-crumbs-reviews" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
