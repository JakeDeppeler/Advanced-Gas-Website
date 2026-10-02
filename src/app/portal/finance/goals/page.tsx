import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { YearGoalBoard } from "@/components/portal/YearGoalBoard";
import { getMonthlyActuals, localToday, xeroStatus } from "@/lib/portal/xero";
import { currentYear, yearSpans, DEFAULT_YEAR_GOAL, type MonthActual, type YearGoal } from "@/lib/portal/yearGoal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "The year — Team portal" };

export default async function YearGoalPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const today = localToday();
  const stored = dbConfigured() ? await getSettings<Partial<YearGoal>>("yeargoal").catch(() => null) : null;

  // An unset goal still renders: the page shows the months Xero has and says
  // the goal is missing, rather than redirecting to a form.
  const goal: YearGoal = {
    basis: stored?.basis === "calendar" ? "calendar" : "financial",
    year: typeof stored?.year === "number" ? stored.year : currentYear(stored?.basis === "calendar" ? "calendar" : "financial", today),
    revenue: typeof stored?.revenue === "number" ? stored.revenue : DEFAULT_YEAR_GOAL.revenue,
    overhead: typeof stored?.overhead === "number" ? stored.overhead : null,
    shape: Array.isArray(stored?.shape) && stored.shape.length === 12 ? stored.shape : null,
  };

  const { status } = await xeroStatus();
  const spans = yearSpans(goal.basis, goal.year);
  const raw = status === "connected" ? await getMonthlyActuals(spans, today).catch(() => spans.map(() => null)) : spans.map(() => null);
  const actuals: MonthActual[] = raw.map((p) => ({
    income: p?.income ?? null,
    expenses: p?.expenses ?? null,
    netProfit: p?.netProfit ?? null,
  }));

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/finance" label="Finance" />
      <div className="pt-head">
        <div className="pt-head__eyebrow">The year</div>
        <h1>Are we going to make it?</h1>
        <p>
          The year&rsquo;s goal broken down across the months, against what Xero says has actually been invoiced and
          what the overheads are running at. Whether we&rsquo;re ahead or behind, and whether last month was better
          than the one before.
        </p>
      </div>

      <YearGoalBoard goal={goal} actuals={actuals} today={today.toISOString().slice(0, 10)} xero={status} />
    </PortalShell>
  );
}
