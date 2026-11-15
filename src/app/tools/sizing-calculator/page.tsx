import type { Metadata } from "next";
import Link from "next/link";
import { SizingCalculator } from "./SizingCalculator";
import { ToolPage } from "@/components/homepage/tools/ToolPage";

export const metadata: Metadata = {
  title: "Aircon Sizing, What kW Size Do I Need?",
  description:
    "Enter your room dimensions, ceiling height, orientation and insulation to get the right cooling capacity in kW, sized the way our installers size it.",
  alternates: { canonical: "/tools/sizing-calculator" },
};

export default function SizingCalculatorPage() {
  return (
    <ToolPage
      slug="sizing-calculator"
      crumb="Sizing calculator"
      title="What size {aircon} does this room need?"
      sub="The right cooling capacity for a single room in seconds, using the residential heat-load formula our installers apply on quote day, adjusted for ceiling height, orientation, insulation, glazing and people."
      how={{
        h: "How the {sum} works.",
        body: (
          <>
            <p>
              We start from a residential base heat-load of <strong>150&nbsp;W per m²</strong> of floor area for
              a standard 2.4&nbsp;m ceiling in an average Melbourne home, then adjust it:
            </p>
            <ul>
              <li><strong>Ceiling height:</strong> anything above 2.7&nbsp;m adds 5% per 0.3&nbsp;m.</li>
              <li><strong>Orientation:</strong> west-facing rooms take the afternoon sun and need 15% more.</li>
              <li><strong>Insulation:</strong> an uninsulated ceiling or single-glazed windows add 10 to 20%.</li>
              <li><strong>People:</strong> every person above two adds about 120&nbsp;W of body heat.</li>
              <li><strong>Glazing:</strong> large areas of glass (more than 20% of the wall) add 10 to 25%.</li>
            </ul>
            <p>
              The result is a range. The low end copes with an average summer day; the top end handles a
              heatwave comfortably. Our quotes are measured room by room, so the final number can differ:{" "}
              <Link href="/quote">send us the room</Link> and we&rsquo;ll spec it exactly.
            </p>
          </>
        ),
      }}
      cta={{ h: "Want it sized {properly}?", text: "Send us the room dimensions. We'll spec the exact model and price it fixed, in writing." }}
    >
      <SizingCalculator />
    </ToolPage>
  );
}
