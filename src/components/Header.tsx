"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { brands } from "@/lib/brands";
import { TIERS } from "@/lib/waterFiltration";
import { SafeImg } from "@/components/SafeImg";

/* --------------------------------------------------------------
 * Mega-menu nav data. Simple nav items are links; mega items
 * declare their own custom render kind and payload.
 * ------------------------------------------------------------ */

type ServiceMegaItem = {
  href: string;
  label: string;
  sub: string;
  photo: string;
  photoAlt: string;
  /** Shown when `photo` isn't on disk yet. The mega renders client-side,
   *  so SafeImg's onError fires after hydration and actually works here —
   *  unlike in server-rendered page content, where it doesn't. */
  photoFallback?: string;
};

type NavItem =
  | { href: string; label: string }
  | {
      label: string;
      trigger: string;
      href?: string;
      alignRight?: boolean;
      /** Discriminator on how to render the mega panel. */
      kind: "services" | "brands" | "areas" | "pricing" | "tools" | "company";
    };

/**
 * Services mega.
 *
 * Rebuilt into four labelled groups plus a service-and-repair row.
 *
 * What was wrong with the old shape: `primary` was rendered under a
 * "Service & repair" heading but contained "Aircon", "Gas heater" and
 * "Temporary hot water", none of which are repairs. `install` had grown
 * to ten flat items with no grouping. `repair` existed in the data and
 * rendered nowhere on desktop. Several services appeared twice under
 * different labels, which is how you end up with two links to the same
 * page that look like different things.
 *
 * Now: every service appears exactly once, grouped the way a customer
 * thinks about it — what am I trying to heat, cool, wash in, or get
 * fixed — and desktop and mobile render the same structure from the
 * same arrays.
 */
