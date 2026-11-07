import type { Metadata } from "next";
import Link from "next/link";
import { RunningCostCalculator } from "./RunningCostCalculator";
import "../../detail.css";
import "../tools.css";
import { Crumbs, Hero, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "Aircon Running Cost, Per Day, Week and Year",
  description:
    "Enter your unit's kW, hours per day and electricity rate to estimate the daily, weekly and yearly cost. Splits, ducted and heat pump hot water.",
  alternates: { canonical: "/tools/running-cost-calculator" },
};

export default function RunningCostCalculatorPage() {
  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Tools", href: "/tools" }, { name: "Running cost calculator" }]} />
      <Hero eye="Free tool" title={<>Aircon <em>running cost calculator</em>.</>} sub={<>Estimate what a split, multi-head, ducted or heat pump hot water system will actually
            cost to run per day, week and year at your current electricity rate. Works from either
            the unit&rsquo;s input rating (kW) or its capacity + COP.</>} ctas={false} />
      <div className="page-detail page-tools kx__tool">

      <section className="page-tool">
        <div className="wrap">
          <RunningCostCalculator />

          <details className="page-tool__how" style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>
              How the calculation works
            </summary>
            <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              <p>
                An aircon&rsquo;s <strong>capacity</strong> (the kW of cooling/heating it produces) is different from
                its <strong>input</strong> (the kW of electricity it draws from the wall). The ratio is the
                <strong> COP</strong> (Coefficient of Performance), a COP of 4.0 means the unit produces 4&nbsp;kW of
                cooling for every 1&nbsp;kW of electricity used.
              </p>
              <p>
                We convert capacity → input using: <code>Input (kW) = Capacity (kW) ÷ COP</code>. Then multiply
                by usage hours × electricity rate to get daily cost, then extend to weekly and yearly. Real running
                cost varies with outdoor temperature, thermostat setting and how well-sealed the room is.
              </p>
              <p>
                The Victorian VEU rebate can knock up to $2,700 off a new heat pump, if you&rsquo;re still
                on gas storage or electric-storage hot water, the running-cost gap will pay back the install
                in 3-5 years on typical usage.
                {" "}<Link href="/rebates" style={{ color: "var(--orange-ink)", fontWeight: 700 }}>See our rebate breakdown</Link>.
              </p>
            </div>
          </details>
        </div>
      </section>

      </div>
      <Cta title={<>Ready to lock in the numbers?</>} text={<>Send us the room and the current unit. We&rsquo;ll quote the swap fixed.</>} />
    </div>
  );
}
