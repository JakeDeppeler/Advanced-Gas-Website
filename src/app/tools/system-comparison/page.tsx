import type { Metadata } from "next";
import { SystemComparison } from "./SystemComparison";
import "../../detail.css";
import "../tools.css";
import { Crumbs, Hero, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "Split vs Multi-head vs Ducted vs Gas vs Evap",
  description:
    "Compare split, multi-head, ducted reverse-cycle, gas ducted and evaporative side by side: install cost, running cost, zoning and who each suits.",
  alternates: { canonical: "/tools/system-comparison" },
};

export default function SystemComparisonPage() {
  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Tools", href: "/tools" }, { name: "System comparison" }]} />
      <Hero eye="Free tool" title={<>System <em>comparison</em> · split, multi-head, ducted, gas &amp; evap.</>} sub={<>Five options for climate-controlling an Australian home, and one is almost always right
            for your situation. Pick the systems you&rsquo;re considering and see them side-by-side
            on install cost, running cost, zone control, lifespan and what they&rsquo;re best for.</>} ctas={false} />
      <div className="page-detail page-tools kx__tool">

      <section className="page-tool">
        <div className="wrap">
          <SystemComparison />
        </div>
      </section>

      </div>
      <Cta title={<>Still not sure which suits you?</>} text={<>Send us the room count, orientation and budget. We&rsquo;ll quote three real options from three different system types.</>} />
    </div>
  );
}
