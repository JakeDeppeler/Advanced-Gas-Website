import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { site } from "@/lib/site";
import "../detail.css";

export const metadata: Metadata = {
  title: "Get a Free Quote — Pakenham VEU-applied",
  description:
    "Free, no-obligation quote in 60 seconds. Licensed Pakenham aircon and heat pump specialists. We apply the VEU rebate at quote stage.",
  alternates: { canonical: "/quote" },
  robots: { index: true, follow: true },
};

export default function QuotePage() {
  return (
    <div className="page-detail">
      <section className="dp-hero">
        <div className="wrap">
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> Free quote · usually back within 2 hrs
          </div>
          <h1>
            Tell us what you need.<br />
            Get a <span className="accent">fixed price</span>.
          </h1>
          <p className="dp-hero__sub">
            60 seconds, no obligation, no spam. We reply with a written quote within
            <strong style={{ color: "#fff" }}> 2 business hours</strong> — or call us now on{" "}
            <a href={`tel:${site.phoneE164}`} style={{ color: "var(--sky-2)", fontWeight: 700 }}>{site.phone}</a>.
          </p>
        </div>
      </section>

      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> What you get</span>
            <h2>No tricks. Just a real price.</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["VEU rebate handled for you", "Eligible Victorian homes — heat pump installs from around $1,780 after rebate."],
                ["Licensed plumbing & refrigeration", "Compliance certificate provided on completion."],
                ["6-year workmanship warranty", "Triple the industry standard."],
                ["Same-week installation", "Most jobs scheduled within 5–7 days of approval."],
              ].map(([t, d]) => (
                <li key={t} style={{ paddingLeft: 28, position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 0, top: 2,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--orange)", color: "#fff",
                    fontSize: 11, fontWeight: 800,
                  }}>✓</span>
                  <div style={{ fontFamily: "var(--f-display)", fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>{t}</div>
                  <div style={{ fontSize: 14.5, color: "var(--ink-2)" }}>{d}</div>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 24, fontSize: 14, color: "var(--ink-3)" }}>
              Prefer to talk? Call{" "}
              <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", fontWeight: 700 }}>{site.phone}</a> — Mon–Sat.
            </p>
          </div>

          <QuoteForm />
        </div>
      </section>
    </div>
  );
}
