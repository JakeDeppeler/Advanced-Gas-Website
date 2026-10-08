import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { getCostSettings } from "@/lib/portal/costSettings";
import { computeCapacity, DEFAULT_SETTINGS, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { getPLDetail, lastTwelveMonths } from "@/lib/portal/xero";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { CommissionModel } from "@/components/portal/CommissionModel";
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

  // What a van brings in a week now: the last twelve months' sales before GST,
  // less every cost of sale that isn't a wage (parts, equipment, certificates,
  // discounts) and the subcontractors wherever they're filed, over the vans on
  // the road. A business average, not any one van's.
  let actualGp: number | null = null;
  let gpSpan: string | null = null;
  try {
    const span = lastTwelveMonths();
    const pl = await getPLDetail(span.from, span.to);
    const vans = computeCapacity(people, s).realVans;
    if (pl && pl.income > 0 && vans > 0) {
      const cos = pl.sections.filter((x) => x.kind === "out" && /cost of sales|direct cost/i.test(x.title))
        .flatMap((x) => x.lines).filter((l) => !/wage|salar|super/i.test(l.label)).reduce((a, l) => a + l.amount, 0);
      const subbies = pl.sections.filter((x) => x.kind === "out" && !/cost of sales|direct cost/i.test(x.title))
        .flatMap((x) => x.lines).filter((l) => /contractor/i.test(l.label)).reduce((a, l) => a + l.amount, 0);
      actualGp = (pl.income - cos - subbies) / vans / s.weeksYear;
      gpSpan = "last 12 months";
    }
  } catch { /* Xero not connected: the model runs on the pace alone */ }

  return (
    <PortalShell user={user}>
      <FinanceHead title="Future planning" lede="The profit you’re aiming at, then the what-ifs. Nothing here changes your live numbers." />
      <PlanningTabs current="/portal/finance/planning/commission" />
      <CommissionModel people={people} settings={s} actualGp={actualGp} gpSpan={gpSpan} />
    </PortalShell>
  );
}
