import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PortalBack } from "@/components/portal/PortalBack";
import { YearGoalBoard } from "@/components/portal/YearGoalBoard";
import { getMoneySeries, getMonthlyActuals, localToday, xeroStatus } from "@/lib/portal/xero";
import { InOutBars } from "@/components/portal/InOutBars";
import { readYearGoal, yearSpans, type MonthActual, type YearGoal } from "@/lib/portal/yearGoal";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { XeroLine } from "@/components/portal/XeroLine";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "The year — Team portal" };

export default async function YearGoalPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const today = localToday();
  const stored = dbConfigured() ? await getSettings<Partial<YearGoal>>("yeargoal").catch(() => null) : null;

  // An unset goal still renders: the page shows the months Xero has and says
  // the goal is missing, rather than redirecting to a form.
  const goal: YearGoal = readYearGoal(stored, today);

  const { status, tenantName } = await xeroStatus();
  const spans = yearSpans(goal.basis, goal.year);
  // The rolling twelve is the Overview's own series, so the two pages share
  // one set of Xero reads rather than asking twice.
  const [raw, rolling] = status === "connected"
    ? await Promise.all([
      getMonthlyActuals(spans, today).catch(() => spans.map(() => null)),
      getMoneySeries("12m").catch(() => []),
    ])
    : [spans.map(() => null), []];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const last12 = Array.from({ length: 12 }, (_, k) => MON[(today.getUTCMonth() + 1 + k) % 12]);
  const actuals: MonthActual[] = raw.map((p) => ({
    income: p?.income ?? null,
    expenses: p?.expenses ?? null,
    netProfit: p?.netProfit ?? null,
  }));

  return (
    <PortalShell user={user}>
      <FinanceHead title="The year" lede="The year’s goal across the months, against what Xero says was actually invoiced and what the overheads are running at." xero={{ state: status, org: tenantName }} />

      <InOutBars points={rolling} months={last12} />
      <YearGoalBoard goal={goal} actuals={actuals} today={today.toISOString().slice(0, 10)} xero={status} />
    </PortalShell>
  );
}
