import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { VeuRebateEstimator } from "./VeuRebateEstimator";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "VEU Rebate Estimator · How much rebate can I claim in 2026?",
  description:
    "Free Victorian Energy Upgrades (VEU) rebate estimator. Pick your postcode, current system and planned upgrade — get the rebate range, net install cost and payback in seconds.",
  alternates: { canonical: "/tools/veu-rebate-estimator" },
};

export default function VeuRebateEstimatorPage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">VEU rebate estimator</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tool</div>
          <h1>
            VEU <span className="accent">rebate estimator</span>.
          </h1>
          <p className="dp-hero__sub">
            The Victorian Energy Upgrades (VEU) scheme knocks up to $2,700 off a heat pump
            install and up to $4,200 off a gas-to-reverse-cycle switch. Enter your postcode,
            current system and planned upgrade to see the estimated rebate range and your
            out-of-pocket install cost.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <VeuRebateEstimator />

          <details className="page-tool__how" style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>
              How the VEU rebate works
            </summary>
            <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              <p>
                The Victorian Energy Upgrades scheme generates <strong>Victorian Energy
                Efficiency Certificates</strong> (VEECs) — one for every tonne of greenhouse
                gas your upgrade will avoid over its assumed 10-year life. Each VEEC has a
                traded market price (currently $60-$75 in 2026, having settled down from the
                inflated 2024 highs).
              </p>
              <p>
                The number of certificates depends on the <strong>Product Class</strong>
                (heat pump hot water, ducted aircon, reverse-cycle upgrade, etc.), your
                <strong> installation region</strong> (Melbourne / VIC-wide split), and the
                <strong> displaced fuel</strong> — going from gas to electric earns more than
                electric to electric because the greenhouse saving is larger.
              </p>
              <p>
                We&rsquo;re a <strong>VEU-accredited provider</strong> — we handle the paperwork end-to-end
                and apply the rebate to your quote up front so you never pay it and then chase it.
                {" "}<Link href="/rebates" style={{ color: "var(--orange)", fontWeight: 700 }}>See how the rebate is applied</Link>.
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 12 }}>
                Numbers here are estimates based on 2026 VEEC market prices ($60-$75). The exact rebate
                is confirmed at quote time after a 20-minute site check — every home is slightly different.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready for the exact number?</h2>
            <p>We&rsquo;ll confirm the rebate on your quote inside 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a rebate-inclusive quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
