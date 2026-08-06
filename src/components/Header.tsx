"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { brands } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";

/* --------------------------------------------------------------
 * Mega-menu nav data. Simple nav items are links; mega items
 * declare their own custom render kind and payload.
 * ------------------------------------------------------------ */

type ServiceMegaItem = { href: string; label: string; sub: string; photo: string; photoAlt: string };

type NavItem =
  | { href: string; label: string; rebate?: boolean }
  | {
      label: string;
      trigger: string;
      href?: string;
      alignRight?: boolean;
      /** Discriminator on how to render the mega panel. */
      kind: "services" | "brands" | "areas";
    };

const SERVICES_MEGA: {
  primary: ServiceMegaItem[];
  popular: { href: string; label: string; sub: string }[];
} = {
  primary: [
    {
      href: "/services/air-conditioning-installation",
      label: "Air conditioning",
      sub: "Split · multi-head · ducted",
      photo: "/kaden-indoor.webp",
      photoAlt: "Split system air conditioner",
    },
    {
      href: "/services/heat-pump-installation",
      label: "Heat pump hot water",
      sub: "VEU rebate applied at quote",
      photo: "/reclaim-spit-close-up.webp",
      photoAlt: "Reclaim heat pump hot water system",
    },
    {
      href: "/services/gas-plumbing",
      label: "Gas & hot water",
      sub: "Continuous flow, storage, LPG",
      photo: "/gas-hot-water-changeover.webp",
      photoAlt: "Gas hot water installation",
    },
    {
      href: "/services/aircon-servicing-repairs",
      label: "Service & repairs",
      sub: "Every major brand",
      photo: "/duct-work.webp",
      photoAlt: "Aircon service and repairs",
    },
  ],
  popular: [
    { href: "/heat-pumps", label: "Heat pump vs gas", sub: "Cost + rebate breakdown" },
    { href: "/rebates", label: "VEU rebate calculator", sub: "See your out-of-pocket" },
    { href: "/pricing", label: "Full price list", sub: "Every model installed price" },
    { href: "/blog/emergency-hot-water-gas-melbourne", label: "24/7 emergency", sub: "Same-day response" },
  ],
};

const AREAS_MEGA = {
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
};

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { label: "Services", trigger: "services", href: "/services", kind: "services" },
  { label: "Brands", trigger: "brands", href: "/brands", kind: "brands" },
  { label: "Areas", trigger: "areas", href: "/service-areas", alignRight: true, kind: "areas" },
  { href: "/pricing", label: "Pricing" },
  { href: "/rebates", label: "VEU Rebates", rebate: true },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isMega(n: NavItem): n is Extract<NavItem, { kind: string }> {
  return "kind" in n;
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

  useEffect(() => setActiveMega(null), [pathname]);

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
                  <div className={`mega mega--${n.kind}`} role="menu">
                    {n.kind === "services" && <ServicesMega />}
                    {n.kind === "brands" && <BrandsMega />}
                    {n.kind === "areas" && <AreasMega />}
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

      {open && <MobileDrawer close={() => setOpen(false)} />}
    </header>
  );
}

/* -------------------- Mega panels -------------------- */

