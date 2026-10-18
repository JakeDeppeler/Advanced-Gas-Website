import { can, type PortalUser } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { TodoBoard } from "@/components/portal/TodoBoard";
import { KpiHead } from "@/components/portal/kit/Kit";
import { dbConfigured } from "@/lib/portal/db";
import { doneSince, meOf, officeIds, openTodos, seesAll, teamPeople, todayMelbourne, todoLists, visibleTo } from "@/lib/todos/store";
import { DEFAULT_LISTS, dueState, isAccountList, isAccountTodo, type Todo } from "@/lib/todos/types";

/**
 * The two to-do boards. One is people's own: what they set themselves or
 * were given. The other is the account to-dos: quotes to follow up, invoices
 * to send, late payments to chase, jobs to book, which the portal writes for
 * the office. Same board, same cards, each holding only its own.
 *
 * The office — Jake, Dean and Kellie — each have a column, side by side, and
 * can add to any of them or give one to the crew; everyone else sees their own.
 * Every to-do has the day it's due by, and past that day it's flagged — here,
 * on the bell, on Home and in the daily report — until it's ticked off.
 */
export async function TodoView({ user, kind }: { user: PortalUser; kind: "mine" | "accounts" }) {
  const ready = dbConfigured();
  const today = todayMelbourne();
  const [me, all, people, office, open, done, saved] = ready
    ? await Promise.all([
        meOf(user),
        seesAll(user),
        teamPeople(),
        officeIds(),
        openTodos().catch(() => [] as Todo[]),
        doneSince(new Date(Date.now() - 7 * 86_400_000)).catch(() => [] as Todo[]),
        todoLists().catch(() => DEFAULT_LISTS),
      ])
    : [null, false, [], [], [] as Todo[], [] as Todo[], DEFAULT_LISTS];

  const ours = (t: Todo) => isAccountTodo(t) === (kind === "accounts");
  const meId = me?.id ?? null;
  const todos = visibleTo(open, meId, all).filter(ours);
  const doneSeen = visibleTo(done, meId, all).filter(ours);
  // The account board shows the portal's lists, and any other list one of
  // its to-dos is on (a quote follow-up on Quoting); people's own board
  // shows the rest.
  const own = saved.filter((l) => !isAccountList(l));
  const lists = kind === "accounts"
    ? saved.filter((l) => isAccountList(l) || todos.some((t) => t.list === l))
    : own.length ? own : DEFAULT_LISTS;

  // The heading counts what this person is looking at: everything for the
  // office, their own list for anyone else.
  const counted = all ? todos : todos.filter((t) => t.assigneeId === meId);
  const late = counted.filter((t) => dueState(t, today) === "overdue");

  return (
    <PortalShell user={user}>
      <KpiHead title={kind === "accounts" ? <>Account to-dos</> : <>To-do</>} kpis={[
        { icon: "clock", fig: String(late.length), label: "Overdue", badge: late.length ? "flagged" : undefined, tone: "down" },
        { icon: "doc", fig: String(counted.filter((t) => dueState(t, today) === "today").length), label: "Due today" },
        { icon: "bars", fig: String(counted.length), label: kind === "accounts" ? "Quotes, invoices and payments to chase" : all ? "Open across the office" : "Open on your list" },
      ]} />

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there are no lists to show.</div>
      ) : !lists.length ? (
        <div className="pt-note">Nothing for the office to chase. The portal puts quote follow-ups, invoices to send and late payments here when it finds them.</div>
      ) : (
        <TodoBoard
          todos={todos}
          done={doneSeen}
          people={people}
          office={office}
          meId={meId}
          all={all}
          admin={can(user, "manage_users")}
          today={today}
          lists={lists}
          allLists={saved}
          fixed={kind === "accounts"}
        />
      )}
    </PortalShell>
  );
}
