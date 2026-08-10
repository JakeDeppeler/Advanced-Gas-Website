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
 * tank finish (glass-lined, stainless, stainless 316, Earthworks) across
 * every capacity (250 L, 315 L, 400 L) side-by-side.
 *
 * Purpose: a customer at the top of the Reclaim decision doesn't need
 * to open 9 product pages to pick between them — this table lays out
 * warranty, price band, best-for and material trade-off for the whole
 * lineup in one scan. Complements the on-brand-page compare tick UI.
 */

export const metadata: Metadata = {
  title: "Reclaim Heat Pump Comparison · Every Tank + Finish, Side-by-Side",
  description:
    "Compare every Reclaim CO₂ heat pump we install — glass-lined, stainless, stainless 316, Earthworks — across 250 L / 315 L / 400 L. Warranty, price band, best-for, and our recommendation for each.",
  alternates: { canonical: "/brands/reclaim/compare" },
};

type Row = {
  finish: string;
  finishSub: string;
  cap: "250 L" | "315 L" | "400 L";
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
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "250 L", slug: "co2-split-250-glass",         price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Couples · entry price",              material: "Enamel glass over steel · anode replaced ~7-10 yrs", ourTake: "Cheapest Reclaim entry. Good for couples on a budget who still want CO₂." },
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "315 L", slug: "co2-split-315-glass",         price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Family of 3-4 · budget",              material: "Enamel glass over steel · anode replaced ~7-10 yrs", ourTake: "Our most-installed Reclaim glass model — best value at the 315 sweet spot." },
  { finish: "Stainless",       finishSub: "no anode, no rust",     cap: "250 L", slug: "co2-split-250-stainless",     price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Couples wanting longevity",           material: "Stainless steel · zero anode maintenance",           ourTake: "Step up in warranty for couples who intend to stay in the house." },
  { finish: "Stainless",       finishSub: "no anode, no rust",     cap: "315 L", slug: "co2-split-315-stainless",     price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Family of 3-4 · long-term",           material: "Stainless steel · zero anode maintenance",           ourTake: "The default Reclaim we spec when the customer plans to be in the home 10+ years." },
  { finish: "Stainless 316",   finishSub: "marine-grade",          cap: "315 L", slug: "co2-split-315-stainless-316", price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Coastal-edge homes",                  material: "316-grade stainless · salt-air resistant",           ourTake: "Only pay the 316 premium if you're coastal — Tooradin, Lang Lang, close to Western Port." },
  { finish: "Earthworks",      finishSub: "premium poly-lined",    cap: "250 L", slug: "co2-split-250-earthworks",    price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Bore / bad water quality",            material: "Poly-lined steel · handles high mineral content",    ourTake: "Spec this only if you're on tank / bore water with high mineral content." },
  { finish: "Earthworks",      finishSub: "premium poly-lined",    cap: "315 L", slug: "co2-split-315-earthworks",    price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Bore water · family",                 material: "Poly-lined steel · handles high mineral content",    ourTake: "Bore-water version of the 315 default — same size, mineral-friendly." },
  { finish: "Glass-lined",     finishSub: "sacrificial anode",     cap: "400 L", slug: "co2-split-400-glass",         price: "Message for quote", warranty: "10-yr tank / 5-yr labour", bestFor: "Family of 5+ · budget",               material: "Enamel glass over steel · anode replaced ~7-10 yrs", ourTake: "400 L for high-draw households — teenagers, big showers, back-to-back use." },
  { finish: "Stainless",       finishSub: "no anode, no rust",     cap: "400 L", slug: "co2-split-400-stainless",     price: "Message for quote", warranty: "15-yr tank / 5-yr labour", bestFor: "Family of 5+ · long-term",            material: "Stainless steel · zero anode maintenance",           ourTake: "Top-of-line residential Reclaim — 400 L stainless will outlast the mortgage." },
];

const QUICK_PICK: { label: string; recommend: string; explain: string }[] = [
  { label: "Cheapest way in", recommend: "Glass-lined 250 L", explain: "Under $5,400 — same CO₂ compressor, glass-lined tank with sacrificial anode. Good for couples on a tight budget." },
  { label: "Best value default", recommend: "Stainless 315 L", explain: "The one we install most — 15-year stainless tank warranty, 315 L for a family of 3-4, no anode maintenance ever." },
  { label: "Family long-term", recommend: "Stainless 400 L", explain: "For 5+ person households — 400 L, 15-year tank warranty, still handles back-to-back showers on a winter morning." },
  { label: "Coastal home", recommend: "Stainless 316 L", explain: "Only pay the 316-grade premium if you're within a couple of km of Western Port or Port Phillip — salt air kills standard stainless in ~10 years." },
  { label: "Bore / tank water", recommend: "Earthworks 315 L", explain: "Poly-lined steel handles high mineral content — spec this if your water is off a private supply, not town mains." },
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
            Nine CO₂ split models across four tank finishes (glass-lined, stainless, stainless 316,
            Earthworks) and three capacities (250 L, 315 L, 400 L). This is the full lineup with
            our take on which finish suits which household — so you don&rsquo;t have to open nine
            product pages to compare.
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
              (VEU rebate not applied — see the rebate estimator for your out-of-pocket).
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
              The CO₂ Split has an outdoor heat pump feeding a separate tank — quieter, longer-lived,
              PV-diverter compatible. If you want everything in one integrated unit (like an old
              gas storage tank), the <strong>Reclaim ECO R290 all-in-one</strong> at 200 L or 300 L
              is the simpler swap-in at <strong>$2,624</strong> fully installed — same platform as
              the Thermann Integrated. iStore comes in cheaper at <strong>$2,144</strong> if budget
              is the priority.
            </p>
          </div>
          <div className="reclaim-aio__ctas">
            <Link href="/brands/reclaim/reclaim-eco-r290-200" className="ds-btn ds-btn--ghost ds-btn--lg">See ECO R290 · 200 L →</Link>
            <Link href="/brands/reclaim/reclaim-eco-r290-300" className="ds-btn ds-btn--ghost ds-btn--lg">See ECO R290 · 300 L →</Link>
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
