import type { Metadata } from "next";
import Link from "next/link";
import { HotWaterSavings } from "./HotWaterSavings";
import { ToolPage } from "@/components/homepage/tools/ToolPage";

export const metadata: Metadata = {
  title: "Hot Water Savings, How Much Will I Save?",
  description:
    "Compare your current gas or electric hot water cost against a heat pump, with the rebates applied and the payback period shown.",
  alternates: { canonical: "/tools/hot-water-savings" },
};

export default function HotWaterSavingsPage() {
  return (
    <ToolPage
      slug="hot-water-savings"
      crumb="Hot water savings"
      title="How much would a {heat pump} save you?"
      sub={<>See what you&rsquo;ll save each year by swapping an old gas or electric hot water system for a modern heat pump. Takes the rebates off the install cost and, once you add the price from your quote, projects the payback over 10&nbsp;years.</>}
      how={{
        h: "How the {sum} works.",
        body: (
          <>
            <p>
            Hot water energy demand depends on the volume you use and how much you have to
            heat it. Australian standard is <strong>~50 L / person / day</strong> at ~50 °C, so a
            4-person household uses ~200 L / day, which needs about <strong>9-10 kWh</strong> of
            delivered heat energy daily.
            </p>
            <p>
            <strong>Gas storage / continuous flow</strong> is ~75-85% efficient, so 10 kWh of delivered
            heat needs ~12-13 kWh of gas input (≈ 44 MJ / day).<br />
            <strong>Electric storage</strong> is 100% efficient at the element (1 kWh input = 1 kWh heat)
            but every kWh costs peak retail rates.<br />
            <strong>Heat pump</strong> pulls 3-4 kWh of heat out of the ambient air for every 1 kWh of
            electricity, so the same 10 kWh of delivered heat needs only ~2.5-3.5 kWh of input.
            </p>
            <p>
            <strong>Rebates</strong> take up to $2,700 off a heat pump install (VEU, STCs and Solar
            Victoria for eligible owner-occupiers), and they come off the quoted price rather than
            being something you chase later. Add the price from your quote and the calculator works
            out the payback on your own numbers. Warranties depend on the brand, from 5 years on the
            whole unit (iStore) up to 15 years on a Reclaim stainless tank.
            {" "}<Link href="/rebates">See our rebate breakdown</Link>.
            </p>

          </>
        ),
      }}
      cta={{ h: "Ready to lock in {the saving}?", text: <>Send us your current unit. We&rsquo;ll price the swap fixed with the VEU rebate applied.</> }}
    >
      <HotWaterSavings />
    </ToolPage>
  );
}
