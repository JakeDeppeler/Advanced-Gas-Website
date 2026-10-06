"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { createTodo, getTodo, meOf, removeTodo, saveOfficeIds, seesAll, setDone, teamPeople, updateTodo } from "@/lib/todos/store";

export type TodoResult = { ok: boolean; error?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Who's asking, what they are on the team, and whether they see every list. */
async function who() {
  const user = await getPortalUser();
  if (!user) return null;
  const me = await meOf(user);
  return { user, me, all: await seesAll(user) };
}

/**
 * Give someone a to-do. The office can give one to anyone; anyone else only
 * to themselves — a list of their own, without filling up somebody else's.
 */
export async function addTodo(input: { title: string; assigneeId: string; dueOn: string; notes?: string }): Promise<TodoResult> {
  const w = await who();
  if (!w) return { ok: false, error: "Sign in again." };
  if (!w.me) return { ok: false, error: "You're not on the team list, so there's no list to add to." };
  const title = (input.title ?? "").trim();
  if (!title) return { ok: false, error: "Say what needs doing." };
  if (!ISO.test(input.dueOn ?? "")) return { ok: false, error: "Pick the day it has to be done by." };
  const people = await teamPeople();
  if (!people.some((p) => p.id === input.assigneeId)) return { ok: false, error: "That person isn't on the team list." };
  if (!w.all && input.assigneeId !== w.me.id) return { ok: false, error: "You can add to your own list." };
  try {
    await createTodo({ title, notes: input.notes ?? null, assigneeId: input.assigneeId, dueOn: input.dueOn, by: w.me });
  } catch {
    return { ok: false, error: "Couldn't save it. Try again." };
  }
  revalidatePath("/portal/todo");
  return { ok: true };
}

/** The office can change any; anyone else, what's on their list or what they wrote. */
async function mayChange(id: string) {
  const w = await who();
  if (!w) return { w: null, t: null, error: "Sign in again." };
  const t = await getTodo(id).catch(() => null);
  if (!t) return { w, t: null, error: "That to-do has gone." };
  const mine = !!w.me && (t.assigneeId === w.me.id || t.createdById === w.me.id);
  if (!w.all && !mine) return { w, t: null, error: "That isn't on your list." };
  return { w, t, error: null };
}

export async function tickTodo(id: string, done: boolean): Promise<TodoResult> {
  const { w, t, error } = await mayChange(id);
  if (!w || !t) return { ok: false, error: error ?? "Couldn't." };
  try {
    await setDone(id, done, w.me?.name ?? w.user.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/todo");
  return { ok: true };
}

export async function editTodo(id: string, patch: { title?: string; dueOn?: string; assigneeId?: string; notes?: string }): Promise<TodoResult> {
  const { w, t, error } = await mayChange(id);
  if (!w || !t) return { ok: false, error: error ?? "Couldn't." };
  if (patch.title !== undefined && !patch.title.trim()) return { ok: false, error: "It needs a name." };
  if (patch.dueOn !== undefined && !ISO.test(patch.dueOn)) return { ok: false, error: "Pick a day." };
  if (patch.assigneeId !== undefined && patch.assigneeId !== t.assigneeId) {
    if (!w.all) return { ok: false, error: "Only the office can hand a to-do to someone else." };
    if (!(await teamPeople()).some((p) => p.id === patch.assigneeId)) return { ok: false, error: "That person isn't on the team list." };
  }
  try {
    await updateTodo(id, patch);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/todo");
  return { ok: true };
}

export async function deleteTodo(id: string): Promise<TodoResult> {
  const { w, t, error } = await mayChange(id);
  if (!w || !t) return { ok: false, error: error ?? "Couldn't." };
  try {
    await removeTodo(id);
  } catch {
    return { ok: false, error: "Couldn't remove it. Try again." };
  }
  revalidatePath("/portal/todo");
  return { ok: true };
}

/** Who has a column at the top and sees every list. Admins only. */
export async function setOffice(ids: string[]): Promise<TodoResult> {
  const user = await getPortalUser();
  if (!user || !can(user, "manage_users")) return { ok: false, error: "Only an admin can change that." };
  const people = new Set((await teamPeople()).map((p) => p.id));
  const clean = ids.filter((id) => people.has(id));
  if (!clean.length) return { ok: false, error: "Leave at least one person in the office." };
  const res = await saveOfficeIds(clean);
  if (!res.ok) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/portal/todo");
  return { ok: true };
}
