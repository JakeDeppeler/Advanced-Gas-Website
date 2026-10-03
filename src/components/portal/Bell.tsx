import Link from "next/link";
import { Suspense } from "react";
import type { PortalUser } from "@/lib/portal/caps";
import { unreadCount } from "@/lib/portal/notices";

const BellIcon = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

type BellProps = { href: string; cls: string; size?: number };

function BellLink({ href, cls, size = 20, unread }: BellProps & { unread: number }) {
  return (
    <Link href={href} className={cls} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
      <BellIcon size={size} />
      {/* Only drawn when there is something to count: a bell wearing a
          permanent zero is a bell nobody looks at. */}
      {unread > 0 && <span className={`${cls}count`}>{unread}</span>}
    </Link>
  );
}

async function CountedBell({ user, ...p }: BellProps & { user: PortalUser }) {
  const unread = await unreadCount(user).catch(() => 0);
  return <BellLink {...p} unread={unread} />;
}

/**
 * The bell, streamed in after the page.
 *
 * Its count is worked out from the vans, their checks and the open quotes — two
 * round trips to the database on every page in the portal. Awaited in the shell,
 * those trips sat in front of every page's own content, because a server
 * component's children don't start until it returns. Behind a Suspense boundary
 * the page goes out first and the number arrives a moment later; until then the
 * bell is drawn without one, which is also what it looks like with nothing new.
 */
export function Bell({ user, ...p }: BellProps & { user: PortalUser }) {
  return (
    <Suspense fallback={<BellLink {...p} unread={0} />}>
      <CountedBell user={user} {...p} />
    </Suspense>
  );
}
