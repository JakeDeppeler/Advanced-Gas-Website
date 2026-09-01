import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { OverheadCalc } from "@/components/portal/OverheadCalc";

export const metadata = { title: "Overhead-cost tool — Team portal" };

export default async function OverheadPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow"><Link href="/portal/admin" style={{ color: "inherit", textDecoration: "none" }}>Admin</Link> · Overhead cost</div>
        <h1>What an hour really costs.</h1>
        <p>Every dollar of overhead has to be earned back across the hours you can actually bill. This works out that per-hour number, and the rate you&rsquo;d charge to clear it with a margin.</p>
      </div>
      <OverheadCalc />
    </PortalShell>
  );
}
