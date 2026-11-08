import type { Metadata } from "next";
import { SystemComparison } from "./SystemComparison";
import { ToolPage } from "@/components/homepage/tools/ToolPage";

export const metadata: Metadata = {
  title: "Split vs Multi-head vs Ducted vs Gas vs Evap",
  description:
    "Compare split, multi-head, ducted reverse-cycle, gas ducted and evaporative side by side: install cost, running cost, zoning and who each suits.",
  alternates: { canonical: "/tools/system-comparison" },
};

export default function SystemComparisonPage() {
  return (
    <ToolPage
      slug="system-comparison"
      crumb="System comparison"
      title="Which {system} suits your home?"
      sub={<>Five options for climate-controlling an Australian home, and one is almost always right for your situation. Pick the systems you&rsquo;re considering and see them side by side on running cost, zone control, lifespan and what they&rsquo;re best for.</>}
      cta={{ h: "Still not sure {which one}?", text: <>Send us the room count, orientation and budget. We&rsquo;ll quote three real options from three different system types.</> }}
    >
      <SystemComparison />
    </ToolPage>
  );
}
