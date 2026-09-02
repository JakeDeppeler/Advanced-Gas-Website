"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { updateCrew, saveSettings } from "@/lib/portal/db";
import { isCrewLevel, type Costing, type CapSettings } from "@/lib/portal/crew";

export type ActionResult = { ok: boolean; error?: string };

async function requireOverhead() {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return null;
  return me;
}

export async function saveCapSettings(s: CapSettings): Promise<ActionResult> {
  const me = await requireOverhead();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await saveSettings("capacity", s);
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  revalidatePath("/portal/finance/capacity");
  revalidatePath("/portal/finance");
  return { ok: true };
}

export async function saveCrew(input: { userId: string; level: string; costing: Costing }): Promise<ActionResult> {
  const me = await requireOverhead();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isCrewLevel(input.level)) return { ok: false, error: "Pick a level." };
  const res = await updateCrew(input.userId, input.level, input.costing);
  if (!res.ok) return { ok: false, error: "Couldn't save." };
  revalidatePath("/portal/finance/capacity");
  return { ok: true };
}
