import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import type { PortalUser } from "@/lib/portal/caps";
import { ROLE_LABELS } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { PortalSearch } from "@/components/portal/PortalSearch";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { BAND_LABEL, BANDS, byBand, ICON, portalNav, type NavBand, type NavItem } from "@/lib/portal/nav";
import { Bell } from "@/components/portal/Bell";
import { SideNav, SideNavButton, type SideTab } from "@/components/portal/SideNav";
import { navBadges } from "@/lib/portal/navBadges";
import { needsByBand, needsToday } from "@/lib/portal/needs";
import { myCounts } from "@/lib/todos/store";

/** Each tab's icon in the side bar, from the same stroke set as the home cards. */
const TAB_ICON: Record<Exclude<NavBand, "hidden">, string> = {
  run: ICON.trend,
  board: ICON.screen,
  customers: ICON.chat,
  profit: ICON.chart,
  marketing: ICON.speaker,
  crew: ICON.truck,
  "how-we-work": ICON.book,
  settings: ICON.user,
};

function tabsOf(items: NavItem[], badges: Record<string, string> = {}, need: Partial<Record<NavBand, number>> = {}): SideTab[] {
  return BANDS.filter((b): b is Exclude<NavBand, "hidden"> => b !== "hidden")
    .map((b) => ({
      key: b,
      label: BAND_LABEL[b],
      icon: TAB_ICON[b],
      need: need[b] ?? 0,
      pages: byBand(items, b).filter((i) => !i.external).map((i) => ({ href: i.href, label: i.label, badge: badges[i.href] })),
    }))
    .filter((t) => t.pages.length > 0);
}

type NavProps = { user: PortalUser; items: NavItem[]; small: boolean; search: React.ReactNode; foot: React.ReactNode };

/**
 * The side bar with its counts. They take the same reads Home's list does —
 * the board's snapshot, the vans, the crew's requests — so they stream in a
 * moment after the page rather than holding every page up for them; until then
 * the bar is drawn the same with no numbers on it.
 */
async function CountedNav({ user, items, ...p }: NavProps) {
  const [badges, lines, todo] = await Promise.all([
    navBadges(user).catch(() => ({})),
    needsToday(user).catch(() => []),
    myCounts(user).catch(() => undefined),
  ]);
  return <SideNav tabs={tabsOf(items, badges, needsByBand(lines))} todo={todo} {...p} />;
}

/**
 * The portal's chrome: the side bar, and the page.
 *
 * The side bar carries everything the top bar used to — the brand, the search,
 * the bell, who's signed in — so the page starts at the top with its own title.
 * Its tabs are the home page's sections, read from the same list, so the
 * bar, the home page and the search can't disagree about where anything lives.
 * On a phone the bar is a drawer and a slim bar across the top opens it.
 *
 * Whether the bar is open or small is a cookie, read here, so the first paint
 * is already the right width.
 */
export function PortalShell({ user, children, variant }: { user: PortalUser; children: React.ReactNode; variant?: "home" | "wide" | "mid" }) {
  const items = portalNav(user);
  const rows = buildSearchIndex(items);
  const small = cookies().get("pt_nav")?.value === "small";
  const first = user.name.split(" ")[0];

  const search = <PortalSearch rows={rows} placeholder="Search" />;
  const foot = (
    <>
      {/* Counted from the same source the notifications page lists, so the
          badge and the page can never disagree about how many there are. */}
      <Bell user={user} href="/portal/notifications" cls="pt-side__bell" />
      <Link href="/portal/me" className="pt-side__me" title="My file">
        <span className="pt__avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="pt-side__metxt">
          <strong>{first}</strong>
          <span>{ROLE_LABELS[user.role]}</span>
        </span>
      </Link>
      <form action="/api/portal/logout" method="post" className="pt-side__out">
        <button type="submit" title="Sign out">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
          </svg>
          <span>Sign out</span>
        </button>
      </form>
    </>
  );
  const nav = { user, items, small, search, foot };

  return (
    // data-no-reveal: the site-wide scroll reveal is for the marketing pages.
    // The portal is a tool — a panel that fades in when you scroll to it is an
    // animation in the way of work, and it left every below-the-fold panel at
    // opacity 0 in screenshots and in print.
    <div className={`pt${variant ? ` pt--${variant}` : ""}${small ? " pt--navsmall" : ""}`} data-no-reveal>
      <Suspense fallback={<SideNav tabs={tabsOf(items)} small={small} search={search} foot={foot} />}>
        <CountedNav {...nav} />
      </Suspense>

      <div className="pt__page">
        {/* A phone's way into the side bar, and nothing else: on a desktop the
            bar is always there and this isn't drawn. */}
        <header className="pt__bar">
          <SideNavButton />
          <Link href="/portal" className="pt__brand" aria-label="Portal home">
            <strong>Advanced</strong>
            <em>Gas &amp; Aircon · Team portal</em>
          </Link>
          <Link href="/portal/me" className="pt__avatar" aria-label={`${user.name} — my file`}>{user.name.slice(0, 1).toUpperCase()}</Link>
        </header>

        <main className="pt__content">
          {user.viewingAs && <ViewAsBanner level={user.viewingAs} />}
          {children}
        </main>
      </div>
    </div>
  );
}
