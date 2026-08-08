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
  install: ServiceMegaItem[];
  repair: ServiceMegaItem[];
  popular: { href: string; label: string; sub: string }[];
} = {
  install: [
    {
      href: "/services/air-conditioning-installation#split",
      label: "Split system aircon",
      sub: "Bedroom, living, multi-head",
      photo: "/AP_70-80HP_front-1920x1440-1.png",
      photoAlt: "Mitsubishi MSZ-AP wall split system",
    },
    {
      href: "/services/air-conditioning-installation#multi",
      label: "Multi-head aircon",
      sub: "One outdoor, 2-5 indoor heads",
      photo: "/mac_slide0.jpg",
      photoAlt: "Mitsubishi multi-head system with outdoor condenser",
    },
    {
      href: "/services/air-conditioning-installation#ducted",
      label: "Ducted air conditioning",
      sub: "Whole-home cooling + heating",
      photo: "/kdi-v2-image_01.jpg",
      photoAlt: "Ducted air conditioning indoor unit",
    },
    {
      href: "/services/heat-pump-installation",
      label: "Heat pump hot water",
      sub: "Reclaim · iStore · Thermann · VEU rebate",
      photo: "/270L-istore-heatpump.webp",
      photoAlt: "iStore 270L heat pump hot water system",
    },
    {
      href: "/services/gas-plumbing#continuous-flow",
      label: "Gas continuous flow",
      sub: "Rinnai · Thermann G-series",
      photo: "/G-Series_Front_On_View_1200x900.jpg",
      photoAlt: "Thermann G-series continuous flow gas hot water",
    },
    {
      href: "/services/gas-plumbing#gas-ducted",
      label: "Gas ducted heating",
      sub: "Brivis Wombat / Buffalo · Kaden",
      photo: "/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg",
      photoAlt: "Brivis gas ducted heater",
    },
    {
      href: "/services/air-conditioning-installation#evap",
      label: "Evaporative cooling",
      sub: "Roof-mounted · dry-summer suburbs",
      photo: "/classic_evap_product_image.jpg",
      photoAlt: "Brivis evaporative cooler",
    },
    {
      href: "/brands/zonemate",
      label: "Zoning & smart control",
      sub: "Zonemate touch + Wi-Fi",
      photo: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",
      photoAlt: "Zonemate touch controller in a living room",
    },
  ],
  repair: [
    {
      href: "/services/aircon-servicing-repairs",
      label: "Aircon service & repair",
      sub: "Every major brand, all fuels",
      photo: "/reclaim-mitsubishi.webp",
      photoAlt: "Aircon service on a Mitsubishi split system",
    },
    {
      href: "/services/gas-plumbing#gas-service",
      label: "Gas heater service & CO test",
      sub: "Annual safety check · $280 + GST",
      photo: "/gas-line-safe.webp",
      photoAlt: "Gas line safety check",
    },
    {
      href: "/services/gas-plumbing#hot-water",
      label: "Hot water swap-out",
      sub: "Tank or continuous · same-day",
      photo: "/gas-hot-water-changeover.webp",
      photoAlt: "Gas hot water changeover on install day",
    },
    {
      href: "/contact#emergency",
      label: "Emergency call-out",
      sub: "24/7 · gas leaks, no hot water",
      photo: "/evap-cooler-service.webp",
      photoAlt: "Emergency service callout",
    },
  ],
  popular: [
    { href: "/heat-pumps", label: "Heat pump vs gas", sub: "Cost + rebate breakdown" },
    { href: "/rebates", label: "VEU rebate calculator", sub: "See your out-of-pocket" },
    { href: "/pricing", label: "Full price list", sub: "Every model installed price" },
    { href: "/contact#emergency", label: "24/7 emergency", sub: "Same-day response" },
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
  { label: "Services", trigger: "services", href: "/services", kind: "services" },
  { label: "Brands", trigger: "brands", href: "/brands", kind: "brands" },
  { label: "Areas", trigger: "areas", href: "/service-areas", kind: "areas" },
  { href: "/tools", label: "Tools" },
  { href: "/pricing", label: "Pricing" },
  { href: "/rebates", label: "VEU Rebates", rebate: true },
  { href: "/blog", label: "Blog" },
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
    // Longer delay (300 ms) so the user has time to traverse the diagonal
    // gap from a nav trigger to the viewport-centered mega panel below.
    closeTimer.current = setTimeout(() => setActiveMega(null), 300);
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
      {/* Installation row — full width so the 8 cards get plenty of
          horizontal space and read big. Repair sits underneath as a
          separate strip rather than fighting for width in a sidebar. */}
      <div className="mega__services-block">
        <div className="mega__collabel">Installation</div>
        <div className="mega__services-grid">
          {SERVICES_MEGA.install.map((s) => (
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
      </div>

      <div className="mega__services-block mega__services-block--repair">
        <div className="mega__collabel">Service &amp; repair</div>
        <div className="mega__services-grid mega__services-grid--repair">
          {SERVICES_MEGA.repair.map((s) => (
            <Link key={s.href} href={s.href} role="menuitem" className="mega__servicecard mega__servicecard--sm">
              <div className="mega__servicecard-photo">
                <img src={s.photo} alt={s.photoAlt} loading="lazy" width="80" height="60" />
              </div>
              <div className="mega__servicecard-body">
                <b>{s.label}</b>
                <span>{s.sub}</span>
              </div>
            </Link>
          ))}
        </div>
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
  // Clean text-only cards (matches the iheatandcool competitor look): brand
  // name bold + one-word category subtitle, no photos. Photos looked cluttered
  // in the dropdown, especially when all fallbacks landed on the same install
  // shot. This reads much cleaner and scans faster.
  const brandSubtitle: Record<string, string> = {
    "mitsubishi-electric": "Air Conditioning",
    "reclaim":             "CO₂ Heat Pumps",
    "thermann":            "Heat Pump · Gas · Solar",
    "istore":              "Heat Pump Hot Water",
    "kaden":               "Split · Ducted · Gas · Evap",
    "zonemate":            "Ducted Zoning",
    "brivis":              "Gas Ducted Heating",
  };
  return (
    <div className="mega__brands">
      <div className="mega__brands-head">
        <div className="mega__collabel">Every brand we install</div>
        <Link href="/brands" className="mega__brands-all">See all {brands.length} brands →</Link>
      </div>
      <div className="mega__brands-cleangrid">
        {brands.map((b) => (
          <Link
            key={b.slug}
            href={`/brands/${b.slug}`}
            role="menuitem"
            className="mega__brandtile"
            style={{ ["--card-accent" as string]: b.accent }}
          >
            <b>{b.name}</b>
            <span>{brandSubtitle[b.slug] ?? b.tagline}</span>
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
                  {SERVICES_MEGA.install.map((s) => (
                    <Link key={s.href} href={s.href} onClick={close} className="hdr__drawer-sublink">
                      <b>{s.label}</b>
                      <span>{s.sub}</span>
                    </Link>
                  ))}
                  <div className="hdr__drawer-collabel">Service &amp; repair</div>
                  {SERVICES_MEGA.repair.map((s) => (
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
