import type { Metadata } from "next";
import Link from "next/link";
import { VeuRebateEstimator } from "./VeuRebateEstimator";
import { ToolPage } from "@/components/homepage/tools/ToolPage";

export const metadata: Metadata = {
  title: "VEU Rebate Calculator 2026: What Can I Claim?",
  description:
    "Pick your postcode, current system and planned upgrade to get the estimated Victorian Energy Upgrades rebate range in seconds.",
  alternates: { canonical: "/tools/veu-rebate-estimator" },
};

export default function VeuRebateEstimatorPage() {
  return (
    <ToolPage
      slug="veu-rebate-estimator"
      crumb="VEU rebate calculator"
      title="How much {rebate} can you get?"
      sub={<>Rebates take up to $2,700 off a heat pump install (VEU, STCs and Solar Victoria for eligible owner-occupiers) and up to $6,000 off a gas-to-reverse-cycle switch. Enter your postcode, current system and planned upgrade to see the estimated rebate range and your out-of-pocket install cost.</>}
      how={{
        h: "How the {VEU rebate} works.",
        body: (
          <>
            <p>
            The Victorian Energy Upgrades scheme generates <strong>Victorian Energy
            Efficiency Certificates</strong> (VEECs), one for every tonne of greenhouse
            gas your upgrade will avoid over its assumed 10-year life. Each VEEC has a
            traded market price, which moves through the year. On a heat pump, the federal
            STCs and, for eligible owner-occupiers, Solar Victoria&rsquo;s rebate stack on top.
            </p>
            <p>
            The number of certificates depends on the <strong>Product Class</strong>{" "}
            (heat pump hot water, ducted aircon, reverse-cycle upgrade, etc.), your
            <strong> installation region</strong> (Melbourne / VIC-wide split), and the
            <strong> displaced fuel</strong>, going from gas to electric earns more than
            electric to electric because the greenhouse saving is larger.
            </p>
            <p>
            We handle the paperwork end-to-end and apply the rebate to your quote up front,
            so you never pay it and then chase it.
            {" "}<Link href="/rebates">See how the rebate is applied</Link>.
            </p>
            <p className="tl__fine">
            Numbers here are estimates on current certificate prices. The exact rebate
            is confirmed at quote time after a 20-minute site check, every home is slightly different.
            </p>

          </>
        ),
      }}
      cta={{ h: "Want the {exact number}?", text: <>We&rsquo;ll confirm the rebate on your quote inside 12 business hours.</> }}
    >
      <VeuRebateEstimator />
    </ToolPage>
  );
}
