import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can, ROLE_LABELS } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Team portal" };

export default async function TeamDirectory() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const users = ready ? await listUsers() : [];
  const active = users.filter((u) => u.active && u.id);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Team</div>
        <h1>The crew.</h1>
        <p>Open a person to see and set their expectations, goals and targets, reviews, and the private managers&rsquo; notes.</p>
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>Database not connected.</strong> Team files need the Supabase keys set on the server.
        </div>
      )}

      {active.length === 0 ? (
        <div className="pt-rep__empty">No team members yet — add them in Admin → Team &amp; access.</div>
      ) : (
        <div className="pt-grid">
          {active.map((u) => (
            <Link key={u.id} href={`/portal/team/${u.id}`} className="pt-card">
              <div className="pt-card__tag">{ROLE_LABELS[u.role]}</div>
              <div className="pt-card__title">{u.name}</div>
              <p className="pt-card__desc">{u.email}</p>
              <div className="pt-card__meta">Open file →</div>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
