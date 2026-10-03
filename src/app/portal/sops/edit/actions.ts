"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { deleteStoredSop, saveStoredSop } from "@/lib/portal/db";
import { SOP_AUDIENCES, SOP_FLAGS, slugify } from "@/lib/portal/sopEdits";
import { SOPS } from "@/lib/portal/sops";

export type ActionResult = { ok: boolean; error?: string };

async function requireEditor() {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return null;
  return me;
}

export async function saveProcedure(input: {
  section: string;
  code: string;
  title: string;
  happens: string;
  flag: string;
  audience: string;
  steps: { do: string; note: string }[];
  changed: string;
  /** Publishing is the explicit act; saving leaves it where it was. */
  publish: boolean;
}): Promise<ActionResult> {
  const me = await requireEditor();
  if (!me) return { ok: false, error: "Not allowed." };

  const code = input.code.trim().toUpperCase();
  const title = input.title.trim();
  if (!code) return { ok: false, error: "Give it a code." };
  if (!title) return { ok: false, error: "Give it a title." };
  if (!SOPS.some((s) => s.letter === input.section)) return { ok: false, error: "Pick a section." };
  if (!SOP_AUDIENCES.some((a) => a.k === input.audience)) return { ok: false, error: "Pick who it's for." };
  if (!SOP_FLAGS.some((f) => f.k === input.flag)) return { ok: false, error: "Pick a flag." };

  // A procedure with nothing in it is a heading, and a heading published to a
  // van is worse than no procedure at all.
  const steps = input.steps.map((s) => ({ do: s.do.trim(), note: s.note.trim() })).filter((s) => s.do);
  if (input.publish && steps.length === 0) return { ok: false, error: "Add at least one step before publishing." };

  const res = await saveStoredSop({
    section: input.section,
    code,
    slug: slugify(title),
    title,
    happens: input.happens.trim() || null,
    flag: input.flag || null,
    audience: input.audience,
    steps,
    changed: input.changed.trim() || null,
    status: input.publish ? "published" : "draft",
    updatedBy: me.name || me.email,
  });
  if (!res.ok) {
    if (res.error === "not-configured") return { ok: false, error: "The database isn't connected yet." };
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath("/portal/sops", "layout");
  revalidatePath("/trade/processes", "layout");
  return { ok: true };
}

/**
 * Take a written procedure away again.
 *
 * This only ever removes the override. A procedure that came from the
 * training-day manual goes back to what the manual says; it is not deleted,
 * because this editor was never where it lived.
 */
export async function revertProcedure(code: string): Promise<ActionResult> {
  const me = await requireEditor();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await deleteStoredSop(code.trim().toUpperCase());
  if (!res.ok) return { ok: false, error: "Couldn't remove it. Try again." };
  revalidatePath("/portal/sops", "layout");
  revalidatePath("/trade/processes", "layout");
  return { ok: true };
}
