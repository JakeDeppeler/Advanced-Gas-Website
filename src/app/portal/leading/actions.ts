"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { canEditStandards } from "@/lib/portal/standards";
import { loadRoles } from "@/lib/portal/roles/store";
import { loadDecisions, loadLeading, saveDecisions, saveLeading } from "@/lib/portal/leading/store";
import type { Band, Decision, Leading, Seat } from "@/lib/portal/leading/types";

export type LeadResult = { ok: boolean; error?: string };

const lines = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => String(x).trim()).filter(Boolean).slice(0, 30).map((x) => x.slice(0, 300));
const text = (v: unknown, n = 1500) => String(v ?? "").trim().slice(0, n);
const money = (v: unknown) => { const n = Number(String(v ?? "").replace(/[$,\s]/g, "")); return String(v ?? "").trim() && Number.isFinite(n) && n >= 0 ? Math.round(n) : null; };

async function owner() {
  const u = await getPortalUser();
  return u && canEditStandards(u) ? u : null;
}

const done = () => revalidatePath("/portal/leading");

/** One seat's bands and limit, new or changed (was: the name it had). Only the owner says what a seat can decide. */
export async function saveSeat(input: Seat, was?: string): Promise<LeadResult> {
  if (!(await owner())) return { ok: false, error: "Only the owner can change who decides what." };
  const l = await loadLeading();
  const name = text(input.name, 80);
  if (!name) return { ok: false, error: "Give the seat a name." };
  if (name !== was && l.seats.some((s) => s.name === name)) return { ok: false, error: `There's already a ${name}.` };
  const seat: Seat = { roleId: text(input.roleId, 80), name, decide: lines(input.decide), tell: lines(input.tell), ask: lines(input.ask), spend: money(input.spend) };
  const seats = was && l.seats.some((s) => s.name === was) ? l.seats.map((s) => (s.name === was ? seat : s)) : [...l.seats, seat];
  const r = await saveLeading({ ...l, seats });
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

export async function removeSeat(name: string): Promise<LeadResult> {
  if (!(await owner())) return { ok: false, error: "Only the owner can change who decides what." };
  const l = await loadLeading();
  const r = await saveLeading({ ...l, seats: l.seats.filter((s) => s.name !== name) });
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't remove it." };
}

/** The words around the seats: the opening, how to bring a call, the ladder. */
export async function saveLeadingText(input: Pick<Leading, "intro" | "method" | "moveUp"> & { ladder: Array<{ name: string; means: string }> }): Promise<LeadResult> {
  if (!(await owner())) return { ok: false, error: "Only the owner can change this." };
  const l = await loadLeading();
  const ladder = (Array.isArray(input.ladder) ? input.ladder : []).map((x) => ({ name: text(x?.name, 60), means: text(x?.means, 400) })).filter((x) => x.name).slice(0, 8);
  const r = await saveLeading({ ...l, intro: text(input.intro), method: lines(input.method), moveUp: text(input.moveUp), ladder: ladder.length ? ladder : l.ladder });
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/** Show it to the team, or take it back to a draft. */
export async function publishLeading(on: boolean): Promise<LeadResult> {
  if (!(await owner())) return { ok: false, error: "Only the owner can publish this." };
  const l = await loadLeading();
  const r = await saveLeading({ ...l, published: !!on });
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/** A call someone made, written down for the weekly review. Anyone signed in. */
export async function logDecision(input: { what: string; why: string; cost?: string; band: Band }): Promise<LeadResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const what = text(input.what, 400);
  if (!what) return { ok: false, error: "Say what you decided." };
  const band: Band = input.band === "decide" || input.band === "ask" ? input.band : "tell";
  const [roles, l] = await Promise.all([loadRoles(), loadLeading()]);
  const roleId = me.id ? roles.assign[me.id] : undefined;
  const seat = l.seats.find((s) => s.roleId && s.roleId === roleId)?.name ?? roles.roles.find((r) => r.id === roleId)?.name ?? null;
  const d: Decision = {
    id: randomUUID(), at: new Date().toISOString(), by: me.name, byEmail: me.email.toLowerCase(), seat,
    what, why: text(input.why, 1200), cost: money(input.cost), band, review: null,
  };
  const r = await saveDecisions([d, ...(await loadDecisions())]);
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/** The owner's word on a call: a good call, or one to talk through, and why. */
export async function reviewDecision(id: string, good: boolean, note: string): Promise<LeadResult> {
  const me = await owner();
  if (!me) return { ok: false, error: "Only the owner reviews the calls." };
  const all = await loadDecisions();
  if (!all.some((d) => d.id === id)) return { ok: false, error: "That one isn't there any more." };
  const r = await saveDecisions(all.map((d) => (d.id === id ? { ...d, review: { good: !!good, note: text(note, 800), by: me.name, at: new Date().toISOString() } } : d)));
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/** Take a call back out: your own before it's been reviewed, or any, for the owner. */
export async function removeDecision(id: string): Promise<LeadResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const all = await loadDecisions();
  const d = all.find((x) => x.id === id);
  if (!d) return { ok: true };
  const mine = d.byEmail === me.email.toLowerCase() && !d.review;
  if (!mine && !canEditStandards(me)) return { ok: false, error: "Only the owner can take out a call that's been reviewed." };
  const r = await saveDecisions(all.filter((x) => x.id !== id));
  done();
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't remove it." };
}
