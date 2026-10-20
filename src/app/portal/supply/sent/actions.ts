"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { resendOrder } from "@/lib/ordering/send";

/** Fix a sent order's delivery and email it again, marked as replacing the first. */
export async function fixAndResend(input: { id: number; toSite: boolean; address: string; instructions: string; deliverBy: string; note: string; pickup: boolean }): Promise<{ ok: boolean; error?: string; note?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(input.id) || input.id <= 0) return { ok: false, error: "Which order?" };
  const address = input.address.trim().slice(0, 200);
  if (!address && !input.pickup) return { ok: false, error: "Where should it go?" };
  const by = input.deliverBy.trim();
  if (by && !/^\d{4}-\d{2}-\d{2}$/.test(by)) return { ok: false, error: "That date doesn't read as a date." };
  const r = await resendOrder(input.id, { toSite: !!input.toSite, address, instructions: input.instructions.trim().slice(0, 300), deliverBy: by || null, note: input.note.trim().slice(0, 600) });
  revalidatePath("/portal/supply/sent");
  return r.ok ? { ok: true, note: r.note } : { ok: false, error: r.error };
}
