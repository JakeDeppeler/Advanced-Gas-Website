"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { loadSession, loadToolbox, saveSchedule, saveSession, saveToolbox } from "@/lib/toolbox/store";
import { onOrAfter, type Every, type Schedule, type Session, type Topic } from "@/lib/toolbox/types";

export type ToolboxResult = { ok: boolean; error?: string; id?: string };

const t = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const lines = (v: unknown) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20).map((x) => x.slice(0, 300));
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const first = (n: string) => n.split(" ")[0];

/** Add a topic, or change one. Anyone signed in: the crew suggest topics as much as the office does. */
export async function saveTopic(input: { id?: string; title: string; points: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const title = t(input.title, 120);
  if (!title) return { ok: false, error: "Give the topic a name." };
  const s = await loadToolbox();
  const id = input.id && s.topics.some((x) => x.id === input.id) ? input.id : newId();
  const topic: Topic = { id, title, points: lines(input.points), addedBy: first(me.name), at: new Date().toISOString() };
  const topics = s.topics.some((x) => x.id === id) ? s.topics.map((x) => (x.id === id ? { ...topic, addedBy: x.addedBy, at: x.at } : x)) : [topic, ...s.topics];
  const r = await saveToolbox({ ...s, topics });
  if (!r.ok) return { ok: false, error: "Couldn't save it." };
  revalidatePath("/portal/toolbox");
  return { ok: true, id };
}

export async function removeTopic(id: string): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const s = await loadToolbox();
  const r = await saveToolbox({ ...s, topics: s.topics.filter((x) => x.id !== id) });
  if (!r.ok) return { ok: false, error: "Couldn't take it off." };
  revalidatePath("/portal/toolbox");
  return { ok: true };
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const empty = (on: string): Session => ({ on, notes: [], record: null, who: [], recordedBy: null, recordedAt: null });

/** How often the talk is, and on which weekday. The office's call: it moves everyone's. */
export async function setSchedule(input: { every: Every; day: number; today: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!can(me, "overhead") && !can(me, "manage_users")) return { ok: false, error: "Only the office can change how often the talk is." };
  const every: Every = input.every === "fortnight" || input.every === "month" ? input.every : "week";
  const day = Math.min(5, Math.max(1, Math.round(Number(input.day) || 1))) as Schedule["day"];
  // A fortnight counts from the next talk, so it lands on the week it's set.
  const r = await saveSchedule({ every, day, start: onOrAfter(isDay(input.today) ? input.today : new Date().toISOString().slice(0, 10), day) });
  if (!r.ok) return { ok: false, error: "Couldn't save it." };
  revalidatePath("/portal/toolbox");
  return { ok: true };
}

/** A note on what to talk about, under its heading, on a date's talk. */
export async function addNote(input: { on: string; head: string; text: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!isDay(input.on)) return { ok: false, error: "Pick which talk it's for." };
  const head = t(input.head, 120);
  if (!head) return { ok: false, error: "Give it a heading." };
  try {
    const s = (await loadSession(input.on)) ?? empty(input.on);
    const id = newId();
    await saveSession({ ...s, notes: [...s.notes, { id, head, text: t(input.text, 4000), by: first(me.name), at: new Date().toISOString() }] });
    revalidatePath("/portal/toolbox");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Couldn't save the note." };
  }
}

export async function removeNote(input: { on: string; id: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!isDay(input.on)) return { ok: false, error: "That talk couldn't be found." };
  try {
    const s = await loadSession(input.on);
    if (!s) return { ok: true };
    await saveSession({ ...s, notes: s.notes.filter((n) => n.id !== input.id) });
    revalidatePath("/portal/toolbox");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't take it off." };
  }
}

/**
 * What was said at a talk: typed, or the transcript from an AI note-taker
 * pasted or loaded from its file, and who was there. Saving it again
 * replaces it; clearing the box takes it off.
 */
export async function saveRecord(input: { on: string; record: string; who: string[] }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!isDay(input.on)) return { ok: false, error: "That talk couldn't be found." };
  const record = String(input.record ?? "").replace(/\r\n/g, "\n").trim().slice(0, 100_000);
  try {
    const s = (await loadSession(input.on)) ?? empty(input.on);
    await saveSession({
      ...s, record: record || null,
      who: (Array.isArray(input.who) ? input.who : []).map((x) => t(x, 80)).filter(Boolean).slice(0, 40),
      recordedBy: record ? me.name : null, recordedAt: record ? new Date().toISOString() : null,
    });
    revalidatePath("/portal/toolbox");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save what was said." };
  }
}
