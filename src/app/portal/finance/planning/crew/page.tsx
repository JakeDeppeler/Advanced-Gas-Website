import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { getCostSettings } from "@/lib/portal/costSettings";
import { DEFAULT_SETTINGS, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { CrewWhatIf } from "@/components/portal/CrewWhatIf";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crew & rate what-ifs — Team portal" };

export default async function CrewWhatIfPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, s] = ready ? await Promise.all([listUsers(), getCostSettings()]) : [[], DEFAULT_SETTINGS];
  const people: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
  const me = users.find((u) => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase());

  return (
    <PortalShell user={user}>
      <FinanceHead title="What if" lede="Add or take off people, change pay, take a cut. Every figure comes from Our numbers; nothing here changes them." />
      <PlanningTabs current="/portal/finance/planning/crew" />
      <CrewWhatIf people={people} settings={s} meId={me?.id ?? null} />
    </PortalShell>
  );
}
