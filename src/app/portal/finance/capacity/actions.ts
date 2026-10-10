"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { updateCrew, saveSettings, createCrewPerson, deleteUser, updateVehicle } from "@/lib/portal/db";
import { normaliseGrowth, type Growth } from "@/lib/portal/growthTypes";
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
  // The depreciation is read from the Vehicles tab every time; saving it would
  // freeze today's fleet into the settings.
  const { fleetDep: _dep, ...keep } = s;
  void _dep;
  const res = await saveSettings("capacity", keep);
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

/* ---------------------------------------------- vans, loans and markup */

/** The new van and the markups: their own settings key, so the costing save can't overwrite them. */
export async function saveGrowth(g: Growth): Promise<ActionResult> {
  const me = await requireOverhead();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await saveSettings("growth", { ...normaliseGrowth(g), savedAt: new Date().toISOString() });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  revalidatePath("/portal/finance/capacity");
  revalidatePath("/portal/finance/planning");
  return { ok: true };
}

const money = (v: unknown, max = 5_000_000): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
};

/**
 * One van's money: what was paid, what's still owing, the repayment, and the
 * resale and life its depreciation is worked from. Only here — the Vehicles
 * tab shows them and links back.
 */
export async function saveVanMoney(input: {
  id: string; purchasePrice: number | null; amountOwing: number | null; monthlyRepayment: number | null;
  resaleValue: number | null; lifespanYears: number | null;
}): Promise<ActionResult> {
  const me = await requireOverhead();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!/^[\w-]{1,64}$/.test(input.id)) return { ok: false, error: "That van couldn't be found." };
  const life = money(input.lifespanYears, 40);
  const res = await updateVehicle(input.id, {
    purchasePrice: money(input.purchasePrice), amountOwing: money(input.amountOwing),
    monthlyRepayment: money(input.monthlyRepayment, 100_000), resaleValue: money(input.resaleValue),
    lifespanYears: life === 0 ? null : life,
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  revalidatePath("/portal/finance/capacity");
  revalidatePath("/portal/finance/planning");
  revalidatePath("/portal/vehicles");
  revalidatePath(`/portal/vehicles/${input.id}`);
  return { ok: true };
}
