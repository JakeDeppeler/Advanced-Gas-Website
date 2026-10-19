import "server-only";
import { cache } from "react";
import { q, sbInsert, sbSelect, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getSettings, listUsers, saveSettings } from "@/lib/portal/db";
import { can, type PortalUser } from "@/lib/portal/caps";
import { DEFAULT_LISTS, dueState, isAccountTodo, type Person, type Todo } from "@/lib/todos/types";

/**
 * Where the to-dos live, and who sees which.
 *
 * Everyone signed in has a list of their own. The office — Jake, Dean and
 * Kellie, until an admin changes it on the page — see every list and can add
 * to anyone's, because the point of it was the three of them keeping each
 * other on top of things. The crew see what's been given to them and what they
 * wrote themselves.
 */

const T = "portal_todos";
const COLS = "id,title,notes,assignee_id,due_on,done_at,done_by,created_by_id,created_by,created_at,list,important";

type Row = {
  id: string; title: string; notes: string | null; assignee_id: string | null; due_on: string;
  done_at: string | null; done_by: string | null; created_by_id: string | null; created_by: string | null; created_at: string;
  list: string | null; important: boolean | null;
};

const toTodo = (r: Row): Todo => ({
  id: r.id, title: r.title, notes: r.notes, assigneeId: r.assignee_id, dueOn: r.due_on,
  doneAt: r.done_at, doneBy: r.done_by, createdById: r.created_by_id, createdBy: r.created_by, createdAt: r.created_at,
  list: r.list ?? null, important: !!r.important,
});

export const todayMelbourne = () => isoDateMelbourne(new Date());

/** Everyone on the team who can be given a to-do, office first is the page's business. */
export const teamPeople = cache(async (): Promise<Person[]> => {
  const users = await listUsers().catch(() => []);
  return users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name }));
});

/**
 * The signed-in person's row in the team list.
 *
 * Owners sign in without one being looked up, so their id comes from the team
 * list by email, and failing that by name — Jake signs in from two addresses
 * and only one of them is on his row.
 */
export const meOf = cache(async (user: PortalUser): Promise<Person | null> => {
  if (user.id) return { id: user.id, name: user.name };
  const users = await listUsers().catch(() => []);
  const e = user.email.toLowerCase();
  const hit = users.find((u) => u.active && u.email?.toLowerCase() === e) ?? users.find((u) => u.active && u.name.trim().toLowerCase() === user.name.trim().toLowerCase());
  return hit?.id ? { id: hit.id, name: hit.name } : null;
});

/* -------------------------------------------------------------- the office */

const OFFICE = "todo-office";

/**
 * Who sees every list. Until somebody changes it: the admins, and whoever in
 * the team list is called Dean or Kellie — the three people it was asked for.
 */
export const officeIds = cache(async (): Promise<string[]> => {
  const saved = await getSettings<{ ids?: string[] }>(OFFICE).catch(() => null);
  if (Array.isArray(saved?.ids)) return saved.ids;
  const users = await listUsers().catch(() => []);
  return users
    .filter((u) => u.active && u.id && (u.role === "admin" || /^(dean|kellie)\b/i.test(u.name.trim())))
    .map((u) => u.id as string);
});

export async function saveOfficeIds(ids: string[]): Promise<{ ok: boolean }> {
  return saveSettings(OFFICE, { ids: [...new Set(ids)].slice(0, 12) });
}

/* -------------------------------------------------------------- the lists */

const LISTS = "todo-lists";
/** Five across the page at most: past that a list of lists stops being a board. */
/** Five on people's own board, and room beside them for the account lists. */
export const MAX_LISTS = 8;

/** A list renamed: its name in the settings and on every to-do that's on it. */
export async function renameTodoList(from: string, to: string): Promise<void> {
  await sbUpdate(T, `${q.eq("list", from)}`, { list: to.trim().slice(0, 40), updated_at: new Date().toISOString() });
}

/** The to-do lists, in the order they sit across the page. */
export const todoLists = cache(async (): Promise<string[]> => {
  const saved = await getSettings<{ names?: string[] }>(LISTS).catch(() => null);
  return Array.isArray(saved?.names) && saved.names.length ? saved.names : DEFAULT_LISTS;
});

export async function saveTodoLists(names: string[]): Promise<{ ok: boolean }> {
  const clean = [...new Set(names.map((n) => n.trim().slice(0, 40)).filter(Boolean))].slice(0, MAX_LISTS);
  return saveSettings(LISTS, { names: clean });
}

/** Sees and adds to everyone's list: in the office, or an admin who manages the team. */
export async function seesAll(user: PortalUser): Promise<boolean> {
  if (can(user, "manage_users")) return true;
  const me = await meOf(user);
  return !!me && (await officeIds()).includes(me.id);
}

/* ------------------------------------------------------------------ reads */

/** Every open to-do, soonest first. A small table: the whole of it is one read. */
export const openTodos = cache(async (): Promise<Todo[]> => {
  const rows = await sbSelect<Row>(T, [q.select(COLS), "done_at=is.null", "removed_at=is.null", "order=due_on.asc,created_at.asc", "limit=1000"].join("&"));
  return rows.map(toTodo);
});

/** Ticked off since a moment, newest first. */
export async function doneSince(from: Date): Promise<Todo[]> {
  const rows = await sbSelect<Row>(T, [q.select(COLS), "done_at=not.is.null", "removed_at=is.null", `done_at=gte.${encodeURIComponent(from.toISOString())}`, "order=done_at.desc", "limit=300"].join("&"));
  return rows.map(toTodo);
}

