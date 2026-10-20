"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { AUTO_KEYS, loadSwitches, saveSwitches, type AutoKey } from "@/lib/automation/log";
import { teamPeople } from "@/lib/todos/store";

/** Turn one automatic job on or off. Admins only: some of them write to ServiceTitan. */
export async function setAuto(key: AutoKey, on: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change this." };
  if (!AUTO_KEYS.includes(key)) return { ok: false, error: "That isn't one of them." };
  const r = await saveSwitches({ ...(await loadSwitches()), [key]: !!on });
  revalidatePath("/portal/automatic");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/** Who gets the office's automatic to-dos, or the Finance list's. */
export async function setOfficeTo(id: string | null, which: "officeTo" | "accountsTo" = "officeTo"): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change this." };
  if (id && !(await teamPeople()).some((p) => p.id === id)) return { ok: false, error: "That person isn't on the team list." };
  const r = await saveSwitches({ ...(await loadSwitches()), [which === "accountsTo" ? "accountsTo" : "officeTo"]: id || null });
  revalidatePath("/portal/automatic");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/** Who's emailed when the portal sends something by itself. */
export async function setNotifyTo(value: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change this." };
  const list = value.split(/[,;\s]+/).map((a) => a.trim()).filter(Boolean);
  const bad = list.find((a) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
  if (bad) return { ok: false, error: `“${bad}” isn't an email address.` };
  if (list.length > 5) return { ok: false, error: "Five addresses at most." };
  const r = await saveSwitches({ ...(await loadSwitches()), notifyTo: list.length ? list.join(", ") : null });
  revalidatePath("/portal/automatic");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}
