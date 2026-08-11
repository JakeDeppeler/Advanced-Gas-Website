import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { findBrand, productPhoto } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import "../../../detail.css";
import "../../[brand]/brand.css";
import "./reclaim-compare.css";

/**
 * Reclaim range comparison — a dedicated deep-dive page comparing every
 * tank finish (glass-lined, stainless tall, stainless squat, Earthworker)
 * across every capacity (160 L, 250 L, 315 L, 400 L) side-by-side.
 *
 * Purpose: a customer at the top of the Reclaim decision doesn't need
 * to open 9 product pages to pick between them — this table lays out
 * warranty, price band, best-for and material trade-off for the whole
 * lineup in one scan. Complements the on-brand-page compare tick UI.
 */

export const metadata: Metadata = {
  title: "Reclaim Heat Pump Comparison · Every Tank + Finish, Side-by-Side",
  description:
    "Compare every Reclaim CO₂ heat pump we install, glass-lined, stainless tall (SST), stainless squat (SSQ) and Earthworker, across 160 L / 250 L / 315 L / 400 L. Warranty, best-for and our recommendation for each.",
  alternates: { canonical: "/brands/reclaim/compare" },
};

type Row = {
  finish: string;
  finishSub: string;
  cap: "160 L" | "250 L" | "315 L" | "400 L";
  slug: string | null; // link into the individual product page
  price: string;
  warranty: string;
  bestFor: string;
  material: string;
  ourTake: string;
};

