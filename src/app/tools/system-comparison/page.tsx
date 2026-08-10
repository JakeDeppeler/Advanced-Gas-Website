import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { SystemComparison } from "./SystemComparison";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "System Comparison · Split vs Multi-head vs Ducted vs Gas vs Evap",
  description:
    "Compare split systems, multi-head, ducted reverse-cycle, gas ducted heating and evaporative cooling side-by-side. Install cost, running cost, zone control, best for, and which we recommend.",
  alternates: { canonical: "/tools/system-comparison" },
};

export default function SystemComparisonPage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">System comparison</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tool</div>
          <h1>
            System <span className="accent">comparison</span> · split, multi-head, ducted, gas &amp; evap.
          </h1>
          <p className="dp-hero__sub">
            Five options for climate-controlling an Australian home, and one is almost always right
            for your situation. Pick the systems you&rsquo;re considering and see them side-by-side
            on install cost, running cost, zone control, lifespan and what they&rsquo;re best for.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <SystemComparison />
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Still not sure which suits you?</h2>
            <p>Send us the room count, orientation and budget. We&rsquo;ll quote three real options from three different system types.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get honest system advice →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