const SERVICES_MEGA: {
  groups: { label: string; items: ServiceMegaItem[] }[];
  repair: ServiceMegaItem[];
  popular: { href: string; label: string; sub: string }[];
} = {
  groups: [
    {
      label: "Air conditioning",
      items: [
        {
          href: "/services/air-conditioning-installation/split",
          label: "Split system",
          sub: "Bedroom, living, one room at a time",
          photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
          photoAlt: "Mitsubishi MSZ-AP wall split system",
        },
        {
          href: "/services/air-conditioning-installation/multi",
          label: "Multi-head",
          sub: "One outdoor unit, 2–5 indoor heads",
          photo: "/mac_slide0.jpg",
          photoAlt: "Mitsubishi multi-head system with outdoor condenser",
        },
        {
          href: "/services/air-conditioning-installation/ducted",
          label: "Ducted air conditioning",
          sub: "Whole-home cooling and heating",
          photo: "/kdi-v2-image_01.webp",
          photoAlt: "Ducted air conditioning indoor unit",
        },
        {
          href: "/services/air-conditioning-installation/evap",
          label: "Evaporative cooling",
          sub: "Roof-mounted, dry-summer suburbs",
          photo: "/classic_evap_product_image.jpg",
          photoAlt: "Brivis evaporative cooler",
        },
      ],
    },
    {
      label: "Heating",
      items: [
        {
          href: "/services/gas-plumbing/gas-ducted",
          label: "Gas ducted heating",
          sub: "Brivis Wombat / Buffalo · Kaden",
          photo: "/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg",
          photoAlt: "Brivis gas ducted heater",
        },
        {
          href: "/brands/zonemate",
          label: "Zoning & smart control",
          sub: "Zonemate touch + Wi-Fi",
          photo: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",
          photoAlt: "Zonemate touch controller in a living room",
        },
        {
          href: "/services/gas-plumbing/gas-service",
          label: "Gas heater service & CO test",
          sub: "Annual safety check · $280 + GST",
          photo: "/gas-ducted-install.webp",
          photoAlt: "Gas ducted heater in a roof space",
        },
      ],
    },
    {
      label: "Hot water",
      items: [
        {
          href: "/services/heat-pump-installation/split-heat-pump",
          label: "Split heat pump",
          sub: "Reclaim CO₂ · Panasonic · 160–400 L",
          photo: "/reclaim-split-stand-back-shot.webp",
          photoAlt: "Reclaim CO₂ split heat pump against a brick wall",
        },
        {
          href: "/services/heat-pump-installation/all-in-one",
          label: "All-in-one heat pump",
          sub: "iStore · Reclaim ECO · Thermann ECO",
          photo: "/270L-istore-heatpump.webp",
          photoAlt: "iStore 270L all-in-one heat pump hot water system",
        },
        {
          href: "/services/gas-plumbing/continuous-flow",
          label: "Gas continuous flow",
          sub: "Rinnai · Thermann G-series",
          photo: "/G-Series_Front_On_View_1200x900.jpg",
          photoAlt: "Thermann G-series continuous flow gas hot water",
        },
        {
          href: "/services/gas-plumbing/temporary-hot-water",
          label: "Temporary hot water hire",
          sub: "$30/day while you decide",
          photo: "/gas-hot-water-changeover.webp",
          photoAlt: "Temporary hot water unit connected during a changeover",
        },
      ],
    },
    {
      label: "Gas",
      items: [
        {
          href: "/services/gas-plumbing",
          label: "Gas fitting & leak detection",
          sub: "Appliance connections, pressure testing",
          photo: "/gas-line.webp",
          photoAlt: "Excavator trenching for a new gas line",
        },
        {
          href: "/contact#emergency",
          label: "24/7 emergency call-out",
          sub: "Gas leaks, no hot water, CO alarms",
          photo: "/gas hot water change over same day.webp",
          photoAlt: "Same-day hot water changeover",
        },
      ],
    },
  ],
  repair: [
    {
      href: "/services/aircon-servicing-repairs",
      label: "Aircon service & repair",
      sub: "Every major brand, all fuels",
      photo: "/ducted-split.webp",
      photoAlt: "Ducted indoor unit in a roof space",
    },
    {
      href: "/services/aircon-servicing-repairs/evap",
      label: "Evap cooler service",
      sub: "Pre-summer clean, water tune-up",
      photo: "/evap-cooler-service.webp",
      photoAlt: "Roof-mounted evaporative cooler service",
    },
    {
      href: "/tools/fault-codes",
      label: "Fault code lookup",
      sub: "Search your code before you call",
      photo: "/Brivis touch tablet controller.jpg",
      photoAlt: "Brivis controller showing a fault code",
    },
    {
      // Sits with the fault codes rather than in Tools: it isn't a
      // calculator, it's the decision you make once you know what the
      // code means.
      href: "/upgrade-or-repair",
      label: "Repair or replace?",
      sub: "The 10-year rule, and the rebate",
      photo: "/ba-hw-before.webp",
      photoAlt: "An old hot water system at the end of its life",
    },
  ],
  popular: [
    { href: "/heat-pumps", label: "Heat pump vs gas", sub: "Cost + rebate breakdown" },
    { href: "/rebates", label: "VEU rebate calculator", sub: "See your out-of-pocket" },
    { href: "/pricing", label: "Full price list", sub: "Every model installed price" },
    { href: "/gallery", label: "Recent installs", sub: "Photos from real jobs" },
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
    {
      // Outer ring. Booked installs rather than same-day work — the
      // suburb pages say so themselves.
      label: "Eastern suburbs",
      items: [
        { href: "/areas/ringwood", label: "Ringwood" },
        { href: "/areas/croydon", label: "Croydon" },
        { href: "/areas/glen-waverley", label: "Glen Waverley" },
        { href: "/areas/wheelers-hill", label: "Wheelers Hill" },
        { href: "/areas/vermont-south", label: "Vermont South" },
        { href: "/areas/wantirna-south", label: "Wantirna South" },
      ],
    },
  ],
};

/**
 * Five items, all of them dropdowns, in the order somebody actually
 * asks the questions: what do you do, what gear, what does it cost, do
 * you come here, who are you. The quote button answers the sixth.
 *
 * It was eight. Tools and Rebates were both "help me work out what
 * I'll pay", so they live under Pricing now — the VEU rebate leads that
 * menu in orange, which is more prominence than it had as one item
 * among eight. Contact went because the phone number and the quote
 * button sit two inches to the right of where it used to be; it's still
 * in the About menu and the footer.
 */
