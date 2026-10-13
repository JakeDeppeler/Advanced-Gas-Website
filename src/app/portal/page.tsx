import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { needsToday } from "@/lib/portal/needs";
import { localToday } from "@/lib/portal/xero";
import { latestBoard, savedGoal, xeroProfit } from "@/lib/portal/office";
import { meOf, openTodos, seesAll, teamPeople, todayMelbourne, visibleTo } from "@/lib/todos/store";
import { byUrgency, dueState, dueWords, firstName } from "@/lib/todos/types";
import { START_COOKIE, START_PAGES } from "@/lib/portal/businessTypes";
import { DEFAULT_WORKING_CALENDAR, isWorkingDay } from "@/lib/dashboard/dates";
import { Home, type HomeTodo } from "@/components/portal/home/Home";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home — Team portal" };

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

export default async function PortalHome({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!searchParams.denied) {
    const start = startPage();
    if (start) redirect(start);
  }

  const office = can(user, "overhead");
  const [board, goal, profit, open, me, all, people, lines] = await Promise.all([
    office ? latestBoard() : Promise.resolve(null),
    office ? savedGoal() : Promise.resolve(null),
    office ? xeroProfit().catch(() => ({ month: null, year: null, yearFrom: "" })) : Promise.resolve({ month: null, year: null, yearFrom: "" }),
    openTodos().catch(() => []),
    meOf(user).catch(() => null),
    seesAll(user).catch(() => false),
    teamPeople().catch(() => []),
    needsToday(user).catch(() => []),
  ]);

  // What's due today or late: the office sees the team's, everyone else their own.
  const today = todayMelbourne();
  const due = visibleTo(open, me?.id ?? null, all)
    .filter((t) => ["overdue", "today"].includes(dueState(t, today)))
    .sort(byUrgency);
  const nameOf = new Map(people.map((p) => [p.id, firstName(p.name)]));
  const todos: HomeTodo[] = due.map((t) => ({
    id: t.id, title: t.title, notes: t.notes,
    who: t.assigneeId ? nameOf.get(t.assigneeId) ?? null : null,
    due: dueWords(t, today), late: dueState(t, today) === "overdue",
  }));

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
        profitYear={profit.year}
        goal={goal}
        todos={todos}
        overdue={todos.filter((t) => t.late).length}
        lines={lines}
        denied={!!searchParams.denied}
      />
    </PortalShell>
  );
}
