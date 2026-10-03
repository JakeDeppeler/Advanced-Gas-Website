/**
 * Everywhere in the portal a person can go, in the order the home page shows
 * them.
 *
 * One list, because three things need to agree about it: the home grid that is
 * now the only navigation, the search box in the top bar, and the capability
 * gate that decides who sees what. When the sidebar held this, the grid and the
 * search would each have had their own copy and they would have drifted within
 * a month.
 *
 * Pure — no React, no database. `can()` is a plain predicate over the user that
 * the caller already has.
 */

import { can, type PortalUser } from "@/lib/portal/caps";

/** The four bands the home page groups by, in order. */
export type NavBand = "on-the-job" | "how-we-work" | "business" | "settings";

export const BAND_LABEL: Record<NavBand, string> = {
  "on-the-job": "On the job",
  "how-we-work": "How we work",
  business: "Business",
  settings: "You & settings",
};

export type NavItem = {
  href: string;
  /** What the card and the search result call it. */
  label: string;
  /** The one line under the title. Written for someone who hasn't used it. */
  blurb: string;
  band: NavBand;
  /** Key into ICON, below. */
  icon: string;
  /**
   * The one card drawn navy. Exactly one, and it is the thing the crew opens
   * most — a second filled card would just be two cards shouting.
   */
  feature?: boolean;
  /** Extra words a search should match: what people call it, not what we do. */
  also?: string[];
  /** Opens in a new tab. The live board is a display, not a page in here. */
  external?: boolean;
};

/**
 * Stroke paths, 24×24. Kept here beside the items so adding a destination is
 * one edit rather than two files.
 */
export const ICON: Record<string, string> = {
  calc: "M6 3h12v18H6zM9 7h6M9 11h1M13 11h2M9 14h1M13 14v4M9 17h1",
  wrench: "M14 6a3.5 3.5 0 0 0 4.6 4.6L21 13l-3 3-2.4-2.4A3.5 3.5 0 0 0 11 8.2zM10 14l-6 6",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7zM7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  box: "M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10",
  book: "M4 5h11a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4zM20 5h0a3 3 0 0 0-3 3",
  list: "M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12",
  play: "M4 5h16v11H4zM10 8.5l4 2.5-4 2.5zM8 20h8",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10v6M12 7v.5",
  speaker: "M4 9v6h4l5 4V5L8 9zM17 9.5a3.5 3.5 0 0 1 0 5M19.5 7a7 7 0 0 1 0 10",
  chart: "M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 11l2 2 3-3.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.3 3-6 7-6s7 2.7 7 6",
  shield: "M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z",
  screen: "M3 5h18v11H3zM9 20h6M12 16v4",
  tablet: "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10 18h4",
};

/**
 * The destinations this person can reach.
 *
 * Gated on the same capabilities the pages themselves check, so the grid never
 * offers a card that redirects straight back with `?denied=1`.
 */
