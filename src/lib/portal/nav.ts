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
import { SOPS } from "@/lib/portal/sops";

/** Counted, not typed: the card said 24 when it was written and would have gone on saying it. */
const SOP_COUNT = SOPS.reduce((n, s) => n + s.sops.length, 0);

/** The four bands the home page groups by, in order. */
export type NavBand = "on-the-job" | "how-we-work" | "business" | "operations" | "settings";

export const BAND_LABEL: Record<NavBand, string> = {
  "on-the-job": "On the job",
  "how-we-work": "How we work",
  business: "Business",
  operations: "Operations",
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
  /** The label on a phone, where a tile is a third of 390px: "Job calc", "Info". */
  short?: string;
};

/**
 * Stroke paths, 24×24, from the design's Main.dc.html. Kept here beside the
 * items so adding a destination is one edit rather than two files.
 */
export const ICON: Record<string, string> = {
  calc: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1M16 16h0",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  play: "M4 5h16v14H4zM10 9l5 3-5 3z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  speaker: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  screen: "M3 5h18v11H3zM9 20h6M12 16v4",
  tablet: "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10 18h4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  pen: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  plug: "M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4",
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
      href: "/portal/job-calculator", label: "Job calculator", short: "Job calc", blurb: "Price a job by who's on it",
      band: "on-the-job", icon: "calc", feature: true, also: ["price", "quote", "rate", "labour"],
    },
    {
      href: "/portal/tools/fault-codes", label: "Tools", blurb: "Sizing, rebates, running cost, fault codes",
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
      href: "/portal/sops", label: "Processes", blurb: `${SOP_COUNT} procedures, one standard`,
      band: "how-we-work", icon: "list", also: ["sop", "procedure", "checklist"],
    },
    {
      href: "/portal/learning", label: "Learning", blurb: "How-to and method videos",
      band: "how-we-work", icon: "play", also: ["training", "video", "course"],
    },
    {
      href: "/portal/information", label: "Information", short: "Info", blurb: "Prices, licences and contacts",
      band: "how-we-work", icon: "info", also: ["price list", "licence", "abn", "arc", "contact"],
    },
  ];

  if (can(user, "overhead")) {
    items.push(
      {
        href: "/portal/supply", label: "Supply", blurb: "Reece pricing, orders and the pricebook",
        band: "operations", icon: "box", also: ["reece", "max", "order", "pricebook", "material"],
      },
      {
        href: "/portal/finance", label: "Finance", blurb: "Live profit from Xero",
        band: "business", icon: "chart", also: ["xero", "profit", "p&l", "revenue", "target", "goal"],
      },
      {
        href: "/portal/website", label: "Website", blurb: "Enquiries, which pages work, drop-off",
        band: "business", icon: "globe", also: ["lead", "enquiry", "website", "traffic", "page", "views", "seo"],
      },
      {
        href: "/portal/blog", label: "Blog", blurb: "Every article, its reads, and the editor",
        band: "business", icon: "pen", also: ["article", "post", "write", "publish", "seo", "views"],
      },
      {
        href: "/portal/marketing", label: "Marketing", blurb: "Campaigns, reviews, ads and social",
        band: "business", icon: "speaker", also: ["campaign", "review", "ads", "instagram", "social", "brand"],
      },
    );
  }

  if (can(user, "reports_read")) {
    items.push({
      href: "/portal/team", label: "Team", blurb: "The crew and each person's file",
      band: "operations", icon: "people", also: ["crew", "people", "staff", "roster"],
    });
  }

  if (can(user, "overhead")) {
    items.push(
      {
        href: "/portal/board", label: "Wall board", blurb: "What's on the office screen, and how it works",
        band: "operations", icon: "screen", also: ["dashboard", "screen", "target", "commission", "tv", "live", "open"],
      },
    );
  }

  if (can(user, "overhead")) {
    items.push({
      href: "/portal/integrations", label: "Integrations", blurb: "ServiceTitan, Xero, Reece — is each one working",
      band: "operations", icon: "plug", also: ["servicetitan", "xero", "reece", "sync", "connection", "instagram", "google"],
    });
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

export const BANDS: NavBand[] = ["on-the-job", "how-we-work", "business", "operations", "settings"];

/** The items of one band, in the order declared above. */
export function byBand(items: NavItem[], band: NavBand): NavItem[] {
  return items.filter((i) => i.band === band);
}

// The section tab strips live in tabSets.ts: the strip is a client component,
// and this module carries the procedures (for the Processes count), which have
// no business in the browser.
export { TAB_SETS, type Tab, type TabSetName } from "@/lib/portal/tabSets";
