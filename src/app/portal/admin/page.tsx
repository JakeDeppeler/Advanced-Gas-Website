import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata = { title: "Admin — Team portal" };

export default async function AdminHome() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (user.role !== "admin") redirect("/portal?denied=1");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Admin</div>
        <h1>Admin.</h1>
        <p>The numbers behind the business — for admins only.</p>
      </div>

      <div className="pt-tiles">
        <Link href="/portal/admin/overhead" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7" /></svg>
          </span>
          <h3>Overhead-cost tool</h3>
          <p>Total overheads ÷ billable hours = what every hour has to recover, plus a charge-out rate.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
      </div>
    </PortalShell>
  );
}