export function portalNav(user: PortalUser): NavItem[] {
  const items: NavItem[] = [
    {
      href: "/portal/job-calculator", label: "Job calculator", blurb: "Price a job by who's on it",
      band: "on-the-job", icon: "calc", feature: true, also: ["price", "quote", "rate", "labour"],
    },
    {
      href: "/portal/tools", label: "Tools", blurb: "Sizing, rebates, running cost, fault codes",
      band: "on-the-job", icon: "wrench", also: ["calculator", "sizing", "rebate", "fault code"],
    },
    {
      href: "/portal/vehicles", label: "Vehicles", blurb: "Servicing, km, fuel and damage log",
      band: "on-the-job", icon: "truck", also: ["van", "fleet", "rego", "service", "clean"],
    },
    // The same portal, built for the iPad in the van: your own van's Monday
    // jobs, the pricebook, the procedures. Everyone gets it — it shows a
    // person their own work and nothing gated.
    {
      href: "/trade", label: "Trade portal", blurb: "The iPad view: Monday jobs, pricebook, procedures",
      band: "on-the-job", icon: "tablet", also: ["ipad", "van", "monday", "tradesman", "on site", "field"],
    },
    {
      href: "/portal/handbook", label: "Handbook", blurb: "The full operations manual, A to G",
      band: "how-we-work", icon: "book", also: ["manual", "policy", "standard"],
    },
    {
      href: "/portal/sops", label: "Processes", blurb: "The procedures we all run on",
      band: "how-we-work", icon: "list", also: ["sop", "procedure", "checklist"],
    },
    {
      href: "/portal/learning", label: "Learning", blurb: "How-to and method videos",
      band: "how-we-work", icon: "play", also: ["training", "video", "course"],
    },
    {
      href: "/portal/information", label: "Information", blurb: "Prices, licences and contacts",
      band: "how-we-work", icon: "info", also: ["price list", "licence", "abn", "arc", "contact"],
    },
  ];

  if (can(user, "overhead")) {
    items.push(
      {
        href: "/portal/supply", label: "Supply", blurb: "Reece pricing, orders and the pricebook",
        band: "on-the-job", icon: "box", also: ["reece", "max", "order", "pricebook", "material"],
      },
      {
        href: "/portal/marketing", label: "Marketing", blurb: "Website leads, reviews and ads",
        band: "business", icon: "speaker", also: ["lead", "enquiry", "website", "review", "ads"],
      },
      {
        href: "/portal/finance", label: "Finance", blurb: "Live profit from Xero",
        band: "business", icon: "chart", also: ["xero", "profit", "p&l", "revenue", "target", "goal"],
      },
    );
  }

  if (can(user, "reports_read")) {
    items.push({
      href: "/portal/team", label: "Team", blurb: "The crew and each person's file",
      band: "business", icon: "people", also: ["crew", "people", "staff", "roster"],
    });
  }

  if (can(user, "overhead")) {
    items.push(
      {
        href: "/portal/finance/board", label: "Wall board", blurb: "What the office screen is aiming at",
        band: "settings", icon: "screen", also: ["dashboard", "screen", "target", "commission"],
      },
      // The board itself, not its settings. It is gated by a shared token
      // rather than a login, so this goes through a route that checks the
      // session and redirects — which also means nothing here can link to it
      // directly, and it fell off the page entirely when the sidebar went.
      {
        href: "/portal/finance/board/open", label: "Open the live board", blurb: "The office screen, in a new tab",
        band: "settings", icon: "screen", external: true, also: ["dashboard", "tv", "screen", "live"],
      },
    );
  }

  // "You & settings" in the design, with Admin — not the tail of Business.
  items.push({
    href: "/portal/me", label: "My file", blurb: "Your leave, goals and reviews",
    band: "settings", icon: "user", also: ["leave", "holiday", "rdo", "review", "goal"],
  });

  if (can(user, "manage_users")) {
    items.push({
      href: "/portal/admin", label: "Admin", blurb: "Who's on the team and what they see",
      band: "settings", icon: "shield", also: ["access", "permission", "user", "level"],
    });
  }

  return items;
}

export const BANDS: NavBand[] = ["on-the-job", "how-we-work", "business", "settings"];

/** The items of one band, in the order declared above. */
export function byBand(items: NavItem[], band: NavBand): NavItem[] {
  return items.filter((i) => i.band === band);
}

/**
 * Section tabs, which is where the sidebar's children went.
 *
 * Declared here beside the destinations rather than in the component, so the
 * orphan check — does anything link to this route? — has one place to look.
 */
export type Tab = { href: string; label: string; also?: string[] };
export type TabSetName = "finance" | "supply" | "marketing";

export const TAB_SETS: Record<TabSetName, Tab[]> = {
  finance: [
    { href: "/portal/finance", label: "Overview" },
    { href: "/portal/finance/goals", label: "The year" },
    { href: "/portal/finance/pl", label: "Profit & loss" },
    { href: "/portal/finance/capacity", label: "Costs & capacity" },
    { href: "/portal/finance/targets", label: "Targets" },
    // Quotes is a tab inside planning rather than a sibling: both ask about
    // work that has not happened yet.
    { href: "/portal/finance/planning", label: "Planning", also: ["/portal/finance/quotes"] },
  ],
  marketing: [
    { href: "/portal/marketing", label: "Overview" },
    { href: "/portal/finance/leads", label: "Website leads" },
  ],
  supply: [
    { href: "/portal/supply", label: "Overview" },
    { href: "/portal/supply/orders", label: "Orders" },
    { href: "/portal/supply/search", label: "Item search" },
    { href: "/portal/supply/syncs", label: "Sync history" },
    // The connection check is reached from the Overview's button rather than
    // a tab: it is an action that takes a few seconds, not a place.
    { href: "/portal/supply/pricing", label: "Pricing rules", also: ["/portal/supply/health"] },
  ],
};
