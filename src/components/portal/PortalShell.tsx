import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import type { PortalUser } from "@/lib/portal/caps";
import { ROLE_LABELS } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { PortalSearch } from "@/components/portal/PortalSearch";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { BAND_LABEL, BANDS, byBand, ICON, portalNav, type NavBand } from "@/lib/portal/nav";
import { Bell } from "@/components/portal/Bell";
import { SideNav, SideNavButton, type SideTab } from "@/components/portal/SideNav";

/** Each tab's icon in the side bar, from the same stroke set as the home cards. */
const TAB_ICON: Record<Exclude<NavBand, "hidden">, string> = {
  run: ICON.trend,
  customers: ICON.chat,
  profit: ICON.chart,
  marketing: ICON.speaker,
  crew: ICON.truck,
  "how-we-work": ICON.book,
  settings: ICON.user,
};

/**
 * The portal's chrome: the side bar, a slim top bar, and the page.
 *
 * The side bar is back, to the design's SideNav — but as tabs that show one
 * group of pages at a time, not the always-open tree that was dropped when the
 * portal passed forty destinations. Its tabs are the home page's seven
 * sections, read from the same list, so the bar, the home grid and the search
 * can't disagree about where anything lives.
 *
 * Whether the bar is open or small is a cookie, read here, so the first paint
 * is already the right width.
 */
export function PortalShell({ user, children, variant }: { user: PortalUser; children: React.ReactNode; variant?: "home" | "wide" | "mid" }) {
  const items = portalNav(user);
  const rows = buildSearchIndex(items);
  const tabs: SideTab[] = BANDS.filter((b): b is Exclude<NavBand, "hidden"> => b !== "hidden")
    .map((b) => ({
      key: b,
      label: BAND_LABEL[b],
      icon: TAB_ICON[b],
      pages: byBand(items, b).filter((i) => !i.external).map((i) => ({ href: i.href, label: i.label })),
    }))
    .filter((t) => t.pages.length > 0);
  const small = cookies().get("pt_nav")?.value === "small";

  return (
    // data-no-reveal: the site-wide scroll reveal is for the marketing pages.
    // The portal is a tool — a panel that fades in when you scroll to it is an
    // animation in the way of work, and it left every below-the-fold panel at
    // opacity 0 in screenshots and in print.
    <div className={`pt${variant ? ` pt--${variant}` : ""}${small ? " pt--navsmall" : ""}`} data-no-reveal>
      <Suspense fallback={<aside className={`pt-side${small ? " is-small" : ""}`} aria-label="Portal" />}>
        <SideNav tabs={tabs} small={small} />
      </Suspense>

      <div className="pt__page">
        <header className="pt__bar">
          {/* On a phone the side bar is a drawer, so the bar carries the way
              into it and the name of the place. */}
          <div className="pt__left">
            <SideNavButton />
            <Link href="/portal" className="pt__brand" aria-label="Portal home">
              <strong>Advanced</strong>
              <em>Gas &amp; Aircon · Team portal</em>
            </Link>
          </div>

          <PortalSearch rows={rows} />

          <div className="pt__right">
            {/* Counted from the same source the notifications page lists, so the
                badge and the page can never disagree about how many there are. */}
            <Bell user={user} href="/portal/notifications" cls="pt__bell" />
            <span className="pt__who">
              <span className="pt__avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="pt__who-txt">
                <strong>{user.name}</strong>
                <span>{ROLE_LABELS[user.role]}</span>
              </span>
            </span>
            <form action="/api/portal/logout" method="post">
              <button type="submit" className="pt__logout">Sign out</button>
            </form>
          </div>
        </header>

        <main className="pt__content">
          {user.viewingAs && <ViewAsBanner level={user.viewingAs} />}
          {children}
        </main>
      </div>
    </div>
  );
}
