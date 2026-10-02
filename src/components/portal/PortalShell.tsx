import Link from "next/link";
import type { PortalUser } from "@/lib/portal/caps";
import { ROLE_LABELS } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { PortalSearch } from "@/components/portal/PortalSearch";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { portalNav } from "@/lib/portal/nav";
import { unreadCount } from "@/lib/portal/notices";

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
export async function PortalShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const rows = buildSearchIndex(portalNav(user));
  // Counted from the same source the notifications page lists, so the badge and
  // the page can never disagree about how many there are.
  const unread = await unreadCount(user).catch(() => 0);

  return (
    <div className="pt">
      <header className="pt__bar">
        <Link href="/portal" className="pt__brand" aria-label="Portal home">
          <strong>Advanced</strong>
          <em>Gas &amp; Aircon · Team portal</em>
        </Link>

        <PortalSearch rows={rows} />

        <div className="pt__right">
          {/* The count is only drawn when there is something to count: a bell
              wearing a permanent zero is a bell nobody looks at. */}
          <Link href="/portal/notifications" className="pt__bell" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && <span className="pt__bellcount">{unread}</span>}
          </Link>
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
