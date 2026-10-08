import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { TodoBoard } from "@/components/portal/TodoBoard";
import { TodoTabs } from "@/components/portal/TodoTabs";
import { listContacts } from "@/lib/contacts/store";
import { isDue, touchState } from "@/lib/contacts/types";
import { dbConfigured } from "@/lib/portal/db";
import { doneSince, meOf, officeIds, openTodos, seesAll, teamPeople, todayMelbourne, visibleTo } from "@/lib/todos/store";
import { dueState, type Todo } from "@/lib/todos/types";

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

  // The heading counts what this person is looking at: everything for the
  // office, their own list for anyone else.
  const counted = all ? todos : todos.filter((t) => t.assigneeId === meId);
  const late = counted.filter((t) => dueState(t, today) === "overdue");

  // The keep-in-touch tab's count: everyone due a call, for the office who work that list.
  const contactsDue = all ? (await listContacts().catch(() => [])).filter((c) => isDue(touchState(c, today))).length : 0;

  return (
    <PortalShell user={user}>
      <div className={`pt-head${all ? " pt-head--split" : ""}`}>
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>To-do</h1>
          <p>{late.length ? `${plural(late.length, "thing")} overdue. ` : ""}Tick things off as you go. Anything past its day gets a flag.</p>
        </div>
        {all && <TodoTabs on="todo" contactsDue={contactsDue} />}
      </div>

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there are no lists to show.</div>
      ) : (
        <>
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
        </>
      )}
    </PortalShell>
  );
}
