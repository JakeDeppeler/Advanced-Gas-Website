/**
 * The side bar: the prototype's sections, in its order, each holding the
 * portal pages that belong to it.
 *
 * Which pages a person sees is still decided by portalNav (nav.ts), the one
 * list the search and the capability gate already agree on: a page shows here
 * only if its link is one portalNav gives this person. So a section can't offer
 * a page that would bounce them back with ?denied=1, and there's no second copy
 * of who-can-see-what to drift.
 *
 * Pages not yet rebuilt to the new design keep their current names, so the
 * side bar and the title on the page say the same thing. Each section's page
 * names move to the prototype's as that section is rebuilt.
 *
 * Pure — no React, no database.
 */

import type { NavItem } from "@/lib/portal/nav";
import type { Business } from "@/lib/portal/businessTypes";

export type SectionId = "home" | "pipe" | "todo" | "run" | "pf" | "numbers" | "mkt" | "crew" | "orders" | "how" | "you";

/** The prototype's stroke icons, 24×24. Several elements each, so kept as markup. */
export const SECTION_ICON: Record<string, string> = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  todo: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  run: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pf: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  wall: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  numbers: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-4.5A8 8 0 1 1 21 12z"/>',
  mega: '<path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  van: '<path d="M2 7h11v9H2zM13 10h4l4 3v3h-8"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  book: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  grow: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  jobs: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  // The dock's own.
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  quote: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
};

/**
 * `unless`: shown only to someone who can't open that page — a stand-in for it.
 * `subs`: pages that share this one's place in the side bar. They are a tab row
 * across the top of each of them (SectionBar) rather than more lines in the
 * bar, so a section stays a handful of lines; `tab` is this page's own label in
 * that row when the side bar's name for the group doesn't fit it.
 */
type PageDef = { label: string; href: string; office?: boolean; unless?: string; tab?: string; subs?: PageDef[] };
/**
 * `flat`: the section is one entry in the side bar, and its pages are a tab
 * bar across the top of each of them instead of a list under it.
 */
type SectionDef = { id: SectionId; label: string; icon: string; blurb: string; pages: PageDef[]; group: 0 | 1 | 2 | 3; flat?: boolean };

/**
 * Every section and page. Grouped by what you came to do — see how we're
 * going, look at the money, price the work, run the crew — rather than by
 * which system a page reads, which had money spread over four sections and
 * two pages each called Today and Team. `group` is the block of the side bar
 * it sits in: Home, the business, the day-to-day, then settings.
 */
