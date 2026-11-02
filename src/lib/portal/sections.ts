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

export type SectionId = "home" | "crm" | "todo" | "pipe" | "orders" | "web" | "mkt" | "fin" | "team" | "you";

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
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  // The page shortcuts' own.
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  tag: '<path d="M3 10V3h7l11 11-7 7z"/><path d="M7 7h.01"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
  // Finance's, as Jake asked: a dollar sign rather than a banknote.
  dollar: '<path d="M12 2v20"/><path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  // The automations' own.
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h6"/>',
};

/**
 * `unless`: shown only to someone who can't open that page — a stand-in for it.
 * `gate`: the page whose access decides this one, for a view of a page (a
 * `?tab=`) or a page reached from it that has no line of its own in portalNav.
 */
type PageDef = { label: string; href: string; office?: boolean; unless?: string; gate?: string; icon?: string };
/**
 * A tab that holds a few pages of one kind (Hourly: the rate, how it's built,
 * what it covers). It's one tab in the section's row, and its pages are a
 * second, smaller row under it while you're in one of them.
 */
type GroupDef = { label: string; group: PageDef[]; icon?: string };
type SectionDef = { id: SectionId; label: string; icon: string; blurb: string; pages: (PageDef | GroupDef)[]; group: Block };

/**
 * The blocks of the side bar, top to bottom. A block with a name has it over
 * its areas, so a longer list of areas still reads as a few kinds of work;
 * Home and Settings are a line of their own and need no name.
 */
export type Block = 0 | 1 | 2 | 3 | 4;
export const BLOCK_NAME: Record<Block, string> = { 0: "", 1: "Day to day", 2: "Getting work", 3: "The business", 4: "" };

/**
 * Every area and page. The portal is a handful of areas, each a place you go
 * for one kind of work: CRM is the day's jobs, To-do everyone's lists,
 * Pipeline the quotes from the enquiry to a yes or no, To order the gear for
 * the installs, Website the enquiries and how the site does, Marketing what
 * we put out, Finance the money, Team the crew and how we work, and Settings
 * is set up once. To-do, Pipeline and To order are areas of their own, not
 * pages of CRM, because they're worked every day; Website left Marketing for
 * the same reason, its leads being rung the day they come in. `group` is the
 * block of the side bar an area sits in (BLOCK_NAME).
 *
 * An area's pages are the shortcuts across the top of its pages, each with
 * its `icon`; the side bar lists the areas alone. The pages that answer the
 * same question are a family (Jobs, Cash, Pace...): one shortcut, whose own
 * pages are a second row while you're in it. Families don't nest.
 */
