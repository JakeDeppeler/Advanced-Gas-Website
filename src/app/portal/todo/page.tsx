import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Heads } from "@/components/portal/marketingParts";
import { TodoBoard } from "@/components/portal/TodoBoard";
import { TodoTabs } from "@/components/portal/TodoTabs";
import { listContacts } from "@/lib/contacts/store";
import { isDue, touchState } from "@/lib/contacts/types";
import { dbConfigured } from "@/lib/portal/db";
import { doneSince, meOf, officeIds, openTodos, seesAll, teamPeople, todayMelbourne, visibleTo } from "@/lib/todos/store";
import { daysFrom, dueState, firstName, type Todo } from "@/lib/todos/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today — Team portal" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The to-do lists.
 *
 * The office — Jake, Dean and Kellie — each have a column, side by side, and
 * can add to any of them or give one to the crew; everyone else sees their own.
 * Every to-do has the day it's due by, and past that day it's flagged — here,
 * on the bell, on Home and in the daily report — until it's ticked off.
 */
export default async function TodoPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const ready = dbConfigured();
  const today = todayMelbourne();
  const [me, all, people, office, open, done] = ready
    ? await Promise.all([
        meOf(user),
        seesAll(user),
        teamPeople(),
        officeIds(),
        openTodos().catch(() => [] as Todo[]),
        doneSince(new Date(Date.now() - 7 * 86_400_000)).catch(() => [] as Todo[]),
      ])
    : [null, false, [], [], [] as Todo[], [] as Todo[]];

  const meId = me?.id ?? null;
  const todos = visibleTo(open, meId, all);
  const doneSeen = visibleTo(done, meId, all);

  // The tiles count what this person is looking at: everything for the office,
  // their own list for anyone else.
  const counted = all ? todos : todos.filter((t) => t.assigneeId === meId);
  const late = counted.filter((t) => dueState(t, today) === "overdue");
  const dueToday = counted.filter((t) => dueState(t, today) === "today").length;
  const thisWeek = counted.filter((t) => dueState(t, today) === "soon").length;
  const lateBy = new Map<string, number>();
  for (const t of late) {
    const n = firstName(people.find((p) => p.id === t.assigneeId)?.name ?? "Nobody");
    lateBy.set(n, (lateBy.get(n) ?? 0) + 1);
  }
  const officeNames = people
    .filter((p) => office.includes(p.id))
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name)))
    .map((p) => firstName(p.name));
  const together = officeNames.length > 1 ? `${officeNames.slice(0, -1).join(", ")} and ${officeNames[officeNames.length - 1]}` : officeNames[0] ?? "The office";
  const lateWho = [...lateBy.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ${c}`).join(" · ");

  // The keep-in-touch tab's count: everyone due a call, for the office who work that list.
  const contactsDue = all ? (await listContacts().catch(() => [])).filter((c) => isDue(touchState(c, today))).length : 0;

  return (
    <PortalShell user={user}>
      <div className={`pt-head${all ? " pt-head--split" : ""}`}>
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>Today</h1>
          <p>
            {all
              ? `What needs doing today, given to each other. ${together} see each other's lists side by side — today's first, then what's coming up. Anything past its day is flagged until it's ticked off.`
              : "What's been given to you for today, then what's coming up. Anything past its day is flagged until it's ticked off."}
          </p>
        </div>
        {all && <TodoTabs on="todo" contactsDue={contactsDue} />}
      </div>

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there are no lists to show.</div>
      ) : (
        <>
          <Heads
            items={[
              {
                label: "Overdue", value: String(late.length), feature: late.length > 0,
                sub: late.length ? (all ? lateWho : `the oldest was due ${plural(-Math.min(...late.map((t) => daysFrom(today, t.dueOn))), "day")} ago`) : "nothing past its day",
              },
              { label: "Due today", value: String(dueToday), sub: dueToday ? "still to tick off today" : "nothing due today" },
              { label: "Due this week", value: String(thisWeek), sub: "in the next six days" },
              { label: "Done this week", value: String(all ? doneSeen.length : doneSeen.filter((t) => t.assigneeId === meId).length), sub: `ticked off in the last seven days` },
            ]}
          />
          <TodoBoard
            todos={todos}
            done={doneSeen}
            people={people}
            office={office}
            meId={meId}
            all={all}
            admin={can(user, "manage_users")}
            today={today}
          />
          {all && (
            <p className="pt-todo__foot">
              {plural(people.length, "person", "people")} on the team list.{" "}
              {people.length > 1 && "Only people with an email on their team page can sign in and see their list."}
            </p>
          )}
        </>
      )}
    </PortalShell>
  );
}
