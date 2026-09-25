"use client";

import Link from "next/link";
import Image from "next/image";
import { LocalConditions } from "@/components/LocalConditions";
import { usePathname, useRouter } from "next/navigation";
import { crossTo } from "@/components/SiteCross";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { brands } from "@/lib/brands";
import { TIERS } from "@/lib/waterFiltration";
import { SafeImg } from "@/components/SafeImg";
import { HeaderSearch } from "@/components/HeaderSearch";

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
      kind: "services" | "areas" | "pricing" | "company";
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
          href: "/services/air-conditioning-installation/reverse-cycle",
          label: "Reverse cycle",
          sub: "Heats & cools · split or ducted",
          photo: "/Kaden Indoor.jpg",
          photoAlt: "Reverse-cycle wall split heating and cooling a living room",
        },
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
      sub: "Pre-summer clean, pads and pump",
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
 * Four items, in the order somebody actually asks the questions: what
 * do you do, what does it cost, do you come here, who are you.
 *
 * It was eight, then six, and six was still two too many. The two that
 * went are the two that were not questions a customer asks:
 *
 *   Brands  is the answer to "what gear do you fit", which is a part of
 *           "what do you do". It is in the Services menu now, one line
 *           under the categories, and on its own page as before.
 *   Tools   is nine calculators, and every one of them exists to answer
 *           "what will this cost me". They sit under Pricing, which is
 *           where somebody looking for them was already going.
 *
 * Fewer items is not the only gain. Six dropdowns plus a search box, a
 * phone number and a quote button needed 1260px of header, so any
 * browser window narrower than that — which is most laptops with
 * anything docked beside them — got a burger and no nav at all. Four
 * items fit in 1080, so the real nav survives on screens that were
 * losing it.
 *
 * No Commercial item. The switch above the header is the door to that
 * side of the business, and it is a bigger, clearer one than a fifth
 * nav link that reads as just another service.
 */
const NAV: NavItem[] = [
  { label: "Services", trigger: "services", href: "/services", kind: "services" },
  { label: "Pricing", trigger: "pricing", href: "/pricing", kind: "pricing" },
  { label: "Areas", trigger: "areas", href: "/service-areas", kind: "areas" },
  { label: "About", trigger: "company", href: "/about", kind: "company" },
];

/**
 * The nav on the commercial side.
 *
 * Two sites means two navs. Leaving the residential one up over there was the
 * bigger half of the problem: a facility manager reading a capability statement
 * was being offered split systems, brand pages, a domestic price list and
 * eighty suburb pages. Plain links, no mega panels — there is nothing here that
 * needs a panel, and a panel full of residential content would put us straight
 * back where we started.
 */