export const SECTION_DEFS: SectionDef[] = [
  { id: "home", label: "Home", icon: "home", blurb: "", group: 0, pages: [{ label: "Overview", href: "/portal" }] },
  {
    id: "crm", label: "CRM", icon: "team", group: 1, blurb: "Today's work and every job",
    pages: [
      { label: "Today", icon: "clock", group: [
        { label: "Today", href: "/portal/today" },
        { label: "Call booking", href: "/portal/today?tab=calls", gate: "/portal/today" },
      ] },
      { label: "Jobs", icon: "jobs", group: [
        { label: "Jobs today", href: "/portal/jobs" },
        { label: "All jobs", href: "/portal/jobs?tab=list", gate: "/portal/jobs" },
      ] },
    ],
  },
  {
    // Out of CRM and an area of its own: everyone's lists are worked all
    // day, by more people than work the rest of CRM. Each person's own
    // board, then the accounts', then marketing's, the order Jake reads
    // them. Account to-dos are the work the portal writes for the office,
    // kept off people's own lists.
    id: "todo", label: "To-do", icon: "todo", group: 1, blurb: "Everyone's lists, who to keep in touch with, toolbox talks and future plans",
    pages: [
      { label: "Personal", href: "/portal/todo", icon: "me" },
      { label: "Accounts", href: "/portal/todo/accounts", office: true, icon: "pf" },
      { label: "Marketing", href: "/portal/todo/marketing", icon: "mega" },
      { label: "Keep in touch", href: "/portal/keep-in-touch", office: true, icon: "phone" },
      // Things to get through rather than to look up, so on the lists with the
      // rest of the work, not in Team.
      { label: "Toolbox talks", href: "/portal/toolbox", icon: "book" },
      { label: "Future planning", href: "/portal/plans", office: true, icon: "grow" },
    ],
  },
  {
    id: "pipe", label: "Pipeline", icon: "quote", group: 1, blurb: "Every quote from the enquiry to a yes or a no, and where each job is up to",
    pages: [
      // Lost quotes left the row because nobody works from it; the page stays
      // for search and old links.
      { label: "Quotes", href: "/portal/pipeline", icon: "quote" },
      { label: "Leads", href: "/portal/leads", icon: "phone" },
      // The whole run of a job, of which the quotes are one stretch.
      { label: "Job tracker", href: "/portal/tracker", office: true, icon: "run" },
    ],
  },
  {
    id: "orders", label: "To order", icon: "box", group: 1, blurb: "Gear to order for the installs, what's gone, the contractors' work orders, and what runs by itself",
    pages: [
      { label: "To order", href: "/portal/supply/next-week", icon: "box" },
      { label: "Sent", href: "/portal/supply/sent", icon: "send" },
      // Every contractor's, not just the electrician's: Ross's water balancing goes from here too.
      { label: "Work orders", href: "/portal/supply/work-orders", icon: "jobs" },
      { label: "Automation", href: "/portal/supply/automation", icon: "bolt" },
      // The wording each supplier gets, a tab away from the orders it goes on.
      { label: "Supplier emails", href: "/portal/supply/emails", icon: "file" },
    ],
  },
  {
    // Where the enquiries arrive and how the site is doing, and the blog
    // that's written for it.
    id: "web", label: "Website", icon: "globe", group: 2, blurb: "Every enquiry from the site, how the site does, and the blog",
    pages: [
      { label: "Website leads", href: "/portal/website", icon: "globe" },
      { label: "On the site", href: "/portal/website?tab=pages", icon: "search" },
      { label: "Drop-off pages", href: "/portal/website?tab=dropoff", icon: "run" },
      { label: "Every enquiry", href: "/portal/finance/leads", icon: "phone" },
      { label: "Blog", href: "/portal/blog", icon: "book" },
    ],
  },
  {
    // What we put out to bring the work in, and the files it's made of.
    id: "mkt", label: "Marketing", icon: "mega", group: 2, blurb: "Campaigns, ads, reviews, the email list and every marketing file",
    pages: [
      { label: "Campaigns", href: "/portal/marketing", icon: "mega" },
      { label: "Instagram", href: "/portal/marketing?tab=social", icon: "grow" },
      { label: "Reviews", href: "/portal/marketing?tab=reviews", icon: "star" },
      { label: "Ads", href: "/portal/marketing?tab=ads", icon: "tag" },
      { label: "Email list", href: "/portal/marketing?tab=emails", icon: "send" },
      { label: "Materials", href: "/portal/materials", icon: "quote" },
    ],
  },
  {
    id: "fin", label: "Finance", icon: "dollar", group: 3, blurb: "Where the money stands, what to invoice and chase, cash, profit, the goals and what we charge",
    // Six shortcuts, down from ten: the overview, then a family for each
    // question (getting paid, cash, profit, pace, and planning what we charge
    // and spend), each family's own pages a second row on the page.
    pages: [
      { label: "Overview", href: "/portal/finance", icon: "run" },
      { label: "Get paid", icon: "clock", group: [
        { label: "Accounts", href: "/portal/accounts" },
        { label: "Owed to us", href: "/portal/money" },
        { label: "Not billed", href: "/portal/jobs?tab=notbilled", gate: "/portal/jobs" },
        { label: "Stuck money", href: "/portal/stuck" },
      ] },
      { label: "Cash", icon: "pf", group: [
        { label: "Cash flow", href: "/portal/finance/cash" },
        { label: "Cash to operate", href: "/portal/finance/cash?tab=operate", gate: "/portal/finance/cash" },
        { label: "We owe", href: "/portal/finance/owe" },
        { label: "Spending", href: "/portal/finance/spend" },
        { label: "Journals to Xero", href: "/portal/journals" },
      ] },
      { label: "Profit & sales", icon: "grow", group: [
        { label: "Profit & loss", href: "/portal/finance/pl" },
        { label: "Job profit", href: "/portal/jobs?tab=profit", gate: "/portal/jobs" },
        { label: "Sales", href: "/portal/sales" },
        { label: "Job types", href: "/portal/sales?tab=types", gate: "/portal/sales" },
      ] },
      // Pace's week, month and year are one layout; setting the goals is in Settings.
      { label: "Goals & pace", icon: "numbers", group: [
        { label: "This week", href: "/portal/pace" },
        { label: "This month", href: "/portal/pace?view=month", gate: "/portal/pace" },
        { label: "This year", href: "/portal/pace?view=year", gate: "/portal/pace" },
        { label: "Year goal", href: "/portal/goal" },
      ] },
      // Tabs of their own, as Jake asked: looked at more than the planning
      // pages they sat among.
      { label: "KPIs", href: "/portal/kpis", icon: "run" },
      { label: "Hourly rate", icon: "clock", group: [
        { label: "Hourly rate", href: "/portal/rates" },
        { label: "On site & commercial", href: "/portal/rates/onsite" },
        { label: "How the rate's built", href: "/portal/finance/hourly" },
        { label: "What an hour must cover", href: "/portal/finance/cover" },
      ] },
      // What we charge, what it costs us, and what if: set up now and then.
      // Materials markup isn't here: it's set on each item in ServiceTitan,
      // and a second copy only drifted.
      { label: "Planning", icon: "tag", group: [
        { label: "Our prices", href: "/portal/pricing" },
        { label: "Commission", href: "/portal/commission" },
        { label: "Running costs", href: "/portal/finance/running" },
        { label: "Overheads", href: "/portal/finance/capacity" },
        { label: "Vans & loans", href: "/portal/finance/capacity?part=vans" },
        { label: "What if: vans", href: "/portal/finance/planning" },
        { label: "What if: hire", href: "/portal/finance/planning/hire", gate: "/portal/finance/planning" },
        { label: "What if: pay plan", href: "/portal/finance/planning/commission", gate: "/portal/finance/planning" },
      ] },
    ],
  },
  {
    id: "team", label: "Team", icon: "van", group: 3, blurb: "The crew, their hours, the vans, and how we work",
    pages: [
      { label: "Team", href: "/portal/team", icon: "team" },
      { label: "Leaderboard", href: "/portal/rates?tab=leaders", gate: "/portal/rates", icon: "star" },
      { label: "Hours", href: "/portal/hours", icon: "clock" },
      { label: "From the crew", href: "/portal/requests", icon: "chat" },
      { label: "Vans", icon: "van", group: [
        { label: "Vans", href: "/portal/vehicles" },
        { label: "Tools", href: "/portal/vehicles/tools" },
        { label: "Kit lists", href: "/portal/vehicles/kit" },
        { label: "Per van, per day", href: "/portal/per-van" },
        { label: "Drive time", href: "/portal/drive" },
      ] },
      { label: "Trade iPad", href: "/trade", icon: "wall" },
      { label: "Pricebook", href: "/trade/pricebook", icon: "tag" },
      { label: "How we work", icon: "todo", group: [
        { label: "Roles", href: "/portal/roles" },
        { label: "Leading", href: "/portal/leading" },
        { label: "Processes", href: "/portal/sops" },
        { label: "Handbook", href: "/portal/handbook" },
        { label: "Learning", href: "/portal/learning" },
        { label: "Information", href: "/portal/information" },
        { label: "Trade tools", href: "/portal/tools/fault-codes" },
      ] },
    ],
  },
  {
    // Set up once and looked at rarely, so out of the way at the bottom.
    id: "you", label: "Settings", icon: "me", group: 4, blurb: "Your file, customers and sites, alerts, the wall board and how the portal is set up",
    pages: [
      // The way in, as the mocks have it: every part of Settings on one page.
      // First, so the initial-and-cog in the corner opens here.
      { label: "Overview", href: "/portal/you", icon: "cog" },
      { label: "My file", href: "/portal/me", icon: "me" },
      { label: "Notifications", href: "/portal/notifications", icon: "bell" },
      // Grouped so the row under the top bar fits: fourteen tabs didn't.
      // The records and the tools that build them (bulk site add lives on
      // Sites), with Messages until a channel is connected to it.
      { label: "Records", icon: "team", group: [
        { label: "Customers", href: "/portal/customers" },
        { label: "Sites", href: "/portal/locations" },
        { label: "Messages", href: "/portal/chats" },
      ] },
      { label: "The portal", icon: "cog", group: [
        { label: "Settings", href: "/portal/settings" },
        { label: "Automatic", href: "/portal/automatic" },
        { label: "Integrations", href: "/portal/integrations" },
        // Where the wall board's email alert is cleared. In the nav rather than
        // link-only, because the alert sends somebody looking for it and a page
        // you can only reach from a banner on a television is not a page.
        { label: "Email", href: "/portal/email" },
        // The numbers every page measures against, set now and then: from Finance.
        { label: "Goals", href: "/portal/numbers" },
      ] },
      { label: "Admin", href: "/portal/admin", icon: "cog" },
      // How ordering is set up: who we buy from and what we keep on the shelf.
      { label: "Ordering", icon: "box", group: [
        { label: "Suppliers", href: "/portal/supply" },
        { label: "Factory stock", href: "/portal/stock" },
      ] },
      // Seven pages that all set up the one screen.
      { label: "Wall board", icon: "wall", group: [
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
export type SidePage = { href: string; label: string; count?: Count; subs?: SidePage[]; icon?: string };

/** Every page in a list, a family's pages in place of the family. */
export const flatPages = (pages: SidePage[]): SidePage[] => pages.flatMap((p) => p.subs ?? [p]);
export type Section = {
  id: SectionId;
  label: string;
  icon: string;
  blurb: string;
  group: Block;
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
        if (s.id === "home" || shows(p)) pages.push({ href: p.href, label: p.label, count: counts[p.href], icon: p.icon });
        continue;
      }
      const subs = p.group.filter(shows).map((x) => ({ href: x.href, label: x.label, count: counts[x.href] }));
      if (!subs.length) continue;
      // A family down to one page is just that page.
      if (subs.length === 1) { pages.push({ ...subs[0], icon: p.icon }); continue; }
      const red = subs.reduce((n, x) => n + (x.count?.red ? x.count.n : 0), 0);
      pages.push({ href: subs[0].href, label: p.label, subs, count: red ? { n: red, red: true } : undefined, icon: p.icon });
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
