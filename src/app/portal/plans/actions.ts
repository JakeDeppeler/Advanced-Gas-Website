"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { meOf, seesAll } from "@/lib/todos/store";
import { createPlan, removePlan, updatePlan } from "@/lib/plans/store";
import { AREAS, HORIZONS, type Horizon, type PlanStatus } from "@/lib/plans/types";

export type PlanResult = { ok: boolean; error?: string };

const ID = /^[0-9a-f-]{36}$/i;

/** Whose list: always the person asking. The office has one each; nobody reads another's. */
async function owner(): Promise<string | null> {
  const user = await getPortalUser();
  if (!user || !(await seesAll(user))) return null;
  return (await meOf(user))?.id ?? null;
}

const okHorizon = (h: unknown): h is Horizon => HORIZONS.some((x) => x.key === h);
const okArea = (a: unknown) => a == null || a === "" || AREAS.some((x) => x.key === a);

export async function addPlan(input: { title: string; notes?: string; area?: string; horizon: Horizon }): Promise<PlanResult> {
  const me = await owner();
  if (!me) return { ok: false, error: "Future planning is for the office." };
  if (!input.title?.trim()) return { ok: false, error: "Say what you want to do." };
  if (!okHorizon(input.horizon)) return { ok: false, error: "Pick when." };
  if (!okArea(input.area)) return { ok: false, error: "Pick what it's about." };
  try {
    await createPlan(me, { title: input.title, notes: input.notes, area: input.area || null, horizon: input.horizon });
  } catch {
    return { ok: false, error: "Couldn't save it. Try again." };
  }
  revalidatePath("/portal/plans");
  return { ok: true };
}

export async function changePlan(id: string, patch: { title?: string; notes?: string; area?: string; horizon?: Horizon; status?: PlanStatus }): Promise<PlanResult> {
  const me = await owner();
  if (!me) return { ok: false, error: "Future planning is for the office." };
  if (!ID.test(id)) return { ok: false, error: "No such plan." };
  if (patch.title !== undefined && !patch.title.trim()) return { ok: false, error: "It needs a name." };
  if (patch.horizon !== undefined && !okHorizon(patch.horizon)) return { ok: false, error: "Pick when." };
  if (patch.area !== undefined && !okArea(patch.area)) return { ok: false, error: "Pick what it's about." };
  if (patch.status !== undefined && !["idea", "doing", "done"].includes(patch.status)) return { ok: false, error: "No such status." };
  try {
    await updatePlan(me, id, { ...patch, ...(patch.area !== undefined ? { area: patch.area || null } : {}) });
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/plans");
  return { ok: true };
}

export async function dropPlan(id: string): Promise<PlanResult> {
  const me = await owner();
  if (!me) return { ok: false, error: "Future planning is for the office." };
  if (!ID.test(id)) return { ok: false, error: "No such plan." };
  try {
    await removePlan(me, id);
  } catch {
    return { ok: false, error: "Couldn't remove it. Try again." };
  }
  revalidatePath("/portal/plans");
  return { ok: true };
}