export const SECTION_DEFS: SectionDef[] = [
  /*
   * Plain names that say what's on the page, and related pages under one tab
   * (their own tab row across the top) instead of a line each. Nothing is
   * taken away: every page is still here, it's just filed with its family.
   */
  { id: "home", label: "Overview", icon: "home", blurb: "", group: 0, pages: [{ label: "Overview", href: "/portal" }] },
  {
    id: "todo", label: "To-do", icon: "todo", group: 1, blurb: "What needs doing, who to keep in touch with, and what's coming",
    pages: [
      { label: "To-do list", href: "/portal/todo", subs: [{ label: "Office today", href: "/portal/office", office: true }] },
      { label: "Keep in touch", href: "/portal/keep-in-touch", office: true },
      { label: "Future planning", href: "/portal/plans", office: true },
      { label: "Toolbox talks", href: "/portal/toolbox" },
    ],
  },
  // The quotes to chase and the customers they're for, in one place.
  {
    id: "pipe", label: "Pipeline", icon: "quote", group: 1, blurb: "Every quote out, who's chasing it, and the customers behind them",
    pages: [
      { label: "Quotes", href: "/portal/pipeline" },
      { label: "Customers", href: "/portal/customers", subs: [{ label: "Sites", href: "/portal/locations" }] },
      { label: "Messages", href: "/portal/chats" },
    ],
  },
  {
    id: "run", label: "The Numbers", icon: "run", group: 1, blurb: "How we're going: today, this month, sales, jobs and the year goal",
    pages: [
      { label: "Today", href: "/portal/today" },
      { label: "This month", href: "/portal/month", subs: [{ label: "KPIs", href: "/portal/kpis" }, { label: "Month review", href: "/portal/finance/review" }] },
      { label: "Sales", href: "/portal/sales" },
      { label: "Jobs", href: "/portal/jobs" },
      // Setting the goals is in Year goal's own tab row.
      { label: "Year goal", href: "/portal/goal" },
    ],
  },
  {
    id: "pf", label: "Finance", icon: "pf", group: 1, blurb: "What to invoice and chase, profit, cash, bills and Xero",
    pages: [
      { label: "Accounts", href: "/portal/accounts" },
      { label: "Summary", href: "/portal/finance" },
      { label: "Profit & loss", href: "/portal/finance/pl" },
      { label: "Cash flow", href: "/portal/finance/cash" },
      { label: "Money owed to us", tab: "Owed to us", href: "/portal/money", subs: [{ label: "Stuck money", href: "/portal/stuck" }] },
      { label: "Bills we owe", tab: "We owe", href: "/portal/finance/owe", subs: [{ label: "Spending", href: "/portal/finance/spend" }] },
      { label: "Journals to Xero", href: "/portal/journals" },
    ],
  },
  {
    id: "numbers", label: "Pricing & costs", icon: "numbers", group: 1, blurb: "What an hour costs, what we charge, and every figure behind it",
    pages: [
      // What an hour must cover and Running costs are in Hourly rate's own tab row.
      { label: "Hourly rate", href: "/portal/rates" },
      {
        label: "Overheads", tab: "Overheads", href: "/portal/finance/capacity",
        subs: [
          { label: "Vans & loans", href: "/portal/finance/capacity?part=vans" },
          { label: "Materials markup", href: "/portal/finance/capacity?part=markup" },
        ],
      },
      { label: "Our prices", href: "/portal/pricing" },
      { label: "Commission", href: "/portal/commission" },
      { label: "What if", href: "/portal/finance/planning" },
    ],
  },
  {
    // Where the work comes from: leads and the website, what we put out,
    // the files it's made of, and the blog.
    id: "mkt", label: "Marketing", icon: "mega", group: 2, blurb: "Website leads, how the site does, campaigns, and every marketing file",
    pages: [
      {
        label: "Website & leads", tab: "Website leads", href: "/portal/website",
        subs: [
          { label: "On the site", href: "/portal/website?tab=pages" },
          { label: "Drop-off pages", href: "/portal/website?tab=dropoff" },
          { label: "Every enquiry", href: "/portal/finance/leads" },
        ],
      },
      {
        label: "Campaigns & socials", tab: "Campaigns", href: "/portal/marketing",
        subs: [
          { label: "Instagram", href: "/portal/marketing?tab=social" },
          { label: "Reviews", href: "/portal/marketing?tab=reviews" },
          { label: "Ads", href: "/portal/marketing?tab=ads" },
          { label: "Email list", href: "/portal/marketing?tab=emails" },
        ],
      },
      { label: "Materials", href: "/portal/materials" },
      { label: "Blog", href: "/portal/blog" },
    ],
  },
  {
    id: "crew", label: "Crew & vans", icon: "van", group: 2, blurb: "The team, the vans and their tools",
    pages: [
      { label: "Team", href: "/portal/team" },
      {
        label: "Vans & tools", tab: "Vans", href: "/portal/vehicles",
        subs: [
          { label: "Tools", href: "/portal/vehicles/tools" },
          { label: "Kit lists", href: "/portal/vehicles/kit" },
          { label: "Per van, per day", href: "/portal/per-van" },
          { label: "Drive time", href: "/portal/drive" },
        ],
      },
      { label: "From the crew", href: "/portal/requests" },
      { label: "Trade iPad", href: "/trade", subs: [{ label: "Pricebook", href: "/trade/pricebook" }] },
    ],
  },
  {
    // Ordering for the installs and the factory's own shelf: an order to send
    // is the job, and once it's gone it moves to Sent.
    id: "orders", label: "Orders & stock", icon: "box", group: 2, blurb: "Gear to order for the installs, what's gone, and the factory shelf",
    pages: [
      { label: "To order", href: "/portal/supply/next-week", subs: [{ label: "Sent", href: "/portal/supply/sent" }, { label: "Work orders", href: "/portal/supply/work-orders" }] },
      { label: "Factory stock", href: "/portal/stock" },
      // Its own tab row (Supplier emails, Orders, Item search…) is on the page.
      { label: "Suppliers", href: "/portal/supply" },
    ],
  },
  {
    id: "how", label: "How we work", icon: "book", group: 2, blurb: "The standard, written down",
    pages: [
      { label: "Roles", href: "/portal/roles" },
      { label: "Processes", href: "/portal/sops" },
      {
        label: "Handbook & info", tab: "Handbook", href: "/portal/handbook",
        subs: [
          { label: "Learning", href: "/portal/learning" },
          { label: "Information", href: "/portal/information" },
          { label: "Trade tools", href: "/portal/tools/fault-codes" },
        ],
      },
    ],
  },
  {
    // Set up once and looked at rarely, so out of the way at the bottom.
    id: "you", label: "Settings", icon: "me", group: 3, blurb: "Your file, alerts, the wall board and how the portal is set up",
    pages: [
      { label: "My file", href: "/portal/me" },
      { label: "Notifications", href: "/portal/notifications" },
      {
        label: "Settings", href: "/portal/settings",
        subs: [
          { label: "Automatic", href: "/portal/automatic" },
          { label: "Integrations", href: "/portal/integrations" },
          { label: "Admin", href: "/portal/admin" },
        ],
      },
      {
        label: "Wall board", tab: "Remote", href: "/portal/board/remote",
        subs: [
          { label: "Targets & commission", href: "/portal/finance/board" },
          { label: "Sounds", href: "/portal/board/sounds" },
          { label: "Standard times", href: "/portal/board/times" },
          { label: "Held work", href: "/portal/board/hold" },
          { label: "Who sold it", href: "/portal/board/credit" },
          { label: "Reports", href: "/portal/board/reports" },
        ],
      },
    ],
  },
];

