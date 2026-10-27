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

  // First, because it's what the office works from all day — and open to
  // anyone with the pipeline switch, not only those who see the money.
  add(office || can(user, "quotes"), {
    href: "/portal/pipeline", label: "Quote pipeline", short: "Pipeline", blurb: "Every quote out, and who's chasing it", band: "run", icon: "funnel",
    also: ["quotes", "quote", "estimate", "quoted", "sold", "won", "lost", "close rate", "follow up", "gone quiet", "chase", "call back", "pipeline"],
  });

  // Answered by whoever runs the pipeline, like the pipeline itself.
  add(office || can(user, "quotes"), {
    href: "/portal/chats", label: "Customer chats", short: "Chats", blurb: "Website, Messenger and Instagram, with drafted replies", band: "customers", icon: "chat",
    also: ["message", "messages", "messenger", "instagram", "facebook", "dm", "chat", "website chat", "inbox", "reply", "customer"],
  });

  add(office,
    { href: "/portal/leads", label: "Leads", blurb: "Who's asking, and from where", band: "run", icon: "speaker", also: ["enquiry", "enquiries", "calls", "source"] },
    { href: "/portal/not-billed", label: "Not billed", blurb: "Jobs done with no invoice yet", band: "run", icon: "doc", also: ["unbilled", "invoice", "to bill", "billing", "not invoiced", "jobs done"] },
    { href: "/portal/hours", label: "Hours", blurb: "Time on the tools, by person", band: "run", icon: "clock", also: ["timesheet", "billable", "utilisation", "on the tools", "clock in"] },
    {
      href: "/portal/tracker", label: "Job tracker", short: "Tracker", band: "run", icon: "list",
      blurb: "Every job from enquiry to paid, in the stage it's stuck at",
      also: ["job status", "where is", "pipeline", "lost jobs", "not closed", "left open", "still open", "close out", "quote visit", "to quote", "not quoted", "not sent", "to book", "not booked", "enquiry", "on hold", "to invoice", "overdue", "imported", "old jobs", "start to finish", "tracker"],
    },
    {
      href: "/portal/stuck", label: "Stuck money", short: "Stuck", band: "run", icon: "chart",
      blurb: "Done but not billed, billed but not paid, and jobs that have stopped",
      also: ["stuck", "not billed", "unbilled", "to bill", "not invoiced", "not paid", "overdue", "aged", "ageing", "backlog", "on hold", "letting jobs go", "leak", "chase"],
    },
    { href: "/portal/money", label: "Owed to us", short: "Owed", blurb: "Unpaid invoices, real estate and domestic, oldest first", band: "run", icon: "chart", also: ["invoice", "overdue", "debtors", "owing", "paid", "money in", "real estate", "agents", "chase"] },
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
    { href: "/portal/finance", label: "Profit & finance", short: "Finance", blurb: "Profit, margin, the bank and what’s owed, from Xero", band: "profit", icon: "chart", also: ["xero", "profit", "p&l", "revenue"] },
    {
      href: "/portal/finance/review", label: "How we went", short: "How we went", blurb: "A month or week, and why it went that way", band: "profit", icon: "chart",
      also: ["review", "month", "week", "why", "loss", "not in profit", "overheads high", "owed", "waiting on payment", "big job", "how did we go"],
    },
    { href: "/portal/finance/owe", label: "We owe", short: "We owe", blurb: "Bills to pay, in the order to pay them", band: "profit", icon: "list", also: ["bills", "payables", "creditors", "owe", "suppliers", "reece", "ato", "due"] },
    { href: "/portal/finance/cash", label: "Cash flow", short: "Cash", blurb: "The bank each month, and how many weeks it covers", band: "profit", icon: "trend", also: ["cash", "cash flow", "bank", "money out", "money in", "buffer", "cash to operate", "running costs"] },
    { href: "/portal/finance/spend", label: "Spending", short: "Spending", blurb: "Every cost from Xero, against the same stretch before", band: "profit", icon: "list", also: ["spending", "costs", "expenses", "overheads", "parts", "where the money went", "up", "down"] },
    {
      href: "/portal/finance/hourly", label: "Our hourly rate", short: "Hourly rate", blurb: "What makes up an hour, and what we charge", band: "profit", icon: "clock",
      also: ["hourly", "charge out", "charge-out", "rate", "cost per hour", "break down", "overhead per hour", "utilisation", "billable hours"],
    },
    {
      href: "/portal/rates/onsite", label: "On site & commercial rates", short: "On site", blurb: "Crew rates for an install that fills the day, and for commercial work", band: "profit", icon: "clock",
      also: ["commercial", "commercial rate", "on site", "onsite", "install rate", "day rate", "all day", "site rate", "tender"],
    },
    {
      href: "/portal/finance/cover", label: "What an hour must cover", short: "Cover the hour", blurb: "Overheads and pay over the hours we bill, what-ifs, and each person's billed day", band: "profit", icon: "clock",
      also: ["break even", "break-even", "overhead", "6 of 8", "billable", "billed hours", "efficiency", "productivity", "hours billed", "add a person", "apprentice", "per hour"],
    },
    {
      href: "/portal/finance/running", label: "Running costs", short: "Running costs", blurb: "Every overhead, and what it does with another van", band: "profit", icon: "list",
      also: ["overheads", "overhead list", "running costs", "fixed costs", "cost to run", "more vans", "another van", "scale", "per van", "grow", "more people"],
    },
    {
      href: "/portal/journals", label: "Journal entries", short: "Journals", blurb: "ServiceTitan to Xero, and what didn't go",
      band: "profit", icon: "doc", also: ["journal", "xero sync", "sync error", "accounting", "export", "manual journal"],
    },
    { href: "/portal/website", label: "Website leads", short: "Web leads", blurb: "What the website brings in", band: "marketing", icon: "speaker", also: ["website", "lead", "enquiry", "form"] },
    { href: "/portal/marketing", label: "Campaigns", blurb: "Everything we're running", band: "marketing", icon: "grid", also: ["campaign", "ads", "facebook", "marketing", "social", "brand"] },
    { href: "/portal/website?tab=pages", label: "On the site", blurb: "What people do on each page", band: "marketing", icon: "globe", also: ["page", "views", "traffic", "seo"] },
    { href: "/portal/website?tab=dropoff", label: "Drop-off", blurb: "Where people stop", band: "marketing", icon: "funnel", also: ["drop off", "abandon", "form"] },
    { href: "/portal/marketing?tab=emails", label: "Email list", blurb: "Everyone we can email, to export", band: "marketing", icon: "list", also: ["email", "mailing list", "newsletter", "export", "csv", "unsubscribe", "edm"] },
    { href: "/portal/marketing?tab=reviews", label: "Reviews", blurb: "Google reviews to answer", band: "marketing", icon: "star", also: ["google", "review", "rating"] },
    { href: "/portal/materials", label: "Marketing materials", short: "Materials", blurb: "Flyers, logos and artwork, current or no longer used", band: "marketing", icon: "doc", also: ["materials", "flyer", "brochure", "logo", "artwork", "pdf", "png", "files", "brand", "print"] },
    { href: "/portal/marketing?tab=social", label: "Instagram", blurb: "What we're posting", band: "marketing", icon: "globe", also: ["instagram", "social", "posts", "ig"] },
    { href: "/portal/blog", label: "Blog", blurb: "Posts on the website", band: "marketing", icon: "doc", also: ["article", "post", "write", "publish"] },
  );

  add(can(user, "reports_read"),
    { href: "/portal/team", label: "Team", blurb: "The crew and each person's file", band: "crew", icon: "people", also: ["crew", "people", "staff", "roster"] },
  );
  items.push({ href: "/portal/vehicles", label: "Vehicles", blurb: "Weekly checks, service, damage", band: "crew", icon: "truck", also: ["van", "fleet", "rego", "service", "clean"] });
  add(office,
    { href: "/portal/supply", label: "Supply", blurb: "Reece pricing and orders", band: "crew", icon: "box", also: ["reece", "max", "order", "pricebook", "material"] },
    {
      href: "/portal/supply/next-week", label: "Next week's orders", short: "Next week", blurb: "Gear for next week's installs, and the electrician",
      band: "crew", icon: "box", also: ["order", "purchase order", "mitsubishi", "reclaim", "rinnai", "brivis", "braemar", "istore", "electrician", "geoff", "work order", "next week"],
    },
    {
      href: "/portal/supply/sent", label: "Sent orders", short: "Sent", blurb: "Orders that have gone to the supplier or the electrician",
      band: "crew", icon: "box", also: ["sent", "ordered", "purchase order", "po"],
    },
    {
      href: "/portal/supply/work-orders", label: "Work orders", blurb: "The electrician for any job: find it, send it to GTE",
      band: "crew", icon: "box", also: ["work order", "electrician", "electrical", "geoff", "gte", "sparky", "switchboard", "circuit"],
    },
    {
      href: "/portal/supply/emails", label: "Supplier emails", blurb: "Who orders go to, and the wording",
      band: "crew", icon: "box", also: ["supplier", "email", "wording", "sample", "test email", "vendor", "order email"],
    },
  );
  items.push(
    { href: "/portal/tools/fault-codes", label: "Trade tools", blurb: "Sizing, rebates, fault codes", band: "crew", icon: "wrench", also: ["calculator", "sizing", "rebate", "fault code"] },
    // The same portal, built for the iPad in the van. Everyone gets it — it
    // shows a person their own work and nothing gated.
    { href: "/trade", label: "See the trade iPad", short: "Trade iPad", blurb: "The portal as a tradie sees it", band: "crew", icon: "tablet", also: ["ipad", "van", "monday", "tradesman", "trade portal", "field"] },
  );
  add(can(user, "vehicles"),
    { href: "/portal/vehicles/tools", label: "Tools", blurb: "Every tool on every van, and when it's next tested", band: "crew", icon: "wrench", also: ["test and tag", "tag", "calibration", "tool register", "tools due"] },
    { href: "/portal/vehicles/kit", label: "Kit lists", blurb: "New starter tools, van equipment and van stock", band: "crew", icon: "wrench", also: ["kit list", "new starter", "tool bag", "van equipment", "van stock", "what to carry", "starter kit"] },
  );
  add(office,
    { href: "/portal/per-van", label: "Per van, per day", short: "Per van", blurb: "What each van brings in a day it's out", band: "crew", icon: "truck", also: ["revenue per van", "per day", "van a day", "per tech"] },
    { href: "/portal/drive", label: "Drive time", blurb: "How much of the day is on the road", band: "crew", icon: "clock", also: ["driving", "travel", "routing", "on the road"] },
  );
  add(office,
    { href: "/portal/stock", label: "Factory stock", short: "Stock", blurb: "What's on the shelf, who took what", band: "crew", icon: "box", also: ["stock", "factory", "shelf", "inventory"] },
    { href: "/portal/requests", label: "From the crew", short: "Requests", blurb: "Leave, parts, incidents, Take 5s", band: "crew", icon: "bell", also: ["leave", "rdo", "parts order", "incident", "take 5", "near miss", "tool broken"] },
  );

  items.push(
    { href: "/portal/handbook", label: "Handbook", blurb: "The operations manual, A to G", band: "how-we-work", icon: "book", also: ["manual", "policy", "standard"] },
    { href: "/portal/roles", label: "Roles", blurb: "What we expect of each seat, and who's in it", band: "how-we-work", icon: "people", also: ["role", "roles", "expectations", "job description", "position", "seat", "apprentice", "tradesman", "leading hand", "field manager", "office manager"] },
    { href: "/portal/leading", label: "Leading", blurb: "Who decides what without us, and how that grows", band: "how-we-work", icon: "people", also: ["leading", "leader", "leadership", "decision", "decide", "authority", "delegate", "spend limit", "sign off", "approve"] },
    { href: "/portal/sops", label: "Processes", blurb: `${SOP_COUNT} procedures, one standard`, band: "how-we-work", icon: "list", also: ["sop", "procedure", "checklist"] },
  );
  add(admin,
    {
      href: "/portal/locations", label: "Site locations", short: "Sites", blurb: "Villages: units in ServiceTitan, serviced or due",
      band: "customers", icon: "list", also: ["location", "village", "unit", "strata", "serviced", "service due", "import", "servicetitan"],
    },
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
  // Everyone has a list; the side bar links it beside Home, so it's here for the search.
  items.push({ href: "/portal/toolbox", label: "Toolbox talks", blurb: "Topics to talk the crew through, and a record of each talk", band: "hidden", icon: "list", also: ["toolbox", "tool box", "toolbox talk", "safety talk", "tailgate", "pre-start", "meeting", "minutes", "safety meeting"] });
  items.push({ href: "/portal/plans", label: "Future planning", blurb: "What you want to do for the business, by when", band: "hidden", icon: "target", also: ["plans", "planning", "future", "goals", "ideas", "business plan", "long term", "someday", "vision"] });
  items.push({ href: "/portal/keep-in-touch", label: "Keep in touch", blurb: "Important people to reach out to every month", band: "hidden", icon: "people", also: ["contacts", "keep in contact", "relationships", "builders", "agents", "suppliers", "referrers", "call list", "reach out", "networking"] });
  items.push({ href: "/portal/todo", label: "To-do", blurb: "Today's jobs, given to each other, with the day each is due", band: "hidden", icon: "list", also: ["todo", "to do", "to-do list", "task", "tasks", "reminder", "due", "overdue", "jobs to do"] });
  items.push({ href: "/portal/todo/marketing", label: "Marketing to-dos", blurb: "Google Ads, Facebook, and the rest: sign wraps, flyers, the website", band: "hidden", icon: "list", also: ["marketing", "marketing to do", "google ads", "facebook", "social", "posts", "ads", "sign wrap", "flyers", "website", "reviews"] });
  // The wall board's own tab: the remote first, because driving the TV is
  // what people come here to do; then what it shows, then what it aims at.
  add(office,
    {
      href: "/portal/board/remote", label: "Remote", blurb: "What's on the wall now, and change it from here", band: "board", icon: "screen",
      also: ["wall board", "dashboard", "tv", "screen", "remote", "demo", "hold", "show a page", "dark mode", "reload"],
    },
    {
      href: "/portal/board/sounds", label: "Sounds", blurb: "What each pop-up plays, and how loud", band: "board", icon: "speaker",
      also: ["sound", "mp3", "audio", "volume", "loud", "quiet", "pop-up", "alert", "homer", "music", "noise"],
    },
    {
      href: "/portal/board/times", label: "Standard times", blurb: "How long each kind of job should take", band: "board", icon: "clock",
      also: ["hours", "time", "how long", "job type", "quoted time", "daily pace", "standard", "allowed", "on the tools"],
    },
    {
      href: "/portal/board/hold", label: "Held work", blurb: "Which job tags mean a job is waiting on something", band: "board", icon: "clock",
      also: ["on hold", "held", "waiting", "stuck", "tags", "tag", "blocked", "awaiting", "not ordered", "quotation required", "chase"],
    },
    {
      href: "/portal/board/credit", label: "Who sold it", blurb: "Move a sold job's credit from one person to another", band: "board", icon: "target",
      also: ["credit", "sold by", "who sold", "reassign", "leaderboard", "commission", "wrong person", "move the sale", "swap tech"],
    },
    {
      href: "/portal/board/reports", label: "Reports", blurb: "The day, the week and the month, kept and emailed", band: "board", icon: "doc",
      also: ["report", "daily report", "weekly report", "monthly report", "email", "summary"],
    },
    { href: "/portal/finance/board", label: "Targets & commission", short: "Targets", blurb: "What it aims at, the bonus bands, the working days", band: "board", icon: "target", also: ["commission", "bonus", "working days", "holidays", "board targets"] },
  );
  // The rebuilt Run the company pages (PR 2 of the new design).
  add(office,
    { href: "/portal/accounts", label: "Accounts", blurb: "What to invoice, money to chase, bills to pay, and what hasn't reached Xero", band: "hidden", icon: "doc", also: ["accounts", "invoice", "to invoice", "chase", "overdue", "bills", "accounts person", "finance"] },
    { href: "/portal/finance/leads", label: "Every enquiry", blurb: "Every lead from the website, the phone and ServiceTitan", band: "hidden", icon: "list", also: ["enquiry", "enquiries", "lead", "leads", "form", "website"] },
    { href: "/portal/todo/accounts", label: "Account to-dos", blurb: "Quotes to follow up, invoices to send, late payments, jobs to book", band: "hidden", icon: "list", also: ["follow up", "chase", "invoice", "late payment", "overdue invoice", "book in", "account", "accounts to do"] },
    { href: "/portal/today", label: "Today", blurb: "How today is going, who's on what, the calls", band: "hidden", icon: "clock", also: ["today", "sold today", "team now", "call booking", "calls"] },
    {
      href: "/portal/office", label: "Office today", short: "Office today", blurb: "The morning routine: review, send, hold list, quotes due, part-paid", band: "hidden", icon: "list",
      also: ["office", "office today", "morning", "routine", "review invoices", "needs review", "not sent", "hold list", "partially paid", "part paid", "follow up"],
    },
    {
      href: "/portal/pace?view=month", label: "Pace this month", short: "Pace · month", blurb: "The month against the goal: invoiced, booked, quoted, sold and done", band: "hidden", icon: "trend",
      also: ["month", "this month", "month so far", "cost of goods", "cogs", "gear", "break even", "cover overheads", "sold jobs", "not billed", "before the reece bill"],
    },
    { href: "/portal/kpis", label: "Our KPIs", short: "KPIs", blurb: "Every number we're measured by, against its goal", band: "hidden", icon: "target", also: ["kpi", "kpis", "scoreboard", "benchmarks", "gross margin", "overheads", "net profit", "win rate"] },
    { href: "/portal/sales", label: "Sales", blurb: "The month, the quotes out, the weeks", band: "hidden", icon: "trend", also: ["sales", "sold", "quotes out", "job types", "sold each week"] },
    { href: "/portal/rates", label: "Team", short: "Labour rates", blurb: "Labour rates and the leaderboard", band: "hidden", icon: "people", also: ["labour rate", "leaderboard", "cost an hour", "break even"] },
  );
  add(office || can(user, "quotes"),
    { href: "/portal/jobs", label: "Jobs", blurb: "Today's jobs, job profit, not billed, compliance certificates", band: "hidden", icon: "wrench", also: ["jobs", "not billed", "compliance certificate", "vba", "cert", "running over"] },
  );

  // Pages the side bar lists that the old home grid reached through a page's
  // own tabs. Here so the search finds them and the side bar's gate is this list.
  add(office,
    { href: "/portal/finance/pl", label: "Profit & loss", short: "P&L", blurb: "Xero's profit and loss, month by month", band: "hidden", icon: "chart", also: ["p&l", "profit and loss", "income", "expenses", "xero"] },
    { href: "/portal/pace?view=year", label: "Pace this year", blurb: "The year against the goal, and what a week it takes to land it", band: "hidden", icon: "target", also: ["year", "months", "invoiced", "overheads"] },
    { href: "/portal/finance/targets", label: "Targets", blurb: "The year's revenue, worked back to the work it takes", band: "hidden", icon: "target", also: ["targets", "revenue", "goal", "work back"] },
    { href: "/portal/numbers", label: "Goals", blurb: "Every goal the portal measures against", band: "hidden", icon: "target", also: ["goals", "our numbers", "year goal", "sales goal", "months", "gross margin goal", "win rate goal"] },
    { href: "/portal/finance/capacity", label: "Overheads", blurb: "Every overhead line, add, edit, a year, a week or a month a van", band: "hidden", icon: "list", also: ["costs", "overheads", "rent", "insurance", "software", "fuel", "servicing", "add a line"] },
    { href: "/portal/pricing", label: "Rates & pricing", blurb: "Our hourly rate, call-out and after-hours", band: "hidden", icon: "tag", also: ["hourly rate", "call out", "callout", "after hours", "pricing", "charge out", "profit we want"] },
    { href: "/portal/finance/capacity?part=vans", label: "Vans & loans", blurb: "What each van owes, and the repayments", band: "hidden", icon: "truck", also: ["van loan", "repayment", "finance", "new van"] },
    { href: "/portal/finance/planning", label: "Future", blurb: "3 vans against 4 or 5, hire someone, and other what-ifs", band: "hidden", icon: "trend", also: ["what if", "hire", "planning", "add a person", "future", "more vans", "fewer vans", "3 vans", "5 vans"] },
    { href: "/portal/marketing?tab=ads", label: "Ads", blurb: "What the ads cost and bring in", band: "hidden", icon: "speaker", also: ["ads", "google ads", "facebook ads"] },
  );
  add(admin, { href: "/portal/commission", label: "Commission", blurb: "The month target and the bonus", band: "hidden", icon: "target", also: ["commission", "bonus", "month target", "incentive"] });
  items.push({ href: "/portal/settings", label: "Settings", blurb: "How the portal looks, and what the business has", band: "hidden", icon: "user", also: ["settings", "theme", "dark mode", "business name", "start page"] });
  add(office,
    { href: "/portal/automatic", label: "Automatic", blurb: "What the portal does by itself, and a record of every time", band: "hidden", icon: "plug", also: ["automatic", "automation", "auto", "tags", "awaiting quote approval", "log", "history"] },
    { href: "/portal/integrations", label: "Integrations", blurb: "ServiceTitan, Xero, Reece, is each one working", band: "hidden", icon: "plug", also: ["servicetitan", "xero", "reece", "sync", "connection"] },
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
