import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { HANDBOOK, VIDEOS, TOOLS } from "@/lib/portal/content";

export const metadata = { title: "Team portal" };

const HB_ITEMS = HANDBOOK.reduce((n, s) => n + s.items.length, 0);

const TILES = [
  { href: "/portal/handbook", title: "Handbook", desc: "How we work — the full operations manual, A to G.", icon: "M4 5h11a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4z", count: () => `${HB_ITEMS} topics` },
  { href: "/portal/learning", title: "Learning videos", desc: "How-to and method videos for the crew.", icon: "M4 5h16v11H4zM10 8.5l4 2.5-4 2.5z", count: () => `${VIDEOS.length} videos` },
  { href: "/portal/information", title: "Information", desc: "The numbers, licences and contacts we quote from.", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10v6M12 7v.5", count: () => "Quick reference" },
  { href: "/portal/tools", title: "Tools", desc: "Sizing, rebate estimator, fault codes, price list.", icon: "M14 6a3.5 3.5 0 0 0 4.6 4.6L21 13l-3 3-2.4-2.4A3.5 3.5 0 0 0 11 8.2z", count: () => `${TOOLS.length} tools` },
];

export default async function PortalHome({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const first = user.name.split(" ")[0];

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Home</div>
        <h1>G&rsquo;day {first}.</h1>
        <p>Everything the crew needs in one place — training, videos, the numbers we quote from, and the tools we use on the job.</p>
      </div>

      {searchParams?.denied === "1" && (
        <div className="pt-note"><strong>Admin only.</strong> That area is limited to admins. Ask Jake if you need access.</div>
      )}

      <div className="pt-tiles">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="pt-tile">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
            </span>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
            <div className="pt-card__meta">{t.count()}</div>
          </Link>
        ))}
        <Link href="/portal/me" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.3 3-6 7-6s7 2.7 7 6" /></svg>
          </span>
          <h3>My file</h3>
          <p>What&rsquo;s expected of you, your goals and targets, and your reviews.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
        {can(user, "reports_read") && (
          <Link href="/portal/team" className="pt-tile">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 11l2 2 3-3.5" /></svg>
            </span>
            <h3>Team</h3>
            <p>Each person&rsquo;s file — expectations, goals, reviews and private notes.</p>
            <div className="pt-card__meta">Lead hands &amp; admins</div>
          </Link>
        )}
        {can(user, "overhead") && (
          <Link href="/portal/overhead" className="pt-tile">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7" /></svg>
            </span>
            <h3>Overhead cost</h3>
            <p>What every billable hour has to recover, and your charge-out rate.</p>
            <div className="pt-card__meta">Open →</div>
          </Link>
        )}
        {can(user, "manage_users") && (
          <Link href="/portal/admin" className="pt-tile">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" /></svg>
            </span>
            <h3>Admin</h3>
            <p>Manage the team and set who can see what.</p>
            <div className="pt-card__meta">Admins only</div>
          </Link>
        )}
      </div>
    </PortalShell>
  );
}
