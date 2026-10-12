"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { updateCrew, saveSettings, getSettings, createCrewPerson, deleteUser, updateVehicle } from "@/lib/portal/db";
import { readLoans, type VanLoan } from "@/lib/portal/fleet/loan";
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
  revalidatePath(`/portal/team/${input.userId}`);
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

/**
 * One van's finance contract and the figures it's costed from, saved from the
 * van's own Costs & details tab. The contract goes in settings (see
 * withLoans in db.ts); price, repayment, life and resale stay on the van, where
 * Vans & loans, the hourly rate and Planning already read them.
 */
export async function saveVanLoan(input: {
  id: string; loan: VanLoan;
  purchasePrice: number | null; purchasedOn: string | null; monthlyRepayment: number | null;
  resaleValue: number | null; lifespanYears: number | null;
}): Promise<ActionResult> {
  const me = await requireOverhead();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!/^[\w-]{1,64}$/.test(input.id)) return { ok: false, error: "That van couldn't be found." };
  const l = input.loan;
  if (l.ratePct != null && (l.ratePct < 0 || l.ratePct > 40)) return { ok: false, error: "The interest rate should be between 0 and 40%." };
  if (l.termMonths != null && (l.termMonths < 1 || l.termMonths > 120)) return { ok: false, error: "The term should be between 1 and 120 months." };
  if (input.purchasedOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.purchasedOn)) return { ok: false, error: "The date bought doesn't look right." };

  const all = readLoans(await getSettings<unknown>("vehicle_loans").catch(() => null));
  const clean = readLoans({ [input.id]: l })[input.id];
  const empty = !clean || Object.values(clean).every((v) => v == null);
  if (empty) delete all[input.id]; else all[input.id] = { ...clean, termMonths: clean.termMonths != null ? Math.round(clean.termMonths) : null };
  const saved = await saveSettings("vehicle_loans", all);
  if (!saved.ok) return { ok: false, error: saved.error === "not-configured" ? "Database not connected." : "Couldn't save the loan." };

  const life = money(input.lifespanYears, 40);
  const res = await updateVehicle(input.id, {
    purchasePrice: money(input.purchasePrice), purchasedOn: input.purchasedOn || null,
    monthlyRepayment: money(input.monthlyRepayment, 100_000), resaleValue: money(input.resaleValue),
    lifespanYears: life === 0 ? null : life,
  });
  if (!res.ok) return { ok: false, error: "The loan saved, but the van's price and life didn't." };
  revalidatePath("/portal/finance/capacity");
  revalidatePath("/portal/vehicles");
  revalidatePath(`/portal/vehicles/${input.id}`);
  return { ok: true };
}