const COMM_NAV: NavItem[] = [
  { href: "/commercial/what-we-do", label: "What we do" },
  // Clients is a section of the front page rather than a page of its own.
  // It earns a nav slot anyway: "who else have you done this for" is the
  // second thing every builder asks, and burying it inside /commercial
  // means only the people who scroll ever find it.
  { href: "/commercial#jobs", label: "Clients" },
  { href: "/commercial/capability", label: "Capability" },
  { href: "/commercial/about", label: "About" },
  { href: "/commercial/contact", label: "Contact" },
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
 * Every public calculator.
 *
 * The menu renders them from PRICING_GROUPS now, which sorts them by the
 * question they answer rather than listing them flat. This stays as the one
 * enumeration of the lot, which is what the rail's "All N calculators" counts
 * — a hardcoded number there goes stale the first time a tool is added.
 */
const TOOLS_MEGA: { href: string; label: string; sub: string; icon: string; lead?: boolean; tool?: boolean }[] = [
  { href: "/tools/veu-rebate-estimator",     label: "VEU rebate estimator",  sub: "Postcode → rebate range",              icon: "$", tool: true },
  { href: "/tools/sizing-calculator",        label: "Aircon sizing",         sub: "Room dims → kW recommended",           icon: "⌂", tool: true },
  { href: "/tools/heat-pump-sizing",         label: "Heat pump sizing",      sub: "Showers → tank size + reheat time",    icon: "◑", tool: true },
  { href: "/tools/running-cost-calculator",  label: "Running cost",          sub: "$/day, week, year",                    icon: "⚡", tool: true },
  { href: "/tools/hot-water-savings",        label: "Hot water savings",     sub: "Gas / electric → heat pump payback",   icon: "♨", tool: true },
  { href: "/tools/heat-pump-compare",        label: "Heat pump compare",     sub: "Reclaim / iStore / Thermann", icon: "◆", tool: true },
  { href: "/tools/heating-comparator",       label: "Gas vs reverse-cycle",  sub: "Winter running cost + payback",        icon: "❄", tool: true },
  { href: "/tools/system-comparison",        label: "System comparison",     sub: "Split · multi · ducted · gas · evap",  icon: "≡", tool: true },
  { href: "/tools/fault-codes",              label: "Fault code lookup",     sub: "Every major brand, searchable",        icon: "!", tool: true },
];

function isMega(n: NavItem): n is Extract<NavItem, { kind: string }> {
  return "kind" in n;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // A link to a section of a page is never "the page you are on": the
    // commercial nav's Clients points at /commercial#jobs, and matching on
    // the path alone would light it up for the whole front page.
    if (href.includes("#")) return false;
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

  const onCommercial = pathname?.startsWith("/commercial") ?? false;

  /**
   * Crossing between the two sides of the business. The one navigation on the
   * site that gets a transition, because it is the one where the reader
   * genuinely changes context. Modified clicks — new tab, new window — are
   * left alone so the tab still behaves like a link when somebody wants it to.
   */
  function crossOver(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    crossTo(() => router.push(href), href === "/commercial" ? "to-commercial" : "to-home");
  }

  return (
    <>
      {/* Residential and commercial are different readers with different fears,
          so they get different sites. This says so from the first pixel and
          lets either one cross over whenever they like, which an interstitial
          that demands the choice before showing anything cannot do without
          costing rankings and the visitors who were closest to enquiring. */}
      <div className={`sitemode${onCommercial ? " sitemode--comm" : ""}`}>
        {/* No label any more. The two tabs say what they are; a caption in front
            of them just made the control smaller to fit the row. The switch
            sits in the corner, and the run of empty strip beside it carries
            what it is doing outside and whether anyone is in the office. */}
        <div className="wrap sitemode__row">
          {/* One strip, not two. The utility bar above this used to carry the
              location, the hours, the ABN, the emergency line and the phone
              number, then this strip carried the conditions and the switch,
              then the header carried the phone again. Three bars before the
              page started. The ABN and hours live in the footer where
              procurement looks for them; the phone is in the header; what is
              left up here is the live stuff and the one link that cannot wait. */}
          <div className="sitemode__left">
            <LocalConditions />
            <span className="sitemode__loc">Pakenham VIC, within 75&nbsp;km</span>
          </div>
          <div className="sitemode__right">
            <a className="sitemode__emerg" href={onCommercial ? `tel:${site.phoneE164}` : "/contact#emergency"}>
              <span className="sitemode__emergdot" aria-hidden="true" />
              24/7 emergency gas &amp; hot water
            </a>
          <nav className="sitemode__tabs" aria-label="Residential or commercial">
            <Link
              href="/"
              className={`sitemode__tab${onCommercial ? "" : " is-on"}`}
              aria-current={onCommercial ? undefined : "page"}
              onClick={(e) => crossOver(e, "/")}
            >
              Your home
            </Link>
            <Link
              href="/commercial"
              className={`sitemode__tab${onCommercial ? " is-on" : ""}`}
              aria-current={onCommercial ? "page" : undefined}
              onClick={(e) => crossOver(e, "/commercial")}
            >
              Business &amp; commercial
            </Link>
          </nav>
          </div>
        </div>
      </div>

    <header className={`hdr${onCommercial ? " hdr--comm" : ""}`}>
      <div className="wrap hdr__row">
        {/* On the commercial side the logo goes to the commercial home, not the
            residential one. Clicking a logo means "start again", and starting
            again should not also mean "and you are now shopping for a split
            system", the switch above is how you cross over. */}
        <Link
          href={onCommercial ? "/commercial" : "/"}
          className="hdr__logo"
          aria-label={`${site.name} ${onCommercial ? "commercial home" : "home"}`}
        >
          <Image
            src="/advanced-gas-logo.webp"
            alt={`${site.name} logo`}
            width={280}
            height={140}
            className="hdr__logo-img"
            sizes="(max-width: 640px) 88px, 120px"
            priority
          />
        </Link>

        <nav className="hdr__nav" aria-label="Primary">
          {(onCommercial ? COMM_NAV : NAV).map((n) => {
            if (!isMega(n)) {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
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
                    {n.kind === "areas" && <AreasMega />}
                    {n.kind === "pricing" && <PricingMega />}
                    {n.kind === "company" && <CompanyMega />}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hdr__cta">
          <HeaderSearch />
          <a href={`tel:${site.phoneE164}`} className="hdr__phone" aria-label={`Call ${site.name}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>
              <em>Call now</em>
              {site.phone}
            </span>
          </a>
          <Link href={onCommercial ? "/commercial/contact" : "/quote"} className="ds-btn ds-btn--primary">
            {onCommercial ? "Submit a scope →" : "Get free quote →"}
          </Link>
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

      {open && <MobileDrawer close={() => setOpen(false)} onCommercial={onCommercial} />}
    </header>
    </>
  );
}

/* -------------------- Mega panels -------------------- */

type RailItem = { href: string; label: string; sub: string; icon?: string; lead?: boolean };
type RailGroup = { label: string; items: RailItem[] };

/**
 * The Services menu's shape, for the menus that are not Services.
 *
 * Pricing and About were both a flat grid: fourteen cards under one heading,
 * and five. Services solved that problem already — categories down the left,
 * the one you are pointing at on the right — and solving it twice in two
 * different ways is how a site ends up with three kinds of dropdown.
 *
 * The difference is the cards. Services has a photograph of every job; a
 * calculator and a reviews page have a glyph, so this renders rows rather than
 * photo cards. Same rail, same two-pane split, same behaviour on hover and
 * keyboard.
 */
function RailMega({ groups, rail, foot }: {
  groups: RailGroup[];
  rail?: React.ReactNode;
  foot?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const g = groups[active];

  return (
    <div className="megasvc">
      <div className="megasvc__rail" role="tablist" aria-label="Sections">
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
            <span aria-hidden="true">&rarr;</span>
          </button>
        ))}
        {rail}
      </div>

      <div className="megasvc__pane">
        <div className="megarows" key={g.label}>
          {g.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              className={`megarow${it.lead ? " megarow--lead" : ""}`}
            >
              {it.icon && <span className="megarow__ico" aria-hidden="true">{it.icon}</span>}
              <span className="megarow__body">
                <b>{it.label}</b>
                <span>{it.sub}</span>
              </span>
              <span className="megarow__go" aria-hidden="true">&rarr;</span>
            </Link>
          ))}
        </div>
        {foot}
      </div>
    </div>
  );
}


function ServicesMega() {
  /* Two panes: the categories down the left, the active category's
     services on the right. The flat version rendered every service at
     once, nineteen photo cards plus a popular row, which had stopped
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
        {/* One destination, not two. There were two links here — the range
            and the brands — pointing at two indexes of the same catalogue,
            one by what the thing is and one by who made it. The range is the
            one with the sizes and the prices on it, so it is the one that
            stays. Brands is still its own page, in the footer and in search. */}
        <Link href="/range" className="megasvc__range">
          <div>
            <b>The full range</b>
            <span>Every model and size, with prices</span>
          </div>
        </Link>
        <Link href="/quote" className="ds-btn ds-btn--orange megasvc__cta">
          Get a quote →
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

/**
 * Pricing, in the Services menu's shape.
 *
 * It was fourteen items under one heading: five price cards, then nine
 * calculators as a strip of chips under a rule. Everything reachable, nothing
 * ranked — a reader after a rebate figure had to read past the running-cost
 * calculators to find it.
 *
 * Four groups instead, in the order the question gets asked: what does it
 * cost, what comes off it, what does it cost to run, and what size do I need.
 * Fault codes are the one thing that left; it is a lookup, not a price, and it
 * lives in the Services menu under Service & repair where somebody with a
 * flashing light is already looking.
 */
const PRICING_GROUPS: RailGroup[] = [
  {
    label: "Prices",
    items: [
      // The range leads, and is the orange one. It is the page that carries
      // every model with its sizes and its price, which makes it the answer
      // to "what do you sell and what does it cost" — the price list is the
      // same information as a table for somebody who wants a table.
      { href: "/range", label: "The full range", sub: "Every model and size, with prices", icon: "\u2302", lead: true },
      { href: "/pricing", label: "Full price list", sub: "The same numbers, as a table", icon: "\u2261" },
      { href: "/tools/veu-rebate-estimator", label: "Compare pricing", sub: "Your postcode \u2192 what you\u2019d pay", icon: "\u25c6" },
    ],
  },
  {
    label: "Rebates",
    items: [
      { href: "/rebates", label: "VEU rebates", sub: "What you get off, and who qualifies", icon: "$", lead: true },
      { href: "/tools/veu-rebate-estimator", label: "VEU rebate estimator", sub: "Postcode \u2192 rebate range", icon: "$" },
    ],
  },
  {
    label: "Running costs",
    items: [
      { href: "/tools/hot-water-savings", label: "Hot water savings", sub: "Gas or electric \u2192 heat pump payback", icon: "\u2668" },
      { href: "/tools/running-cost-calculator", label: "Running cost", sub: "What it costs a day, a week, a year", icon: "\u26a1" },
      { href: "/tools/heating-comparator", label: "Gas vs reverse-cycle", sub: "Winter running cost and payback", icon: "\u2744" },
    ],
  },
  {
    label: "What size",
    items: [
      { href: "/tools/sizing-calculator", label: "Aircon sizing", sub: "Room dimensions \u2192 kW recommended", icon: "\u2302" },
      { href: "/tools/heat-pump-sizing", label: "Heat pump sizing", sub: "Showers \u2192 tank size and reheat time", icon: "\u25d1" },
      { href: "/tools/heat-pump-compare", label: "Heat pump compare", sub: "Reclaim, iStore and Thermann", icon: "\u25c6" },
      { href: "/tools/system-comparison", label: "System comparison", sub: "Split \u00b7 multi \u00b7 ducted \u00b7 gas \u00b7 evap", icon: "\u2261" },
    ],
  },
];

function PricingMega() {
  return (
    <RailMega
      groups={PRICING_GROUPS}
      rail={
        <>
          <Link href="/range" className="megasvc__range">
            <div>
              <b>Open the full range</b>
              <span>Every model, every size, filterable</span>
            </div>
          </Link>
          <Link href="/quote" className="ds-btn ds-btn--orange megasvc__cta">
            Get a quote &rarr;
          </Link>
        </>
      }
      foot={
        <div className="megasvc__foot">
          <span className="megasvc__footlabel">Worth knowing</span>
          <span className="megarow__note">
            Every number is the installed price with the rebate already off it.
          </span>
          <Link href="/tools" className="megasvc__poplink">All {TOOLS_MEGA.length} calculators</Link>
        </div>
      }
    />
  );
}

/**
 * About, in the same shape.
 *
 * Five rows in a grid became three groups, and the groups pulled in
 * destinations that were previously only reachable from inside other pages.
 * "Who we are" was already five links to five different kinds of thing —
 * the company, photographs, ratings, articles and a phone number — under one
 * heading that only honestly described the first of them.
 */
const COMPANY_GROUPS: RailGroup[] = [
  {
    label: "Who we are",
    items: [
      { href: "/about", label: "About us", sub: "The family, the team, how we work", icon: "\u25c8" },
      { href: "/reviews", label: "Reviews", sub: "4.9/5 on Google", icon: "\u2605" },
      { href: "/gallery", label: "Gallery", sub: "Real installs \u00b7 before and after", icon: "\u25c9" },
    ],
  },
  {
    label: "Guides & advice",
    items: [
      { href: "/blog", label: "The blog", sub: "Guides, rebates and buying advice", icon: "\u270e" },
      { href: "/heat-pumps", label: "Heat pump or gas?", sub: "The hot water fork, with the numbers", icon: "\u2668" },
      { href: "/upgrade-or-repair", label: "Repair or replace?", sub: "The 10-year rule, and the rebate", icon: "\u21ba" },
    ],
  },
  {
    label: "Talk to us",
    items: [
      { href: "/contact", label: "Contact", sub: "Phone, email, where we are", icon: "\u2706" },
      { href: "/contact#emergency", label: "24/7 emergency", sub: "Gas leak, no hot water, CO alarm", icon: "!", lead: true },
      { href: "/quote", label: "Get a quote", sub: "In writing, inside 12 business hours", icon: "\u2261" },
    ],
  },
];

function CompanyMega() {
  return (
    <RailMega
      groups={COMPANY_GROUPS}
      rail={
        <>
          <Link href="/gallery" className="megasvc__range">
            <div>
              <b>See our install gallery</b>
              <span>Photographs from real jobs</span>
            </div>
          </Link>
          <Link href="/quote" className="ds-btn ds-btn--orange megasvc__cta">
            Get a quote &rarr;
          </Link>
        </>
      }
      foot={
        <div className="megasvc__foot">
          <span className="megasvc__footlabel">Since 2014</span>
          <span className="megarow__note">
            Family owned in Pakenham. The same face on the quote as on the tools.
          </span>
        </div>
      }
    />
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

function MobileDrawer({ close, onCommercial }: { close: () => void; onCommercial: boolean }) {
  return (
    <div className="hdr__drawer">
      <div className="wrap hdr__drawer-inner">
        {/* The search box, which until now existed only above 1080px — that is,
            on no phone at all. It is the one control that gets somebody to the
            right page in one move without knowing how the menu is organised,
            and it was hidden from the readers who need it most. First thing in
            the drawer, full width. */}
        <div className="hdr__drawer-search">
          <HeaderSearch />
        </div>
        {/* Same split as the desktop nav. A drawer full of split systems on the
            commercial side would undo the whole point of there being two. */}
        <div className="hdr__drawer-mode">
          <Link href="/" onClick={close} className={onCommercial ? "" : "is-on"}>Your home</Link>
          <Link href="/commercial" onClick={close} className={onCommercial ? "is-on" : ""}>Business &amp; commercial</Link>
        </div>
        {(onCommercial ? COMM_NAV : NAV).map((n) => {
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
                  {/* Brands, which used to be a nav item of its own. Last in
                      the list on purpose: nobody scrolling a phone for "ducted
                      heating" should have to get past them first. */}
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
              {/* The same groups the desktop panel renders, in the same
                  order. They used to be two separate lists and drifted. */}
              {n.kind === "company" && (
                <div className="hdr__drawer-col">
                  {COMPANY_GROUPS.map((grp) => (
                    <div key={grp.label}>
                      <div className="hdr__drawer-collabel">{grp.label}</div>
                      {grp.items.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={close}
                          className={`hdr__drawer-sublink hdr__drawer-sublink--tool${c.lead ? " is-lead" : ""}`}
                        >
                          <span className="hdr__drawer-toolicon" aria-hidden="true">{c.icon}</span>
                          <span className="hdr__drawer-toolbody">
                            <b>{c.label}</b>
                            <span>{c.sub}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {n.kind === "pricing" && (
                <div className="hdr__drawer-col">
                  {PRICING_GROUPS.map((grp) => (
                    <div key={grp.label}>
                      <div className="hdr__drawer-collabel">{grp.label}</div>
                      {grp.items.map((t) => (
                        <Link
                          key={`${grp.label}-${t.href}`}
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
