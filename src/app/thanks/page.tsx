import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Thanks — your quote request is in",
  description: "We've received your request and will be in touch within 2 business hours.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <section style={{ padding: "120px 0", background: "var(--bg)" }}>
      <div className="wrap" style={{ maxWidth: 720, textAlign: "center" }}>
        <div
          style={{
            margin: "0 auto",
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: "var(--orange)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
            fontFamily: "var(--f-display)",
            fontWeight: 800,
            boxShadow: "0 8px 0 #c14a13",
          }}
        >
          ✓
        </div>
        <h1
          style={{
            marginTop: 32,
            fontFamily: "var(--f-display)",
            fontWeight: 900,
            fontSize: "clamp(36px, 4.5vw, 56px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.02,
            color: "var(--navy)",
            textWrap: "balance",
          }}
        >
          Got it — we&apos;re on it.
        </h1>
        <p style={{ marginTop: 18, fontSize: 18, color: "var(--ink-2)", maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          Your quote request is in. One of our licensed team will text or call you within
          {" "}<strong style={{ color: "var(--navy)" }}>2 business hours</strong> with a fixed price (rebate already applied) and the next available install slot.
        </p>
        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--orange ds-btn--lg">
            Or call us now — {site.phone}
          </a>
          <Link href="/" className="ds-btn ds-btn--ghost ds-btn--lg">Back to home</Link>
        </div>
        <p style={{ marginTop: 56, fontFamily: "var(--f-mono)", fontSize: 11.5, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
          {/* Conversion tracking pixels go here — see README. */}
          tracking pixel placeholder · Google Ads · Meta · GA4
        </p>
      </div>
    </section>
  );
}
