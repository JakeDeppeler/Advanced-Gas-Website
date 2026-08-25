import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { serviceContent } from "@/lib/serviceContent";
import { systemDetail } from "@/lib/systemDetail";
import { QuoteForm } from "@/components/QuoteForm";
import { BenefitTiles } from "@/components/BenefitTiles";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import { resolveAsset, hasAsset } from "@/lib/publicAsset";
import "./hire.css";

/**
 * Temporary hot water hire, on its own route.
 *
 * A static segment beats the /services/[slug]/[system] catch-all, so the
 * URL doesn't move and every existing link still lands here — it just
 * gets the page the filtration pages got rather than the generic system
 * template it shared with nine other pages.
 *
 * Every number on this page comes from serviceContent and systemDetail
 * rather than being retyped, because $30 a day and the $350 set-up
 * already appear in the nav, the service page and the upgrade-or-repair
 * page, and four copies of a price is three too many.
 */

const SERVICE = "gas-plumbing";
const SYSTEM = "temporary-hot-water";
const HERO_PHOTO = "/gas-hot-water-changeover.webp";

const sys = serviceContent[SERVICE]?.systems?.find((x) => x.id === SYSTEM);
const detail = systemDetail(SERVICE, SYSTEM);

export const metadata: Metadata = {
  title: absoluteTitle("Temporary Hot Water Hire | $30/day | Advanced Gas & Aircon"),
  description: metaDescription(
    "Temporary hot water unit connected the same day while you choose a replacement. $30 a day, $350 set-up waived if we do the job. Pakenham, Officer, Berwick and the south-east.",
  ),
  keywords: [
    "temporary hot water hire",
    "hot water unit hire melbourne",
    "emergency hot water rental",
    "no hot water pakenham",
    "temporary hot water rental victoria",
  ],
  alternates: { canonical: `/services/${SERVICE}/${SYSTEM}` },
};

/** When you'd actually want one. Drawn from the bestFor list on the
 *  service entry, given a tile each so it reads as scenarios rather
 *  than a bulleted case. */
const WHEN = [
  {
    area: "It failed today",
    icon: "tank",
    tint: "#0B1450",
    line: "And you're being asked to spend thousands by tonight",
    detail:
      "A dead tank turns a three or four thousand dollar decision into an ultimatum, with cold showers as the deadline. That is the worst possible way to buy a hot water system, and it is exactly how people end up with the wrong one.",
  },
  {
    area: "Kids and shift work",
    icon: "shower",
    tint: "#00699A",
    line: "Households that genuinely cannot go a day without",
    detail:
      "Some houses can camp for a couple of nights and some cannot. If yours has small children in it, or somebody coming off a night shift needing a shower at seven in the morning, going without is not really on the table.",
  },
  {
    area: "Waiting on the right unit",
    icon: "flow",
    tint: "#2E7D6B",
    line: "Or on a rebate approval to come through",
    detail:
      "The system that actually suits your house might not be on anybody's truck this week, and a VEU approval takes as long as it takes. This is the difference between waiting for the right one and taking the available one.",
  },
  {
    area: "Rentals",
    icon: "valve",
    tint: "#C2540F",
    line: "The minimum standards don't pause while you decide",
    detail:
      "Hot water at a tenanted property is not optional and the clock does not stop for a supply delay. A temporary unit keeps water running while the permanent replacement is arranged — book both, because this buys time rather than solving it.",
  },
  {
    area: "Comparing properly",
    icon: "kettle",
    tint: "#5A5F7A",
    line: "Three real quotes, read at a normal pace",
    detail:
      "Heat pump against gas, what the rebate is worth on each, what your roof and your household actually suit. That is a comparison nobody makes standing in a cold bathroom, and it is the one that decides the next ten years.",
  },
];

