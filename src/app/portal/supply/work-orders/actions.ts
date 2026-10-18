"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { createAndSendWorkOrder, findJobs, loadWoContacts, moveWorkOrder, saveWoContacts, type JobHit, type WoContact } from "@/lib/ordering/workOrders";
import { parseEmails } from "@/lib/ordering/plan";

export type ActionResult = { ok: boolean; error?: string; note?: string };

/** Make a work order for one job and send it to the electrician. */
export async function sendWorkOrder(input: {
  jobId: number; date: string; time: string; work: string; site: string; customer: string; phone: string; email: string; crew: string; sendTo: string; cc: string;
  /** Set when it's for someone other than the electrician: what the work is, and their name. */
  trade?: string; toName?: string;
}): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(input.jobId) || input.jobId <= 0) return { ok: false, error: "Which job?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Pick the day you want the electrician there." };
  if (input.time && !/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, error: "That time doesn't read as a time." };
  const work = input.work.trim();
  if (!work) return { ok: false, error: "Say what work is needed, it's what they read first." };
  const cut = (s: string, n: number) => String(s ?? "").slice(0, n);
  const to = parseEmails(input.sendTo ?? "");
  if (to.bad.length || to.ok.length > 1) return { ok: false, error: `Send to takes one email address${to.bad.length ? `, “${to.bad[0]}” isn't one` : ""}.` };
  const cc = parseEmails(input.cc ?? "");
  if (cc.bad.length) return { ok: false, error: `“${cc.bad[0]}” isn't an email address.` };
  try {
    const r = await createAndSendWorkOrder({
      jobId: input.jobId, date: input.date, time: input.time || null, work: cut(work, 1500),
      site: cut(input.site, 300), customer: cut(input.customer, 200), phone: cut(input.phone, 60), email: cut(input.email, 200), crew: cut(input.crew, 300),
      sendTo: to.ok[0] ?? null, cc: cc.ok.slice(0, 10),
      trade: cut(input.trade ?? "", 60) || null, toName: cut(input.toName ?? "", 80) || null,
    }, me.name || me.email);
    revalidatePath("/portal/supply/work-orders");
    revalidatePath("/portal/supply/next-week");
    return r.ok ? { ok: true, note: r.note ?? "Sent." } : { ok: false, error: r.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

/** Someone work orders go to, saved to pick next time: water balancing with Ross, a plumber. */
export async function saveWoContact(input: { name: string; email: string; trade: string }): Promise<ActionResult & { contact?: WoContact }> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const name = input.name.trim().slice(0, 80), trade = input.trade.trim().slice(0, 60);
  const email = parseEmails(input.email ?? "");
  if (!name) return { ok: false, error: "Give them a name." };
  if (!trade) return { ok: false, error: "Say what work they do, e.g. Water balancing." };
  if (email.bad.length || email.ok.length !== 1) return { ok: false, error: "One email address." };
  const list = await loadWoContacts();
  const contact = { id: `c${Date.now().toString(36)}`, name, email: email.ok[0], trade };
  if (!(await saveWoContacts([...list.filter((c) => c.email.toLowerCase() !== contact.email.toLowerCase()), contact]))) return { ok: false, error: "Couldn't save them." };
  revalidatePath("/portal/supply/work-orders");
  return { ok: true, contact, note: `${name} saved.` };
}

export async function removeWoContact(id: string): Promise<ActionResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const list = await loadWoContacts();
  if (!(await saveWoContacts(list.filter((c) => c.id !== id)))) return { ok: false, error: "Couldn't save." };
  revalidatePath("/portal/supply/work-orders");
  return { ok: true };
}

/** Jobs to move a work order onto, from the pop-up. */
export async function searchJobs(q: string): Promise<JobHit[]> {
  if (!(await office())) return [];
  return findJobs(String(q ?? "").slice(0, 60)).catch(() => []);
}

/** Put a work order on another job (the install's, not the quote's). */
export async function moveToJob(input: { id: number; jobId: number }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(input.id) || !Number.isInteger(input.jobId)) return { ok: false, error: "Which job?" };
  try {
    const r = await moveWorkOrder(input.id, input.jobId);
    revalidatePath("/portal/supply/work-orders");
    revalidatePath("/portal/supply/next-week");
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
