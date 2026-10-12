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

export type SectionId = "home" | "todo" | "run" | "pf" | "wall" | "future" | "numbers" | "cust" | "mkt" | "crew" | "how" | "you";

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
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
};

/** `unless`: shown only to someone who can't open that page — a stand-in for it. */
type PageDef = { label: string; href: string; office?: boolean; unless?: string };
type SectionDef = { id: SectionId; label: string; icon: string; blurb: string; pages: PageDef[]; group: 0 | 1 | 2 };

/**
 * Every section and page, in the prototype's order. `group` is which block of
 * the side bar it sits in: Home, then running the business, then the rest.
 */
export const SECTION_DEFS: SectionDef[] = [
  { id: "home", label: "Home", icon: "home", blurb: "", group: 0, pages: [{ label: "Home", href: "/portal" }] },
  {
    id: "todo", label: "To-do", icon: "todo", group: 1, blurb: "What needs doing, and who to keep in touch with",
    pages: [
      { label: "Today", href: "/portal/todo" },
      // The office's lists, as the old side bar had them.
      { label: "Keep in touch", href: "/portal/keep-in-touch", office: true },
      { label: "Future planning", href: "/portal/plans", office: true },
    ],
  },
  {
    id: "run", label: "Run the company", icon: "run", group: 1, blurb: "How we're tracking, from lead to paid",
    pages: [
      { label: "Today", href: "/portal/today" },
      { label: "Our KPIs", href: "/portal/kpis" },
      { label: "Sales", href: "/portal/sales" },
      // Office staff without the money see the pipeline itself, in Sales' place.
      { label: "Quote pipeline", href: "/portal/pipeline", unless: "/portal/sales" },
      { label: "Jobs", href: "/portal/jobs" },
      { label: "Team", href: "/portal/rates" },
      { label: "Pace", href: "/portal/goal" },
    ],
  },
  {
    id: "pf", label: "Profit & finance", icon: "pf", group: 1, blurb: "Margins, the year goal and Xero",
    pages: [
      { label: "Overview", href: "/portal/finance" },
      { label: "Profit & loss", href: "/portal/finance/pl" },
      { label: "Cash flow", href: "/portal/finance/cash" },
      { label: "Owed to us", href: "/portal/money" },
      { label: "We owe", href: "/portal/finance/owe" },
      { label: "Spending", href: "/portal/finance/spend" },
      { label: "Profit on every job", href: "/portal/profit" },
      { label: "Year goal", href: "/portal/finance/goals" },
      { label: "How we went", href: "/portal/finance/review" },
      { label: "Journal entries", href: "/portal/journals" },
    ],
  },
  {
    id: "wall", label: "Wall board", icon: "wall", group: 1, blurb: "The office screen, and the remote for it",
    pages: [
      { label: "Remote", href: "/portal/board/remote" },
      { label: "What it shows", href: "/portal/board" },
      { label: "Targets & commission", href: "/portal/finance/board" },
      { label: "Sounds", href: "/portal/board/sounds" },
      { label: "Standard times", href: "/portal/board/times" },
      { label: "Reports", href: "/portal/board/reports" },
    ],
  },
  { id: "future", label: "Future", icon: "grow", group: 1, blurb: "Hire someone, and other what-ifs", pages: [{ label: "Future", href: "/portal/finance/planning" }] },
  {
    id: "numbers", label: "Our numbers", icon: "numbers", group: 1, blurb: "Every goal, wage, cost and rate in one place",
    pages: [
      { label: "Goals", href: "/portal/numbers" },
      { label: "Team & wages", href: "/portal/finance/capacity" },
      { label: "Costs", href: "/portal/finance/capacity?t=overheads" },
      { label: "Vans & loans", href: "/portal/finance/capacity?part=vans" },
      { label: "Markup", href: "/portal/finance/capacity?part=markup" },
      { label: "Rates & pricing", href: "/portal/pricing" },
      { label: "Commission", href: "/portal/commission" },
    ],
  },
  {
    id: "cust", label: "Customers & sales", icon: "chat", group: 2, blurb: "Talking to customers and pricing the work",
    pages: [
      { label: "Customer chats", href: "/portal/chats" },
      { label: "One customer", href: "/portal/customers" },
      { label: "Pricebook", href: "/trade/pricebook" },
      { label: "Site locations", href: "/portal/locations" },
      { label: "Job calculator", href: "/portal/job-calculator" },
    ],
  },
  {
    id: "mkt", label: "Marketing", icon: "mega", group: 2, blurb: "Where the work comes from",
    pages: [
      { label: "Campaigns", href: "/portal/marketing" },
      { label: "Blog", href: "/portal/blog" },
      { label: "Website leads", href: "/portal/website" },
      { label: "On the site", href: "/portal/website?tab=pages" },
      { label: "Drop-off", href: "/portal/website?tab=dropoff" },
      { label: "Reviews", href: "/portal/marketing?tab=reviews" },
      { label: "Ads", href: "/portal/marketing?tab=ads" },
      { label: "Social", href: "/portal/marketing?tab=social" },
      { label: "Brand assets", href: "/portal/marketing?tab=assets" },
      { label: "Email list", href: "/portal/marketing?tab=emails" },
    ],
  },
  {
    id: "crew", label: "Crew & vans", icon: "van", group: 2, blurb: "The team, the fleet and supplies",
    pages: [
      { label: "Team", href: "/portal/team" },
      { label: "Vehicles", href: "/portal/vehicles" },
      { label: "Supply", href: "/portal/supply" },
      { label: "Factory stock", href: "/portal/stock" },
      { label: "Tools", href: "/portal/tools/fault-codes" },
      { label: "From the crew", href: "/portal/requests" },
      { label: "See the trade iPad", href: "/trade" },
    ],
  },
  {
    id: "how", label: "How we work", icon: "book", group: 2, blurb: "The standard, written down",
    pages: [
      { label: "Processes", href: "/portal/sops" },
      { label: "Handbook", href: "/portal/handbook" },
      { label: "Learning", href: "/portal/learning" },
      { label: "Information", href: "/portal/information" },
      { label: "Edit processes", href: "/portal/sops/edit" },
    ],
  },
  {
    id: "you", label: "You & settings", icon: "me", group: 2, blurb: "Your file, alerts and how the portal is set up",
    pages: [
      { label: "Settings", href: "/portal/settings" },
      { label: "My file", href: "/portal/me" },
      { label: "Notifications", href: "/portal/notifications" },
      { label: "Integrations", href: "/portal/integrations" },
      { label: "Admin", href: "/portal/admin" },
      { label: "Access levels", href: "/portal/admin/access" },
    ],
  },
];

