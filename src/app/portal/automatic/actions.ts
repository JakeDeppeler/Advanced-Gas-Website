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

/** Who gets the office's automatic to-dos, or the invoicing lists'. */
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

/**
 * Take failures off "Needs a look" once someone's dealt with them by hand:
 * a tag taken off in ServiceTitan, a work order sent. The office's, since
 * they're the ones who sort them. Keys are only ever the page's own, so
 * anything that doesn't look like one is dropped.
 */
export async function markSorted(keys: string[]): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !(can(me, "overhead") || can(me, "manage_users"))) return { ok: false, error: "Only the office can change this." };
  const clean = keys.filter((k) => typeof k === "string" && /^[\w-]{1,40}\|[^|]{1,200}$/.test(k)).slice(0, 100);
  if (!clean.length) return { ok: false, error: "Nothing to mark." };
  const { markSortedKeys } = await import("@/lib/automation/log");
  const r = await markSortedKeys(clean);
  revalidatePath("/portal/automatic");
  revalidatePath("/portal/supply/automation");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

/**
 * The quotes the old guess marked Awaiting Quote Approval: mark some still in
 * draft, or confirm them sent. The office's call, since only ServiceTitan's
 * quote screen shows the Draft tick. A slice at a time from the page, so a
 * long list doesn't run a function out of time.
 */
export async function sortGuessed(jobIds: number[], as: "draft" | "sent"): Promise<{ ok: boolean; done?: number; failed?: { jobId: number; detail: string }[]; error?: string }> {
  const me = await getPortalUser();
  if (!me || !(can(me, "overhead") || can(me, "manage_users"))) return { ok: false, error: "Only the office can change this." };
  const ids = jobIds.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 15);
  if (!ids.length) return { ok: false, error: "Tick at least one." };
  const { confirmSent, markStillDraft } = await import("@/lib/automation/quoteDrafts");
  if (as === "sent") {
    await confirmSent(ids);
    revalidatePath("/portal/automatic");
    return { ok: true, done: ids.length, failed: [] };
  }
  const r = await markStillDraft(ids);
  revalidatePath("/portal/automatic");
  return { ok: true, done: r.filter((x) => x.ok).length, failed: r.filter((x) => !x.ok).map(({ jobId, detail }) => ({ jobId, detail })) };
}
