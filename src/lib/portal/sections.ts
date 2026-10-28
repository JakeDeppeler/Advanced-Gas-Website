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

export type SectionId = "home" | "crm" | "fin" | "mkt" | "team" | "you";

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
 * `gate`: the page whose access decides this one, for a view of a page (a
 * `?tab=`) or a page reached from it that has no line of its own in portalNav.
 */
type PageDef = { label: string; href: string; office?: boolean; unless?: string; gate?: string };
/**
 * A tab that holds a few pages of one kind (Hourly: the rate, how it's built,
 * what it covers). It's one tab in the section's row, and its pages are a
 * second, smaller row under it while you're in one of them.
 */
type GroupDef = { label: string; group: PageDef[] };
type SectionDef = { id: SectionId; label: string; icon: string; blurb: string; pages: (PageDef | GroupDef)[]; group: 0 | 1 | 2 | 3 };

/**
 * Every area and page. The portal is a handful of areas, each a place you go
 * for one kind of work: CRM is the customers' work from the enquiry to the
 * job done, Finance is the money, Marketing is where the work comes from, Team
 * is the crew and how we work, and Settings is set up once. `group` is the
 * block of the side bar an area sits in: Home, the business, the crew, then
 * settings.
 *
 * Inside an area the pages that answer the same question are a family (Jobs,
 * To-do, Cash, Pace...), one line in the side bar that opens to its pages
 * while you're in it, so an area stays a short list. Families don't nest.
 */
