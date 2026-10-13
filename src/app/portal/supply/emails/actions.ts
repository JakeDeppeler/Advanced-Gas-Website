"use server";

import { revalidatePath } from "next/cache";
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
  if (cc.ok.length > 10) return { ok: false, error: "That's a lot of people — ten at most." };
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
