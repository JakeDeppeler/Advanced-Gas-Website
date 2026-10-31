import type { Metadata } from "next";
import Link from "next/link";
import { SizingCalculator } from "./SizingCalculator";
import "../../detail.css";
import "../tools.css";
import { Crumbs, Hero, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "Aircon Sizing, What kW Size Do I Need?",
  description:
    "Enter your room dimensions, ceiling height, orientation and insulation to get the right cooling capacity in kW, sized the way our installers size it.",
  alternates: { canonical: "/tools/sizing-calculator" },
};

export default function SizingCalculatorPage() {
  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Tools", href: "/tools" }, { name: "Sizing calculator" }]} />
      <Hero eye="Free tool" title={<>Aircon <em>sizing calculator</em>.</>} sub={<>Work out the right cooling capacity for a single room in seconds. Uses the
            residential heat-load formula our installers apply on quote day, adjusted for
            ceiling height, orientation, insulation, glazing and occupants.</>} ctas={false} />
      <div className="page-detail page-tools kx__tool">

      <section className="page-tool">
        <div className="wrap">
          <SizingCalculator />

          <details className="page-tool__how" style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>
              How the calculation works
            </summary>
            <div style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              <p>
                We start from a residential base heat-load of <strong>150&nbsp;W per m²</strong> of floor area for
                a standard 2.4&nbsp;m ceiling in an average Melbourne home, then apply the following adjustments:
              </p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Ceiling height</strong>, anything above 2.7&nbsp;m increases the load by 5% per 0.3&nbsp;m.</li>
                <li><strong>Orientation</strong>, west-facing rooms take the afternoon sun and need +15% capacity.</li>
                <li><strong>Insulation</strong>, an uninsulated ceiling or single-glazed windows add 10-20%.</li>
                <li><strong>Occupants</strong>, every person above 2 adds ~120&nbsp;W of body heat.</li>
                <li><strong>Glazing</strong>, large expanses of glass (&gt;20% wall area) add 10-25%.</li>
              </ul>
              <p>
                The result is a recommended cooling capacity range. The lower end is the minimum that will
                cope with an average summer day; the upper end handles heat-wave conditions comfortably.
                Real-world quotes we produce take room-by-room measurements into account, so numbers may
                vary, <Link href="/quote" style={{ color: "var(--orange-ink)", fontWeight: 700 }}>send us the room</Link> and we&rsquo;ll spec it exactly.
              </p>
            </div>
          </details>
        </div>
      </section>

      </div>
      <Cta title={<>Want a properly-sized quote?</>} text={<>Send us the room dimensions. We&rsquo;ll spec the exact model and price it fixed.</>} />
    </div>
  );
}