export async function getTodo(id: string): Promise<Todo | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await sbSelect<Row>(T, [q.select(COLS), q.eq("id", id), "removed_at=is.null"].join("&"));
  return rows[0] ? toTodo(rows[0]) : null;
}

/** What this person can see: everything for the office, their own and what they wrote for anyone else. */
export function visibleTo(todos: Todo[], meId: string | null, all: boolean): Todo[] {
  if (all) return todos;
  return todos.filter((t) => (meId && (t.assigneeId === meId || t.createdById === meId)));
}

/** The side bar's number: mine that are overdue or due today. */
type DueCount = { due: number; overdue: number };
/** What's due for this person: all of it, then split into their own and the account to-dos, for each tab's count. */
export async function myCounts(user: PortalUser): Promise<DueCount & { own: DueCount; acct: DueCount }> {
  const none = { due: 0, overdue: 0 };
  const me = await meOf(user);
  if (!me) return { ...none, own: none, acct: none };
  const today = todayMelbourne();
  const count = (ts: Todo[]): DueCount => {
    const overdue = ts.filter((t) => dueState(t, today) === "overdue").length;
    return { overdue, due: overdue + ts.filter((t) => dueState(t, today) === "today").length };
  };
  const mine = (await openTodos()).filter((t) => t.assigneeId === me.id);
  return { ...count(mine), own: count(mine.filter((t) => !isAccountTodo(t))), acct: count(mine.filter(isAccountTodo)) };
}

/** Overdue, by person, most first — for Home's "Needs someone" and the daily report. */
export async function overdueByPerson(): Promise<Array<{ name: string; n: number }>> {
  const today = todayMelbourne();
  const [open, people] = await Promise.all([openTodos(), teamPeople()]);
  const name = new Map(people.map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();
  for (const t of open) {
    if (dueState(t, today) !== "overdue") continue;
    const who = (t.assigneeId && name.get(t.assigneeId)) || "Nobody";
    counts.set(who, (counts.get(who) ?? 0) + 1);
  }
  return [...counts.entries()].map(([n, c]) => ({ name: n, n: c })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}

/* ----------------------------------------------------------------- writes */

export async function createTodo(input: { title: string; notes?: string | null; assigneeId: string; dueOn: string; by: Person; list?: string | null; important?: boolean }): Promise<void> {
  await sbInsert(T, {
    title: input.title.trim().slice(0, 300),
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 2000) : null,
    assignee_id: input.assigneeId,
    due_on: input.dueOn,
    created_by_id: input.by.id,
    created_by: input.by.name,
    list: input.list?.trim() ? input.list.trim().slice(0, 40) : null,
    important: !!input.important,
  });
}

/**
 * A to-do the portal writes by itself (Settings › Automatic). Nobody wrote
 * it, so it carries no author id and says "Automatic" where a name would go.
 */
export async function createAutoTodo(input: { title: string; notes?: string | null; assigneeId: string; dueOn: string; list?: string | null }): Promise<string | null> {
  const title = input.title.trim().slice(0, 300);
  await sbInsert(T, {
    title,
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 2000) : null,
    assignee_id: input.assigneeId,
    due_on: input.dueOn,
    created_by_id: null,
    created_by: "Automatic",
    list: input.list?.trim() ? input.list.trim().slice(0, 40) : null,
  });
  // Its id, so the job that wrote it can tick it off when the thing is done.
  const [row] = await sbSelect<{ id: string }>(T, [q.select("id"), q.eq("created_by", "Automatic"), q.eq("title", title), "order=created_at.desc", "limit=1"].join("&")).catch(() => []);
  return row?.id ?? null;
}

export async function updateTodo(id: string, patch: { title?: string; notes?: string | null; assigneeId?: string; dueOn?: string; list?: string | null; important?: boolean }): Promise<void> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) body.title = patch.title.trim().slice(0, 300);
  if (patch.notes !== undefined) body.notes = patch.notes?.trim() ? patch.notes.trim().slice(0, 2000) : null;
  if (patch.assigneeId !== undefined) body.assignee_id = patch.assigneeId;
  if (patch.dueOn !== undefined) body.due_on = patch.dueOn;
  if (patch.list !== undefined) body.list = patch.list?.trim() ? patch.list.trim().slice(0, 40) : null;
  if (patch.important !== undefined) body.important = !!patch.important;
  await sbUpdate(T, `${q.eq("id", id)}&removed_at=is.null`, body);
}

/** Tick it off, or put it back. Returns false when there was nothing to change. */
export async function setDone(id: string, done: boolean, byName: string): Promise<boolean> {
  const now = new Date().toISOString();
  const rows = await sbUpdateReturning(
    T,
    `${q.eq("id", id)}&removed_at=is.null&done_at=${done ? "is.null" : "not.is.null"}`,
    done ? { done_at: now, done_by: byName, updated_at: now } : { done_at: null, done_by: null, updated_at: now },
  );
  return rows.length > 0;
}

/** Off the list. Stamped, not deleted, so it can be found again. */
export async function removeTodo(id: string): Promise<void> {
  await sbUpdate(T, `${q.eq("id", id)}&removed_at=is.null`, { removed_at: new Date().toISOString() });
}
