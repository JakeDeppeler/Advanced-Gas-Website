import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { FaultCodeLookup } from "./FaultCodeLookup";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "Aircon Fault Code Lookup, Every Major Brand",
  description:
    "Searchable table of common aircon fault codes: Mitsubishi, Daikin, Fujitsu, Panasonic, LG, Kaden, Brivis. Each lists the likely cause and what to check.",
  alternates: { canonical: "/tools/fault-codes" },
};

export default function FaultCodesPage() {
  return (
    <div className="page-detail page-tools">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools">Tools</Link>
            <span className="sep">/</span>
            <span className="cur">Fault codes</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Free reference</div>
          <h1>
            Aircon <span className="accent">fault code lookup</span>.
          </h1>
          <p className="dp-hero__sub">
            Search or filter by brand to decode what a flashing error on your split, ducted or
            multi-head aircon actually means. Each entry lists the likely cause and the first
            thing to check before booking a service call. Covers every major brand we install
            plus the ones we don&rsquo;t.
          </p>
        </div>
      </section>

      <section className="page-tool">
        <div className="wrap">
          <FaultCodeLookup />

          <div style={{
            marginTop: 40,
            padding: "24px 26px",
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderLeft: "4px solid var(--orange)",
            borderRadius: 12,
          }}>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 800, letterSpacing: -0.01, color: "var(--navy)", margin: "0 0 8px" }}>
              Code not in the list?
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-2)", margin: "0 0 14px", maxWidth: "60ch" }}>
              We service every major brand. Send us the code, the brand and (ideally) a photo of the
              wall controller. We&rsquo;ll come back with what it means and a fixed-price
              service quote.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/contact" className="ds-btn ds-btn--orange">Send us the code →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost">Call {site.phone}</a>
            </div>
          </div>

          {/* Knowing what the code means is only half of it. This sits
              with the fault codes rather than in the Tools menu, because
              it's the question that comes straight after. */}
          <div style={{
            marginTop: 18,
            padding: "24px 26px",
            background: "var(--navy)",
            borderRadius: 12,
            color: "#fff",
          }}>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 800, letterSpacing: -0.01, color: "#fff", margin: "0 0 8px" }}>
              Know the code. Now, is it worth fixing?
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "rgba(255,255,255,0.82)", margin: "0 0 14px", maxWidth: "62ch" }}>
              Past about ten years on hot water and gas heating, and twelve on aircon, a
              significant repair usually costs more per remaining year than a replacement
              does — and it&rsquo;s the same point at which the VEU rebate is worth the most.
              If yours is young and the fault is a component, we&rsquo;ll fix it and say so.
            </p>
            <Link href="/upgrade-or-repair" className="ds-btn ds-btn--orange">
              Repair or replace? The 10-year rule →
            </Link>
          </div>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Broken unit worth repairing, or time to replace?</h2>
            <p>We give the honest answer, sometimes a new install with the VEU rebate is cheaper than the repair.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a repair-or-replace quote →</Link>
            <Link href="/upgrade-or-repair" className="bigcta__phone">
              or read <strong>the 10-year rule</strong>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
