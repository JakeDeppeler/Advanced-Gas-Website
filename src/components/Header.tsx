"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/rebates", label: "Rebates", rebate: true },
  { href: "/membership", label: "Membership" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="hdr">
      <div className="wrap hdr__row">
        <Link href="/" className="hdr__logo" aria-label={`${site.name} home`}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogoMark className="h-12 w-12" />
            <span style={{ lineHeight: 0.95 }}>
              <span style={{ display: "block", fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em", color: "var(--navy)" }}>
                Advanced
              </span>
              <span style={{ display: "block", fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 13, color: "var(--sky)" }}>
                Gas &amp; Aircon
              </span>
            </span>
          </div>
        </Link>

        <nav className="hdr__nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={[
                isActive(n.href) ? "is-active" : "",
                "rebate" in n && n.rebate ? "hdr__nav-rebate" : "",
              ].filter(Boolean).join(" ")}
            >
              {n.label}
              {"rebate" in n && n.rebate && <span className="hdr__nav-tag">$$$</span>}
            </Link>
          ))}
        </nav>

        <div className="hdr__cta">
          <a href={`tel:${site.phoneE164}`} className="hdr__phone" aria-label={`Call ${site.name}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>
              <em>Call now</em>
              {site.phone}
            </span>
          </a>
          <Link href="/quote" className="ds-btn ds-btn--primary">Get free quote →</Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="hdr__burger"
          aria-label="Toggle menu"
          aria-expanded={open}
          style={{
            alignItems: "center",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 8,
            cursor: "pointer",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div
          style={{
            borderTop: "1px solid var(--line)",
            background: "var(--bg)",
          }}
        >
          <div className="wrap" style={{ display: "flex", flexDirection: "column", padding: "12px 32px 16px", gap: 2 }}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 8px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "rebate" in n && n.rebate ? "var(--orange)" : "var(--ink)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {n.label}
                {"rebate" in n && n.rebate && <span className="hdr__nav-tag">$$$</span>}
              </Link>
            ))}
            <Link href="/quote" className="ds-btn ds-btn--primary" onClick={() => setOpen(false)} style={{ marginTop: 8 }}>
              Get free quote →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
