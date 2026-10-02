import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { listNotices } from "@/lib/portal/notices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications — Trade portal" };

/**
 * The same notices the office portal shows, in the trade shell.
 *
 * Derived rather than stored — `listNotices` works them out from the vans and
 * the quotes each time — so there is nothing to mark read and the list is never
 * stale.
 */
export default async function TradeNotifications() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const notices = await listNotices(user).catch(() => []);

  return (
    <TradeShell
      user={user} active="/trade"
      title="Notifications"
      sub={notices.length ? `${notices.length} ${notices.length === 1 ? "thing" : "things"} needing a look` : "Nothing needs you"}
    >
      {notices.length ? (
        <div className="tr-stack" style={{ gap: 12 }}>
          {notices.map((n) => (
            <Link key={`${n.href}${n.title}`} href={n.href} className={`tr-card tr-link tr-notice is-${n.tone}`}>
              <strong className="tr-link__v" style={{ fontSize: 19, lineHeight: "25px" }}>{n.title}</strong>
              <span className="tr-sub">{n.detail}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="tr-empty">Nothing needs a look. The van checks are up to date.</p>
      )}
    </TradeShell>
  );
}
