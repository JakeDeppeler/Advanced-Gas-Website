"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can, REPORT_CATEGORIES } from "@/lib/portal/caps";
import { createReport, deleteReport } from "@/lib/portal/db";

export type ActionResult = { ok: boolean; error?: string };

const CATEGORY_KEYS = REPORT_CATEGORIES.map((c) => c.key);

export async function writeReport(input: {
  subjectId: string;
  subjectName: string;
  category: string;
  title: string;
  body: string;
}): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "reports_write")) return { ok: false, error: "Not allowed." };

  const body = input.body.trim();
  const subjectName = input.subjectName.trim();
  if (!subjectName || !input.subjectId) return { ok: false, error: "Pick who it's about." };
  if (!body) return { ok: false, error: "Write something in the report." };
  const category = CATEGORY_KEYS.includes(input.category) ? input.category : "note";

  const res = await createReport({
    subjectId: input.subjectId,
    subjectName,
    authorEmail: me.email,
    authorName: me.name,
    category,
    title: input.title.trim(),
    body,
  });
  if (!res.ok) {
    if (res.error === "not-configured") return { ok: false, error: "The database isn't connected yet." };
    return { ok: false, error: "Couldn't save the report. Try again." };
  }
  revalidatePath("/portal/reports");
  return { ok: true };
}

export async function removeReport(input: { id: string }): Promise<ActionResult> {
  const me = await getPortalUser();
  // Reports are a record — only admins can remove one.
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can delete a report." };
  if (!input.id) return { ok: false, error: "Missing report." };

  const res = await deleteReport(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't delete it. Try again." };
  revalidatePath("/portal/reports");
  return { ok: true };
}