// Grid: rows = finish/capacity, columns = comparison dimensions.
// Keeping data local to this page so it can be edited independently
// of the master brand catalogue without disturbing rebuild boundaries.
const ROWS: Row[] = [
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "160 L", slug: "co2-split-160-glass",          price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "1-2 people · tight spaces",           material: "Enamel glass over steel · anode swapped every 5-7 yrs", ourTake: "The smallest tank Reclaim make. You pick it for the space it fits into, not to save money." },
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "250 L", slug: "co2-split-250-glass",          price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Couples and families of three", material: "Enamel glass over steel · anode swapped every 5-7 yrs", ourTake: "Same CO₂ compressor as every other tank in the range, in the smallest size that still suits a family." },
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "315 L", slug: "co2-split-315-glass",          price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Family of 3-4 on town water",   material: "Enamel glass over steel · anode swapped every 5-7 yrs", ourTake: "The size most families land on. Glass-lined does an honest job on Pakenham mains, as long as someone remembers the anode." },
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "400 L", slug: "co2-split-400-glass",          price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Households of 6+",              material: "Enamel glass over steel · anode swapped every 5-7 yrs", ourTake: "400 L on the 5 kW compressor, for a house where the draw is genuinely high." },
  { finish: "Stainless, tall", finishSub: "SST · no anode",        cap: "160 L", slug: "co2-split-160-stainless",      price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Units and rentals",             material: "Stainless steel · nothing to service",                  ourTake: "160 L with no anode to remember, which is the argument on any property you don't live in." },
  { finish: "Stainless, tall", finishSub: "SST · no anode",        cap: "250 L", slug: "co2-split-250-stainless",      price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Couples staying put",           material: "Stainless steel · nothing to service",                  ourTake: "Same size and footprint as the glass-lined 250, with 15 years of tank warranty instead of 10." },
  { finish: "Stainless, tall", finishSub: "SST · no anode",        cap: "315 L", slug: "co2-split-315-stainless",      price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Family of 3-4 · long-term",     material: "Stainless steel · nothing to service",                  ourTake: "Our most-installed Reclaim, and Reclaim's own best seller. Quiet enough at 37 dBA to sit against a bedroom wall." },
  { finish: "Stainless, tall", finishSub: "SST · no anode",        cap: "400 L", slug: "co2-split-400-stainless",      price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Acreage and big households",    material: "Stainless steel · nothing to service",                  ourTake: "The most volume Reclaim make, in stainless, on the 5 kW compressor, so it comes back before the evening run." },
  { finish: "Stainless, squat",finishSub: "SSQ · short and wide",  cap: "315 L", slug: "co2-split-315-stainless-squat",price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Low eaves, cupboards, doorways",material: "Same stainless as the SST, 1490 mm tall not 1985 mm",   ourTake: "The Q is squat, not a grade of steel. Identical system to the tall 315, in a body that fits where the tall one won't." },
  { finish: "Earthworker",     finishSub: "made in Morwell",       cap: "250 L", slug: "co2-split-250-earthworker",    price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Buying Australian, on purpose", material: "Stainless steel, built by a worker-owned co-op",        ourTake: "Performs like the standard stainless because it is stainless. What you're choosing is where it was made." },
  { finish: "Earthworker",     finishSub: "made in Morwell",       cap: "315 L", slug: "co2-split-315-earthworker",    price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Family of 4-5, made locally",   material: "Stainless steel, built by a worker-owned co-op",        ourTake: "Same heat pump, same warranty, steel rolled an hour up the Princes Highway." },
];

const QUICK_PICK: { label: string; recommend: string; explain: string }[] = [
  { label: "Couple, town water", recommend: "Glass-lined 250 L", explain: "Same CO₂ compressor as every other tank in the range. Glass-lined means a sacrificial anode, which we swap every five to seven years, and which does an honest job on Pakenham mains." },
  { label: "Family of 3-4", recommend: "Stainless 315 L", explain: "The one we install most. 315 L of stainless, 15-year tank warranty, and no anode to remember in year five." },
  { label: "Family long-term", recommend: "Stainless 400 L", explain: "For 5+ person households, 400 L, 15-year tank warranty, still handles back-to-back showers on a winter morning." },
  { label: "Low eave or tight cupboard", recommend: "Stainless squat 315 L (SSQ)", explain: "Same 315 litres and the same stainless as the tall SST, in a body about half a metre shorter. We measure the space at the site visit and tell you which one goes in." },
  { label: "Australian-made, on purpose", recommend: "Earthworker 315 L", explain: "Reclaim heat pump on a stainless tank built in Morwell by a worker-owned co-op. Runs the same as the standard stainless, because it is stainless." },
];

export default function ReclaimComparePage() {
  const brand = findBrand("reclaim");
  if (!brand) return null;

  return (
    <div className="page-detail page-brand" style={{ ["--card-accent" as string]: brand.accent }}>
      <section className="dp-hero brand-hero">
        <div className="brand-hero__pic" aria-hidden="true">
          <SafeImg src={brand.photo} fallback={brand.photoFallback} alt="" width="1600" height="900" fetchPriority="high" />
        </div>
        <div className="brand-hero__scrim" aria-hidden="true" />
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <Link href="/brands/reclaim">Reclaim</Link>
            <span className="sep">/</span>
            <span className="cur">Compare</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {brand.name} · full-range comparison
          </div>
          <h1>
            Every <span className="accent">Reclaim</span> tank + finish, side-by-side.
          </h1>
          <p className="dp-hero__sub">
            Eleven CO₂ split systems across four tank types (glass-lined, stainless tall,
            stainless squat and the Earthworker tank built in Morwell) and four capacities
            (160 L, 250 L, 315 L, 400 L), with our take on which suits which household. If
            you already have a model code in front of you,{" "}
            <Link href="/brands/reclaim/models">look it up here</Link> instead.
          </p>
        </div>
      </section>

      {/* ---- Quick-pick strip ---- */}
      <section className="reclaim-quickpick">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Quick picks</span>
            <h2>Skip the reading. Jump to the right model.</h2>
          </div>
          <div className="reclaim-quickpick__grid">
            {QUICK_PICK.map((q) => (
              <div key={q.label} className="reclaim-quickpick__card">
                <div className="reclaim-quickpick__lbl">{q.label}</div>
                <div className="reclaim-quickpick__rec">{q.recommend}</div>
                <p>{q.explain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Full comparison table ---- */}
      <section className="reclaim-cmp">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Full comparison</span>
            <h2>All 9 Reclaim CO₂ split models on one page.</h2>
            <p>
              Every model we install, ranked by capacity then finish. Price is fully-installed
              (VEU rebate not applied, see the rebate estimator for your out-of-pocket).
            </p>
          </div>

          <div className="reclaim-cmp__scroll">
            <table className="reclaim-cmp__table">
              <thead>
                <tr>
                  <th className="reclaim-cmp__th reclaim-cmp__th--sticky">Finish + capacity</th>
                  <th className="reclaim-cmp__th">Price</th>
                  <th className="reclaim-cmp__th">Warranty</th>
                  <th className="reclaim-cmp__th">Best for</th>
                  <th className="reclaim-cmp__th">Material</th>
                  <th className="reclaim-cmp__th">Our take</th>
                  <th className="reclaim-cmp__th">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={`${r.finish}-${r.cap}`}>
                    <th scope="row" className="reclaim-cmp__rowhead">
                      <div className="reclaim-cmp__finish">{r.finish}</div>
                      <div className="reclaim-cmp__cap">{r.cap} · <span>{r.finishSub}</span></div>
                    </th>
                    <td className="reclaim-cmp__price">{r.price}</td>
                    <td>{r.warranty}</td>
                    <td>{r.bestFor}</td>
                    <td>{r.material}</td>
                    <td className="reclaim-cmp__take">{r.ourTake}</td>
                    <td className="reclaim-cmp__cta">
                      {r.slug ? (
                        <Link href={`/brands/reclaim/${r.slug}`} className="ds-btn ds-btn--ghost ds-btn--sm">
                          Details →
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- All-in-one strip ---- */}
      <section className="reclaim-aio">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> All-in-one alternative</span>
            <h2>Prefer a single-unit heat pump?</h2>
            <p>
              The CO₂ Split has an outdoor heat pump feeding a separate tank, quieter, longer-lived,
              PV-diverter compatible. If you want everything in one integrated unit (like an old
              gas storage tank), the <strong>Reclaim ECO R290 all-in-one</strong> at 200 L or 285 L
              is the simpler swap-in at <strong>$2,624</strong> fully installed, on the same platform as
              the Thermann Integrated. If the VEU rebate is what decides it, iStore takes it
              furthest, at <strong>$2,144</strong>.
            </p>
          </div>
          <div className="reclaim-aio__ctas">
            <Link href="/brands/reclaim/eco-r290-200" className="ds-btn ds-btn--ghost ds-btn--lg">See ECO R290 · 200 L →</Link>
            <Link href="/brands/reclaim/eco-r290-300" className="ds-btn ds-btn--ghost ds-btn--lg">See ECO R290 · 285 L →</Link>
            <Link href="/tools/heat-pump-compare" className="ds-btn ds-btn--orange ds-btn--lg">Compare all AIO brands →</Link>
          </div>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready to lock in the right Reclaim?</h2>
            <p>We&rsquo;ll spec the model, apply the VEU rebate and quote it fixed.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
