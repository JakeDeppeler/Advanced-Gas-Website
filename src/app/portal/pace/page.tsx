import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dbConfigured, getSettings } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PacePlanner } from "@/components/portal/PacePlanner";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { latestSnapshot } from "@/lib/dashboard/metrics";
import { jobProfits } from "@/lib/dashboard/jobProfit";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { isoDateMelbourne, startOfMonthMelbourne } from "@/lib/dashboard/dates";
import { MonthSoFar } from "@/components/portal/run/MonthSoFar";
import { YearSoFar } from "@/components/portal/run/YearSoFar";

export const dynamic = "force-dynamic";
// The year reads twelve months of Xero.
export const maxDuration = 60;
export const metadata = { title: "Pace · Team portal" };

/**
 * Where the business sets its pace and sees whether it's holding it.
 *
 * The goal (how much, at what profit) is the same row the Year goal page and
 * the wall board read, so a change here moves the wall. Everything measured
 * comes from the board's own latest snapshot rather than a second set of
 * queries, so this page and the TV in the office can't disagree about how many
 * jobs were quoted this week. The profit on this month's jobs is read live,
 * because it lists the jobs.
 *
 * Three tabs (The Numbers › Pace): the week, the month — which took in what
 * This month showed, the jobs sold and the gear in them — and the year, which
 * took in Year so far's months against the goal from Xero.
 */
export default async function PacePage({ searchParams }: { searchParams: { view?: string; m?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Pace" forWhom="managers" />;

  const view = searchParams?.view === "month" ? "month" : searchParams?.view === "year" ? "year" : "week";
  const ready = dbConfigured();
  const now = new Date();
  const [row, snap, crew] = ready
    ? await Promise.all([
      getSettings<unknown>("yeargoal").catch(() => null),
      latestSnapshot().catch(() => null),
      view === "month" ? hourJobCosts().catch(() => null) : Promise.resolve(null),
    ])
    : [null, null, null];

  const goal = readYearGoal(row, now);
  // Nothing saved yet: start from the figures Jake asked for, labelled as not
  // saved. The board reads only the saved row, so none of these reach the wall.
  const sample = row == null || goal.revenue <= 0;
  const shown = sample ? { ...goal, revenue: 3_200_000, profitPct: goal.profitPct ?? 20 } : goal;

  const from = isoDateMelbourne(startOfMonthMelbourne(now));
  // Only the month shows the profit on its jobs, so only the month reads it.
  const profit = ready && view === "month"
    ? await jobProfits(from, isoDateMelbourne(now), crew?.costPerHr ?? null, shown.profitPct, crew?.crew ?? [])
      .then((r) => ({
        summary: r.summary,
        // The jobs worth a look: costed ones under the goal, worst first.
        worst: r.rows.filter((j) => j.margin != null && (shown.profitPct == null || j.margin < shown.profitPct / 100)).slice(0, 8),
      }))
      .catch(() => null)
    : null;

  return (
    <PortalShell user={user} variant="wide">

      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected.</strong> The goal can be explored but not saved until it is.
        </div>
      )}
      <PacePlanner
        goal={{ basis: shown.basis, year: shown.year, revenue: shown.revenue, profitPct: shown.profitPct, shape: shown.shape, weeks: shown.weeks }}
        sample={sample}
        settings={shown.pace}
        data={snap?.metrics.paceData ?? null}
        profit={profit}
        canSave={ready}
        view={view}
      >
        {view === "month" ? <MonthSoFar m={searchParams?.m} /> : view === "year" ? <YearSoFar /> : null}
      </PacePlanner>
    </PortalShell>
  );
}
