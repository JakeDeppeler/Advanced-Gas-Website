"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { FOLLOW_UP_LIST, WON_LIST, isAccountList, isMarketingList, jobNumberIn, type Todo } from "@/lib/todos/types";
import { loadFlow, saveFlow } from "@/lib/todos/flow";
import { sbSelect } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { HOW_LABEL, LOST_REASONS, isHow } from "@/lib/pipeline/types";
import { markLost, saveFollowUp } from "@/app/portal/pipeline/actions";
import { MAX_LISTS, createTodo, getTodo, meOf, removeTodo, renameTodoList, saveOfficeIds, saveTodoLists, seesAll, setDone, teamPeople, todoLists, updateTodo } from "@/lib/todos/store";

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
export async function addTodo(input: { title: string; assigneeId: string; dueOn: string; notes?: string; list?: string; important?: boolean }): Promise<TodoResult> {
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
    await createTodo({ title, notes: input.notes ?? null, assigneeId: input.assigneeId, dueOn: input.dueOn, by: w.me, list: input.list ?? null, important: !!input.important });
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

export async function editTodo(id: string, patch: { title?: string; dueOn?: string; assigneeId?: string; notes?: string; list?: string; important?: boolean }): Promise<TodoResult> {
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

/**
 * The lists across the top. Anyone who sees every list can add one or take
 * one away; a list taken away hands its to-dos to the first list, so nothing
 * on it is lost.
 */
export async function saveLists(names: string[]): Promise<TodoResult> {
  const w = await who();
  if (!w || !w.all) return { ok: false, error: "Only the office can change the lists." };
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!clean.length) return { ok: false, error: "Keep at least one list." };
  // People's own board only shows its own lists: the account and marketing
  // lists it doesn't show stay where they were, after them.
  const kept = (await todoLists()).filter((l) => (isAccountList(l) || isMarketingList(l)) && !clean.includes(l));
  if (clean.length + kept.length > MAX_LISTS) return { ok: false, error: "That's as many lists as there's room for. Take one away first." };
  const res = await saveTodoLists([...clean, ...kept]);
  if (!res.ok) return { ok: false, error: "Couldn't save the lists." };
  revalidatePath("/portal/todo");
  return { ok: true };
}


/** Rename a list, and every to-do on it with it. */
export async function renameList(from: string, to: string): Promise<TodoResult> {
  const w = await who();
  if (!w || !w.all) return { ok: false, error: "Only the office can change the lists." };
  const name = to.trim().slice(0, 40);
  if (!name) return { ok: false, error: "Give the list a name." };
  const lists = await todoLists();
  if (!lists.includes(from)) return { ok: false, error: "That list has gone." };
  if (name !== from && lists.includes(name)) return { ok: false, error: "There's already a list called that." };
  try {
    await renameTodoList(from, name);
    const r = await saveTodoLists(lists.map((l) => (l === from ? name : l)));
    if (!r.ok) return { ok: false, error: "Couldn't save the lists." };
  } catch {
    return { ok: false, error: "Couldn't rename it. Try again." };
  }
  revalidatePath("/portal/todo");
  return { ok: true };
}

/** The day as the notes write it: "Mon 19 Oct". */
const dayWords = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * The quote on the Pipeline a to-do is chasing, if it's chasing one: the
 * follow-up to-dos the portal writes are kept against their quote; an older
 * quote to-do names its job, and the quote is that job's while it still has
 * an open estimate. An invoice or booking to-do names a job too, but isn't a
 * quote, so only the quote lists are looked at.
 */
async function quoteFor(t: Todo): Promise<string | null> {
  const open = (await getSettings<Record<string, { id: string }>>("automation_follow_todos").catch(() => null)) ?? {};
  const kept = Object.entries(open).find(([, v]) => v.id === t.id)?.[0];
  if (kept) return kept;
  if (!t.list || !(t.list === FOLLOW_UP_LIST || /quot|sales/i.test(t.list))) return null;
  const n = jobNumberIn(t);
  if (!n) return null;
  const [job] = await sbSelect<{ id: number }>("st_jobs", `select=id&job_number=eq.${encodeURIComponent(n)}&limit=1`).catch(() => []);
  if (!job) return null;
  const [est] = await sbSelect<{ id: number }>("st_estimates", `select=id&job_id=eq.${job.id}&status=eq.Open&limit=1`).catch(() => []);
  return est ? `j${job.id}` : null;
}

/**
 * Account to-dos › the pop-up: what happened when they were rung, and then
 * either it's done or when to try again. The line goes on top of the to-do's
 * notes so the history reads newest first; a quote's call is also logged on
 * the Pipeline (which notes the job in ServiceTitan), so the follow-up count
 * there moves on with it.
 */
export async function logContact(input: { id: string; how?: string | null; note?: string; nextOn?: string | null; done?: boolean }): Promise<TodoResult & { said?: string }> {
  const { w, t, error } = await mayChange(input.id);
  if (!w || !t) return { ok: false, error: error ?? "Couldn't." };
  const how = input.how && isHow(input.how) ? input.how : null;
  const note = (input.note ?? "").trim().slice(0, 300);
  const next = !input.done && input.nextOn && ISO.test(input.nextOn) ? input.nextOn : null;
  if (!input.done && !next) return { ok: false, error: "Pick a day to follow up, or mark it done." };
  if (!how && !note && !input.done && next === t.dueOn) return { ok: false, error: "Nothing's changed." };
  const by = (w.me?.name ?? w.user.name).split(" ")[0];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const line = `${dayWords(today)} ${by}: ${how ? HOW_LABEL[how] : "Note"}${note ? `, ${note}` : ""}${input.done ? ". Done." : next ? `. Follow up ${dayWords(next)}.` : "."}`;
  try {
    await updateTodo(t.id, { notes: `${line}\n${t.notes ?? ""}`.slice(0, 2000), ...(next ? { dueOn: next } : {}) });
    if (input.done) await setDone(t.id, true, w.me?.name ?? w.user.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/todo/accounts");
  // The quote's own record, when it's a quote and something happened.
  const key = how ? await quoteFor(t).catch(() => null) : null;
  if (key) {
    const r = await saveFollowUp({ key, how, note: note || null, ...(next ? { nextOn: next } : {}) }).catch(() => null);
    if (!r?.ok) return { ok: true, said: "Saved here, but the call didn't go on the Pipeline. Log it there too." };
    return { ok: true, said: r.said ?? "Saved, and logged on the Pipeline and the job." };
  }
  return { ok: true };
}

/**
 * Account to-dos › Won, to be paid: the customer said yes and the deposit's
 * on its way. The to-do waits on its own list; once ServiceTitan marks the
 * quote sold it moves to Jobs to Book, once booked to Finance to invoice, and
 * it ticks itself off when the invoice is out (reminders › accountFlow).
 */
export async function markWon(input: { id: string; note?: string }): Promise<TodoResult & { said?: string }> {
  const { w, t, error } = await mayChange(input.id);
  if (!w || !t) return { ok: false, error: error ?? "Couldn't." };
  const key = await quoteFor(t).catch(() => null);
  if (!key) return { ok: false, error: "This to-do isn't tied to a quote on the Pipeline, so it can't follow the sale through." };
  const lists = await todoLists();
  if (!lists.includes(WON_LIST)) {
    // Straight after Follow up, where it's moved from.
    const at = Math.max(lists.indexOf(FOLLOW_UP_LIST) + 1, 0) || lists.length;
    const next = [...lists.slice(0, at), WON_LIST, ...lists.slice(at)];
    if (next.length > MAX_LISTS || !(await saveTodoLists(next)).ok) return { ok: false, error: "There's no room for the Won list. Take a list away first." };
  }
  const by = (w.me?.name ?? w.user.name).split(" ")[0];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const note = (input.note ?? "").trim().slice(0, 300);
  const chase = new Date(Date.parse(`${today}T12:00:00Z`) + 2 * 86_400_000).toISOString().slice(0, 10);
  try {
    await updateTodo(t.id, {
      list: WON_LIST,
      title: t.title.replace(/^(First |Second |Third |Next )?follow[- ]up:?\s*/i, "Won: "),
      dueOn: chase,
      notes: `${dayWords(today)} ${by}: Won, waiting on payment${note ? `, ${note}` : ""}. Moves to Jobs to Book once ServiceTitan marks it sold.\n${t.notes ?? ""}`.slice(0, 2000),
    });
    const flow = await loadFlow();
    flow[t.id] = { key, step: "won" };
    await saveFlow(flow);
    // Off the follow-up list's books, so the follow-ups don't tick it off or
    // write the next call for a quote that's been won.
    const open = (await getSettings<Record<string, { id: string; n: number }>>("automation_follow_todos").catch(() => null)) ?? {};
    const k = Object.entries(open).find(([, v]) => v.id === t.id)?.[0];
    if (k) { delete open[k]; await saveSettings("automation_follow_todos", open); }
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/todo/accounts");
  // On the Pipeline too: a note, and the next call when the payment's to be chased.
  const r = await saveFollowUp({ key, how: "note", note: `Won, waiting on payment${note ? `: ${note}` : ""}`, nextOn: chase }).catch(() => null);
  return r?.ok ? { ok: true } : { ok: true, said: "Moved to Won, but the Pipeline didn't take the note." };
}

/** Lost: closed off on the Pipeline (and dismissed in ServiceTitan, with a note on the job), and ticked off here. */
export async function markLostTodo(input: { id: string; reason: string; note?: string }): Promise<TodoResult & { said?: string }> {
  const { w, t, error } = await mayChange(input.id);
  if (!w || !t) return { ok: false, error: error ?? "Couldn't." };
  const key = await quoteFor(t).catch(() => null);
  if (!key) return { ok: false, error: "This to-do isn't tied to a quote on the Pipeline. Mark it lost there." };
  const reason = (LOST_REASONS as readonly string[]).includes(input.reason) ? input.reason : "Other";
  const r = await markLost({ key, reason, note: input.note?.trim() || null });
  if (!r.ok) return { ok: false, error: r.error ?? "Couldn't mark it lost." };
  const by = (w.me?.name ?? w.user.name).split(" ")[0];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  try {
    await updateTodo(t.id, { notes: `${dayWords(today)} ${by}: Lost, ${reason.toLowerCase()}.\n${t.notes ?? ""}`.slice(0, 2000) });
    await setDone(t.id, true, w.me?.name ?? w.user.name);
    const flow = await loadFlow();
    if (flow[t.id]) { delete flow[t.id]; await saveFlow(flow); }
  } catch {
    return { ok: false, error: "Marked lost on the Pipeline, but the to-do didn't tick off. Tick it by hand." };
  }
  revalidatePath("/portal/todo/accounts");
  return { ok: true, said: r.said };
}
