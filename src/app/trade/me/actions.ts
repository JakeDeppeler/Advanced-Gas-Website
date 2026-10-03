"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { askLeave, getTimesheet, saveTimesheet } from "@/lib/portal/people";
import { LEAVE_KINDS, minutesOf, type LeaveKind, type TimesheetDays } from "@/lib/portal/peopleParts";

export type MeResult = { ok: boolean; error?: string };

const iso = /^\d{4}-\d{2}-\d{2}$/;

export async function askForLeave(input: { kind: LeaveKind; from: string; to: string; note: string }): Promise<MeResult> {
  const me = await getPortalUser();
  if (!me?.id) return { ok: false, error: "Sign in again." };
  if (!LEAVE_KINDS.some((k) => k.k === input.kind)) return { ok: false, error: "Pick the kind of leave." };
  if (!iso.test(input.from) || !iso.test(input.to)) return { ok: false, error: "Put both dates in." };
  if (input.to < input.from) return { ok: false, error: "The last day is before the first." };
  try {
    await askLeave({ userId: me.id, userName: me.name, kind: input.kind, from: input.from, to: input.to, note: input.note.trim().slice(0, 300) || null });
  } catch {
    return { ok: false, error: "Couldn't send it." };
  }
  revalidatePath("/trade/me");
  revalidatePath("/portal");
  return { ok: true };
}

/**
 * Save the week, or send it. A sent week can still be corrected — the send
 * time moves with it, so the office can see it changed after it came in.
 */
export async function saveWeek(input: { weekOf: string; days: TimesheetDays; submit: boolean }): Promise<MeResult> {
  const me = await getPortalUser();
  if (!me?.id) return { ok: false, error: "Sign in again." };
  if (!iso.test(input.weekOf)) return { ok: false, error: "Which week?" };
  const days: TimesheetDays = {};
  for (const [d, v] of Object.entries(input.days).slice(0, 7)) {
    if (!iso.test(d) || d < input.weekOf) continue;
    const start = (v.start ?? "").trim().slice(0, 10);
    const finish = (v.finish ?? "").trim().slice(0, 10);
    if ((start && minutesOf(start) == null) || (finish && minutesOf(finish) == null)) {
      return { ok: false, error: `Check the times on ${new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long" })} — like 7:30am.` };
    }
    days[d] = { start, finish, note: (v.note ?? "").trim().slice(0, 80) };
  }
  const existing = await getTimesheet(me.id, input.weekOf);
  try {
    await saveTimesheet({ userId: me.id, userName: me.name, weekOf: input.weekOf, days, submit: input.submit || !!existing?.submittedAt });
  } catch {
    return { ok: false, error: "Couldn't save the week." };
  }
  revalidatePath("/trade/me");
  revalidatePath("/trade/me/timesheet");
  revalidatePath("/portal/hours");
  return { ok: true };
}
