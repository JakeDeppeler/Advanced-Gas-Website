import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dbConfigured, getSettings } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { BoardCommission } from "@/components/portal/BoardCommission";
import { BoardCalendar } from "@/components/portal/BoardCalendar";
import { monthTargetsFromYearGoal, normaliseBoardSettings } from "@/lib/dashboard/boardSettings";
import { isoDateMelbourne, workingDaysInMonth } from "@/lib/dashboard/dates";
import { mixTotals, periodLabel, readYearGoal } from "@/lib/portal/yearGoal";
import { money } from "@/lib/portal/format";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wall board — Team portal" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * What the wall board is aiming at, and the two things it is told that the
 * year goal doesn't say: the commission bands and the working calendar.
 *
 * The targets are shown, not typed. They used to be four boxes here, which
 * made this a second place to say what the year was aiming at — and two places
 * to say it is one place to forget.
 */
export default async function BoardPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const ready = dbConfigured();
  const [saved, goalRow] = ready
    ? await Promise.all([
      getSettings<Record<string, unknown>>("dashboard").catch(() => null),
      getSettings<unknown>("yeargoal").catch(() => null),
    ])
    : [null, null];

  // Read through the same normaliser the board reads with, so what this page
  // says the board is aiming at is what the board is aiming at.
  const cfg = normaliseBoardSettings(saved);
  const now = new Date();
  const goal = readYearGoal(goalRow, now);
  const hasGoal = goalRow != null && goal.revenue > 0;
  const cal = { days: cfg.workingDays, holidays: cfg.holidays };
  const days = workingDaysInMonth(now, cal);
  const t = monthTargetsFromYearGoal(hasGoal ? goal : null, isoDateMelbourne(now).slice(0, 7), days, cal.days.length);
  const jobsWeek = mixTotals(goal.mix, goal.weeks).jobsWeek;
  const month = MONTHS[Number(isoDateMelbourne(now).slice(5, 7)) - 1];

  const cells: Array<{ k: string; v: string | null; how: string }> = [
    {
      k: "To invoice",
      v: t.revenue == null ? null : money(t.revenue),
      how: hasGoal ? `${month}'s share of the ${periodLabel(goal)} goal of ${money(goal.revenue)}` : "Needs a year goal",
    },
    {
      k: "To sell",
      v: t.sales == null ? null : money(t.sales),
      how: "The same figure — over a year, what's sold is what gets invoiced",
    },
    {
      k: "Gross profit",
      v: t.profit == null ? null : money(t.profit),
      how: goal.profitPct ? `At the goal's ${goal.profitPct}%, on the month before GST` : "Needs a profit % on the goal",
    },
    {
      k: "Jobs booked",
      v: t.bookings == null ? null : t.bookings.toLocaleString("en-AU"),
      how: jobsWeek > 0 ? `${jobsWeek.toLocaleString("en-AU")} a week over ${days.total} working days` : "Needs the week planned on the goal",
    },
  ];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/board" label="Wall board" />

      <div className="pt-head pt-head--split">
        <div>
          <h1>What the board is aiming at</h1>
          <p>
            Every target on the wall comes from the year goal, worked out fresh for the month on every refresh. Change
            the goal and the board follows within the minute.
          </p>
        </div>
        {/* The board is gated by a shared token rather than a login, so it
            cannot be linked to directly. This goes through a route that checks
            the session first and then redirects with the token, which keeps the
            token out of this page's markup. */}
        <a className="pt-btn pt-btn--ghost" href="/portal/finance/board/open" target="_blank" rel="noreferrer">
          Open the live board ↗
        </a>
      </div>

      {!ready && (
        <section className="pt-panel">
          <p className="pt-panel__sub">The database isn&rsquo;t connected, so nothing can be saved yet.</p>
        </section>
      )}

      <section className="pt-panel pt-bdg">
        <div className="pt-bdg__head">
          <div>
            <h2 className="pt-panel__h">{month}, from the year goal</h2>
            <p className="pt-panel__sub">
              The four dials on the Pace page. One the goal doesn&rsquo;t cover says &ldquo;not set&rdquo; on the wall
              rather than guessing.
            </p>
          </div>
          <Link href="/portal/goal" className={`pt-btn ${hasGoal ? "pt-btn--ghost" : "pt-btn--orange"}`}>
            {hasGoal ? "Change the year goal" : "Set the year goal"}
          </Link>
        </div>
        <div className="pt-bdg__cells">
          {cells.map((c) => (
            <div key={c.k} className={`pt-bdg__cell${c.v == null ? " is-unset" : ""}`}>
              <span>{c.k}</span>
              <strong>{c.v ?? "Not set"}</strong>
              <em>{c.how}</em>
            </div>
          ))}
        </div>
      </section>

      <BoardCommission initial={cfg.commissionTiers} canSave={ready} />

      <BoardCalendar workingDays={cfg.workingDays} holidays={cfg.holidays} now={now.toISOString()} />
    </PortalShell>
  );
}
