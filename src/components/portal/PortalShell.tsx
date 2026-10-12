import { Suspense } from "react";
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
import { NAV_COOKIE, readTheme, THEME_COOKIE, type Business } from "@/lib/portal/businessTypes";
import { buildSections, sectionOff, sectionOfPath, type Count, type Section } from "@/lib/portal/sections";
import { Crumb, MenuButton, Sidebar, type LiveState } from "@/components/portal/shell/Sidebar";
import { ThemeButton } from "@/components/portal/shell/ThemeButton";

const office = (user: PortalUser) => can(user, "overhead") || can(user, "manage_users");

/**
 * The counts beside each page, and each section's: the number of things in it
 * that are wrong (red pages added up), so a section that only has a count of
 * how many — leads this month — carries no number of its own. To-do's is
 * what's due today, red once something's late.
 */
async function sideCounts(user: PortalUser, sections: Section[]): Promise<Record<string, Count>> {
  const [counts, todos, all, contacts] = await Promise.all([
    navCounts(user).catch(() => ({})),
    myCounts(user).catch(() => ({ due: 0, overdue: 0 })),
    seesAll(user).catch(() => false),
    listContacts().catch(() => []),
  ]);
  const out: Record<string, Count> = {};
  for (const [href, c] of Object.entries(counts)) out[href] = { n: c.n, red: c.red };
  const today = isoDateMelbourne(new Date());
  const calls = all ? contacts.filter((c) => isDue(touchState(c, today))) : [];
  const callsLate = calls.some((c) => touchState(c, today) === "overdue");
  if (todos.due) out["/portal/todo"] = { n: todos.due, red: todos.overdue > 0 };
  if (calls.length) out["/portal/keep-in-touch"] = { n: calls.length, red: callsLate };
  for (const s of sections) {
    if (s.id === "todo") {
      const n = todos.due + calls.length;
      if (n) out["section:todo"] = { n, red: todos.overdue > 0 || callsLate };
      continue;
    }
    const n = s.pages.reduce((t, p) => t + (out[p.href]?.red ? out[p.href].n : 0), 0);
    if (n) out[`section:${s.id}`] = { n, red: true };
  }
  return out;
}

/**
 * Is the sync keeping up? The board's snapshot is rebuilt every few minutes,
 * so an old one says it isn't. Office only: it's their figures that go stale.
 */
async function liveLine(user: PortalUser): Promise<LiveState | null> {
  if (!can(user, "overhead")) return null;
  const board = await latestBoard();
  const at = board?.computedAt ? Date.parse(board.computedAt) : NaN;
  if (!Number.isFinite(at)) return { fresh: false, text: "Not synced yet", title: "The first sync hasn't run" };
  const mins = Math.round((Date.now() - at) / 60_000);
  const fresh = mins <= 30;
  const ago = mins < 90 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
  return { fresh, text: fresh ? "ServiceTitan · Xero" : `Synced ${ago}`, title: fresh ? `Last synced ${ago}` : `Last synced ${ago}: the sync may have stopped` };
}

type BarProps = { user: PortalUser; sections: Section[]; biz: Business; small: boolean; foot: React.ReactNode };

/** The side bar with its counts, streamed in after the page so the counts never hold a page up. */
async function CountedSidebar({ user, sections, biz, small, foot }: BarProps) {
  const [counts, live] = await Promise.all([sideCounts(user, sections).catch(() => ({})), liveLine(user).catch(() => null)]);
  const items = portalNav(user);
  return <Sidebar sections={buildSections(items, biz, office(user), counts)} biz={biz} small={small} foot={foot} live={live} />;
}

/**
 * The portal's chrome, to the new design: the side bar, a top bar with where
 * you are, the search, the bell and light or dark, then the page.
 *
 * What the side bar offers comes from sections.ts over portalNav, and what the
 * business has (Settings) takes sections away: a business with no wall board
 * has no Wall board section, and its pages send you home.
 *
 * The bar's width and the theme are cookies, read here, so the first paint is
 * already right.
 */
export async function PortalShell({ user, children, variant }: { user: PortalUser; children: React.ReactNode; variant?: "home" | "wide" | "mid" }) {
  const biz = await getBusiness();
  const path = headers().get("x-pt-path") ?? "";
  const sec = path ? sectionOfPath(path) : null;
  if (sec && sectionOff(sec, biz)) redirect("/portal");

  const items = portalNav(user);
  const sections = buildSections(items, biz, office(user));
  const rows = buildSearchIndex(items);
  const small = cookies().get(NAV_COOKIE)?.value === "small";
  const theme = readTheme(cookies().get(THEME_COOKIE)?.value);
  const first = user.name.split(" ")[0];

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
          <Crumb sections={sections} />
          <div className="pn-tools">
            <div className="pn-search"><PortalSearch rows={rows} placeholder="Search" /></div>
            <Bell user={user} href="/portal/notifications" cls="pn-bell" size={18} />
            <ThemeButton initial={theme} />
          </div>
        </header>
        <main className="pt__content pn-content">
          {user.viewingAs && <ViewAsBanner level={user.viewingAs} />}
          {children}
        </main>
      </div>
    </div>
  );
}
