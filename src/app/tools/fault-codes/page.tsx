import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { FaultCodeLookup } from "./FaultCodeLookup";
import "../../detail.css";
import "../tools.css";

export const metadata: Metadata = {
  title: "Aircon Fault Code Lookup · Mitsubishi, Daikin, Fujitsu, LG, Panasonic, Kaden, Brivis",
  description:
    "Free searchable table of the most common aircon fault codes — Mitsubishi Electric, Daikin, Fujitsu, Panasonic, LG, Kaden, Brivis and more. Each entry lists likely cause and first thing to check.",
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
              wall controller — we&rsquo;ll come back with what it means and a fixed-price
              service quote.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/contact" className="ds-btn ds-btn--orange">Send us the code →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost">Call {site.phone}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="bigcta" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <div>
            <h2>Broken unit worth repairing, or time to replace?</h2>
            <p>We give the honest answer — sometimes a new install with the VEU rebate is cheaper than the repair.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a repair-or-replace quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
