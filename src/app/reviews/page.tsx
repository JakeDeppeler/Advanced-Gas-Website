import type { Metadata } from "next";
import { site } from "@/lib/site";
import { RATING_SUMMARY } from "@/lib/reviews";
import { getReviews } from "@/lib/googleReviews";
import { breadcrumbSchema } from "@/lib/schema";
import { Head, Next } from "@/components/homepage/page/kit";
import { PageHero } from "@/components/homepage/page/PageHero";
import { SiteModeStrip } from "@/components/Header";
import { PHOTO } from "@/lib/homepage/data";
import { EndCta } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: `Reviews, ${RATING_SUMMARY.value.toFixed(1)}/5 from ${RATING_SUMMARY.count} Google reviews`,
  description:
    `What customers say about our heat pump, aircon and gas heating installs. ${RATING_SUMMARY.value.toFixed(1)}/5 from ${RATING_SUMMARY.count} Google reviews.`,
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  // Live from Google where the API is configured, the curated set otherwise.
  const { reviews, summary } = await getReviews(60);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Reviews", url: `${site.url}/reviews` },
  ]);

  return (
    // The homepage's top (PageHero), behind it a finished job of ours: a
    // Reclaim heat pump beside two Mitsubishi outdoor units.
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <>
    <SiteModeStrip tabs={false} />
    <div className="ag ag--flat" data-no-reveal>
      <PageHero
        crumbs={[{ name: "Reviews" }]}
        eye={`${summary.value.toFixed(1)} / 5 on Google`}
        title="What our {customers} say."
        // We publish our 4- and 5-star Google reviews (MIN_PUBLISHED_RATING in
        // lib/reviews.ts), so this can't claim "every review" or "no filtered
        // feedback". Google has the lot, and the link to it is the honest version.
        sub={<>Every review here is a real Google review from a real job, copied word for word. We show our 4- and 5-star reviews on this page; all of them, whatever the rating, are <a href={site.social.google} target="_blank" rel="noopener noreferrer">on Google</a>.</>}
        photo={PHOTO.heatPumpInstall} pos="center 55%" from="reviews-hero"
        rating={{ value: summary.value.toFixed(1), label: summary.verifiedCount ? `From ${summary.count} Google reviews` : "Google reviews" }}
        trust={[]}
      />

      <section className="pxs">
        <div className="wrap pp__col">
          <Head eye="A selection from Google" h="In their words." />
          <div className="pp__revs">
            {reviews.map((r) => (
              <article key={r.who + r.title} className="rev">
                <span className="stars stars--ink" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}</span>
                <h3>{r.title}</h3>
                <p>&ldquo;{r.txt}&rdquo;</p>
                <div className="rev__who">
                  <span aria-hidden="true">{r.a}</span>
                  <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                </div>
              </article>
            ))}
          </div>
          <p><a href={site.social.google} target="_blank" rel="noopener noreferrer">Read all {summary.count} reviews on Google →</a></p>
        </div>
      </section>

      <section className="pxs pxs--sky">
        <div className="wrap pp__col">
          <Head eye="Where next" h="See the work behind them." />
          <Next items={[
            { t: "Work we've done", s: "Real installs, before and after", href: "/gallery" },
            { t: "Who we are", s: "The team and how we work", href: "/about" },
            { t: "Find your system", s: "Options, and how each one works", href: "/#find" },
          ]} />
        </div>
      </section>

      {/* The homepage's closing box rather than a full-width orange band: every inside page ends on it. */}
      <EndCta title={<>Want the same <span>experience</span>?</>} text="A callback within 12 business hours, then a free site check and a written price." />
      <JsonLd data={crumbs} />
    </div>
    </>
  );
}
