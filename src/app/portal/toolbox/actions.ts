"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { loadToolbox, saveToolbox } from "@/lib/toolbox/store";
import type { Talk, Topic } from "@/lib/toolbox/types";

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

/** Save what was talked about: the day, who was there, what was said and what was agreed. */
export async function saveTalk(input: { topicId: string | null; title: string; on: string; who: string[]; notes: string; actions: string }): Promise<ToolboxResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const title = t(input.title, 120);
  if (!title) return { ok: false, error: "Say what the talk was on." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.on ?? "")) return { ok: false, error: "Pick the day." };
  const s = await loadToolbox();
  const talk: Talk = {
    id: newId(), topicId: input.topicId && s.topics.some((x) => x.id === input.topicId) ? input.topicId : null, title, on: input.on,
    by: me.name, who: (Array.isArray(input.who) ? input.who : []).map((x) => t(x, 80)).filter(Boolean).slice(0, 40),
    notes: t(input.notes, 6000), actions: t(input.actions, 3000), at: new Date().toISOString(),
  };
  const talks = [talk, ...s.talks].sort((a, b) => b.on.localeCompare(a.on) || b.at.localeCompare(a.at));
  const r = await saveToolbox({ ...s, talks });
  if (!r.ok) return { ok: false, error: "Couldn't save the talk." };
  revalidatePath("/portal/toolbox");
  return { ok: true, id: talk.id };
}
