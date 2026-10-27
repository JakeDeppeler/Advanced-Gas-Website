import { cache, Suspense } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { can, ROLE_LABELS, type PortalUser } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { PortalSearch } from "@/components/portal/PortalSearch";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { portalNav } from "@/lib/portal/nav";
import { Bell } from "@/components/portal/Bell";
import { navCounts } from "@/lib/portal/navBadges";
import { myCounts, seesAll } from "@/lib/todos/store";
import { listContacts } from "@/lib/contacts/store";
import { isDue, touchState } from "@/lib/contacts/types";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { latestBoard } from "@/lib/portal/office";
import { getBusiness } from "@/lib/portal/business";
import { BAR_COOKIE, NAV_COOKIE, readBar, readTheme, THEME_COOKIE, type Business, type ThemeChoice } from "@/lib/portal/businessTypes";
import { buildSections, flatPages, pathOff, type Count, type Section, type SectionId } from "@/lib/portal/sections";
import { Crumb, MenuButton, Sidebar, type LiveState } from "@/components/portal/shell/Sidebar";
import { ThemeButton } from "@/components/portal/shell/ThemeButton";
import { Brand, SearchPop, SectionPages, TopNav } from "@/components/portal/shell/TopNav";
import { Dock, type DockLink } from "@/components/portal/shell/Dock";
import { FigureCount } from "@/components/portal/shell/FigureCount";
import { ChromeMemo } from "@/components/portal/shell/ChromeMemo";
import { ScrollMark } from "@/components/portal/shell/ScrollMark";
import { KeepFresh } from "@/components/portal/shell/KeepFresh";

const office = (user: PortalUser) => can(user, "overhead") || can(user, "manage_users");

/**
 * The counts beside each page, and each section's: the number of things in it
 * that are wrong (red pages added up), so a section that only has a count of
 * how many — leads this month — carries no number of its own. To-do's is
 * what's due today, red once something's late.
 */
// Both the side bar and the wide top bar want these, in the same request; cached so they're read once.
const sideCounts = cache(async (user: PortalUser, sections: Section[]): Promise<Record<string, Count>> => {
  const [counts, todos, all, contacts] = await Promise.all([
    navCounts(user).catch(() => ({})),
    myCounts(user).catch(() => ({ due: 0, overdue: 0, own: { due: 0, overdue: 0 }, acct: { due: 0, overdue: 0 } })),
    seesAll(user).catch(() => false),
    listContacts().catch(() => []),
  ]);
  const out: Record<string, Count> = {};
  for (const [href, c] of Object.entries(counts)) out[href] = { n: c.n, red: c.red };
  const today = isoDateMelbourne(new Date());
  const calls = all ? contacts.filter((c) => isDue(touchState(c, today))) : [];
  const callsLate = calls.some((c) => touchState(c, today) === "overdue");
  if (todos.own.due) out["/portal/todo"] = { n: todos.own.due, red: todos.own.overdue > 0 };
  if (todos.acct.due) out["/portal/todo/accounts"] = { n: todos.acct.due, red: todos.acct.overdue > 0 };
  if (calls.length) out["/portal/keep-in-touch"] = { n: calls.length, red: callsLate };
  // Not billed is a view of Jobs now, under Finance; its count goes with it.
  if (out["/portal/not-billed"]) out["/portal/jobs?tab=notbilled"] = out["/portal/not-billed"];
  for (const s of sections) {
    if (s.id === "todo") {
      const n = todos.due + calls.length;
      if (n) out["section:todo"] = { n, red: todos.overdue > 0 || callsLate };
      continue;
    }
    const n = flatPages(s.pages).reduce((t, p) => t + (out[p.href]?.red ? out[p.href].n : 0), 0);
    if (n) out[`section:${s.id}`] = { n, red: true };
  }
  return out;
});

/**
 * Is the sync keeping up? The board's snapshot is rebuilt every few minutes,
 * so an old one says it isn't. Office only: it's their figures that go stale.
 */