const NAV: NavItem[] = [
  { label: "Services", trigger: "services", href: "/services", kind: "services" },
  { label: "Brands", trigger: "brands", href: "/brands", kind: "brands" },
  { label: "Pricing", trigger: "pricing", href: "/pricing", kind: "pricing" },
  { label: "Tools", trigger: "tools", href: "/tools", kind: "tools" },
  { label: "Areas", trigger: "areas", href: "/service-areas", kind: "areas" },
  { label: "About", trigger: "company", href: "/about", kind: "company" },
];

/**
 * The filtration categories as service-mega rows. Filtration is not a
 * top-level nav item — it lives in the Services tab like everything else
 * we sell.
 */
const WATER_SERVICE_ITEMS: ServiceMegaItem[] = TIERS.map((t) => ({
  href: `/water-filtration/${t.slug}`,
  label: t.label,
  sub: t.tagline,
  photo: t.productPhoto,
  photoAlt: t.productPhotoAlt,
  // Not every tier has a product shot yet; the diagram is drawn for all
  // of them and reads fine at thumbnail size.
  photoFallback: t.diagram,
}));

const COMPANY_MEGA: { href: string; label: string; sub: string; icon: string }[] = [
  { href: "/about",     label: "About us",   sub: "The family, the team, how we work", icon: "◈" },
  { href: "/gallery",   label: "Gallery",    sub: "Real installs · before & after",    icon: "◉" },
  { href: "/reviews",   label: "Reviews",    sub: "4.9/5 on Google",            icon: "★" },
  { href: "/blog",      label: "Blog",       sub: "Guides, rebates + buying advice",   icon: "✎" },
  { href: "/contact",   label: "Contact",    sub: "Phone, email, where we are",        icon: "✆" },
];

/**
 * The Pricing menu. The first two rows are the destinations people came
 * for — the rebate and the price list — and everything under them is a
 * calculator that helps work one of those two numbers out.
 *
 * `lead` marks the rebate row. It carried an orange badge in the top
 * nav before this menu existed, and losing that entirely would have
 * been a real cost; here it gets a full orange card instead.
 */
/**
 * The Pricing menu. Five destinations, all of them about what a job
 * costs: the price list itself, the rebate, the two things that compare
 * prices, and the range with every installed price on it.
 */
const PRICING_MEGA: { href: string; label: string; sub: string; icon: string; lead?: boolean }[] = [
  { href: "/rebates",                    label: "VEU rebates",        sub: "What you get off, and who qualifies",  icon: "$", lead: true },
  { href: "/pricing",                    label: "Full price list",    sub: "Every model, installed price",         icon: "≡" },
  { href: "/tools/veu-rebate-estimator", label: "Compare pricing",    sub: "Your postcode → what you'd pay",       icon: "◆" },
  { href: "/range",                      label: "The full range",     sub: "Every model we install, filterable",   icon: "⌂" },
  { href: "/tools/hot-water-savings",    label: "What it costs to run", sub: "Payback on a heat pump swap",        icon: "⚡" },
];

