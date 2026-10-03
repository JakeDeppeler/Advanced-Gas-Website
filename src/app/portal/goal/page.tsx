import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dbConfigured, getSettings, listUsers } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { GoalPlanner } from "@/components/portal/GoalPlanner";
import { Locked } from "@/components/portal/Locked";
import { readYearGoal, STARTING_GOAL, STARTING_MIX } from "@/lib/portal/yearGoal";
import { normaliseBoardSettings } from "@/lib/dashboard/boardSettings";
import { isoDateMelbourne, workingDaysInMonth } from "@/lib/dashboard/dates";
import { latestSnapshot } from "@/lib/dashboard/metrics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Year goal — Team portal" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * The year goal: the one place the business says what it is aiming at.
 *
 * The wall board's four monthly targets, Finance's The year and the Targets
 * planner all read the row this page saves, so changing the goal here moves
 * every one of them and there is no second figure to forget to update.
 */
export default async function GoalPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The year goal" forWhom="managers" />;

  const ready = dbConfigured();
  const now = new Date();
  const [row, board, users, snap] = ready
    ? await Promise.all([
      getSettings<unknown>("yeargoal").catch(() => null),
      getSettings<unknown>("dashboard").catch(() => null),
      listUsers().catch(() => []),
      latestSnapshot().catch(() => null),
    ])
    : [null, null, [], null];

  const goal = readYearGoal(row, now);
  // Nothing saved: show the design's goal and week so the page reads as it was
  // drawn, labelled as not saved. The board reads only the saved row, so none
  // of these reach the wall.
  const sample = row == null || goal.revenue <= 0;
  const initial = sample
    ? { ...goal, revenue: STARTING_GOAL.revenue, profitPct: goal.profitPct ?? STARTING_GOAL.profitPct, mix: goal.mix.length ? goal.mix : STARTING_MIX }
    : { ...goal, mix: goal.mix.length ? goal.mix : STARTING_MIX };

  // The people who run jobs — not the office, and not apprentices riding along.
  const techs = users.filter((u) => u.active && (u.level === "tradesman" || u.level === "lead" || u.level === "hybrid")).length;

  // The month's working days off the board's own calendar, so the jobs-booked
  // figure this page shows is the one the board's dial will use.
  const cfg = normaliseBoardSettings(board);
  const days = workingDaysInMonth(now, { days: cfg.workingDays, holidays: cfg.holidays });

  // Jobs booked this month, as the board last counted them from ServiceTitan.
  // Only a snapshot from this month counts — last month's total is not this
  // month's.
  const thisMonth = isoDateMelbourne(now).slice(0, 7);
  const booked = snap && isoDateMelbourne(new Date(snap.computedAt)).slice(0, 7) === thisMonth && typeof snap.metrics.bookingsMonth === "number"
    ? snap.metrics.bookingsMonth
    : null;

  return (
    <PortalShell user={user} variant="mid">
      <PortalBack href="/portal" label="Home" />
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected.</strong> The goal can be explored but not saved until it is.
        </div>
      )}
      <GoalPlanner
        initial={initial}
        sample={sample}
        sampleMix={goal.mix.length === 0}
        techs={techs}
        booked={booked}
        month={{ name: MONTHS[Number(thisMonth.slice(5, 7)) - 1], workingDays: days.total, daysPerWeek: cfg.workingDays.length }}
        canSave={ready}
      />
    </PortalShell>
  );
}
