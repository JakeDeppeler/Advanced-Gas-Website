"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

/* --------------------------------------------------------------
 * Mega-menu nav data. Each nav item is either a simple link, or a
 * dropdown with a `mega` payload that renders columns of links.
 * ------------------------------------------------------------ */

type MegaColumn = {
  label: string;
  items: { href: string; label: string; sub?: string }[];
};

type NavItem =
  | { href: string; label: string; rebate?: boolean }
  | {
      label: string;
      trigger: string;
      href?: string; // top-level link when the label is clicked (not the trigger)
      /** Anchor the dropdown to the right edge of the trigger. Used for
       *  triggers in the right half of the nav so the panel doesn't
       *  overflow past the viewport. */
      alignRight?: boolean;
      mega: {
        columns: MegaColumn[];
        cta?: { href: string; label: string; sub: string };
      };
    };

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  {
    label: "Services",
    trigger: "services",
    href: "/services",
    mega: {
      columns: [
        {
          label: "Installation",
          items: [
            { href: "/services/air-conditioning-installation", label: "Air conditioning", sub: "Split, multi-head, ducted" },
            { href: "/services/heat-pump-installation", label: "Heat pump hot water", sub: "VEU rebate handled" },
            { href: "/services/gas-plumbing", label: "Gas & hot water", sub: "Continuous flow, storage" },
            { href: "/services/aircon-servicing-repairs", label: "Service & repairs", sub: "All major brands" },
          ],
        },
        {
          label: "Popular",
          items: [
            { href: "/heat-pumps", label: "Heat pump vs gas", sub: "Cost + rebate breakdown" },
            { href: "/rebates", label: "VEU rebate calculator", sub: "See your out-of-pocket" },
            { href: "/blog/ducted-aircon-melbourne-cost-install", label: "Ducted retrofit guide", sub: "Cost, sizing, zoning" },
            { href: "/blog/emergency-hot-water-gas-melbourne", label: "24/7 emergency", sub: "Same-day response" },
          ],
        },
      ],
      cta: { href: "/quote", label: "Get a fixed quote →", sub: "60 seconds. No obligation." },
    },
  },
  {
    label: "Brands",
    trigger: "brands",
    href: "/brands",
    mega: {
      columns: [
        {
          label: "Air conditioning",
          items: [
            { href: "/brands/mitsubishi-electric", label: "Mitsubishi Electric", sub: "22 SKUs · our default premium" },
            { href: "/brands/kaden", label: "Kaden", sub: "15 SKUs · best value split & ducted" },
          ],
        },
        {
          label: "Heat pump hot water",
          items: [
            { href: "/brands/reclaim", label: "Reclaim Energy", sub: "CO₂ · Australian-made premium" },
            { href: "/brands/thermann", label: "Thermann (Rheem)", sub: "14 SKUs · volume brand" },
            { href: "/brands/istore", label: "iStore", sub: "Best VEU rebate outcome" },
          ],
        },
        {
          label: "Zoning",
          items: [
            { href: "/brands/zonemate", label: "Zonemate", sub: "4, 6, 8-zone controllers" },
          ],
        },
      ],
      cta: { href: "/brands", label: "Browse all 68 SKUs →", sub: "Real spec + installed price" },
    },
  },
  {
    label: "Areas",
    trigger: "areas",
    href: "/service-areas",
    alignRight: true,
    mega: {
      columns: [
        {
          label: "Cardinia",
          items: [
            { href: "/areas/pakenham", label: "Pakenham" },
            { href: "/areas/officer", label: "Officer" },
            { href: "/areas/beaconsfield", label: "Beaconsfield" },
            { href: "/areas/bunyip", label: "Bunyip" },
            { href: "/areas/garfield", label: "Garfield" },
          ],
        },
        {
          label: "Casey",
          items: [
            { href: "/areas/berwick", label: "Berwick" },
            { href: "/areas/cranbourne", label: "Cranbourne" },
            { href: "/areas/narre-warren", label: "Narre Warren" },
            { href: "/areas/clyde-north", label: "Clyde North" },
            { href: "/areas/hampton-park", label: "Hampton Park" },
            { href: "/areas/endeavour-hills", label: "Endeavour Hills" },
          ],
        },
        {
          label: "Baw Baw & further",
          items: [
            { href: "/areas/drouin", label: "Drouin" },
            { href: "/areas/warragul", label: "Warragul" },
            { href: "/areas/dandenong", label: "Dandenong" },
          ],
        },
      ],
      cta: { href: "/service-areas", label: "See all 46 suburbs →", sub: "Every postcode within 50km" },
    },
  },
  { href: "/pricing", label: "Pricing" },
  { href: "/rebates", label: "VEU Rebates", rebate: true },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isMega(n: NavItem): n is Extract<NavItem, { mega: unknown }> {
  return "mega" in n;
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Close mega-menu on Escape + when the route changes.
  useEffect(() => {
    setActiveMega(null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMega(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMega = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMega(key);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveMega(null), 160);
  };

  return (
    <header className="hdr">
      <div className="wrap hdr__row">
        <Link href="/" className="hdr__logo" aria-label={`${site.name} home`}>
          {/* Real branded logo asset (single unified image) rather than the
              SVG mark + separate wordmark recreation. The webp has a white
              background that blends with the white nav so it looks clean. */}
          <img
            src="/advanced-gas-logo.webp"
            alt={`${site.name} logo`}
            width="280"
            height="140"
            className="hdr__logo-img"
            fetchPriority="high"
          />
        </Link>

        <nav className="hdr__nav" aria-label="Primary">
          {NAV.map((n) => {
            if (!isMega(n)) {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={[
                    active ? "is-active" : "",
                    "rebate" in n && n.rebate ? "hdr__nav-rebate" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {n.label}
                  {"rebate" in n && n.rebate && <span className="hdr__nav-tag">$$$</span>}
                </Link>
              );
            }
            const isOpen = activeMega === n.trigger;
            const parentHref = n.href ?? "#";
            const active = isActive(parentHref);
            return (
              <div
                key={n.trigger}
                className={[
                  "hdr__navwrap",
                  isOpen ? "is-open" : "",
                  n.alignRight ? "hdr__navwrap--right" : "",
                ].filter(Boolean).join(" ")}
                onMouseEnter={() => openMega(n.trigger)}
                onMouseLeave={scheduleClose}
                onFocus={() => openMega(n.trigger)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose();
                }}
              >
                <Link
                  href={parentHref}
                  className={`hdr__navtrigger ${active ? "is-active" : ""}`}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  {n.label}
                  <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
                    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>

                {isOpen && (
                  <div className="mega" role="menu">
                    <div className="mega__inner">
                      {n.mega.columns.map((col) => (
                        <div key={col.label} className="mega__col">
                          <div className="mega__collabel">{col.label}</div>
                          <ul>
                            {col.items.map((it) => (
                              <li key={it.href}>
                                <Link href={it.href} role="menuitem">
                                  <b>{it.label}</b>
                                  {it.sub && <span>{it.sub}</span>}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {n.mega.cta && (
                        <div className="mega__cta">
                          <div className="mega__cta-sub">{n.mega.cta.sub}</div>
                          <Link href={n.mega.cta.href} className="ds-btn ds-btn--orange">
                            {n.mega.cta.label}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="hdr__drawer">
          <div className="wrap hdr__drawer-inner">
            <a href={`tel:${site.phoneE164}`} onClick={() => setOpen(false)} className="hdr__drawer-call">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
              Call {site.phone}
            </a>

            {NAV.map((n) => {
              if (!isMega(n)) {
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`hdr__drawer-link ${"rebate" in n && n.rebate ? "hdr__drawer-link--rebate" : ""}`}
                  >
                    {n.label}
                    {"rebate" in n && n.rebate && <span className="hdr__nav-tag">$$$</span>}
                  </Link>
                );
              }
              return (
                <details key={n.trigger} className="hdr__drawer-group">
                  <summary>{n.label}</summary>
                  {n.mega.columns.map((col) => (
                    <div key={col.label} className="hdr__drawer-col">
                      <div className="hdr__drawer-collabel">{col.label}</div>
                      {col.items.map((it) => (
                        <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="hdr__drawer-sublink">
                          <b>{it.label}</b>
                          {it.sub && <span>{it.sub}</span>}
                        </Link>
                      ))}
                    </div>
                  ))}
                </details>
              );
            })}

            <Link href="/quote" onClick={() => setOpen(false)} className="ds-btn ds-btn--orange ds-btn--lg" style={{ marginTop: 12, justifyContent: "center" }}>
              Get a free quote →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