export const SECTION_DEFS: SectionDef[] = [
  { id: "home", label: "Home", icon: "home", blurb: "", group: 0, pages: [{ label: "Overview", href: "/portal" }] },
  {
    id: "crm", label: "CRM", icon: "team", group: 1, blurb: "Every customer's work, from the first enquiry to the job done",
    pages: [
      { label: "Today", group: [
        { label: "Today", href: "/portal/today" },
        { label: "Call booking", href: "/portal/today?tab=calls", gate: "/portal/today" },
      ] },
      { label: "Leads", href: "/portal/leads" },
      // Lost quotes left the row because nobody works from it; the page stays
      // for search and old links.
      { label: "Quotes", href: "/portal/pipeline" },
      // The whole run of a job, of which the quotes are one stretch.
      { label: "Job tracker", href: "/portal/tracker", office: true },
      { label: "Jobs", group: [
        { label: "Jobs today", href: "/portal/jobs" },
        { label: "All jobs", href: "/portal/jobs?tab=list", gate: "/portal/jobs" },
      ] },
      // What to send, what's gone, and the electrician's visits.
      { label: "To order", group: [
        { label: "To order", href: "/portal/supply/next-week" },
        { label: "Sent", href: "/portal/supply/sent" },
        { label: "Electrician", href: "/portal/supply/work-orders" },
      ] },
      // Each person's own board, then the accounts', then marketing's, the
      // order Jake reads them. Account to-dos are the work the portal writes
      // for the office, kept off people's own lists.
      { label: "To-do", group: [
        { label: "Personal", href: "/portal/todo" },
        { label: "Accounts", href: "/portal/todo/accounts", office: true },
        { label: "Marketing", href: "/portal/todo/marketing" },
        { label: "Keep in touch", href: "/portal/keep-in-touch", office: true },
      ] },
    ],
  },
  {
    id: "fin", label: "Finance", icon: "pf", group: 1, blurb: "What to invoice and chase, cash, profit, the goals and what we charge",
    pages: [
      { label: "Accounts", href: "/portal/accounts" },
      { label: "Owed to us", href: "/portal/money" },
      { label: "Not billed", href: "/portal/jobs?tab=notbilled", gate: "/portal/jobs" },
      { label: "Stuck money", href: "/portal/stuck" },
      { label: "Cash", group: [
        { label: "Cash flow", href: "/portal/finance/cash" },
        { label: "Cash to operate", href: "/portal/finance/cash?tab=operate", gate: "/portal/finance/cash" },
        { label: "We owe", href: "/portal/finance/owe" },
        { label: "Spending", href: "/portal/finance/spend" },
        { label: "Journals to Xero", href: "/portal/journals" },
      ] },
      { label: "Profit & sales", group: [
        { label: "Summary", href: "/portal/finance" },
        { label: "Profit & loss", href: "/portal/finance/pl" },
        { label: "Job profit", href: "/portal/jobs?tab=profit", gate: "/portal/jobs" },
        { label: "Sales", href: "/portal/sales" },
        { label: "Job types", href: "/portal/sales?tab=types", gate: "/portal/sales" },
      ] },
      // Pace took in This month (its Month) and Year so far (its Year).
      { label: "Goals & pace", group: [
        { label: "Pace", href: "/portal/pace" },
        { label: "Pace, month", href: "/portal/pace?view=month", gate: "/portal/pace" },
        { label: "Pace, year", href: "/portal/pace?view=year", gate: "/portal/pace" },
        { label: "KPIs", href: "/portal/kpis" },
        { label: "Year goal", href: "/portal/goal" },
        { label: "Set the goals", href: "/portal/numbers" },
      ] },
      // Materials markup is gone from here: it's set on each item in
      // ServiceTitan, so a second copy here only drifted from it.
      { label: "Pricing", group: [
        { label: "Hourly rate", href: "/portal/rates" },
        { label: "On site & commercial", href: "/portal/rates/onsite" },
        { label: "Our hourly rate", href: "/portal/finance/hourly" },
        { label: "What an hour must cover", href: "/portal/finance/cover" },
        { label: "Our prices", href: "/portal/pricing" },
        { label: "Commission", href: "/portal/commission" },
      ] },
      { label: "Costs", group: [
        { label: "Running costs", href: "/portal/finance/running" },
        { label: "Overheads", href: "/portal/finance/capacity" },
        { label: "Vans & loans", href: "/portal/finance/capacity?part=vans" },
      ] },
      { label: "What if", group: [
        { label: "Vans", href: "/portal/finance/planning" },
        { label: "Hire someone", href: "/portal/finance/planning/hire", gate: "/portal/finance/planning" },
        { label: "Pay plan", href: "/portal/finance/planning/commission", gate: "/portal/finance/planning" },
      ] },
    ],
  },
  {
    // Where the work comes from: leads and the website, what we put out,
    // the files it's made of, and the blog.
    id: "mkt", label: "Marketing", icon: "mega", group: 1, blurb: "Website leads, how the site does, campaigns, and every marketing file",
    pages: [
      { label: "Website", group: [
        { label: "Website leads", href: "/portal/website" },
        { label: "On the site", href: "/portal/website?tab=pages" },
        { label: "Drop-off pages", href: "/portal/website?tab=dropoff" },
        { label: "Every enquiry", href: "/portal/finance/leads" },
      ] },
      { label: "Campaigns", href: "/portal/marketing" },
      { label: "Instagram", href: "/portal/marketing?tab=social" },
      { label: "Reviews", href: "/portal/marketing?tab=reviews" },
      { label: "Ads", href: "/portal/marketing?tab=ads" },
      { label: "Email list", href: "/portal/marketing?tab=emails" },
      { label: "Materials", href: "/portal/materials" },
      { label: "Blog", href: "/portal/blog" },
    ],
  },
  {
    id: "team", label: "Team", icon: "van", group: 2, blurb: "The crew, their hours, the vans, and how we work",
    pages: [
      { label: "Team", href: "/portal/team" },
      { label: "Leaderboard", href: "/portal/rates?tab=leaders", gate: "/portal/rates" },
      { label: "Hours", href: "/portal/hours" },
      { label: "From the crew", href: "/portal/requests" },
      { label: "Vans", group: [
        { label: "Vans", href: "/portal/vehicles" },
        { label: "Tools", href: "/portal/vehicles/tools" },
        { label: "Kit lists", href: "/portal/vehicles/kit" },
        { label: "Per van, per day", href: "/portal/per-van" },
        { label: "Drive time", href: "/portal/drive" },
      ] },
      { label: "Trade iPad", href: "/trade" },
      { label: "Pricebook", href: "/trade/pricebook" },
      { label: "Toolbox talks", href: "/portal/toolbox" },
      { label: "How we work", group: [
        { label: "Roles", href: "/portal/roles" },
        { label: "Leading", href: "/portal/leading" },
        { label: "Processes", href: "/portal/sops" },
        { label: "Handbook", href: "/portal/handbook" },
        { label: "Learning", href: "/portal/learning" },
        { label: "Information", href: "/portal/information" },
        { label: "Trade tools", href: "/portal/tools/fault-codes" },
      ] },
      { label: "Future planning", href: "/portal/plans", office: true },
    ],
  },
  {
    // Set up once and looked at rarely, so out of the way at the bottom.
    id: "you", label: "Settings", icon: "me", group: 3, blurb: "Your file, customers and sites, alerts, the wall board and how the portal is set up",
    pages: [
      { label: "My file", href: "/portal/me" },
      // The records and the tools that build them (bulk site add lives on
      // Sites), with Messages until a channel is connected to it.
      { label: "Customers", href: "/portal/customers" },
      { label: "Sites", href: "/portal/locations" },
      { label: "Messages", href: "/portal/chats" },
      { label: "Notifications", href: "/portal/notifications" },
      { label: "Settings", href: "/portal/settings" },
      { label: "Automatic", href: "/portal/automatic" },
      { label: "Integrations", href: "/portal/integrations" },
      // Where the wall board's email alert is cleared. In the nav rather than
      // link-only, because the alert sends somebody looking for it and a page
      // you can only reach from a banner on a television is not a page.
      { label: "Email", href: "/portal/email" },
      { label: "Admin", href: "/portal/admin" },
      // How ordering is set up: who we buy from and what we keep on the shelf.
      { label: "Ordering", group: [
        { label: "Suppliers", href: "/portal/supply" },
        { label: "Factory stock", href: "/portal/stock" },
      ] },
      // Seven pages that all set up the one screen.
      { label: "Wall board", group: [
        { label: "Wall board", href: "/portal/board/remote" },
        { label: "Targets & commission", href: "/portal/finance/board" },
        { label: "Sounds", href: "/portal/board/sounds" },
        { label: "Standard times", href: "/portal/board/times" },
        { label: "Held work", href: "/portal/board/hold" },
        { label: "Who sold it", href: "/portal/board/credit" },
        { label: "Reports", href: "/portal/board/reports" },
      ] },
    ],
  },
];

