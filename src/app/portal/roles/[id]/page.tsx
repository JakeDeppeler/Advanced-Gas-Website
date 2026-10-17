import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead } from "@/components/portal/kit/Kit";
import { RoleView } from "@/components/portal/roles/RoleView";
import { loadRoles } from "@/lib/portal/roles/store";
import { ladderOf } from "@/lib/portal/roles/ladder";
import { canEditStandards } from "@/lib/portal/standards";
import { dbConfigured, listUsers } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const r = (await loadRoles().catch(() => null))?.roles.find((x) => x.id === params.id);
  return { title: `${r?.name ?? "Role"} · Team portal` };
}

/** One role, the whole page: what the seat is, set out as points, and who's in it. */
export default async function RolePage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const [state, users] = await Promise.all([loadRoles(), dbConfigured() ? listUsers().catch(() => []) : Promise.resolve([])]);
  const role = state.roles.find((r) => r.id === params.id);
  if (!role) notFound();
  const people = users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name })).sort((a, b) => a.name.localeCompare(b.name));
  const who = people.filter((p) => state.assign[p.id] === role.id);
  const ladder = ladderOf(state.roles);
  const step = ladder.rungs.findIndex((rung) => rung.some((r) => r.id === role.id));
  return (
    <PortalShell user={user}>
      <a href="/portal/roles" className="pt-back">‹ All roles</a>
      <KpiHead title={role.name} kpis={[
        { icon: "trophy", fig: String(who.length), label: who.length === 1 ? "Person in this role" : "People in this role" },
        { icon: "trend", fig: step >= 0 ? `${step + 1} of ${ladder.rungs.length}` : "Off the tools", label: step >= 0 ? "Step on the ladder" : "Not on the field ladder" },
        { icon: "doc", fig: String(role.owns.length), label: "Things this seat owns" },
      ]} />
      <RoleView role={role} roles={state.roles} assign={state.assign} people={people} canEdit={canEditStandards(user)} ladder={ladder} />
    </PortalShell>
  );
}
