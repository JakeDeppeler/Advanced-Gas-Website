"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { createAndSendWorkOrder } from "@/lib/ordering/workOrders";
import { parseEmails } from "@/lib/ordering/plan";

export type ActionResult = { ok: boolean; error?: string; note?: string };

/** Make a work order for one job and send it to the electrician. */
export async function sendWorkOrder(input: {
  jobId: number; date: string; time: string; work: string; site: string; customer: string; phone: string; email: string; crew: string; sendTo: string; cc: string;
}): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(input.jobId) || input.jobId <= 0) return { ok: false, error: "Which job?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Pick the day you want the electrician there." };
  if (input.time && !/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, error: "That time doesn't read as a time." };
  const work = input.work.trim();
  if (!work) return { ok: false, error: "Say what electrical work is needed — it's what Geoff reads first." };
  const cut = (s: string, n: number) => String(s ?? "").slice(0, n);
  const to = parseEmails(input.sendTo ?? "");
  if (to.bad.length || to.ok.length > 1) return { ok: false, error: `Send to takes one email address${to.bad.length ? ` — “${to.bad[0]}” isn't one` : ""}.` };
  const cc = parseEmails(input.cc ?? "");
  if (cc.bad.length) return { ok: false, error: `“${cc.bad[0]}” isn't an email address.` };
  try {
    const r = await createAndSendWorkOrder({
      jobId: input.jobId, date: input.date, time: input.time || null, work: cut(work, 1500),
      site: cut(input.site, 300), customer: cut(input.customer, 200), phone: cut(input.phone, 60), email: cut(input.email, 200), crew: cut(input.crew, 300),
      sendTo: to.ok[0] ?? null, cc: cc.ok.slice(0, 10),
    }, me.name || me.email);
    revalidatePath("/portal/supply/work-orders");
    revalidatePath("/portal/supply/next-week");
    return r.ok ? { ok: true, note: r.note ?? "Sent." } : { ok: false, error: r.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
