import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { HeatPumpCompareTool } from "./HeatPumpCompareTool";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "Heat Pumps Compared, Side by Side",
  description:
    "Cross-brand heat pump comparison: CO₂ vs R290, capacity, warranty, COP and our installer take. Toggle any 2 to 5 models to compare side by side.",
  alternates: { canonical: "/tools/heat-pump-compare" },
};

export default function HeatPumpComparePage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">Heat pump compare</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tool</div>
          <h1>
            Heat pump <span className="accent">side-by-side</span>.
          </h1>
          <p className="dp-hero__sub">
            Every heat pump hot water brand we service, Reclaim, iStore, Thermann, Sanden and Rheem, 
            with the specs a real buyer cares about: refrigerant, COP, capacity, warranty, price band,
            made-in and what it&rsquo;s best for. Pick 2-5 to compare side-by-side.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <HeatPumpCompareTool />

          <details className="page-tool__how" style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>
              How to read this comparison
            </summary>
            <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              <p>
                <strong>Refrigerant</strong> matters more than most people think. <strong>CO₂ (R744)</strong>
                is a natural refrigerant with zero GWP and holds heating capacity down to -10 °C ambient, 
                the go-to for hills postcodes. <strong>R290</strong> (propane) is the current market
                default; excellent efficiency, small charge, but drops capacity faster below 0 °C.
              </p>
              <p>
                <strong>COP</strong> (Coefficient of Performance) is heat produced per kWh of electricity.
                A COP of 4 means the unit delivers 4 kW of hot water heat for every 1 kW of grid electricity.
                Higher is better, but real-world COP falls when ambient temp drops.
              </p>
              <p>
                <strong>Tank warranty</strong> is the single best long-term signal, stainless (15 yr) beats
                enamel/glass (10 yr) beats standard. <strong>Made-in</strong> matters for parts availability
, Australian-made or Aus-designed brands (Reclaim, Sanden) have local parts pipelines,
                imported units can be slower.
              </p>
              <p>
                Prices shown are fully-installed, pre-rebate. <Link href="/tools/veu-rebate-estimator" style={{ color: "var(--orange)", fontWeight: 700 }}>Run
                the rebate estimator</Link> for your net out-of-pocket.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Made your pick?</h2>
            <p>Send us the model and we&rsquo;ll quote it fixed with the VEU rebate applied.</p>
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
