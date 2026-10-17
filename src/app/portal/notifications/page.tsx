import { PageHead } from "@/components/portal/kit/PageHead";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { MarkAllRead } from "@/components/portal/MarkAllRead";
import { listNotices } from "@/lib/portal/notices";

export const dynamic = "force-dynamic";
export const metadata = { title: "For you · Team portal" };

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
      <div className="sx">
      <div className="nt-wide">
      <PageHead hi="Settings" title="For you" line="What needs doing, and what's new." kpis={[
        { icon: "bell", fig: String(notices.filter((n) => n.group === GROUPS[0].key).length), label: GROUPS[0].label },
        { icon: "doc", fig: String(notices.filter((n) => n.unread).length), label: "Not read yet" },
      ]} action={<MarkAllRead disabled={!notices.some((n) => n.unread)} />} />

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
        <div className="nt-cols">{GROUPS.map(({ key, label }) => {
          const rows = notices.filter((n) => n.group === key);
          if (rows.length === 0) return null;
          return (
            <div key={key} className="pt-notice__group">
              <h2 className="pt-notice__label">{label}</h2>
              <section className="pt-panel pt-notice">
                {rows.map((n, i) => (
                  <Link key={`${n.href}-${i}`} href={n.href} className="pt-notice__row">
                    {/* The dot is the unread mark; the words say what it is. */}
                    <span className={`pt-notice__dot${n.unread ? ` pt-notice__dot--${n.tone}` : ""}`} aria-hidden="true" />
                    <span className="pt-notice__txt">
                      <strong>{n.title}</strong>
                      <span>{n.detail}</span>
                    </span>
                    {n.when && <span className="pt-notice__when">{n.when}</span>}
                  </Link>
                ))}
              </section>
            </div>
          );
        })}</div>
      )}
      </div>
    </div>
    </PortalShell>
  );
}
