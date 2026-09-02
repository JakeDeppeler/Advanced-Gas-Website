import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can, ROLE_LABELS } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { CREW_LEVELS } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { AddTeamPerson } from "@/components/portal/AddTeamPerson";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Team portal" };

export default async function TeamDirectory() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const users = ready ? await listUsers() : [];
  const active = users.filter((u) => u.active && u.id);

  // group by crew level, in the CREW_LEVELS order, with the unassigned last
  const groups: { key: string; label: string; people: typeof active }[] = CREW_LEVELS.map((l) => ({
    key: l.key, label: l.label, people: active.filter((u) => u.level === l.key),
  })).filter((g) => g.people.length > 0);
  const unassigned = active.filter((u) => !u.level || !CREW_LEVELS.some((l) => l.key === u.level));
  if (unassigned.length) groups.push({ key: "none", label: "No level set", people: unassigned });

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Team</div>
        <h1>The crew.</h1>
        <p>Grouped by level. Open a person for their file — expectations, goals, reviews and notes. Set levels and costing in Finance → Billable capacity.</p>
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> The team needs the Supabase keys set on the server.</div>
      )}

      {can(user, "manage_users") && <AddTeamPerson />}

      {active.length === 0 ? (
        <div className="pt-rep__empty">No team members yet — add them in Admin → Team &amp; access.</div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="pt-teamgroup">
            <h2 className="pt-cathead">{g.label} <span className="pt-tm__count">{g.people.length}</span></h2>
            <div className="pt-grid">
              {g.people.map((u) => (
                <Link key={u.id} href={`/portal/team/${u.id}`} className="pt-card">
                  <div className="pt-card__tag">{ROLE_LABELS[u.role]}</div>
                  <div className="pt-card__title">{u.name}</div>
                  <p className="pt-card__desc">{u.email}</p>
                  <div className="pt-card__meta">Open file →</div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </PortalShell>
  );
}
