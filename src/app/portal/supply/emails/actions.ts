"use server";

import { revalidatePath } from "next/cache";
import { saveStPoSettings } from "@/lib/ordering/stPurchaseOrders";
import { saveJobNoteSuppliers, updatePastOrders } from "@/lib/ordering/stJobNotes";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveSupplierEmail } from "@/lib/ordering/db";
import { sendSamples } from "@/lib/ordering/send";
import { parseEmails } from "@/lib/ordering/plan";

export type ActionResult = { ok: boolean; error?: string; note?: string };

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isId = (s: string) => /^[a-z0-9_]{1,40}$/.test(s);
// Blank means "use the standard wording", so an emptied box goes back to it.
const text = (s: string, n: number) => (s.trim() ? s.trim().slice(0, n) : null);

export async function saveWording(input: { id: string; email: string; intro: string; signoff: string; cc: string; combine: boolean; needsEmail: boolean }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which supplier?" };
  const email = input.email.trim();
  if (input.needsEmail && !isEmail(email)) return { ok: false, error: "That isn't an email address." };
  if (!input.needsEmail && email && !isEmail(email)) return { ok: false, error: "That isn't an email address." };
  const cc = parseEmails(input.cc.slice(0, 1000));
  if (cc.bad.length) return { ok: false, error: `Not an email address: ${cc.bad.join(", ")}` };
  if (cc.ok.length > 10) return { ok: false, error: "That's a lot of people, ten at most." };
  const ok = await saveSupplierEmail(input.id, { email: email || null, intro: text(input.intro, 1500), signoff: text(input.signoff, 1500), cc: cc.ok, combine: !!input.combine });
  revalidatePath("/portal/supply/emails");
  return ok ? { ok: true, note: "Saved." } : { ok: false, error: "That supplier isn't there any more." };
}

export async function sendSample(input: { to: string; supplierId?: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const to = input.to.trim();
  if (!isEmail(to)) return { ok: false, error: "That isn't an email address." };
  if (input.supplierId && !isId(input.supplierId)) return { ok: false, error: "Which supplier?" };
  try {
    return await sendSamples(to, input.supplierId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** How sent orders go into ServiceTitan: the type, warehouse, stock business unit, vendors, and whether every order goes automatically. */
export async function saveStPo(input: { auto: boolean; typeId: number | null; warehouseId: number | null; stockBusinessUnitId: number | null; vendorIds: Record<string, number> }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const id = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);
  const vendorIds: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.vendorIds ?? {})) if (/^[\w-]{1,40}$/.test(k) && id(v)) vendorIds[k] = v;
  const ok = await saveStPoSettings({ auto: input.auto === true, typeId: id(input.typeId), warehouseId: id(input.warehouseId), stockBusinessUnitId: id(input.stockBusinessUnitId), vendorIds });
  if (!ok) return { ok: false, error: "Couldn't save." };
  revalidatePath("/portal/supply/emails");
  return { ok: true };
}

/** Whose sent orders are noted on their jobs in ServiceTitan. */
export async function saveJobNotes(ids: string[]): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const clean = [...new Set((Array.isArray(ids) ? ids : []).filter((x) => typeof x === "string" && /^[\w-]{1,40}$/.test(x)))].slice(0, 40);
  if (!(await saveJobNoteSuppliers(clean))) return { ok: false, error: "Couldn't save." };
  revalidatePath("/portal/supply/emails");
  revalidatePath("/portal/supply/next-week");
  return { ok: true, note: "Saved." };
}

/** Bring every sent order that isn't up to date on its jobs in ServiceTitan up to date: tags, notes, purchase orders. */
export async function noteAllPast(): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  try {
    const r = await updatePastOrders();
    revalidatePath("/portal/supply/emails");
    revalidatePath("/portal/supply/next-week");
    const done = r.done ? `${r.done} order${r.done === 1 ? "" : "s"} brought up to date in ServiceTitan.` : "";
    if (r.failed.length) return { ok: false, error: `${done} ${r.failed[0]}${r.failed.length > 1 ? ` (and ${r.failed.length - 1} more)` : ""}`.trim() };
    return { ok: true, note: done || "Nothing left to do." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
