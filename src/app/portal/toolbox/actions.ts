"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { loadSchedule, loadSession, loadToolbox, saveSchedule, saveSession, saveToolbox } from "@/lib/toolbox/store";
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

/**
 * How often the talk is, which weekday and time, who runs it and who's
 * expected. The office's call: it moves everyone's.
 */
export async function setSchedule(input: { every: Every; day: number; today: string; time?: string | null; runBy?: string | null; expected?: string[] }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!can(me, "overhead") && !can(me, "manage_users")) return { ok: false, error: "Only the office can change how often the talk is." };
  const every: Every = input.every === "fortnight" || input.every === "month" ? input.every : "week";
  const day = Math.min(5, Math.max(1, Math.round(Number(input.day) || 1))) as Schedule["day"];
  const today = isDay(input.today) ? input.today : new Date().toISOString().slice(0, 10);
  const was = await loadSchedule(today);
  // A fortnight counts from the next talk, so it lands on the week it's set.
  // Changing only the time or who's there keeps it where it is: re-counting
  // from today in an off week would slide every talk by a week.
  const start = every === was.every && day === was.day ? was.start : onOrAfter(today, day);
  const time = typeof input.time === "string" && /^\d{2}:\d{2}$/.test(input.time) ? input.time : input.time === undefined ? was.time : null;
  const runBy = input.runBy === undefined ? was.runBy : t(input.runBy, 80) || null;
  const expected = input.expected === undefined ? was.expected : (Array.isArray(input.expected) ? input.expected : []).map((x) => t(x, 80)).filter(Boolean).slice(0, 40);
  const r = await saveSchedule({ every, day, start, time, runBy, expected });
  if (!r.ok) return { ok: false, error: "Couldn't save it." };
  revalidatePath("/portal/toolbox");
  return { ok: true };
}

/**
 * A topic written on the page: straight onto the next talk, or on hold for
 * a later one. Anyone signed in, as notes and ideas always were.
 */
export async function newTopic(input: { on: string; head: string; text: string; to: "talk" | "hold" }): Promise<ToolboxResult> {
  if (input.to === "talk") return addNote({ on: input.on, head: input.head, text: input.text });
  return saveTopic({ title: input.head, points: input.text });
}

/** Off a talk and onto On hold, heading and description kept. */
export async function holdNote(input: { on: string; id: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!isDay(input.on)) return { ok: false, error: "That talk couldn't be found." };
  try {
    const s = await loadSession(input.on);
    const n = s?.notes.find((x) => x.id === input.id);
    if (!s || !n) return { ok: false, error: "That topic's already gone from the talk." };
    // On hold first, then off the talk: a failure between leaves it in both, never in neither.
    const box = await loadToolbox();
    const topic: Topic = { id: newId(), title: n.head, points: lines(n.text), addedBy: n.by, at: new Date().toISOString() };
    const r = await saveToolbox({ ...box, topics: [topic, ...box.topics] });
    if (!r.ok) return { ok: false, error: "Couldn't put it on hold." };
    await saveSession({ ...s, notes: s.notes.filter((x) => x.id !== input.id) });
    revalidatePath("/portal/toolbox");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't put it on hold." };
  }
}

/** Off hold and onto a talk. */
export async function bringBack(input: { on: string; id: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!isDay(input.on)) return { ok: false, error: "Pick which talk it's for." };
  const box = await loadToolbox();
  const topic = box.topics.find((x) => x.id === input.id);
  if (!topic) return { ok: false, error: "That topic's already gone from On hold." };
  // Onto the talk first, then off hold, for the same reason as above.
  const r = await addNote({ on: input.on, head: topic.title, text: topic.points.join("\n") });
  if (!r.ok) return r;
  const after = await loadToolbox();
  const s = await saveToolbox({ ...after, topics: after.topics.filter((x) => x.id !== input.id) });
  if (!s.ok) return { ok: false, error: "It's on the talk, but couldn't come off On hold." };
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
