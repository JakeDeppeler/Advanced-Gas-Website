import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getSettings, dbConfigured } from "@/lib/portal/db";
import { getCostSettings } from "@/lib/portal/costSettings";
import { computeCapacity, DEFAULT_SETTINGS, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { getPLDetail, lastTwelveMonths } from "@/lib/portal/xero";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { PayPlanModel } from "@/components/portal/PayPlanModel";
import { readPayPlan } from "@/lib/portal/payPlan";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commission — Team portal" };

export default async function CommissionPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, s] = ready ? await Promise.all([listUsers(), getCostSettings()]) : [[], DEFAULT_SETTINGS];
  const people: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));

  // A van's sales a year, and how much of each sales dollar is left after
  // parts, equipment and subbies: the last twelve months in Xero, averaged
  // over the vans on the road.
  let salesPerVan: number | null = null;
  let gpMargin: number | null = null;
  try {
    const span = lastTwelveMonths();
    const pl = await getPLDetail(span.from, span.to);
    const vans = computeCapacity(people, s).realVans;
    if (pl && pl.income > 0 && vans > 0) {
      const cos = pl.sections.filter((x) => x.kind === "out" && /cost of sales|direct cost/i.test(x.title))
        .flatMap((x) => x.lines).filter((l) => !/wage|salar|super/i.test(l.label)).reduce((a, l) => a + l.amount, 0);
      const subbies = pl.sections.filter((x) => x.kind === "out" && !/cost of sales|direct cost/i.test(x.title))
        .flatMap((x) => x.lines).filter((l) => /contractor/i.test(l.label)).reduce((a, l) => a + l.amount, 0);
      salesPerVan = pl.income / vans;
      gpMargin = (pl.income - cos - subbies) / pl.income;
    }
  } catch { /* Xero not connected: the model takes a typed figure */ }
  const plan = readPayPlan(ready ? await getSettings<unknown>("payplan").catch(() => null) : null);

  return (
    <PortalShell user={user}>
      <FinanceHead title="What if" lede="The pay plan from January, and whether it pays for itself. Every figure comes from Our numbers." />
      <PlanningTabs current="/portal/finance/planning/commission" />
      <PayPlanModel people={people} settings={s} salesPerVan={salesPerVan} gpMargin={gpMargin} plan={plan} today={isoDateMelbourne(new Date())} />
    </PortalShell>
  );
}