const TOOLS_MEGA: { href: string; label: string; sub: string; icon: string; lead?: boolean; tool?: boolean }[] = [
  { href: "/tools/veu-rebate-estimator",     label: "VEU rebate estimator",  sub: "Postcode → rebate range",              icon: "$", tool: true },
  { href: "/tools/sizing-calculator",        label: "Aircon sizing",         sub: "Room dims → kW recommended",           icon: "⌂", tool: true },
  { href: "/tools/heat-pump-sizing",         label: "Heat pump sizing",      sub: "Showers → tank size + reheat time",    icon: "◑", tool: true },
  { href: "/tools/running-cost-calculator",  label: "Running cost",          sub: "$/day, week, year",                    icon: "⚡", tool: true },
  { href: "/tools/hot-water-savings",        label: "Hot water savings",     sub: "Gas / electric → heat pump payback",   icon: "♨", tool: true },
  { href: "/tools/heat-pump-compare",        label: "Heat pump compare",     sub: "Reclaim / iStore / Thermann / Sanden", icon: "◆", tool: true },
  { href: "/tools/heating-comparator",       label: "Gas vs reverse-cycle",  sub: "Winter running cost + payback",        icon: "❄", tool: true },
  { href: "/tools/system-comparison",        label: "System comparison",     sub: "Split · multi · ducted · gas · evap",  icon: "≡", tool: true },
  { href: "/tools/fault-codes",              label: "Fault code lookup",     sub: "Every major brand, searchable",        icon: "!", tool: true },
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
                  className={active ? "is-active" : undefined}
                >
                  {n.label}
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
                    {n.kind === "pricing" && <PricingMega />}
                    {n.kind === "tools" && <ToolsMega />}
                    {n.kind === "company" && <CompanyMega />}
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
  /* Two panes: the categories down the left, the active category's
     services on the right. The flat version rendered every service at
     once — nineteen photo cards plus a popular row — which had stopped
     being a menu and started being a page. Now you scan five words,
     land on the one that matches your problem, and see three or four
     choices instead of nineteen. */
  const [active, setActive] = useState(0);
  const groups = [
    ...SERVICES_MEGA.groups,
    { label: "Water filtration", items: WATER_SERVICE_ITEMS },
    { label: "Service & repair", items: SERVICES_MEGA.repair },
  ];
  const g = groups[active];

  return (
    <div className="megasvc">
      <div className="megasvc__rail" role="tablist" aria-label="Service categories">
        {groups.map((grp, i) => (
          <button
            key={grp.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`megasvc__railbtn${i === active ? " is-on" : ""}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            {grp.label}
            <span aria-hidden="true">→</span>
          </button>
        ))}
        <Link href="/range" className="megasvc__range">
          <b>The full range</b>
          <span>Every model, filterable</span>
        </Link>
        <Link href="/quote" className="ds-btn ds-btn--orange megasvc__cta">
          Get a fixed quote →
        </Link>
      </div>

      <div className="megasvc__pane">
        {/* keyed so the card grid re-animates on category change */}
        <div className="megasvc__grid" key={g.label}>
          {g.items.map((s) => (
            <Link key={s.href} href={s.href} role="menuitem" className="mega__servicecard">
              <div className="mega__servicecard-photo">
                <SafeImg src={s.photo} fallback={s.photoFallback} alt={s.photoAlt} loading="lazy" width="120" height="90" />
              </div>
              <div className="mega__servicecard-body">
                <b>{s.label}</b>
                <span>{s.sub}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="megasvc__foot">
          <span className="megasvc__footlabel">Popular</span>
          {SERVICES_MEGA.popular.map((pop) => (
            <Link key={pop.href} href={pop.href} role="menuitem" className="megasvc__poplink">
              {pop.label}
            </Link>
          ))}
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

function PricingMega() {
  return (
    <div className="mega__tools mega__pricing">
      <div className="mega__toolshead">
        <div className="mega__collabel">What a job costs</div>
        <Link href="/pricing" className="mega__toolsall">Open the full price list →</Link>
      </div>
      <div className="mega__toolsgrid">
        {PRICING_MEGA.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="menuitem"
            className={`mega__toolcard${t.lead ? " mega__toolcard--lead" : ""}`}
          >
            <span className="mega__toolicon" aria-hidden="true">{t.icon}</span>
            <div className="mega__toolbody">
              <b>{t.label}</b>
              <span>{t.sub}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mega__toolsfoot">
        <div className="mega__cta-sub">Every number is the installed price with the rebate already off it.</div>
        <div className="mega__toolsbtns">
          <Link href="/range" className="ds-btn ds-btn--ghost">The full range →</Link>
          <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
        </div>
      </div>
    </div>
  );
}

function ToolsMega() {
  return (
    <div className="mega__tools">
      <div className="mega__toolshead">
        <div className="mega__collabel">Free tools &amp; calculators</div>
        <Link href="/tools" className="mega__toolsall">See all {TOOLS_MEGA.length} tools →</Link>
      </div>
      <div className="mega__toolsgrid">
        {TOOLS_MEGA.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="menuitem"
            className={`mega__toolcard${t.lead ? " mega__toolcard--lead" : ""}`}
          >
            <span className="mega__toolicon" aria-hidden="true">{t.icon}</span>
            <div className="mega__toolbody">
              <b>{t.label}</b>
              <span>{t.sub}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mega__toolsfoot">
        <div className="mega__cta-sub">Prefer a real quote? We&rsquo;ll answer inside 12 business hours.</div>
        {/* The price list gets a button as well as a card. It's the
            destination the menu is named after, and a row in a grid of
            eleven is easy to read past. */}
        <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
      </div>
    </div>
  );
}

function CompanyMega() {
  return (
    <div className="mega__tools">
      <div className="mega__toolshead">
        <div className="mega__collabel">Who we are</div>
        <Link href="/gallery" className="mega__toolsall">See our install gallery →</Link>
      </div>
      <div className="mega__toolsgrid">
        {COMPANY_MEGA.map((c) => (
          <Link key={c.href} href={c.href} role="menuitem" className="mega__toolcard">
            <span className="mega__toolicon" aria-hidden="true">{c.icon}</span>
            <div className="mega__toolbody">
              <b>{c.label}</b>
              <span>{c.sub}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mega__toolsfoot">
        <div className="mega__cta-sub">Family owned since 2014 · same face on the quote as on the tools.</div>
        <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote →</Link>
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
        <div className="mega__cta-sub">Every postcode within 75&nbsp;km of Pakenham.</div>
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
        {NAV.map((n) => {
          if (!isMega(n)) {
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={close}
                className="hdr__drawer-link"
              >
                {n.label}
              </Link>
            );
          }
          return (
            <details key={n.trigger} className="hdr__drawer-group">
              <summary>{n.label}</summary>
              {n.kind === "services" && (
                <div className="hdr__drawer-col">
                  {/* Same groups as the desktop mega, same order, same
                      arrays. They used to diverge, which meant a service
                      you could find on a phone was missing on a laptop. */}
                  {SERVICES_MEGA.groups.map((g) => (
                    <div key={g.label}>
                      <div className="hdr__drawer-collabel">{g.label}</div>
                      {g.items.map((s) => (
                        <Link key={s.href} href={s.href} onClick={close} className="hdr__drawer-sublink">
                          <b>{s.label}</b>
                          <span>{s.sub}</span>
                        </Link>
                      ))}
                    </div>
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
                    <Link
                      key={b.slug}
                      href={`/brands/${b.slug}`}
                      onClick={close}
                      className="hdr__drawer-sublink hdr__drawer-sublink--brand"
                      style={{ ["--brand-accent" as string]: b.accent }}
                    >
                      <span className="hdr__drawer-brandstripe" aria-hidden="true" />
                      <span className="hdr__drawer-brandbody">
                        <b>{b.name}</b>
                        <span>{b.tagline}</span>
                      </span>
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
              {n.kind === "company" && (
                <div className="hdr__drawer-col">
                  <div className="hdr__drawer-collabel">Who we are</div>
                  {COMPANY_MEGA.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={close}
                      className="hdr__drawer-sublink hdr__drawer-sublink--tool"
                    >
                      <span className="hdr__drawer-toolicon" aria-hidden="true">{c.icon}</span>
                      <span className="hdr__drawer-toolbody">
                        <b>{c.label}</b>
                        <span>{c.sub}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {n.kind === "pricing" && (
                <div className="hdr__drawer-col">
                  <div className="hdr__drawer-collabel">What a job costs</div>
                  {PRICING_MEGA.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={close}
                      className={`hdr__drawer-sublink hdr__drawer-sublink--tool${t.lead ? " is-lead" : ""}`}
                    >
                      <span className="hdr__drawer-toolicon" aria-hidden="true">{t.icon}</span>
                      <span className="hdr__drawer-toolbody">
                        <b>{t.label}</b>
                        <span>{t.sub}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {n.kind === "tools" && (
                <div className="hdr__drawer-col">
                  <div className="hdr__drawer-collabel">Prices, rebates &amp; calculators</div>
                  {TOOLS_MEGA.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={close}
                      className="hdr__drawer-sublink hdr__drawer-sublink--tool"
                    >
                      <span className="hdr__drawer-toolicon" aria-hidden="true">{t.icon}</span>
                      <span className="hdr__drawer-toolbody">
                        <b>{t.label}</b>
                        <span>{t.sub}</span>
                      </span>
                    </Link>
                  ))}
                </div>
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
