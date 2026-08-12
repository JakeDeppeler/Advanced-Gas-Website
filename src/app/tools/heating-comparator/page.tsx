import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { HeatingComparator } from "./HeatingComparator";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "Gas Heater vs Reverse-Cycle Running Cost",
  description:
    "Compare the annual running cost of a gas ducted heater against reverse-cycle in Melbourne. Star ratings, COPs, tariffs and payback if you upgrade.",
  alternates: { canonical: "/tools/heating-comparator" },
};

export default function HeatingComparatorPage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">Gas vs reverse-cycle</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free tool</div>
          <h1>
            Gas heater <span className="accent">vs reverse-cycle</span> running cost.
          </h1>
          <p className="dp-hero__sub">
            Compare what a gas ducted heater and a reverse-cycle (heat pump) system will actually cost
            to run per winter. Enter your home&rsquo;s heat load, the star rating of your current gas
            heater, the COP of the reverse-cycle system, plus your gas and electricity rates.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <HeatingComparator />

          <details className="page-tool__how" style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>
              How the calculation works
            </summary>
            <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              <p>
                We compute the <strong>delivered heat energy</strong> needed per year, heat load (kW)
                × hours per day × days per year. That&rsquo;s the same output both systems have to hit.
              </p>
              <p>
                <strong>Gas heater</strong>: input MJ needed = delivered heat ÷ efficiency. A
                3-star heater is ~65% efficient, 5-star ~82%, 6-star ~87%. Multiply input MJ
                by your gas tariff to get $/year.
              </p>
              <p>
                <strong>Reverse-cycle</strong>: input kWh needed = delivered heat ÷ COP. A
                modern inverter running in mild Melbourne winter conditions averages a COP of
                3.5-4.5. Multiply input kWh by your electricity tariff to get $/year.
              </p>
              <p>
                A rough <strong>Melbourne heat load</strong> reference:
                small unit (1 bed) ~2-3&nbsp;kW, 3-bed home ~6-10&nbsp;kW, large / double-storey ~12-18&nbsp;kW.
                Ducted systems typically run 4-8 hours/day for ~120-150 days per year.
              </p>
              <p>
                Big picture: a modern reverse-cycle unit on 2025 tariffs typically runs at half the
                cost of a 3-star gas ducted heater. The VEU rebate makes the swap cost dramatically
                less, <Link href="/tools/veu-rebate-estimator" style={{ color: "var(--orange)", fontWeight: 700 }}>estimate your rebate</Link>.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready to price the swap?</h2>
            <p>Send us the current heater. We&rsquo;ll quote the reverse-cycle upgrade with rebate applied.</p>
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
