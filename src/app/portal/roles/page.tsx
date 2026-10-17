import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead } from "@/components/portal/kit/Kit";
import { RolesBoard } from "@/components/portal/RolesBoard";
import { loadRoles } from "@/lib/portal/roles/store";
import { ATTITUDE, DEAL, STANDARDS } from "@/lib/portal/roles/seed";
import { dbConfigured, listUsers } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles · Team portal" };

/**
 * How we work › Roles: what we expect of every seat, from the expectations
 * document issued with ServiceTitan go-live, and who sits in each. Everyone
 * can read it; the office edits the roles and puts people in them.
 */
export default async function RolesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const ready = dbConfigured();
  const [state, users] = await Promise.all([loadRoles(), ready ? listUsers().catch(() => []) : Promise.resolve([])]);
  const people = users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name })).sort((a, b) => a.name.localeCompare(b.name));
  const placed = people.filter((p) => state.roles.some((r) => r.id === state.assign[p.id])).length;
  const canEdit = can(user, "manage_users") || can(user, "overhead");
  return (
    <PortalShell user={user}>
      <KpiHead title={<>Roles</>} kpis={[
        { icon: "doc", fig: String(state.roles.length), label: "Seats in the business" },
        { icon: "trophy", fig: `${placed} of ${people.length}`, label: "People in a role" },
      ]} />
      <p className="pk-note td-intro">What we expect of each seat: the day, what you own and what you don&rsquo;t, what you&rsquo;re measured on, what the seat needs, and how you move up. You grow up this ladder as you earn it, not by time served.</p>
      <RolesBoard roles={state.roles} assign={state.assign} people={people} canEdit={canEdit} everyone={{ standards: STANDARDS, attitude: ATTITUDE, deal: DEAL }} />
    </PortalShell>
  );
}
