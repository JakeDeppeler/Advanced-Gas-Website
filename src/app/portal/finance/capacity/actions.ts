"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { updateCrew, saveSettings, createCrewPerson, deleteUser } from "@/lib/portal/db";
import { isCrewLevel, defaultsFor, type Costing, type CapSettings } from "@/lib/portal/crew";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ActionResult = { ok: boolean; error?: string };

async function requireOverhead() {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return null;
  return me;
}

export async function removeCrewPerson(input: { userId: string; email?: string | null }): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can remove someone." };
  if ((input.email ?? "").trim().toLowerCase() === me.email) return { ok: false, error: "You can't remove yourself." };
  const res = await deleteUser(input.userId);
  if (!res.ok) return { ok: false, error: "Couldn't remove them." };
  revalidatePath("/portal/finance/capacity");
  revalidatePath("/portal/team");
  return { ok: true };
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

export async function addCrewPerson(input: { name: string; email: string; level: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can add someone." };
  if (!input.name.trim()) return { ok: false, error: "Give them a name." };
  if (!isCrewLevel(input.level)) return { ok: false, error: "Pick a level." };
  const email = input.email.trim();
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };
  const res = await createCrewPerson({ name: input.name, email: email || null, level: input.level, costing: defaultsFor(input.level) });
  if (!res.ok) {
    if (res.error === "exists") return { ok: false, error: "Someone with that email already exists." };
    if (res.error === "not-configured") return { ok: false, error: "Database not connected." };
    return { ok: false, error: "Couldn't add them." };
  }
  revalidatePath("/portal/finance/capacity");
  revalidatePath("/portal/team");
  return { ok: true, id: res.id };
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
