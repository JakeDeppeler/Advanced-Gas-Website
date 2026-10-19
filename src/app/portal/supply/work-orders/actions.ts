"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { createAndSendWorkOrder, dropWorkOrderDraft, editWorkOrder, findJobs, jobForWork, loadWoContacts, moveWorkOrder, saveWoContacts, type JobHit, type WoContact } from "@/lib/ordering/workOrders";
import { approveAndSend, resendWorkOrder } from "@/lib/ordering/send";
import { listJobFiles, type JobFile } from "@/lib/ordering/jobFiles";

type Picked = { id: number; name: string };
/** The job files picked on the form, as far as they read as files: an id and a name, a handful at most. */
const pickedFiles = (v: unknown): Picked[] =>
  (Array.isArray(v) ? v : [])
    .filter((f): f is Picked => !!f && Number.isInteger((f as Picked).id) && (f as Picked).id > 0 && typeof (f as Picked).name === "string")
    .slice(0, 15)
    .map((f) => ({ id: f.id, name: f.name.replace(/[\\/:*?"<>|\r\n]/g, "-").slice(0, 150) || `Attachment ${f.id}` }));

/** The files on a job in ServiceTitan, to pick ones to send with a work order. */
export async function jobFiles(jobId: number): Promise<{ files: JobFile[] } | { error: string }> {
  if (!(await office())) return { error: "Not allowed." };
  if (!Number.isInteger(jobId) || jobId <= 0) return { files: [] };
  return listJobFiles(jobId);
}
import { parseEmails } from "@/lib/ordering/plan";

export type ActionResult = { ok: boolean; error?: string; note?: string };

/** Make a work order for one job and send it to the electrician. */
export async function sendWorkOrder(input: {
  jobId: number; date: string; time: string; work: string; site: string; customer: string; phone: string; email: string; crew: string; sendTo: string; cc: string;
  /** Set when it's for someone other than the electrician: what the work is, and their name. */
  trade?: string; toName?: string; files?: Picked[];
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
      files: pickedFiles(input.files),
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

/** What the pop-up fills in when a work order is put on another job: that job's site and customer. */
export async function jobFill(jobId: number): Promise<{ site: string; customer: string; phone: string; email: string } | null> {
  if (!(await office()) || !Number.isInteger(jobId) || jobId <= 0) return null;
  const j = await jobForWork(jobId).catch(() => null);
  // A job with no location on file falls back to its suburb, which is no better than the address already there.
  return j ? { site: j.site_address !== (j.suburb ?? "") ? j.site_address : "", customer: j.customer_name ?? "", phone: j.phone ?? "", email: j.email ?? "" } : null;
}

/**
 * Edit a work order from its pop-up: the job it's on, what it says, who it's
 * for. Then, as asked: just keep it, send a draft, or email a sent one again.
 */
export async function saveWorkOrder(input: {
  id: number; jobId: number; date: string; time: string; work: string; site: string; customer: string; phone: string; email: string; crew: string;
  trade: string; toName: string; sendTo: string; files: Picked[]; then: "save" | "send" | "resend";
}): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(input.id) || !Number.isInteger(input.jobId) || input.jobId <= 0) return { ok: false, error: "Which job?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Pick the day." };
  if (input.time && !/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, error: "That time doesn't read as a time." };
  if (!input.work.trim()) return { ok: false, error: "Say what work is needed, it's what they read first." };
  const to = parseEmails(input.sendTo ?? "");
  if (to.bad.length || to.ok.length > 1) return { ok: false, error: `Send to takes one email address${to.bad.length ? `, “${to.bad[0]}” isn't one` : ""}.` };
  const cut = (s: string, n: number) => String(s ?? "").slice(0, n);
  const trade = cut(input.trade, 60).trim();
  try {
    const e = await editWorkOrder(input.id, {
      date: input.date, time: input.time || null, work: cut(input.work, 1500), site: cut(input.site, 300), customer: cut(input.customer, 200),
      phone: cut(input.phone, 60), email: cut(input.email, 200), crew: cut(input.crew, 300),
      // "Electrical" is the electrician's own, kept without a trade, as a new one would be.
      trade: trade && !/^electric/i.test(trade) ? trade : null, toName: cut(input.toName, 80) || null,
      files: pickedFiles(input.files),
    });
    if (!e.ok) return { ok: false, error: e.error };
    const notes: string[] = ["Saved."];
    const m = await moveWorkOrder(input.id, input.jobId, { quiet: input.then === "resend" });
    if (m.ok && m.note) notes.push(m.note);
    else if (!m.ok && m.error !== "It's already on that job.") return { ok: false, error: `Saved, but ${m.error}` };
    const who = me.name || me.email;
    const r = input.then === "send" ? await approveAndSend(input.id, who, { to: to.ok[0] })
      : input.then === "resend" ? await resendWorkOrder(input.id, who, { to: to.ok[0] })
      : null;
    revalidatePath("/portal/supply/work-orders");
    revalidatePath("/portal/supply/next-week");
    if (r && !r.ok) return { ok: false, error: `Saved, but it didn't send: ${r.error}` };
    if (r?.note) notes.push(r.note);
    return { ok: true, note: notes.join(" ") };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Throw away a work order that hasn't gone: made on the wrong job, or not needed. Kept as cancelled, out of the list, rather than deleted. */
export async function deleteWorkOrderDraft(id: number): Promise<ActionResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Which work order?" };
  const r = await dropWorkOrderDraft(id);
  revalidatePath("/portal/supply/work-orders");
  revalidatePath("/portal/supply/next-week");
  return r.ok ? { ok: true, note: "Draft deleted." } : { ok: false, error: r.error };
}
