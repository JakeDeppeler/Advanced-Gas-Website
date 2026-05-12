import Link from "next/link";

export default function NotFound() {
  return (
    <section style={{ padding: "120px 0", background: "var(--bg)", textAlign: "center" }}>
      <div className="wrap" style={{ maxWidth: 640 }}>
        <h1
          style={{
            fontFamily: "var(--f-display)",
            fontWeight: 900,
            fontSize: "clamp(80px, 12vw, 140px)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "var(--navy)",
            margin: 0,
          }}
        >
          404
        </h1>
        <p style={{ marginTop: 16, fontSize: 19, color: "var(--ink-2)" }}>
          That page doesn&apos;t exist. Try the homepage or get a quote.
        </p>
        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          <Link href="/" className="ds-btn ds-btn--ghost">Home</Link>
          <Link href="/quote" className="ds-btn ds-btn--orange">Free Quote</Link>
        </div>
      </div>
    </section>
  );
}