/** A count beside a page: red when it means something's wrong. */
export type Count = { n: number; red?: boolean };

export type SidePage = { href: string; label: string; count?: Count };
export type Section = {
  id: SectionId;
  label: string;
  icon: string;
  blurb: string;
  group: 0 | 1 | 2;
  /** Where clicking the section goes: its first page. */
  href: string;
  /** More than one page: the section opens to list them. */
  pages: SidePage[];
  count?: Count;
};

/** Pages a business switches off in Settings, by what it doesn't have. */
function offFor(biz: Business): Set<string> {
  const off = new Set<string>();
  if (!biz.has.vans) off.add("/portal/vehicles");
  if (!biz.has.ipad) off.add("/trade");
  return off;
}

/** Sections the business has switched off: they go from the side bar, and their pages go home. */
export const sectionOff = (id: SectionId, biz: Business) => id === "wall" && !biz.has.wall;

/**
 * This person's side bar. `items` is portalNav(user); `office` is whether they
 * see the office's own lists. Counts are keyed by a page's link.
 */
export function buildSections(items: NavItem[], biz: Business, office: boolean, counts: Record<string, Count> = {}): Section[] {
  const allowed = new Set(items.map((i) => i.href));
  const off = offFor(biz);
  const out: Section[] = [];
  for (const s of SECTION_DEFS) {
    if (sectionOff(s.id, biz)) continue;
    const pages = s.pages
      .filter((p) => s.id === "home" || (allowed.has(p.href) && !off.has(p.href) && (!p.office || office) && !(p.unless && allowed.has(p.unless))))
      .map((p) => ({ href: p.href, label: p.label, count: counts[p.href] }));
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
      const named = ["tab", "part", "t"].find((k) => query.get(k) && pages.some((o) => o.href.startsWith(`${base}?`) && new URLSearchParams(o.href.split("?")[1]).get(k) === query.get(k)));
      if (named) continue;
    }
    if (!best || score > best.score) best = { href: p.href, score };
  }
  return best?.href ?? null;
}

/**
 * Pages reached from another page rather than the side bar, filed under the
 * page they belong to: every tool under Tools, and Every enquiry (which sits
 * under /portal/finance only by history) under Website leads.
 */
export const ALIAS: [string, string][] = [
  ["/portal/tools", "/portal/tools/fault-codes"],
  ["/portal/finance/leads", "/portal/website"],
  // The pages that became tabs of the rebuilt Run the company pages.
  ["/portal/pipeline", "/portal/sales"],
  ["/portal/leads", "/portal/sales"],
  ["/portal/not-billed", "/portal/jobs"],
  ["/portal/hours", "/portal/rates"],
  ["/portal/pace", "/portal/goal"],
  // Team › Build our rate.
  ["/portal/finance/hourly", "/portal/rates"],
];
const unalias = (path: string) => ALIAS.find(([from]) => path === from || path.startsWith(`${from}/`))?.[1] ?? path;

/** The section and page an address belongs to, for the side bar and the breadcrumb. */
export function whereAmI(sections: Section[], path: string, query: URLSearchParams): { section: Section | null; page: SidePage | null } {
  const all = sections.flatMap((s) => s.pages);
  // The page it's filed under when that's in this person's side bar; the
  // page itself otherwise (the pipeline is in its own right, for some).
  const aliased = unalias(path);
  const href = (aliased !== path ? activePage(all, aliased, query) : null) ?? activePage(all, path, query);
  if (!href) return { section: null, page: null };
  const section = sections.find((s) => s.pages.some((p) => p.href === href)) ?? null;
  return { section, page: section?.pages.find((p) => p.href === href) ?? null };
}

/** Which section a path sits in, from the full list — for sending a switched-off section's pages home. */
export function sectionOfPath(path: string): SectionId | null {
  const all = SECTION_DEFS.flatMap((s) => s.pages.map((p) => ({ href: p.href, id: s.id })));
  const href = activePage(all, unalias(path), new URLSearchParams());
  return all.find((p) => p.href === href)?.id ?? null;
}
