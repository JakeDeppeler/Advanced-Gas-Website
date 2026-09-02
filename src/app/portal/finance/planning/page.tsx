import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, DEFAULT_SETTINGS, type CrewLevel } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { ScenarioPlanner } from "@/components/portal/ScenarioPlanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planning — Team portal" };

export default async function PlanningPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  let charge = 0, cost = 0;
  if (dbConfigured()) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const s = settings ?? DEFAULT_SETTINGS;
    const people = users.filter((u) => u.active && u.id && u.level).map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    const cap = computeCapacity(people, s);
    cost = Math.round(cap.costPerHr);
    charge = Math.round(cap.costPerHr * (1 + s.margin / 100));
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Planning</div>
        <h1>What if&hellip;</h1>
        <p>Quick scenarios — what another billable person adds to the bottom line, and what a more economical van saves. Nothing here changes your live numbers.</p>
      </div>
      <ScenarioPlanner defaultCharge={charge} defaultCost={cost} />
    </PortalShell>
  );
}
