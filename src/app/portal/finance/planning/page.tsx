import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, getSettings, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, overheadSplit, overheadTotal, scaleModel, DEFAULT_SETTINGS, type CrewLevel, type ScaleRow } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PortalBack } from "@/components/portal/PortalBack";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { ScenarioPlanner } from "@/components/portal/ScenarioPlanner";
import { FinancePlanner } from "@/components/portal/FinancePlanner";
import { VanScaling } from "@/components/portal/VanScaling";
import { WhatIf } from "@/components/portal/WhatIf";
import { xeroStatus, getProfitAndLoss, localToday } from "@/lib/portal/xero";
import { DEFAULT_TARGETS, type Targets } from "@/lib/portal/targets";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { XeroLine } from "@/components/portal/XeroLine";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planning — Team portal" };

export default async function PlanningPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  // The year's profit so far, so the target has something to measure against.
  const { status, tenantName } = await xeroStatus();
  const t = localToday();
  const yearProfit = status === "connected"
    ? (await getProfitAndLoss(
        new Date(Date.UTC(t.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10),
        t.toISOString().slice(0, 10),
      ))?.netProfit ?? null
    : null;

  // The same days-a-week the Targets page works to, so "per day" means the
  // same thing on both screens.
  const targets = dbConfigured() ? await getSettings<Targets>("targets") : null;
  const daysWeek = targets?.daysWeek ?? DEFAULT_TARGETS.daysWeek;

  let charge = 0, cost = 0, techs = 0;

  // What another van does to the numbers. It used to be a tab on the costing
  // page, beside four tabs about the business as it stands; it is a question
  // about next year, so it lives here.
  let scale: ScaleRow[] = [];
  let split = { fixed: 0, perVan: 0 };
  let officeOh = 0, ohTotal = 0;
  if (dbConfigured()) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const s = settings ?? DEFAULT_SETTINGS;
    const people = users.filter((u) => u.active && u.id && u.level).map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    const cap = computeCapacity(people, s);
    // The people who bill their own hours: the starting point for "techs on
    // the road".
    techs = people.filter((p) => p.level === "tradesman" || p.level === "lead" || p.level === "hybrid").length;
    cost = Math.round(cap.costPerHr);
    charge = Math.round(cap.costPerHr * (1 + s.margin / 100));
    scale = scaleModel(cap, s);
    split = overheadSplit(s);
    officeOh = cap.officeOh;
    ohTotal = overheadTotal(s) + cap.labourOh + cap.officeOh;
  }

  return (
    <PortalShell user={user}>
      <FinanceHead title="Future planning" lede="The profit you’re aiming at, then the what-ifs. Nothing here changes your live numbers." xero={{ state: status, org: tenantName }} />
      <PlanningTabs current="/portal/finance/planning" />
      <WhatIf techs={techs} rate={charge} />
      <FinancePlanner yearProfit={yearProfit} daysWeek={daysWeek} />
      <ScenarioPlanner defaultCharge={charge} defaultCost={cost} />
      {scale.length > 0 && (
        <VanScaling scale={scale} split={split} officeOh={officeOh} ohTotal={ohTotal} />
      )}
    </PortalShell>
  );
}
