import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { listNotices } from "@/lib/portal/notices";

export const dynamic = "force-dynamic";
export const metadata = { title: "For you — Team portal" };

const GROUPS = [
  { key: "doing" as const, label: "Needs doing" },
  { key: "news" as const, label: "News" },
];

export default async function NotificationsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const notices = await listNotices(user).catch(() => []);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal" label="Home" />
        <h1>For you</h1>
        <p>
          Everything waiting on somebody, worked out from the vans and the quote book rather than kept in a list of its
          own. Each one clears when the thing itself is dealt with.
        </p>
      </div>

      {notices.length === 0 ? (
        <section className="pt-panel pt-empty">
          <span className="pt-empty__kicker">Nothing waiting</span>
          <strong>You&rsquo;re all clear</strong>
          <span>Every van check is current and no quote has been sitting too long.</span>
        </section>
      ) : (
        /* Two lists, not one. Something waiting on a person and something that
           changed are different kinds of thing, and running them together
           means the jobs get skimmed past along with the news. */
        GROUPS.map(({ key, label }) => {
          const rows = notices.filter((n) => n.group === key);
          if (rows.length === 0) return null;
          return (
            <div key={key} className="pt-notice__group">
              <h2 className="pt-notice__label">{label}</h2>
              <section className="pt-panel pt-notice">
                {rows.map((n, i) => (
                  <Link key={`${n.href}-${i}`} href={n.href} className="pt-notice__row">
                    <span className={`pt-notice__dot pt-notice__dot--${n.tone}`} aria-hidden="true" />
                    <span className="pt-notice__txt">
                      <strong>{n.title}</strong>
                      <span>{n.detail}</span>
                    </span>
                    {n.when && <span className="pt-notice__when">{n.when}</span>}
                    <span className="pt-notice__go" aria-hidden="true">→</span>
                  </Link>
                ))}
              </section>
            </div>
          );
        })
      )}

    </PortalShell>
  );
}
