/**
 * Everywhere in the portal a person can go, in the order the home page shows
 * them.
 *
 * One list, because four things need to agree about it: the home grid, the
 * side bar (whose tabs are the grid's sections), the search box in
 * the top bar, and the capability gate that decides who sees what. Each with
 * its own copy would have drifted within a month.
 *
 * Pure — no React, no database. `can()` is a plain predicate over the user that
 * the caller already has.
 */

import { can, type PortalUser } from "@/lib/portal/caps";
import { SOPS } from "@/lib/portal/sops";

/** Counted, not typed: the card said 24 when it was written and would have gone on saying it. */
const SOP_COUNT = SOPS.reduce((n, s) => n + s.sops.length, 0);

/**
 * The home page's sections, in order, to the design's Home: what the office
 * runs the company from first, the standard and the settings last. `hidden`
 * is for places the search should find that the home grid doesn't carry.
 */
export type NavBand = "run" | "board" | "customers" | "profit" | "marketing" | "crew" | "how-we-work" | "settings" | "hidden";

export const BAND_LABEL: Record<NavBand, string> = {
  run: "Run the company",
  board: "Wall board",
  customers: "Customers & sales",
  profit: "Profit & finance",
  marketing: "Marketing",
  crew: "Crew & vans",
  "how-we-work": "How we work",
  settings: "You & settings",
  hidden: "",
};

/** The grey line beside each heading. */
export const BAND_BLURB: Record<NavBand, string> = {
  run: "How we're tracking, and leads to paid step by step",
  board: "The office screen, and the remote for it",
  customers: "Talking to customers and pricing the work",
  profit: "Margins, the year goal and Xero",
  marketing: "Where the work comes from",
  crew: "The team, the fleet and supplies",
  "how-we-work": "The standard, written down",
  settings: "Your file, alerts and access",
  hidden: "",
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
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  tag: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  chat: "M4 12a8 8 0 1 1 3.4 6.5L3 20l1.5-4.2A8 8 0 0 1 4 12z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  funnel: "M3 4h18l-7 8.5V19l-4 2v-8.5z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  doc: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 8h8M8 12h8M8 16h5",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
};

/**
 * The destinations this person can reach.
 *
 * Gated on the same capabilities the pages themselves check, so the grid never
 * offers a card that redirects straight back with `?denied=1`.
 *
 * `goalLabel` is the year goal as people say it ("$3M"), when one is saved:
 * the design calls the card "The $3M goal", and a card that names a figure
 * nobody set would be naming the wrong one.
 */
