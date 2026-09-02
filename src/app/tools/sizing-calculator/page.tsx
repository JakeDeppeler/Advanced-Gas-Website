import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { SizingCalculator } from "./SizingCalculator";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "Aircon Sizing, What kW Size Do I Need?",
  description:
    "Enter your room dimensions, ceiling height, orientation and insulation to get the right cooling capacity in kW, sized the way our installers size it.",
  alternates: { canonical: "/tools/sizing-calculator" },
};

export default function SizingCalculatorPage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">Sizing calculator</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tool</div>
          <h1>
            Aircon <span className="accent">sizing calculator</span>.
          </h1>
          <p className="dp-hero__sub">
            Work out the right cooling capacity for a single room in seconds. Uses the
            residential heat-load formula our installers apply on quote day, adjusted for
            ceiling height, orientation, insulation, glazing and occupants.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <SizingCalculator />

          <details className="page-tool__how" style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>
              How the calculation works
            </summary>
            <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              <p>
                We start from a residential base heat-load of <strong>150&nbsp;W per m²</strong> of floor area for
                a standard 2.4&nbsp;m ceiling in an average Melbourne home, then apply the following adjustments:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Ceiling height</strong>, anything above 2.7&nbsp;m increases the load by 5% per 0.3&nbsp;m.</li>
                <li><strong>Orientation</strong>, west-facing rooms take the afternoon sun and need +15% capacity.</li>
                <li><strong>Insulation</strong>, an uninsulated ceiling or single-glazed windows add 10-20%.</li>
                <li><strong>Occupants</strong>, every person above 2 adds ~120&nbsp;W of body heat.</li>
                <li><strong>Glazing</strong>, large expanses of glass (&gt;20% wall area) add 10-25%.</li>
              </ul>
              <p>
                The result is a recommended cooling capacity range. The lower end is the minimum that will
                cope with an average summer day; the upper end handles heat-wave conditions comfortably.
                Real-world quotes we produce take room-by-room measurements into account, so numbers may
                vary, <Link href="/quote" style={{ color: "var(--orange)", fontWeight: 700 }}>send us the room</Link> and we&rsquo;ll spec it exactly.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Want a properly-sized quote?</h2>
            <p>Send us the room dimensions. We&rsquo;ll spec the exact model and price it fixed.</p>
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
