import { can, type PortalUser } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { TodoBoard } from "@/components/portal/TodoBoard";
import { KpiHead } from "@/components/portal/kit/Kit";
import { dbConfigured } from "@/lib/portal/db";
import { doneSince, meOf, officeIds, openTodos, seesAll, teamPeople, todayMelbourne, todoLists, visibleTo } from "@/lib/todos/store";
import { DEFAULT_LISTS, MARKETING_LISTS, accountRank, dueState, isAccountList, isAccountTodo, isMarketingList, jobNumberIn, type Todo } from "@/lib/todos/types";
import { sbSelect } from "@/lib/dashboard/db";

/**
 * The three to-do boards. People's own: what they set themselves or were
 * given. The account to-dos: quotes to follow up, invoices to send, late
 * payments to chase, jobs to book, which the portal writes for the office.
 * And marketing's. Same board, same cards, each holding only its own.
 *
 * The office — Jake, Dean and Kellie — each have a column, side by side, and
 * can add to any of them or give one to the crew; everyone else sees their own.
 * Every to-do has the day it's due by, and past that day it's flagged — here,
 * on the bell, on Home and in the daily report — until it's ticked off.
 */
export async function TodoView({ user, kind }: { user: PortalUser; kind: "mine" | "accounts" | "marketing" }) {
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

  const ours = (t: Todo) => (isAccountTodo(t) ? kind === "accounts" : isMarketingList(t.list) ? kind === "marketing" : kind === "mine");
  const meId = me?.id ?? null;
  const todos = visibleTo(open, meId, all).filter(ours);
  const doneSeen = visibleTo(done, meId, all).filter(ours);
  // The account board shows the portal's lists, and any other list one of
  // its to-dos is on (a quote follow-up on Quoting); people's own board
  // shows the rest.
  const own = saved.filter((l) => !isAccountList(l) && !isMarketingList(l));
  const marketing = saved.filter(isMarketingList);
  // in the order the work goes: quote, chase, book in, invoice.
  const lists = kind === "accounts"
    ? saved.filter((l) => isAccountList(l) || todos.some((t) => t.list === l)).sort((a, b) => accountRank(a) - accountRank(b))
    : kind === "marketing" ? [...MARKETING_LISTS, ...marketing.filter((l) => !MARKETING_LISTS.includes(l) && todos.some((t) => t.list === l))]
    : own.length ? own : DEFAULT_LISTS;
  // Each card's job, for the pop-up's link into ServiceTitan: one read for the lot.
  const jobIds: Record<string, number> = {};
  if (kind === "accounts" && ready) {
    const nums = [...new Set(todos.map(jobNumberIn).filter((n): n is string => !!n))];
    const rows = nums.length
      ? await sbSelect<{ id: number; job_number: string }>("st_jobs", `select=id,job_number&job_number=in.(${nums.map(encodeURIComponent).join(",")})`).catch(() => [])
      : [];
    const byNum = new Map(rows.map((r) => [String(r.job_number), r.id]));
    for (const t of todos) { const n = jobNumberIn(t); const id = n ? byNum.get(n) : undefined; if (id) jobIds[t.id] = id; }
  }

  // The heading counts what this person is looking at: everything for the
  // office, their own list for anyone else.
  const counted = all ? todos : todos.filter((t) => t.assigneeId === meId);
  const late = counted.filter((t) => dueState(t, today) === "overdue");

  return (
    <PortalShell user={user}>
      <KpiHead title={kind === "accounts" ? <>Account to-dos</> : kind === "marketing" ? <>Marketing to-dos</> : <>Personal to-dos</>} kpis={[
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
          locked={kind === "marketing"}
          jobIds={jobIds}
        />
      )}
    </PortalShell>
  );
}
