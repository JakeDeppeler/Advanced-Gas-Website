import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { FaultCodeLookup } from "./FaultCodeLookup";
import { ToolPage } from "@/components/homepage/tools/ToolPage";

export const metadata: Metadata = {
  title: "Aircon Fault Code Lookup, Every Major Brand",
  description:
    "Searchable table of common aircon fault codes: Mitsubishi, Daikin, Fujitsu, Panasonic, LG, Kaden, Brivis. Each lists the likely cause and what to check.",
  alternates: { canonical: "/tools/fault-codes" },
};

export default function FaultCodesPage() {
  return (
    <ToolPage
      slug="fault-codes"
      crumb="Fault codes"
      title="What does the {error code} on my aircon mean?"
      sub={<>Search or filter by brand to decode a flashing error on a split, ducted or multi-head system. Each entry lists the likely cause and the first thing to check before booking a service call. Covers every major brand we install, plus the ones we don&rsquo;t.</>}
      more={
        <section className="bk__sec bk__sec--white" id="next">
          <div className="wrap"><div className="bk__blk tl__duo">
            <div className="tl__note">
              <h2>Code not in the list?</h2>
              <p>
                We service every major brand. Send us the code, the brand and, ideally, a photo of the
                wall controller. We&rsquo;ll come back with what it means and a written service quote.
              </p>
              <div className="bxh__ctas">
                <Link href="/contact" className="abtn abtn--or abtn--flat">Send us the code →</Link>
                <a href={`tel:${site.phoneE164}`} className="abtn abtn--line" data-call-from="fault-codes">Call {site.phone}</a>
              </div>
            </div>
            {/* Knowing what the code means is only half of it. This sits with
                the fault codes rather than in the Tools menu, because it's the
                question that comes straight after. */}
            <div className="tl__note tl__note--navy">
              <h2>Know the code. Now, is it worth fixing?</h2>
              <p>
                Past about ten years on hot water and gas heating, and twelve on aircon, a significant
                repair usually costs more per remaining year than a replacement does, and it&rsquo;s the
                same point at which the VEU rebate is worth the most. If yours is young and the fault is
                a component, we&rsquo;ll fix it and say so.
              </p>
              <div className="bxh__ctas">
                <Link href="/upgrade-or-repair" className="abtn abtn--or abtn--flat">Repair or replace? The 10-year rule →</Link>
              </div>
            </div>
          </div></div>
        </section>
      }
      cta={{ h: "Worth repairing, or {time to replace}?", text: "We give the honest answer. Sometimes a new install with the VEU rebate costs less than the repair." }}
    >
      <FaultCodeLookup />
    </ToolPage>
  );
}
