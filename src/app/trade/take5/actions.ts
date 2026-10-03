"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { saveTake5 } from "@/lib/portal/people";
import { HAZARDS } from "@/lib/portal/peopleParts";

export type Take5Result = { ok: boolean; error?: string };

export async function sendTake5(input: { job: string; hazards: string[]; controls: string; safe: boolean }): Promise<Take5Result> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!input.safe) return { ok: false, error: "Tick that it's safe to start — or don't start, and ring the office." };
  const hazards = input.hazards.filter((h) => HAZARDS.some((x) => x.k === h));
  if (hazards.length && !input.controls.trim()) return { ok: false, error: "Say how you'll control what's here." };
  try {
    await saveTake5({
      kind: "take5", userId: me.id ?? null, userName: me.name, job: input.job.trim().slice(0, 120) || null,
      hazards, controls: input.controls.trim().slice(0, 1000) || null, safe: true, detail: null,
    });
  } catch {
    return { ok: false, error: "Couldn't save it." };
  }
  revalidatePath("/trade/take5");
  return { ok: true };
}

/** An incident, injury or near miss. It sits on the office's Home until somebody reads it. */
export async function reportIncident(input: { job: string; detail: string }): Promise<Take5Result> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!input.detail.trim()) return { ok: false, error: "Say what happened." };
  try {
    await saveTake5({
      kind: "incident", userId: me.id ?? null, userName: me.name, job: input.job.trim().slice(0, 120) || null,
      hazards: [], controls: null, safe: null, detail: input.detail.trim().slice(0, 2000),
    });
  } catch {
    return { ok: false, error: "Couldn't send it. Ring the office." };
  }
  revalidatePath("/trade/take5");
  revalidatePath("/portal");
  return { ok: true };
}
