import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Thanks, your quote request is in",
  description: "We've received your request and will call in business hours to book your quote visit.",
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
          Got it, we&apos;re on it.
        </h1>
        <p style={{ marginTop: 18, fontSize: 18, color: "var(--ink-2)", maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          Your quote request is in. One of our licensed team will call or text you in
          {" "}<strong style={{ color: "var(--navy)" }}>business hours (Mon&ndash;Fri 7am&ndash;3:30pm)</strong> to confirm the details and book your free quote visit.
          Sent it on a weekend? You&rsquo;re first on the list Monday morning.
        </p>
        <p style={{ marginTop: 14, fontSize: 16, color: "var(--ink-2)", maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          After the visit you get a written quote with the VEU rebate already applied. The number on it is the number you pay.
        </p>
        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--orange ds-btn--lg">
            Or call us now, {site.phone}
          </a>
          <Link href="/" className="ds-btn ds-btn--ghost ds-btn--lg">Back to home</Link>
        </div>
        {/* Conversions are fired by the form that produced the lead (src/lib/track.ts),
            not from this pageview: a pageview can't say which form it came from and
            people land here by accident. */}
      </div>
    </section>
  );
}
