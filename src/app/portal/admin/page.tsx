import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata = { title: "Admin — Team portal" };

export default async function AdminHome() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users") && !can(user, "overhead")) redirect("/portal?denied=1");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Admin</div>
        <h1>Admin.</h1>
        <p>Manage who&rsquo;s on the team and what they can see, plus the numbers behind the business.</p>
      </div>

      <div className="pt-tiles">
        {can(user, "manage_users") && (
          <Link href="/portal/admin/team" className="pt-tile">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 11l2 2 3-3.5" /></svg>
            </span>
            <h3>Team &amp; access</h3>
            <p>Add people, set their role, and switch on or off exactly what each person can see.</p>
            <div className="pt-card__meta">Open →</div>
          </Link>
        )}
        {can(user, "overhead") && (
          <Link href="/portal/admin/overhead" className="pt-tile">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7" /></svg>
            </span>
            <h3>Overhead-cost tool</h3>
            <p>Total overheads ÷ billable hours = what every hour has to recover, plus a charge-out rate.</p>
            <div className="pt-card__meta">Open →</div>
          </Link>
        )}
      </div>
    </PortalShell>
  );
}
