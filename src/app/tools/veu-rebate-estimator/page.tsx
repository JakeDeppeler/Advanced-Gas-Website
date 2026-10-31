import type { Metadata } from "next";
import Link from "next/link";
import { VeuRebateEstimator } from "./VeuRebateEstimator";
import "../../detail.css";
import "../tools.css";
import { Crumbs, Hero, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "VEU Rebate Calculator 2026: What Can I Claim?",
  description:
    "Pick your postcode, current system and planned upgrade to get the Victorian Energy Upgrades rebate range, net install cost and payback in seconds.",
  alternates: { canonical: "/tools/veu-rebate-estimator" },
};

export default function VeuRebateEstimatorPage() {
  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Tools", href: "/tools" }, { name: "VEU rebate calculator" }]} />
      <Hero eye="Free tool" title={<>VEU <em>rebate calculator</em>.</>} sub={<>The Victorian Energy Upgrades (VEU) scheme knocks up to $2,700 off a heat pump
            install and up to $4,200 off a gas-to-reverse-cycle switch. Enter your postcode,
            current system and planned upgrade to see the estimated rebate range and your
            out-of-pocket install cost.</>} ctas={false} />
      <div className="page-detail page-tools kx__tool">

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
                Efficiency Certificates</strong> (VEECs), one for every tonne of greenhouse
                gas your upgrade will avoid over its assumed 10-year life. Each VEEC has a
                traded market price (currently $60-$75 in 2026, having settled down from the
                inflated 2024 highs).
              </p>
              <p>
                The number of certificates depends on the <strong>Product Class</strong>
                (heat pump hot water, ducted aircon, reverse-cycle upgrade, etc.), your
                <strong> installation region</strong> (Melbourne / VIC-wide split), and the
                <strong> displaced fuel</strong>, going from gas to electric earns more than
                electric to electric because the greenhouse saving is larger.
              </p>
              <p>
                We&rsquo;re a <strong>VEU-accredited provider</strong>. We handle the paperwork end-to-end
                and apply the rebate to your quote up front so you never pay it and then chase it.
                {" "}<Link href="/rebates" style={{ color: "var(--orange-ink)", fontWeight: 700 }}>See how the rebate is applied</Link>.
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 12 }}>
                Numbers here are estimates based on 2026 VEEC market prices ($60-$75). The exact rebate
                is confirmed at quote time after a 20-minute site check, every home is slightly different.
              </p>
            </div>
          </details>
        </div>
      </section>

      </div>
      <Cta title={<>Ready for the exact number?</>} text={<>We&rsquo;ll confirm the rebate on your quote inside 12 business hours.</>} />
    </div>
  );
}