export default function TemporaryHotWaterPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: "Gas & plumbing", url: `${site.url}/services/${SERVICE}` },
    { name: "Temporary hot water hire", url: `${site.url}/services/${SERVICE}/${SYSTEM}` },
  ]);

  const faqs = sys?.faqs ?? [];
  const steps = detail?.spotlight?.items ?? [];

  return (
    <div className="page-hire">
      <Script id="hire-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
      <Script id="hire-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      {/* HEADER — the photo, full bleed, with the numbers along the bottom. */}
      <section
        className={`hire-hero${hasAsset(HERO_PHOTO) ? " hire-hero--shot" : ""}`}
        style={
          hasAsset(HERO_PHOTO)
            ? {
                backgroundImage:
                  `linear-gradient(180deg, rgba(9,17,52,0.45) 0%, rgba(9,17,52,0.12) 38%, rgba(9,17,52,0.72) 100%), ` +
                  `linear-gradient(100deg, rgba(9,17,52,0.95) 0%, rgba(9,17,52,0.90) 30%, rgba(9,17,52,0.36) 52%, rgba(9,17,52,0.08) 76%), ` +
                  `url("${resolveAsset(HERO_PHOTO)}")`,
              }
            : undefined
        }
      >
        <div className="wrap">
          <div className="hire-hero__copy">
            <nav className="hire-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/services">Services</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/services/${SERVICE}`}>Gas &amp; plumbing</Link>
              <span aria-hidden="true">/</span>
              <span>Temporary hot water</span>
            </nav>
            <div className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot" />
              Hot water hire · connected the same day in most cases
            </div>
            <h1>Hot water tonight, and the decision can wait.</h1>
            <p className="hire-hero__sub">
              A temporary unit plumbed into the existing hot water line, so every outlet in the
              house works normally while you choose the replacement properly.
            </p>
            <p className="hire-hero__where">
              <strong>Where it goes:</strong> beside the failed unit, on the line the old one was on
            </p>
            <div className="pg-ctas">
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--orange ds-btn--lg">
                Call {site.phone}
              </a>
              <Link href="#quote" className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                Or send the details
              </Link>
            </div>
          </div>
          {detail?.specs && (
            <ul className="hire-hero__at">
              {detail.specs.map((sp) => (
                <li key={sp.label}>
                  <strong>{sp.value}</strong>
                  <span>{sp.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* WHEN YOU'D WANT ONE */}
      <section className="hire-when">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> When it's worth it</span>
            <h2>What the hire actually buys you.</h2>
            <p>
              Not hot water — you'd get that from a replacement too. What it buys is the time to
              choose the replacement without a cold shower setting the deadline.
            </p>
          </div>
          <BenefitTiles benefits={WHEN} />
        </div>
      </section>

      {/* THE PRICE, up front, because on this page we actually have one */}
      {detail?.pricing && (
        <section className="hire-price">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot" /> What it costs</span>
              <h2 className="ds-h--on-dark">Two numbers, and one of them usually disappears.</h2>
            </div>
            <div className="hire-price__grid">
              {detail.pricing.map((row) => (
                <article className="hire-price__row" key={row.tier}>
                  <span className="hire-price__amt">{row.price}</span>
                  <h3>{row.tier}</h3>
                  <p>{row.includes}</p>
                </article>
              ))}
            </div>
            {detail.pricingNote && <p className="hire-price__note">{detail.pricingNote}</p>}
          </div>
        </section>
      )}

      {/* HOW THE WEEK GOES — the numbered steps, same as everywhere else */}
      {steps.length > 0 && (
        <section className="process">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> {detail?.spotlight?.eyebrow}</span>
              <h2 className="ds-h--on-dark">{detail?.spotlight?.heading}</h2>
            </div>
            {detail?.spotlight?.blurb && <p className="hire-steps__lede">{detail.spotlight.blurb}</p>}
            <ol className="steps">
              {steps.map((st, i) => (
                <li key={st.t} className="step">
                  <span className="step__num">{i + 1}</span>
                  <h3>{st.t}</h3>
                  <p>{st.d}</p>
                </li>
              ))}
            </ol>
            {detail?.spotlight?.note && <p className="hire-steps__note">{detail.spotlight.note}</p>}
          </div>
        </section>
      )}

      {/* WORTH KNOWING — the honest limits, not buried */}
      {sys?.watchOut && (
        <section className="hire-watch">
          <div className="wrap hire-watch__grid">
            <div>
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Worth knowing first</span>
              <h2>The parts we&rsquo;d rather you heard from us.</h2>
              <p>
                A hire unit is the right answer often enough that we keep one on the truck, and the
                wrong answer often enough that this list is on the page rather than in the
                small print.
              </p>
            </div>
            <ul className="hire-watch__list">
              {sys.watchOut.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* QUOTE — the orange panel */}
      <section className="quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange">
                  <span className="ds-dot ds-dot--on-orange" /> Without hot water right now?
                </span>
                <h2>Ring us. This one is faster by phone.</h2>
                <p className="quotesec__lede">
                  A form is fine if it can wait until tomorrow. If the house is cold tonight,{" "}
                  <a href={`tel:${site.phoneE164}`} style={{ color: "#fff" }}>call {site.phone}</a>{" "}
                  and we&rsquo;ll tell you straight away whether we can get to you today.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> We look at what failed on the same visit</li>
                  <li><span className="tick tick--on-orange">✓</span> If it&rsquo;s a repair, we say so and you don&rsquo;t need the hire</li>
                  <li><span className="tick tick--on-orange">✓</span> No obligation to buy the replacement from us</li>
                </ul>
                <p className="quotesec__finep">
                  Licensed plumbers · {site.licences.plumbing} · 24/7 for no hot water and gas leaks.
                </p>
              </div>
              <QuoteForm presetService="gas-plumbing" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ, in the home page's shape */}
      {faqs.length > 0 && (
        <section className="hire-faq faq">
          <div className="wrap faq__grid">
            <div className="faq__left">
              <span className="ds-eyebrow"><span className="ds-dot" /> Hire questions</span>
              <h2>Straight answers.</h2>
              <p>
                Still want a human?{" "}
                <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>
                  Call {site.phone}
                </a>
                .
              </p>
            </div>
            <div className="faq__right">
              {faqs.map((f, i) => (
                <details key={f.q} name="faq" {...(i === 0 ? { open: true } : {})}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <ReviewMarquee heading="Reviews from households across the south-east." />
    </div>
  );
}
