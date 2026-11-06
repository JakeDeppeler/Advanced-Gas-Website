import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { needsToday } from "@/lib/portal/needs";
import { localToday } from "@/lib/portal/xero";
import { latestBoard, savedGoal } from "@/lib/portal/office";
import { meOf, openTodos, seesAll, teamPeople, todayMelbourne, visibleTo } from "@/lib/todos/store";
import { byUrgency, dueState, dueWords, firstName } from "@/lib/todos/types";
import { START_COOKIE, START_PAGES } from "@/lib/portal/businessTypes";
import { DEFAULT_WORKING_CALENDAR, isWorkingDay } from "@/lib/dashboard/dates";
import { Home, type HomeTodo } from "@/components/portal/home/Home";
import { overview } from "@/lib/portal/home/overview";
import { crewNow } from "@/lib/portal/home/crewNow";
import { revenueGoalFor, yearSpans } from "@/lib/portal/yearGoal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home · Team portal" };

/**
 * Where the portal opens, when someone has picked a start page in Settings:
 * only on the way in — signing in, a bookmark, a typed address — never when
 * they click Home from inside the portal, or Home could never be reached.
 */
function startPage(): string | null {
  const key = cookies().get(START_COOKIE)?.value;
  const start = START_PAGES.find((p) => p.key === key);
  if (!start || start.href === "/portal") return null;
  const from = headers().get("referer") ?? "";
  let inside = false;
  try {
    const u = new URL(from);
    inside = u.pathname.startsWith("/portal") && u.pathname !== "/portal/login";
  } catch {
    /* No referrer: a way in. */
  }
  return inside ? null : start.href;
}

export default async function PortalHome({ searchParams }: { searchParams: { denied?: string; r?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!searchParams.denied) {
    const start = startPage();
    if (start) redirect(start);
  }

  const office = can(user, "overhead");
  const span: 6 | 12 = searchParams.r === "6" ? 6 : 12;
  // The overview needs only the goal, so it starts as soon as the goal's in
  // rather than after every read below has come back.
  const goalP = office ? savedGoal() : Promise.resolve(null);
  const ovP = office ? goalP.then((g) => overview(g, span)).catch(() => null) : Promise.resolve(null);
  const crewP = office ? crewNow().catch(() => null) : Promise.resolve(null);
  // The "look at today" counts are the slowest read on the page; for the
  // office they're handed down unresolved and stream in under their own
  // placeholder, so the rest draws without waiting on them.
  const linesP = needsToday(user).catch(() => []);
  const [board, goal, open, me, all, people, ov, crew] = await Promise.all([
    office ? latestBoard() : Promise.resolve(null),
    goalP,
    openTodos().catch(() => []),
    meOf(user).catch(() => null),
    seesAll(user).catch(() => false),
    teamPeople().catch(() => []),
    ovP,
    crewP,
  ]);
  const lines = office ? linesP : await linesP;
  // Days left in the goal's year, for the ring.
  const spans = goal ? yearSpans(goal.basis, goal.year) : null;
  const yearEnd = spans ? spans[spans.length - 1].to : null;
  const daysLeft = yearEnd ? Math.max(0, Math.ceil((Date.parse(`${yearEnd}T23:59:59+10:00`) - Date.now()) / 86_400_000)) : null;
  // Where the year's goal says we should be by today, for the year card; the lower goal is its share of it.
  const yearByNow = goal && spans ? revenueGoalFor(goal, spans[0].from, todayMelbourne()) : null;

  // What's due today or late: the office sees the team's, everyone else their own.
  const today = todayMelbourne();
  const due = visibleTo(open, me?.id ?? null, all)
    .filter((t) => ["overdue", "today"].includes(dueState(t, today)))
    .sort(byUrgency);
  const nameOf = new Map(people.map((p) => [p.id, firstName(p.name)]));
  const toHome = (t: (typeof open)[number]): HomeTodo => ({
    id: t.id, title: t.title, notes: t.notes,
    who: t.assigneeId ? nameOf.get(t.assigneeId) ?? null : null,
    due: dueWords(t, today), late: dueState(t, today) === "overdue",
  });
  const todos = due.map(toHome);
  // Flagged important on To-do, whenever they're due: the office's list beside the chart.
  const important = visibleTo(open, me?.id ?? null, all).filter((t) => t.important).sort(byUrgency).map(toHome);

  // Melbourne's date and time, not the server's.
  const now = new Date();
  const date = localToday().toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const time = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  const month = now.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });
  // The board's own count of working days, with its holidays. Days left
  // includes today when today is one.
  const m = board?.metrics ?? null;
  const day = m && m.workingDaysTotal > 0
    ? { n: Math.min(m.workingDaysTotal, m.workingDaysTotal - m.workingDaysLeft + (isWorkingDay(now, DEFAULT_WORKING_CALENDAR) ? 1 : 0)), of: m.workingDaysTotal }
    : null;

  return (
    <PortalShell user={user} variant="home">
      <Home
        first={user.name.split(" ")[0]}
        when={`${date} · ${time}`}
        month={month}
        day={day}
        office={office}
        m={m}
        goal={goal}
        todos={todos}
        important={important}
        overdue={todos.filter((t) => t.late).length}
        lines={lines}
        denied={!!searchParams.denied}
        ov={ov ? {
          data: ov, span, closeRate: board?.metrics?.closeRate30d ?? null,
          yearInvoiced: board?.metrics?.revenueInvoicedYtd ?? null, yearGoal: goal?.revenue ?? null,
          yearFloor: goal?.floorRevenue ?? null, daysLeft, yearByNow,
          team: (board?.metrics?.salesLeaderboard ?? []).map((r) => ({ name: r.name, sold: r.sold, soldToday: r.soldToday, quoted: r.quoted, soldJobs: r.soldJobs, quotedJobs: r.quotedJobs, closeRate: r.closeRate })),
          crew,
        } : null}
      />
    </PortalShell>
  );
}