/** A count beside a page: red when it means something's wrong. */
export type Count = { n: number; red?: boolean };

/** A page, or a family of them (`subs`, the first being where the tab goes). */
export type SidePage = { href: string; label: string; count?: Count; subs?: SidePage[] };

/** Every page in a list, a family's pages in place of the family. */
export const flatPages = (pages: SidePage[]): SidePage[] => pages.flatMap((p) => p.subs ?? [p]);
export type Section = {
  id: SectionId;
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
  const shows = (p: PageDef) => allowed.has(p.gate ?? p.href) && !off.has(p.href) && (!p.office || office) && !(p.unless && allowed.has(p.unless));
  const out: Section[] = [];
  for (const s of SECTION_DEFS) {
    const pages: SidePage[] = [];
    for (const p of s.pages) {
      if (!("group" in p)) {
        if (s.id === "home" || shows(p)) pages.push({ href: p.href, label: p.label, count: counts[p.href] });
        continue;
      }
      const subs = p.group.filter(shows).map((x) => ({ href: x.href, label: x.label, count: counts[x.href] }));
      if (!subs.length) continue;
      // A family down to one page is just that page.
      if (subs.length === 1) { pages.push(subs[0]); continue; }
      const red = subs.reduce((n, x) => n + (x.count?.red ? x.count.n : 0), 0);
      pages.push({ href: subs[0].href, label: p.label, subs, count: red ? { n: red, red: true } : undefined });
    }
    if (!pages.length) continue;
    out.push({ id: s.id, label: s.label, icon: s.icon, blurb: s.blurb, group: s.group, href: pages[0].href, pages, count: counts[`section:${s.id}`] });
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
      const named = ["tab", "part", "t", "view"].find((k) => query.get(k) && pages.some((o) => o.href.startsWith(`${base}?`) && new URLSearchParams(o.href.split("?")[1]).get(k) === query.get(k)));
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
  // Old addresses of pages that are now a view of another.
  ["/portal/not-billed", "/portal/jobs"],
  ["/portal/profit", "/portal/jobs"],
];
const unalias = (path: string) => ALIAS.find(([from]) => path === from || path.startsWith(`${from}/`))?.[1] ?? path;

/**
 * The section and page an address belongs to, for the side bar, the tab rows
 * and the breadcrumb. `page` is the tab in the section's row (a family, when
 * it's in one); `at` is the page itself.
 */
export function whereAmI(sections: Section[], path: string, query: URLSearchParams): { section: Section | null; page: SidePage | null; at: SidePage | null } {
  const owner = new Map<string, { section: Section; page: SidePage; at: SidePage }>();
  for (const section of sections) for (const page of section.pages) for (const at of page.subs ?? [page]) owner.set(at.href, { section, page, at });
  const all = [...owner.keys()].map((href) => ({ href }));
  // The page it's filed under when that's in this person's side bar; the
  // page itself otherwise.
  const aliased = unalias(path);
  const href = (aliased !== path ? activePage(all, aliased, query) : null) ?? activePage(all, path, query);
  return (href && owner.get(href)) || { section: null, page: null, at: null };
}
