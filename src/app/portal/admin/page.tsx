import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { ViewAsPicker } from "@/components/portal/ViewAs";
import { PortalBack } from "@/components/portal/PortalBack";

export const metadata = { title: "Admin — Team portal" };

export default async function AdminHome() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) redirect("/portal?denied=1");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal" label="Home" />
        <h1>Admin</h1>
        <p>Who&rsquo;s on the team and exactly what each person can see.</p>
      </div>

      <div className="pt-tiles">
        <Link href="/portal/admin/team" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 11l2 2 3-3.5" /></svg>
          </span>
          <h3>Team &amp; access</h3>
          <p>Add people, set their role, and switch on or off exactly what each person can see.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
        <Link href="/portal/admin/access" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5zM12 15v2" /></svg>
          </span>
          <h3>Access levels</h3>
          <p>What each crew level can see — Operations, Lead hand, Tradesman, Apprentice, Office, Admin.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
        {/* The pricebook as the van sees it. Admin links to it because what
            the iPad shows is an admin question even though the page itself
            lives in the trade portal. */}
        <Link href="/trade/pricebook" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10 18h4" /></svg>
          </span>
          <h3>iPad pricebook</h3>
          <p>The installed prices the crew quote from in the van, as the iPad shows them.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
      </div>
      <ViewAsPicker current={user.viewingAs} />
    </PortalShell>
  );
}