/** A count beside a page: red when it means something's wrong. */
export type Count = { n: number; red?: boolean };

export type SidePage = {
  href: string; label: string; count?: Count;
  /** Its own name in its group's tab row, when that differs from the side bar's. */
  tab?: string;
  /** The pages that share its line in the side bar, shown as a tab row on each. */
  subs?: SidePage[];
};
export type Section = {
  id: SectionId;
  flat?: boolean;
  label: string;
  icon: string;
  blurb: string;
  group: 0 | 1 | 2 | 3;
  /** Where clicking the section goes: its first page. */
  href: string;
  /** More than one page: the section opens to list them. */
  pages: SidePage[];
  count?: Count;
};

/** Pages a business switches off in Settings, by what it doesn't have. */
function offFor(biz: Business): Set<string> {
  const off = new Set<string>();
  // No vans: the fleet, its tools, and the two pages measured per van go.
  if (!biz.has.vans) for (const h of ["/portal/vehicles", "/portal/vehicles/tools", "/portal/vehicles/kit", "/portal/per-van", "/portal/drive"]) off.add(h);
  if (!biz.has.ipad) off.add("/trade");
  if (!biz.has.wall) for (const h of WALL_PAGES) off.add(h);
  return off;
}

const WALL_PAGES = ["/portal/board/remote", "/portal/board", "/portal/finance/board", "/portal/board/sounds", "/portal/board/times", "/portal/board/hold", "/portal/board/credit", "/portal/board/reports"];

/** A wall board page for a business with no wall board: it goes from the side bar and sends you home. */
export const pathOff = (path: string, biz: Business): boolean =>
  !biz.has.wall && WALL_PAGES.some((h) => path === h || path.startsWith(`${h}/`));

/**
 * This person's side bar. `items` is portalNav(user); `office` is whether they
 * see the office's own lists. Counts are keyed by a page's link.
 */
export function buildSections(items: NavItem[], biz: Business, office: boolean, counts: Record<string, Count> = {}): Section[] {
  const allowed = new Set(items.map((i) => i.href));
  const off = offFor(biz);
  const shows = (p: PageDef) => allowed.has(p.href) && !off.has(p.href) && (!p.office || office) && !(p.unless && allowed.has(p.unless));
  const out: Section[] = [];
  for (const s of SECTION_DEFS) {
    const pages: SidePage[] = [];
    for (const p of s.pages) {
      if (s.id === "home") { pages.push({ href: p.href, label: p.label }); continue; }
      const subs = (p.subs ?? []).filter(shows);
      const own = shows(p);
      if (!own && !subs.length) continue;
      // Someone who can't open the group's first page still gets the rest of it,
      // under the group's name, starting at the first one they can.
      const tabs: SidePage[] = [
        ...(own ? [{ href: p.href, label: p.tab ?? p.label, count: counts[p.href] }] : []),
        ...subs.map((x) => ({ href: x.href, label: x.label, count: counts[x.href] })),
      ];
      const lead = tabs[0];
      const red = tabs.filter((t) => t.count?.red).reduce((a, t) => a + (t.count?.n ?? 0), 0);
      pages.push({
        href: lead.href, label: p.label, tab: lead.label,
        count: counts[lead.href] ?? (red ? { n: red, red: true } : undefined),
        subs: tabs.length > 1 ? tabs.slice(1) : undefined,
      });
    }
    if (!pages.length) continue;
    out.push({ id: s.id, flat: s.flat, label: s.label, icon: s.icon, blurb: s.blurb, group: s.group, href: pages[0].href, pages, count: counts[`section:${s.id}`] });
  }
  return out;
}

