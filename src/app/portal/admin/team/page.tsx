import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can, type PortalUser } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { isOwner } from "@/lib/portal/team";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { TeamManager } from "@/components/portal/TeamManager";

export const metadata = { title: "Team & access — Team portal" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const raw = ready ? await listUsers() : [];
  // Make sure the signed-in owner always appears, even before the DB has rows.
  const rows: (PortalUser & { isOwner: boolean })[] = raw.map((u) => ({ ...u, isOwner: isOwner(u.email) }));
  if (!rows.some((u) => u.email === user.email)) {
    rows.unshift({ ...user, isOwner: isOwner(user.email) });
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/admin" label="Admin" />
        <h1>Who&rsquo;s in, and what they see.</h1>
        <p>Add the crew, set each person&rsquo;s role, and switch individual things on or off. Changes take effect the next time they load a page.</p>
      </div>

      <TeamManager users={rows} meEmail={user.email} dbReady={ready} />
    </PortalShell>
  );
}
