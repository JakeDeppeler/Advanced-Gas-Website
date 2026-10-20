"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { resendOrder } from "@/lib/ordering/send";
import { putBackToDraft } from "@/lib/ordering/db";
import { holdFromAutoSend, logAuto } from "@/lib/automation/log";
import { sbSelectOne } from "@/lib/dashboard/db";

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

/** Put an order or work order that went back as a draft, to fix and send again. Nothing is emailed. */
export async function undoSend(id: number): Promise<{ ok: boolean; error?: string; note?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Which order?" };
  const r = await putBackToDraft(id);
  if (!r.ok) return { ok: false, error: r.error };
  const kind = await sbSelectOne<{ kind: string }>("purchase_orders", `select=kind&id=eq.${id}`).catch(() => null);
  if (kind?.kind === "work_order") await holdFromAutoSend(id).catch(() => undefined);
  await logAuto([{ at: new Date().toISOString(), kind: "undo", ok: true, po: r.was?.po, title: `${r.was?.po} put back as a draft by ${me.name.split(" ")[0]}`, detail: r.was?.to ? `It had gone to ${r.was.to}.` : undefined }]).catch(() => undefined);
  revalidatePath("/portal/supply/sent");
  revalidatePath("/portal/supply/next-week");
  revalidatePath("/portal/supply/work-orders");
  return { ok: true, note: `${r.was?.po} is a draft again. Fix it and send it${kind?.kind === "work_order" ? " from Work orders; it won't go by itself" : " from To order"}.${r.was?.to ? ` If ${r.was.to} shouldn't have had it, let them know.` : ""}` };
}
