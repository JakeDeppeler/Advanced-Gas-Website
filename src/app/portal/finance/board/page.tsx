import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dbConfigured, getSettings } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { BoardTargets } from "@/components/portal/BoardTargets";
import { BoardCalendar } from "@/components/portal/BoardCalendar";
import { monthTargetFromYearGoal, normaliseBoardSettings, type YearGoalShape } from "@/lib/dashboard/boardSettings";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { currentYear, periodLabel } from "@/lib/portal/yearGoal";
import type { BoardTargets as Saved } from "./actions";
import type { Targets } from "@/lib/portal/targets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wall board — Team portal" };

/**
 * Where the wall board's numbers are set.
 *
 * The board is read from across the office and nobody who reads it can change
 * it, so the one thing it needs from a person — what we are aiming at — belongs
 * in the portal beside the other targets rather than in a database row somebody
 * has to be asked to write.
 */
export default async function BoardPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const saved = ready ? await getSettings<Partial<Saved>>("dashboard") : null;
  const year = ready ? await getSettings<Targets>("targets") : null;

  const initial: Saved = {
    revenueTargetMonthly: saved?.revenueTargetMonthly ?? null,
    salesTargetMonthly: saved?.salesTargetMonthly ?? null,
    profitTargetMonthly: saved?.profitTargetMonthly ?? null,
    bookingsTargetMonthly: saved?.bookingsTargetMonthly ?? null,
    commissionTiers: saved?.commissionTiers ?? [],
  };

  // Offered, never applied: the year's goal is invoiced revenue, and three of
  // the four dials measure something else.
  const suggestion = year?.revenue && year.revenue > 0 ? year.revenue / 12 : null;

  // The rest of the same row — where the revenue target comes from, and the
  // working calendar — read through the same normaliser the board reads with.
  const cfg = normaliseBoardSettings(saved);

  // The year goal proper, which the revenue target can be driven from. This is
  // a different thing from `targets` above: that is the quoting plan, this is
  // the year the accounts are measured against, with a month-by-month shape.
  const goalRow = ready ? await getSettings<Partial<YearGoalShape>>("yeargoal").catch(() => null) : null;
  const goal: YearGoalShape | null =
    goalRow && typeof goalRow.revenue === "number" && goalRow.revenue > 0
      ? {
          basis: goalRow.basis === "calendar" ? "calendar" : "financial",
          year: typeof goalRow.year === "number" ? goalRow.year : currentYear(goalRow.basis === "calendar" ? "calendar" : "financial", new Date()),
          revenue: goalRow.revenue,
          shape: Array.isArray(goalRow.shape) && goalRow.shape.length === 12 ? goalRow.shape : null,
        }
      : null;

  // Melbourne's now, resolved on the server so the working-day counts the editor
  // recomputes as the boxes are ticked agree with the first render.
  const nowIso = new Date().toISOString();
  const derived = monthTargetFromYearGoal(goal, isoDateMelbourne(new Date()).slice(0, 7));

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/finance" label="Finance" />

      <div className="pt-head">
        <div className="pt-head__eyebrow">Wall board</div>
        <h1>What the board is aiming at<span className="pt-stop">.</span></h1>
        <p>
          The dials on the office screen measure the month against these. Until a target is set the dial says so
          rather than guessing, which is the only honest thing a wall can do with a number nobody agreed to.
        </p>
      </div>

      {!ready && (
        <section className="pt-panel">
          <p className="pt-panel__sub">The database isn&rsquo;t connected, so nothing can be saved yet.</p>
        </section>
      )}

      <BoardTargets initial={initial} canSave={ready} suggestion={suggestion} />

      <BoardCalendar
        revenueFromYearGoal={cfg.revenueFromYearGoal}
        workingDays={cfg.workingDays}
        holidays={cfg.holidays}
        derived={derived}
        goalLabel={goal ? periodLabel(goal) : null}
        goalRevenue={goal?.revenue ?? null}
        now={nowIso}
      />
    </PortalShell>
  );
}
