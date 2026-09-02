"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { isCrewLevel } from "@/lib/portal/crew";
import {
  updateUser, createGoal, updateGoal, deleteGoal,
  createReview, deleteReview, createReport, deleteReport,
} from "@/lib/portal/db";

export type ActionResult = { ok: boolean; error?: string };

export async function setPersonLevel(input: { userId: string; level: string }): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change a level." };
  if (!isCrewLevel(input.level)) return { ok: false, error: "Pick a level." };
  const res = await updateUser(input.userId, { level: input.level });
  if (!res.ok) return { ok: false, error: "Couldn't save." };
  revalidatePath("/portal/team");
  revalidatePath("/portal/finance/capacity");
  return { ok: true };
}

export async function saveTeamOrder(input: { ids: string[] }): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Not allowed." };
  for (let i = 0; i < input.ids.length; i++) await updateUser(input.ids[i], { sortOrder: i });
  revalidatePath("/portal/team");
  return { ok: true };
}

async function requireWriter() {
  const me = await getPortalUser();
  if (!me || !can(me, "reports_write")) return null;
  return me;
}

function reval(userId: string) {
  revalidatePath(`/portal/team/${userId}`);
  revalidatePath("/portal/me");
}

export async function saveExpectations(input: { userId: string; text: string }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await updateUser(input.userId, { expectations: input.text });
  if (!res.ok) return { ok: false, error: "Couldn't save." };
  reval(input.userId);
  return { ok: true };
}

export async function addGoal(input: { userId: string; title: string; target: string; due: string }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!input.title.trim()) return { ok: false, error: "Give the goal a title." };
  const res = await createGoal({ userId: input.userId, title: input.title.trim(), target: input.target.trim(), due: input.due || null, createdBy: me.email });
  if (!res.ok) return { ok: false, error: "Couldn't add the goal." };
  reval(input.userId);
  return { ok: true };
}

export async function setGoalStatus(input: { id: string; userId: string; status: "open" | "done" }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await updateGoal(input.id, { status: input.status });
  if (!res.ok) return { ok: false, error: "Couldn't update." };
  reval(input.userId);
  return { ok: true };
}

export async function removeGoal(input: { id: string; userId: string }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await deleteGoal(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove." };
  reval(input.userId);
  return { ok: true };
}

export async function addReview(input: { userId: string; period: string; rating: number | null; body: string }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!input.body.trim()) return { ok: false, error: "Write the review." };
  const res = await createReview({ userId: input.userId, period: input.period.trim(), rating: input.rating, body: input.body.trim(), authorEmail: me.email, authorName: me.name });
  if (!res.ok) return { ok: false, error: "Couldn't save the review." };
  reval(input.userId);
  return { ok: true };
}

export async function removeReview(input: { id: string; userId: string }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await deleteReview(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove." };
  reval(input.userId);
  return { ok: true };
}

export async function addNote(input: { userId: string; subjectName: string; sentiment: string; body: string }): Promise<ActionResult> {
  const me = await requireWriter();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!input.body.trim()) return { ok: false, error: "Write the note." };
  const res = await createReport({
    subjectId: input.userId, subjectName: input.subjectName,
    authorEmail: me.email, authorName: me.name,
    category: "note", sentiment: input.sentiment || "note", body: input.body.trim(),
  });
  if (!res.ok) return { ok: false, error: "Couldn't save the note." };
  reval(input.userId);
  return { ok: true };
}

export async function removeNote(input: { id: string; userId: string }): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can delete a note." };
  const res = await deleteReport(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't delete." };
  reval(input.userId);
  return { ok: true };
}