function ServicesMega() {
  return (
    <div className="mega__services">
      <div className="mega__collabel">Installation</div>
      <div className="mega__services-grid">
        {SERVICES_MEGA.primary.map((s) => (
          <Link key={s.href} href={s.href} role="menuitem" className="mega__servicecard">
            <div className="mega__servicecard-photo">
              <img src={s.photo} alt={s.photoAlt} loading="lazy" width="120" height="90" />
            </div>
            <div className="mega__servicecard-body">
              <b>{s.label}</b>
              <span>{s.sub}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mega__services-foot">
        <div>
          <div className="mega__collabel">Popular</div>
          <ul className="mega__poplist">
            {SERVICES_MEGA.popular.map((p) => (
              <li key={p.href}>
                <Link href={p.href} role="menuitem">
                  <b>{p.label}</b>
                  <span>{p.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mega__cta">
          <div className="mega__cta-sub">60 seconds. No obligation.</div>
          <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
        </div>
      </div>
    </div>
  );
}

function BrandsMega() {
  return (
    <div className="mega__brands">
      <div className="mega__brands-head">
        <div className="mega__collabel">Every brand we install</div>
        <Link href="/brands" className="mega__brands-all">See all 68 models →</Link>
      </div>
      <div className="mega__brands-grid">
        {brands.map((b) => (
          <Link
            key={b.slug}
            href={`/brands/${b.slug}`}
            role="menuitem"
            className="mega__brandcard"
            style={{ ["--card-accent" as string]: b.accent }}
          >
            <div className="mega__brandcard-photo">
              <SafeImg src={b.photo} fallback={b.photoFallback} alt={b.photoAlt} loading="lazy" width="200" height="140" />
            </div>
            <div className="mega__brandcard-body">
              <b>{b.name}</b>
              <span>{b.tagline}</span>
              <em>{b.products.length} models · {b.origin}</em>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AreasMega() {
  return (
    <div className="mega__areas">
      {AREAS_MEGA.columns.map((col) => (
        <div key={col.label} className="mega__col">
          <div className="mega__collabel">{col.label}</div>
          <ul>
            {col.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} role="menuitem">
                  <b>{it.label}</b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mega__cta">
        <div className="mega__cta-sub">Every postcode within 50&nbsp;km of Pakenham.</div>
        <Link href="/service-areas" className="ds-btn ds-btn--orange">See all 46 suburbs →</Link>
      </div>
    </div>
  );
}

/* -------------------- Mobile drawer -------------------- */

function MobileDrawer({ close }: { close: () => void }) {
  return (
    <div className="hdr__drawer">
      <div className="wrap hdr__drawer-inner">
        <a href={`tel:${site.phoneE164}`} onClick={close} className="hdr__drawer-call">
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
                onClick={close}
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
              {n.kind === "services" && (
                <div className="hdr__drawer-col">
                  <div className="hdr__drawer-collabel">Installation</div>
                  {SERVICES_MEGA.primary.map((s) => (
                    <Link key={s.href} href={s.href} onClick={close} className="hdr__drawer-sublink">
                      <b>{s.label}</b>
                      <span>{s.sub}</span>
                    </Link>
                  ))}
                  <div className="hdr__drawer-collabel">Popular</div>
                  {SERVICES_MEGA.popular.map((p) => (
                    <Link key={p.href} href={p.href} onClick={close} className="hdr__drawer-sublink">
                      <b>{p.label}</b>
                      <span>{p.sub}</span>
                    </Link>
                  ))}
                </div>
              )}
              {n.kind === "brands" && (
                <div className="hdr__drawer-col">
                  <div className="hdr__drawer-collabel">Every brand we install</div>
                  {brands.map((b) => (
                    <Link key={b.slug} href={`/brands/${b.slug}`} onClick={close} className="hdr__drawer-sublink">
                      <b>{b.name}</b>
                      <span>{b.tagline}</span>
                    </Link>
                  ))}
                </div>
              )}
              {n.kind === "areas" && (
                <>
                  {AREAS_MEGA.columns.map((col) => (
                    <div key={col.label} className="hdr__drawer-col">
                      <div className="hdr__drawer-collabel">{col.label}</div>
                      {col.items.map((it) => (
                        <Link key={it.href} href={it.href} onClick={close} className="hdr__drawer-sublink">
                          <b>{it.label}</b>
                        </Link>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </details>
          );
        })}

        <Link href="/quote" onClick={close} className="ds-btn ds-btn--orange ds-btn--lg" style={{ marginTop: 12, justifyContent: "center" }}>
          Get a free quote →
        </Link>
      </div>
    </div>
  );
}
