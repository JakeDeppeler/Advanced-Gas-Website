import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can, ROLE_LABELS } from "@/lib/portal/caps";
import { getUserById, listGoals, listReviews, listReports, listVehicles } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PersonFile } from "@/components/portal/PersonFile";
import { PersonVan } from "@/components/portal/PersonVan";
import { personVan } from "@/lib/portal/personVan";

export const dynamic = "force-dynamic";

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TeamMemberFile({ params }: { params: { id: string } }) {
  const me = await getPortalUser();
  if (!me) redirect("/portal/login");
  if (!can(me, "reports_read")) redirect("/portal?denied=1");

  const person = await getUserById(params.id);
  if (!person || !person.id) notFound();

  const [goals, reviews, notes, vanView] = await Promise.all([
    listGoals(person.id),
    listReviews(person.id),
    listReports({ subjectId: person.id }),
    personVan(person.id, person.name),
  ]);
  const canFleet = can(me, "vehicles");
  const vans = canFleet ? (await listVehicles()).map((v) => ({ id: v.id, name: v.name, rego: v.rego })) : [];

  return (
    <PortalShell user={me}>
      <div className="pt-head">
        <PortalBack href="/portal/team" label="All of the team" />
        <div className="pt-head__eyebrow">Team · {ROLE_LABELS[person.role]}</div>
        <h1>{person.name}.</h1>
        <p>{person.email}</p>
      </div>

      <PersonVan {...vanView} mine={false} assign={canFleet ? { userId: person.id, vans } : undefined} />

      <PersonFile
        userId={person.id}
        name={person.name}
        expectations={person.expectations ?? null}
        goals={goals.map((g) => ({ id: g.id, title: g.title, target: g.target, status: g.status, due: g.due }))}
        reviews={reviews.map((r) => ({ id: r.id, period: r.period, rating: r.rating, body: r.body, authorName: r.authorName, when: when(r.createdAt) }))}
        notes={notes.map((n) => ({ id: n.id, sentiment: n.sentiment, body: n.body, authorName: n.authorName, when: when(n.createdAt) }))}
        canEdit={can(me, "reports_write")}
        canDeleteNotes={can(me, "manage_users")}
      />
    </PortalShell>
  );
}
