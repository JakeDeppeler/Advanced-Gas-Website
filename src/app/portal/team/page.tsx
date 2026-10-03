import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import type { CrewLevel } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { AddTeamPerson } from "@/components/portal/AddTeamPerson";
import { TeamBoard, type TeamPerson } from "@/components/portal/TeamBoard";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Team portal" };

export default async function TeamDirectory({ searchParams }: { searchParams: { add?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) return <Locked user={user} what="Team" forWhom="managers" />;

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
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>The crew</h1>
          <p>Grouped by level. Open a person for their file.</p>
        </div>
        {canManage && <Link href="/portal/team?add=1" className="pt-btn pt-btn--orange pt-mkadd">+ Add a person</Link>}
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> The team needs the Supabase keys set on the server.</div>
      )}

      {canManage && searchParams?.add === "1" && <AddTeamPerson doneHref="/portal/team" />}

      {people.length === 0 ? (
        <div className="pt-rep__empty">
          {ready
            ? "No team members yet — add them above."
            : "The team can’t be read right now, so this is empty rather than the team being empty."}
        </div>
      ) : (
        <TeamBoard initial={people} canManage={canManage} />
      )}
    </PortalShell>
  );
}