/**
 * Which page an address is on. Some pages are one route with a tab in the
 * query (Website leads, On the site, Drop-off are all /portal/website), so a
 * link with a query wins only when the query matches; otherwise the longest
 * path the address starts with. A query that names a sibling's tab doesn't
 * fall back to the bare page.
 */
export function activePage(pages: { href: string }[], path: string, query: URLSearchParams): string | null {
  let best: { href: string; score: number } | null = null;
  for (const p of pages) {
    const [base, qs] = p.href.split("?");
    const onPath = base === "/portal" ? path === "/portal" : path === base || path.startsWith(`${base}/`);
    if (!onPath) continue;
    let score = base.length * 10;
    if (qs) {
      const want = new URLSearchParams(qs);
      if (![...want.entries()].every(([k, v]) => query.get(k) === v)) continue;
      score += 5;
    } else {
      const named = ["tab", "part", "t"].find((k) => query.get(k) && pages.some((o) => o.href.startsWith(`${base}?`) && new URLSearchParams(o.href.split("?")[1]).get(k) === query.get(k)));
      if (named) continue;
    }
    if (!best || score > best.score) best = { href: p.href, score };
  }
  return best?.href ?? null;
}

/**
 * Pages reached from another page rather than the side bar, filed under the
 * page they belong to: every tool under Tools.
 */
export const ALIAS: [string, string][] = [
  ["/portal/tools", "/portal/tools/fault-codes"],
  // The pages that became tabs of the rebuilt Run the company pages.
  // Lost quotes stay a tab of Sales; the pipeline itself is its own tab.
  ["/portal/pipeline/lost", "/portal/sales"],
  ["/portal/leads", "/portal/sales"],
  ["/portal/not-billed", "/portal/jobs"],
  // The job-by-job profit list lives with the jobs now, not under Finance.
  ["/portal/profit", "/portal/jobs"],
  ["/portal/hours", "/portal/rates"],
  ["/portal/pace", "/portal/goal"],
  // Pricing & costs › Hourly rate's Build our rate tab.
  ["/portal/finance/hourly", "/portal/rates"],
  // A tab of Pace & year goal.
  ["/portal/finance/goals", "/portal/goal"],
  ["/portal/numbers", "/portal/goal"],
  // Tabs of Hourly rate.
  ["/portal/finance/cover", "/portal/rates"],
  ["/portal/finance/running", "/portal/rates"],
];
const unalias = (path: string) => ALIAS.find(([from]) => path === from || path.startsWith(`${from}/`))?.[1] ?? path;

/**
 * The section and page an address belongs to, for the side bar and the
 * breadcrumb. `at` is the tab it's on when the page is a group: the side bar
 * lights the group, the tab row lights the tab.
 */
export function whereAmI(sections: Section[], path: string, query: URLSearchParams): { section: Section | null; page: SidePage | null; at: string | null } {
  const owner = new Map<string, SidePage>();
  for (const p of sections.flatMap((s) => s.pages)) {
    owner.set(p.href, p);
    for (const x of p.subs ?? []) owner.set(x.href, p);
  }
  const all = [...owner.keys()].map((href) => ({ href }));
  // The page it's filed under when that's in this person's side bar; the
  // page itself otherwise (the pipeline is in its own right, for some).
  const aliased = unalias(path);
  const href = (aliased !== path ? activePage(all, aliased, query) : null) ?? activePage(all, path, query);
  if (!href) return { section: null, page: null, at: null };
  const page = owner.get(href) ?? null;
  const section = page ? sections.find((s) => s.pages.includes(page)) ?? null : null;
  return { section, page, at: href };
}