const liveLine = cache(async (user: PortalUser): Promise<LiveState | null> => {
  if (!can(user, "overhead")) return null;
  const board = await latestBoard();
  const at = board?.computedAt ? Date.parse(board.computedAt) : NaN;
  if (!Number.isFinite(at)) return { fresh: false, text: "Not synced yet", title: "The first sync hasn't run" };
  const mins = Math.round((Date.now() - at) / 60_000);
  const fresh = mins <= 30;
  const ago = mins < 90 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
  return { fresh, text: fresh ? "ServiceTitan · Xero" : `Synced ${ago}`, title: fresh ? `Last synced ${ago}` : `Last synced ${ago}: the sync may have stopped` };
});

type BarProps = { user: PortalUser; sections: Section[]; biz: Business; small: boolean; foot: React.ReactNode };

/** The side bar with its counts, streamed in after the page so the counts never hold a page up. */
async function CountedSidebar({ user, sections, biz, small, foot }: BarProps) {
  const [counts, live] = await Promise.all([sideCounts(user, sections).catch(() => ({})), liveLine(user).catch(() => null)]);
  const items = portalNav(user);
  return <Sidebar sections={buildSections(items, biz, office(user), counts)} biz={biz} small={small} foot={foot} live={live} />;
}

/** The wide bar's brand and pills, with the same counts as the side bar, streamed in the same way. */
async function CountedTop({ user, sections, biz, more, docked }: { user: PortalUser; sections: Section[]; biz: Business; more: string[]; docked: SectionId[] }) {
  const [counts, live] = await Promise.all([sideCounts(user, sections).catch(() => ({})), liveLine(user).catch(() => null)]);
  return (
    <>
      <Brand biz={biz} live={live} />
      <TopNav sections={buildSections(portalNav(user), biz, office(user), counts)} more={more} docked={docked} />
    </>
  );
}

/**
 * The places someone goes many times a day, for the dock: each only if this
 * person can open it and the business has it.
 */
const DOCK: Array<Omit<DockLink, "match" | "count"> & { section?: SectionId }> = [
  { href: "/portal/todo", label: "To-do", icon: "todo", section: "todo" },
  { href: "/portal/pipeline", label: "Pipeline", icon: "quote", section: "pipe" },
  { href: "/portal/supply/next-week", label: "Ordering", icon: "box", section: "orders" },
  { href: "/portal/board/remote", label: "Wall board", icon: "wall" },
  { href: "/portal/settings", label: "Settings", icon: "cog", section: "you" },
];

/** The wall board's own setup pages: in Settings' row, but the dock's Wall board lights for them. */
const WALL_SETUP = ["/portal/board", "/portal/finance/board"];

/**
 * The dock's links for this person, each with the addresses that light it:
 * its section's pages, or for the wall board its own setup pages, which live
 * in Settings but are their own place to go.
 */
function dockFor(sections: Section[], allowed: Set<string>, biz: Business, counts: Record<string, Count> = {}): DockLink[] {
  return DOCK.filter((l) => allowed.has(l.href) && !pathOff(l.href, biz)).map((l) => {
    const sec = l.section ? sections.find((s) => s.id === l.section) : null;
    const match = sec ? flatPages(sec.pages).map((p) => p.href).filter((h) => !WALL_SETUP.some((w) => h === w || h.startsWith(`${w}/`))) : WALL_SETUP;
    return { href: l.href, label: l.label, icon: l.icon, match, count: l.section ? counts[`section:${l.section}`] : undefined, section: l.section };
  });
}

/**
 * The sections that can sit on the wide top bar: everything but Home (always
 * there), Settings, and what the dock already carries. Settings lists these
 * to choose which go under More.
 */
export function barSections(user: PortalUser, biz: Business): Section[] {
  const items = portalNav(user);
  const sections = buildSections(items, biz, office(user));
  const docked = dockFor(sections, new Set(items.map((i) => i.href)), biz).map((l) => l.section);
  return sections.filter((s) => s.id !== "home" && s.id !== "you" && !docked.includes(s.id));
}

/** The dock with its counts, streamed in like the bars' so they never hold a page up. */
async function CountedDock({ user, sections, biz, allowed, theme }: { user: PortalUser; sections: Section[]; biz: Business; allowed: Set<string>; theme: ThemeChoice }) {
  const counts = await sideCounts(user, sections).catch(() => ({}));
  return <Dock links={dockFor(sections, allowed, biz, counts)} theme={theme} />;
}

