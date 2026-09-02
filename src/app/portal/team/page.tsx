import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import type { CrewLevel } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { AddTeamPerson } from "@/components/portal/AddTeamPerson";
import { TeamBoard, type TeamPerson } from "@/components/portal/TeamBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Team portal" };

export default async function TeamDirectory() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const users = ready ? await listUsers() : [];
  const active = users
    .filter((u) => u.active && u.id)
    .sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.name.localeCompare(b.name));

  const people: TeamPerson[] = active.map((u) => ({
    id: u.id as string, name: u.name, email: u.email, level: (u.level as CrewLevel | null) ?? "", role: u.role,
  }));

  const canManage = can(user, "manage_users");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Team</div>
        <h1>The crew.</h1>
        <p>Grouped by level. {canManage ? "Change anyone's level right here, drag the order with the arrows, and open a person for their file." : "Open a person for their file — expectations, goals, reviews and notes."}</p>
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> The team needs the Supabase keys set on the server.</div>
      )}

      {canManage && <AddTeamPerson />}

      {people.length === 0 ? (
        <div className="pt-rep__empty">No team members yet — add them above.</div>
      ) : (
        <TeamBoard initial={people} canManage={canManage} />
      )}
    </PortalShell>
  );
}
