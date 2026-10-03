import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { ViewAsPicker } from "@/components/portal/ViewAs";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";

export const metadata = { title: "Admin — Team portal" };

export default async function AdminHome() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) return <Locked user={user} what="Admin" forWhom="admins" />;

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal" label="Home" />
        <h1>Admin</h1>
        <p>Who&rsquo;s on the team and exactly what each person can see.</p>
      </div>

      {/* Four doors, two by two, as in the Admin mock: a title, what's behind
          it, and the one word that says what you'll do there. */}
      <div className="pt-admgrid">
        <Link href="/portal/admin/team" className="pt-admcard">
          <h2>Team &amp; access</h2>
          <p>Add people, set their role, and switch each page on or off for them.</p>
          <span>Open →</span>
        </Link>
        <Link href="/portal/admin/access" className="pt-admcard">
          <h2>Access levels</h2>
          <p>What each crew level can see, page by page.</p>
          <span>Open →</span>
        </Link>
        <Link href="/portal/sops/edit" className="pt-admcard">
          <h2>Processes &amp; procedures</h2>
          <p>Write and change what the crew reads, then publish it to the vans.</p>
          <span>Edit →</span>
        </Link>
        {/* The pricebook as the van sees it. Admin links to it because what
            the iPad shows is an admin question even though the page itself
            lives in the trade portal. */}
        <Link href="/trade/pricebook" className="pt-admcard">
          <h2>iPad pricebook</h2>
          <p>The installed prices the crew quote from in the van, as the iPad shows them.</p>
          <span>Open →</span>
        </Link>
      </div>
      <ViewAsPicker current={user.viewingAs} />
    </PortalShell>
  );
}
