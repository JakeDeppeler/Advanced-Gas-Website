import Link from "next/link";
import type { PortalUser } from "@/lib/portal/caps";
import { ROLE_LABELS } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { PortalSearch } from "@/components/portal/PortalSearch";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { portalNav } from "@/lib/portal/nav";
import { Bell } from "@/components/portal/Bell";

/**
 * The portal's chrome: one slim bar, and the page.
 *
 * The sidebar is gone. It carried every destination at all times, which made
 * sense when there were eight and stopped making sense at forty — it had grown
 * three levels of collapsing groups, and finding anything in it meant opening
 * two of them. Navigation is the home grid now, reached from the brand in the
 * corner, with the search box for the fast path.
 *
 * A server component: it reads nothing and holds no state, so only the search
 * input ships as JavaScript.
 */
export function PortalShell({ user, children, variant }: { user: PortalUser; children: React.ReactNode; variant?: "home" | "wide" | "mid" }) {
  const rows = buildSearchIndex(portalNav(user));

  return (
    // data-no-reveal: the site-wide scroll reveal is for the marketing pages.
    // The portal is a tool — a panel that fades in when you scroll to it is an
    // animation in the way of work, and it left every below-the-fold panel at
    // opacity 0 in screenshots and in print.
    <div className={`pt${variant ? ` pt--${variant}` : ""}`} data-no-reveal>
      <header className="pt__bar">
        <div className="pt__left">
        <Link href="/portal" className="pt__brand" aria-label="Portal home">
          <strong>Advanced</strong>
          <em>Gas &amp; Aircon · Team portal</em>
        </Link>
        {/* Home is the navigation, so it gets a button of its own beside the
            brand — filled when you're on it, as the design has it. */}
        <Link href="/portal" className={`pt__home${variant === "home" ? " is-on" : ""}`} aria-current={variant === "home" ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
          </svg>
          Home
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
  );
}