export function portalNav(user: PortalUser, opts: { goalLabel?: string | null } = {}): NavItem[] {
  const office = can(user, "overhead");
  const admin = can(user, "manage_users");
  const items: NavItem[] = [];
  const add = (ok: boolean, ...xs: NavItem[]) => { if (ok) items.push(...xs); };

  add(office,
    { href: "/portal/scoreboard", label: "Scoreboard", blurb: "The month and the year in numbers", band: "run", icon: "target", also: ["month", "year", "kpi", "numbers", "target"] },
    { href: "/portal/numbers", label: "The numbers", blurb: "Leads to paid, all in one place", band: "run", icon: "trend", also: ["funnel", "conversion", "leads to paid", "average job"] },
    { href: "/portal/leads", label: "Leads", blurb: "Who's asking, and from where", band: "run", icon: "speaker", also: ["enquiry", "enquiries", "calls", "source"] },
    { href: "/portal/quotes", label: "Quotes", blurb: "What's out, what's sold", band: "run", icon: "tag", also: ["estimate", "quoted", "sold", "close rate", "follow up", "gone quiet"] },
    { href: "/portal/hours", label: "Hours", blurb: "Paid vs billed, by person", band: "run", icon: "clock", also: ["timesheet", "billable", "utilisation"] },
    { href: "/portal/money", label: "Money in", short: "Money", blurb: "Invoices, overdue, plans, VEU", band: "run", icon: "chart", also: ["invoice", "overdue", "debtors", "owing", "paid", "veu", "payment plan"] },
    { href: "/portal/chats", label: "Customer chats", short: "Chats", blurb: "Every quote conversation", band: "customers", icon: "chat", also: ["message", "sms", "customer"] },
    { href: "/portal/customers", label: "One customer", short: "Customer", blurb: "A job from lead to paid", band: "customers", icon: "user", also: ["customer", "job number", "invoice number", "history"] },
    { href: "/trade/pricebook", label: "Pricebook", blurb: "What the iPad shows, and ServiceTitan", band: "customers", icon: "tag", also: ["price", "installed price", "ipad", "servicetitan"] },
    // Beside the goal it paces: Run the company is six across, and a seventh
    // card there sat on a row of its own.
    {
      href: "/portal/pace", label: "Pace", blurb: "What the goal takes, and are we on it", band: "profit", icon: "trend",
      also: ["pace", "on track", "behind", "ahead", "catch up", "leads needed", "quotes needed", "how many", "funnel", "3.2", "target"],
    },
    { href: "/portal/profit", label: "Profit on every job", short: "Job profit", blurb: "Margin, job by job", band: "profit", icon: "trend", also: ["margin", "job costing", "profit"] },
    {
      href: "/portal/goal", label: opts.goalLabel ? `The ${opts.goalLabel} goal` : "Year goal", short: "Goal",
      blurb: "What we need booked each week", band: "profit", icon: "target",
      also: ["goal", "target", "$3m", "profit", "jobs a week", "mix", "budget", "year goal"],
    },
    { href: "/portal/finance", label: "Finance", blurb: "Live profit from Xero", band: "profit", icon: "chart", also: ["xero", "profit", "p&l", "revenue"] },
    {
      href: "/portal/journals", label: "Journal entries", short: "Journals", blurb: "ServiceTitan to Xero, and what didn't go",
      band: "profit", icon: "doc", also: ["journal", "xero sync", "sync error", "accounting", "export", "manual journal"],
    },
    { href: "/portal/website", label: "Website leads", short: "Web leads", blurb: "What the website brings in", band: "marketing", icon: "speaker", also: ["website", "lead", "enquiry", "form"] },
    { href: "/portal/marketing", label: "Campaigns", blurb: "Everything we're running", band: "marketing", icon: "grid", also: ["campaign", "ads", "facebook", "marketing", "social", "brand"] },
    { href: "/portal/website?tab=pages", label: "On the site", blurb: "What people do on each page", band: "marketing", icon: "globe", also: ["page", "views", "traffic", "seo"] },
    { href: "/portal/website?tab=dropoff", label: "Drop-off", blurb: "Where people stop", band: "marketing", icon: "funnel", also: ["drop off", "abandon", "form"] },
    { href: "/portal/marketing?tab=reviews", label: "Reviews", blurb: "Google reviews to answer", band: "marketing", icon: "star", also: ["google", "review", "rating"] },
    { href: "/portal/blog", label: "Blog", blurb: "Posts on the website", band: "marketing", icon: "doc", also: ["article", "post", "write", "publish"] },
  );

  add(can(user, "reports_read"),
    { href: "/portal/team", label: "Team", blurb: "The crew and each person's file", band: "crew", icon: "people", also: ["crew", "people", "staff", "roster"] },
  );
  items.push({ href: "/portal/vehicles", label: "Vehicles", blurb: "Weekly checks, service, damage", band: "crew", icon: "truck", also: ["van", "fleet", "rego", "service", "clean"] });
  add(office,
    { href: "/portal/supply", label: "Supply", blurb: "Reece pricing and orders", band: "crew", icon: "box", also: ["reece", "max", "order", "pricebook", "material"] },
  );
  items.push(
    { href: "/portal/tools/fault-codes", label: "Tools", blurb: "Sizing, rebates, fault codes", band: "crew", icon: "wrench", also: ["calculator", "sizing", "rebate", "fault code"] },
    // The same portal, built for the iPad in the van. Everyone gets it — it
    // shows a person their own work and nothing gated.
    { href: "/trade", label: "See the trade iPad", short: "Trade iPad", blurb: "The portal as a tradie sees it", band: "crew", icon: "tablet", also: ["ipad", "van", "monday", "tradesman", "trade portal", "field"] },
  );
  add(office,
    { href: "/portal/stock", label: "Factory stock", short: "Stock", blurb: "What's on the shelf, who took what", band: "crew", icon: "box", also: ["stock", "factory", "shelf", "inventory"] },
    { href: "/portal/requests", label: "From the crew", short: "Requests", blurb: "Leave, parts, incidents, Take 5s", band: "crew", icon: "bell", also: ["leave", "rdo", "parts order", "incident", "take 5", "near miss", "tool broken"] },
  );

  items.push(
    { href: "/portal/handbook", label: "Handbook", blurb: "The operations manual, A to G", band: "how-we-work", icon: "book", also: ["manual", "policy", "standard"] },
    { href: "/portal/sops", label: "Processes", blurb: `${SOP_COUNT} procedures, one standard`, band: "how-we-work", icon: "list", also: ["sop", "procedure", "checklist"] },
  );
  add(admin,
    { href: "/portal/sops/edit", label: "Edit processes", short: "Edit SOPs", blurb: "Change what the crew sees", band: "how-we-work", icon: "pen", also: ["edit", "procedure", "publish"] },
  );
  items.push(
    { href: "/portal/learning", label: "Learning", blurb: "How-to and method videos", band: "how-we-work", icon: "play", also: ["training", "video", "course"] },
    { href: "/portal/information", label: "Information", short: "Info", blurb: "Prices, licences, contacts", band: "how-we-work", icon: "info", also: ["price list", "licence", "abn", "arc", "contact"] },
    { href: "/portal/me", label: "My file", blurb: "Your leave, goals and reviews", band: "settings", icon: "user", also: ["leave", "holiday", "rdo", "review", "goal"] },
    { href: "/portal/notifications", label: "Notifications", short: "Alerts", blurb: "Everything that needs you", band: "settings", icon: "bell", also: ["alert", "notice", "waiting"] },
  );
  add(admin,
    { href: "/portal/admin", label: "Admin", blurb: "People and what they can open", band: "settings", icon: "shield", also: ["user", "permission", "people"] },
    { href: "/portal/admin/access", label: "Access levels", short: "Access", blurb: "Who sees which page", band: "settings", icon: "grid", also: ["access", "permission", "level", "role"] },
  );

  // Not cards on the home grid, but still places the search should find.
  items.push({ href: "/portal/job-calculator", label: "Job calculator", short: "Job calc", blurb: "Price a job by who's on it", band: "hidden", icon: "calc", also: ["price", "quote", "rate", "labour"] });
  // The wall board's own tab: the remote first, because driving the TV is
  // what people come here to do; then what it shows, then what it aims at.
  add(office,
    {
      href: "/portal/board/remote", label: "Remote", blurb: "What's on the wall now, and change it from here", band: "board", icon: "screen",
      also: ["wall board", "dashboard", "tv", "screen", "remote", "demo", "hold", "show a page", "dark mode", "reload"],
    },
    { href: "/portal/board", label: "What it shows", short: "Pages", blurb: "Each page's figures, and where they come from", band: "board", icon: "chart", also: ["dashboard", "screen", "tv", "live", "feeds"] },
    { href: "/portal/finance/board", label: "Targets & commission", short: "Targets", blurb: "What it aims at, the bonus bands, the working days", band: "board", icon: "target", also: ["commission", "bonus", "working days", "holidays", "board targets"] },
  );
  add(office,
    { href: "/portal/integrations", label: "Integrations", blurb: "ServiceTitan, Xero, Reece — is each one working", band: "hidden", icon: "plug", also: ["servicetitan", "xero", "reece", "sync", "connection"] },
  );

  return items;
}

export const BANDS: NavBand[] = ["run", "board", "customers", "profit", "marketing", "crew", "how-we-work", "settings"];

/** The items of one band, in the order declared above. */
export function byBand(items: NavItem[], band: NavBand): NavItem[] {
  return items.filter((i) => i.band === band);
}

// The section tab strips live in tabSets.ts: the strip is a client component,
// and this module carries the procedures (for the Processes count), which have
// no business in the browser.
export { TAB_SETS, type Tab, type TabSetName } from "@/lib/portal/tabSets";
