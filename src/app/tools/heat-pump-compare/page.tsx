import type { Metadata } from "next";
import Link from "next/link";
import { HeatPumpCompareTool } from "./HeatPumpCompareTool";
import { ToolPage } from "@/components/homepage/tools/ToolPage";

export const metadata: Metadata = {
  title: "Heat Pumps Compared, Side by Side",
  description:
    "Cross-brand heat pump comparison: CO₂ vs R290, capacity, warranty, COP and our installer take. Toggle any 2 to 5 models to compare side by side.",
  alternates: { canonical: "/tools/heat-pump-compare" },
};

export default function HeatPumpComparePage() {
  return (
    <ToolPage
      slug="heat-pump-compare"
      crumb="Heat pump compare"
      title="Heat pumps, {side by side}."
      sub={<>Every heat pump hot water brand we service, Reclaim, iStore and Thermann and Rheem, with the specs a real buyer cares about: refrigerant, COP, capacity, warranty, price band, made-in and what it&rsquo;s best for. Pick 2-5 to compare side-by-side.</>}
      how={{
        h: "How to read the {comparison}.",
        body: (
          <>
            <p>
            <strong>Refrigerant</strong> matters more than most people think. <strong>CO₂ (R744)</strong>{" "}
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
            enamel/glass (10 yr) beats standard. <strong>Made-in</strong> matters for parts availability:
            Australian-made or Aus-designed brands (Reclaim) have local parts pipelines,
            imported units can be slower.
            </p>
            <p>
            Prices shown are fully-installed, pre-rebate. <Link href="/tools/veu-rebate-estimator">Run
            the rebate estimator</Link> for your net out-of-pocket.
            </p>

          </>
        ),
      }}
      cta={{ h: "Made {your pick}?", text: <>Send us the model and we&rsquo;ll quote it in writing with the VEU rebate applied.</> }}
    >
      <HeatPumpCompareTool />
    </ToolPage>
  );
}
