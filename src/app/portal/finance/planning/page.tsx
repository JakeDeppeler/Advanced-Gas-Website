import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { getCostSettings } from "@/lib/portal/costSettings";
import { getGrowth } from "@/lib/portal/growth";
import { EMPTY_GROWTH } from "@/lib/portal/growthTypes";
import { DEFAULT_SETTINGS, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { HireCalc } from "@/components/portal/HireCalc";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire someone — Team portal" };

/**
 * Planning, cut down to the question it gets asked: what does hiring one more
 * person take, and what does it make? Every figure comes from Our numbers —
 * the crew, the costs, the next van, the markups — so nothing is typed twice
 * and nothing here can drift from the hourly rate.
 */
export default async function PlanningPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, s, growth] = ready ? await Promise.all([listUsers(), getCostSettings(), getGrowth()]) : [[], DEFAULT_SETTINGS, EMPTY_GROWTH];
  const people: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));

  return (
    <PortalShell user={user}>
      <FinanceHead title="What if" lede="What another person takes, and what they make. Every figure comes from Our numbers; nothing here changes them." />
      <PlanningTabs current="/portal/finance/planning" />
      <HireCalc people={people} settings={s} growth={growth} />
    </PortalShell>
  );
}