/**
 * The portal's chrome, to the new design: the side bar, a top bar with where
 * you are, the search, the bell and light or dark, then the page.
 *
 * What the side bar offers comes from sections.ts over portalNav, and what the
 * business has (Settings) takes sections away: a business with no wall board
 * has no Wall board section, and its pages send you home.
 *
 * On a wide screen the side bar gives way to Rapport's layout: the sections
 * as pills across the top, and a dock of shortcuts floating down the left.
 * Both menus are drawn and the CSS shows the one that fits, so there's no
 * flash of the wrong one while the browser measures itself.
 *
 * The bar's width and the theme are cookies, read here, so the first paint is
 * already right.
 */
export async function PortalShell({ user, children, variant }: { user: PortalUser; children: React.ReactNode; variant?: "home" | "wide" | "mid" }) {
  const biz = await getBusiness();
  const path = headers().get("x-pt-path") ?? "";
  if (path && pathOff(path, biz)) redirect("/portal");

  const items = portalNav(user);
  const sections = buildSections(items, biz, office(user));
  const rows = buildSearchIndex(items);
  const small = cookies().get(NAV_COOKIE)?.value === "small";
  const theme = readTheme(cookies().get(THEME_COOKIE)?.value);
  const more = readBar(cookies().get(BAR_COOKIE)?.value);
  const first = user.name.split(" ")[0];
  const allowed = new Set(items.map((i) => i.href));
  const dock = dockFor(sections, allowed, biz);
  // Sections that have a place in the dock come off the top bar.
  const docked = dock.map((l) => l.section).filter((x): x is SectionId => !!x);

  const foot = (
    <>
      <Link href="/portal/me" className="pn-me" title="My file">
        <span className="pn-av" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="pn-met"><b>{first}</b><span>{ROLE_LABELS[user.role]}</span></span>
      </Link>
      <form action="/api/portal/logout" method="post" className="pn-out">
        <button type="submit" title="Sign out" aria-label="Sign out">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
          </svg>
        </button>
      </form>
    </>
  );

  return (
    // data-no-reveal: the site-wide scroll reveal is for the marketing pages.
    <div className={`pt pn${variant ? ` pt--${variant}` : ""}${small ? " pn--mini" : ""}`} data-no-reveal data-theme={theme === "system" ? undefined : theme}>
      <Suspense fallback={<Sidebar sections={sections} biz={biz} small={small} foot={foot} />}>
        <CountedSidebar user={user} sections={sections} biz={biz} small={small} foot={foot} />
      </Suspense>

      <div className="pn-main">
        <header className="pn-top">
          <MenuButton />
          <Suspense fallback={<><Brand biz={biz} /><TopNav sections={sections} more={more} docked={docked} /></>}>
            <CountedTop user={user} sections={sections} biz={biz} more={more} docked={docked} />
          </Suspense>
          <Crumb sections={sections} />
          <div className="pn-tools">
            <SearchPop><PortalSearch rows={rows} placeholder="Search" /></SearchPop>
            <Bell user={user} href="/portal/notifications" cls="pn-bell" size={18} />
            <ThemeButton initial={theme} />
            <Link href="/portal/me" className="pn-avbtn" title={`${user.name} · My file`}>
              <span aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="pn-vh">My file</span>
            </Link>
          </div>
        </header>
        <main className="pt__content pn-content">
          {user.viewingAs && <ViewAsBanner level={user.viewingAs} />}
          <Suspense fallback={null}><SectionPages sections={sections} /></Suspense>
          {children}
        </main>
      </div>
      <Suspense fallback={<Dock links={dock} theme={theme} />}>
        <CountedDock user={user} sections={sections} biz={biz} allowed={allowed} theme={theme} />
      </Suspense>
      <Suspense fallback={null}><FigureCount /></Suspense>
      <ChromeMemo />
      <ScrollMark />
      {/* The refresh route is the office's (overhead); nobody else would be let through. */}
      {can(user, "overhead") && <KeepFresh />}
    </div>
  );
}
