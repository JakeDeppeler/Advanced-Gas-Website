import "server-only";
import { sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { cancelDraft, createOrder, getOrder, loadSuppliers, nextPoNumber } from "./db";
import { approveAndSend } from "./send";
import { updateJobs } from "./stJobNotes";
import { thisWeek, type Supplier, type WorkOrderDetails } from "./plan";

/**
 * Orders & stock › Work orders: the electrician for any job, not only the
 * installs the weekly plan drafts for. Find the job, say what's needed, send
 * it to GTE — and from there it is a work order like any other: emailed,
 * noted on the job with the PDF attached, the job tagged GTE Booked.
 *
 * Kept apart from the plan by its group key ("manual:…"), so redrafting the
 * week never takes one away (draftWeek).
 */

export type JobHit = {
  id: number; job_number: string; status: string | null; job_type: string | null;
  customer_name: string | null; suburb: string | null; next_visit: string | null;
};

export type JobForWork = JobHit & {
  site_address: string; phone: string | null; email: string | null; crew: string[];
  start_at: string | null; end_at: string | null; all_visits: string | null;
};

// PostgREST's or=() is split on commas and brackets; a search term never needs them.
const clean = (q: string) => q.replace(/[(),*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

/** Jobs by number, customer or suburb, open ones and the most recent first. */
export async function findJobs(q: string): Promise<JobHit[]> {
  const t = clean(q);
  if (t.length < 2) return [];
  const like = `*${t}*`;
  const rows = await sbSelect<Omit<JobHit, "next_visit">>(
    "st_jobs",
    `select=id,job_number,status,job_type,customer_name,suburb&or=(job_number.ilike.${encodeURIComponent(like)},customer_name.ilike.${encodeURIComponent(like)},suburb.ilike.${encodeURIComponent(like)})&status=neq.Canceled&order=modified_on.desc.nullslast&limit=12`,
  );
  if (!rows.length) return [];
  const visits = await sbSelect<{ job_id: number; start_at: string | null }>("job_next_appointment", `select=job_id,start_at&job_id=in.(${rows.map((r) => r.id).join(",")})`).catch(() => []);
  const at = new Map(visits.map((v) => [v.job_id, v.start_at]));
  return rows.map((r) => ({ ...r, next_visit: at.get(r.id) ?? null }));
}

/** Everything a work order needs from the job, read from the synced ServiceTitan tables. */
export async function jobForWork(id: number): Promise<JobForWork | null> {
  const [job] = await sbSelect<Omit<JobHit, "next_visit"> & { location_id: number | null; customer_id: number | null }>(
    "st_jobs", `select=id,job_number,status,job_type,customer_name,suburb,location_id,customer_id&id=eq.${id}`,
  );
  if (!job) return null;
  const [loc, visit, crew, lc, cc] = await Promise.all([
    job.location_id ? sbSelect<{ raw: { address?: Record<string, string | null> } | null }>("st_locations", `select=raw&id=eq.${job.location_id}`).then((r) => r[0] ?? null) : null,
    sbSelect<{ start_at: string | null; end_at: string | null; all_visits: string | null }>("job_next_appointment", `select=start_at,end_at,all_visits&job_id=eq.${id}`).then((r) => r[0] ?? null).catch(() => null),
    sbSelect<{ technician_name: string | null }>("st_appointment_assignments", `select=technician_name&job_id=eq.${id}&active=is.true`).catch(() => []),
    job.location_id ? sbSelect<{ type: string; value: string }>("st_location_contacts", `select=type,value&location_id=eq.${job.location_id}&active=is.true`).catch(() => []) : [],
    job.customer_id ? sbSelect<{ type: string; value: string }>("st_customer_contacts", `select=type,value&customer_id=eq.${job.customer_id}&active=is.true`).catch(() => []) : [],
  ]);
  // The site's own contact first, then the customer's, mobile before landline — as the planned work orders do (0063).
  const contacts = [...lc, ...cc];
  const phone = contacts.find((c) => c.type === "MobilePhone")?.value ?? contacts.find((c) => c.type === "Phone")?.value ?? null;
  const email = contacts.find((c) => c.type === "Email")?.value ?? null;
  const a = loc?.raw?.address ?? {};
  const site = [[a.unit, a.street].filter(Boolean).join(" "), a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter((s) => s && s.trim()).join(", ");
  return {
    id: job.id, job_number: job.job_number, status: job.status, job_type: job.job_type, customer_name: job.customer_name, suburb: job.suburb,
    next_visit: visit?.start_at ?? null, start_at: visit?.start_at ?? null, end_at: visit?.end_at ?? null, all_visits: visit?.all_visits ?? null,
    site_address: site || [job.suburb].filter(Boolean).join(""), phone, email,
    crew: [...new Set(crew.map((c) => c.technician_name).filter((n): n is string => !!n))],
  };
}

/** "2026-10-21" and "07:30" in Melbourne, as an instant. */
export function melbourneInstant(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // Try +11 (daylight saving) then +10, keeping whichever reads back as the time asked for.
  for (const off of [11, 10]) {
    const t = new Date(Date.UTC(y, m - 1, d, hh - off, mm));
    const back = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false }).format(t);
    if (back.replace(/^24/, "00") === `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`) return t.toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d, hh - 10, mm)).toISOString();
}

export type NewWorkOrder = {
  jobId: number; date: string; time: string | null; work: string;
  site: string; customer: string; phone: string; email: string; crew: string;
  /** Who it goes to when not the electrician on file, and anyone else copied on this one. */
  sendTo?: string | null; cc?: string[];
  /** The work, when it isn't electrical (water balancing), and the person's name for the email. */
  trade?: string | null; toName?: string | null;
  /** Files on the job in ServiceTitan to send with it. */
  files?: { id: number; name: string }[];
};

/**
 * Make the work order and send it to the electrician. A failed email leaves
 * it as a draft with the reason, on To order for its week, to send again —
 * the same as a planned one.
 */
export async function createAndSendWorkOrder(o: NewWorkOrder, who: string): Promise<{ ok: boolean; id?: number; error?: string; note?: string }> {
  const job = await jobForWork(o.jobId);
  if (!job) return { ok: false, error: "That job isn't in the synced ServiceTitan jobs." };
  const supplier: Supplier | undefined = (await loadSuppliers()).find((s) => s.method === "work_order" && s.active);
  if (!supplier) return { ok: false, error: "There's no electrician set up to send work orders to." };

  const startAt = o.time ? melbourneInstant(o.date, o.time) : null;
  const week = thisWeek(new Date(`${o.date}T12:00:00+10:00`));
  const details: WorkOrderDetails = {
    date: o.date, start_at: startAt, end_at: null, all_visits: null,
    site_address: o.site.trim() || job.site_address,
    crew: o.crew.split(",").map((s) => s.trim()).filter(Boolean),
    customer_name: o.customer.trim() || job.customer_name,
    customer_phone: o.phone.trim() || null,
    customer_email: o.email.trim() || null,
    jobs: [{ job_id: job.id, job_number: job.job_number, job_type: job.job_type, customer_name: job.customer_name, system_installed: null, electrical_items: null, work: o.work.trim() }],
    note: null,
    ...(o.trade?.trim() ? { trade: o.trade.trim(), to_name: o.toName?.trim() || null } : {}),
    ...(o.files?.length ? { files: o.files } : {}),
  };
  const id = await createOrder({
    po_number: await nextPoNumber(week, supplier.id), supplier_id: supplier.id, week_of: week.start, kind: "work_order",
    group_key: `manual:${job.id}:${Date.now()}`, status: "draft", details, cc_emails: o.cc ?? [], delivery_address: details.site_address, delivery_to_site: true,
  });
  const r = await approveAndSend(id, who, { to: o.sendTo ?? undefined });
  return r.ok ? { ok: true, id, note: r.note } : { ok: false, id, error: r.error };
}

export type WorkOrderRow = {
  id: number; po_number: string; status: string; sent_at: string | null; sent_to: string | null; send_error: string | null;
  approved_by: string | null; cc_emails: string[] | null;
  details: WorkOrderDetails | null; st_notes: { job_id: number; note: boolean; file: boolean; tags?: boolean }[] | null; st_note_error: string | null;
  manual: boolean;
};

/** Every electrician work order from the last two months and coming up, newest first. */
export async function listWorkOrders(): Promise<WorkOrderRow[]> {
  const since = isoDateMelbourne(new Date(Date.now() - 60 * 86400000));
  const rows = await sbSelect<Omit<WorkOrderRow, "manual"> & { group_key: string }>(
    "purchase_orders",
    `select=id,po_number,status,sent_at,sent_to,send_error,approved_by,cc_emails,details,st_notes,st_note_error,group_key&kind=eq.work_order&status=neq.cancelled&week_of=gte.${since}&order=id.desc&limit=60`,
  );
  return rows.map(({ group_key, ...r }) => ({ ...r, manual: group_key.startsWith("manual:") }));
}

/* ------------------------------------------------- people we send them to */

/**
 * The people work orders go to besides the electrician on file: water
 * balancing with Ross, a plumber, a builder's sparky. Picked on the form
 * rather than typed each time. Kept in portal_settings: a handful of rows.
 */
export type WoContact = { id: string; name: string; email: string; trade: string };
const CONTACTS = "work_order_contacts";

export async function loadWoContacts(): Promise<WoContact[]> {
  const s = await getSettings<{ list?: WoContact[] }>(CONTACTS).catch(() => null);
  return Array.isArray(s?.list) ? s.list : [];
}

export async function saveWoContacts(list: WoContact[]): Promise<boolean> {
  return (await saveSettings(CONTACTS, { list: list.slice(0, 40) })).ok;
}

/**
 * A draft work order the office doesn't want, marked cancelled as To order
 * cancels a draft: out of every list, and its job isn't drafted again
 * automatically. Never one that's been sent — the electrician has it.
 */
export async function dropWorkOrderDraft(id: number): Promise<{ ok: boolean; error?: string }> {
  const po = await getOrder(id);
  if (!po || po.kind !== "work_order") return { ok: false, error: "That work order isn't there any more." };
  if (po.status !== "draft") return { ok: false, error: "It's been sent, so it can't be deleted. Edit it and email the update instead." };
  return (await cancelDraft(id)) ? { ok: true } : { ok: false, error: "It's been sent, so it can't be deleted." };
}

/**
 * Put a work order on another job: sent against the quote's job when the
 * install's is the one it's for, say. The work order keeps everything else;
 * if it's gone, the new job gets the note and the work order in ServiceTitan.
 * The old job's note stays where it is: ServiceTitan's notes can't be taken back.
 */
export async function moveWorkOrder(id: number, jobId: number, opts: { quiet?: boolean } = {}): Promise<{ ok: boolean; error?: string; note?: string }> {
  const po = await getOrder(id);
  if (!po || po.kind !== "work_order" || !po.details) return { ok: false, error: "That work order couldn't be found." };
  const job = await jobForWork(jobId);
  if (!job) return { ok: false, error: "That job isn't in the synced ServiceTitan jobs." };
  const was = po.details.jobs[0];
  if (was?.job_id === job.id) return { ok: false, error: "It's already on that job." };
  const jobs = [{ ...(was ?? { system_installed: null, electrical_items: null, work: null }), job_id: job.id, job_number: job.job_number, job_type: job.job_type, customer_name: job.customer_name }, ...po.details.jobs.slice(1)];
  await sbUpdate("purchase_orders", `id=eq.${id}`, { details: { ...po.details, jobs }, updated_at: new Date().toISOString() });
  await sbUpdate("purchase_order_lines", `po_id=eq.${id}&job_id=eq.${was?.job_id ?? 0}`, { job_id: job.id, job_number: job.job_number, customer_name: job.customer_name }).catch(() => undefined);
  // quiet: it's about to be emailed again, which notes the job with the new copy.
  if (po.status !== "sent" || opts.quiet) return { ok: true, note: `Moved to job ${job.job_number}.` };
  const r = await updateJobs(id).catch((e: Error) => ({ ok: false, done: [], error: e.message }));
  return r.ok
    ? { ok: true, note: `Moved to job ${job.job_number}, noted there with the work order attached.${was ? ` Job ${was.job_number}'s note stays in ServiceTitan.` : ""}` }
    : { ok: true, note: `Moved to job ${job.job_number}, but ServiceTitan didn't take the note: ${r.error ?? "try again from To order › Sent"}.` };
}

export type WorkOrderEdit = {
  date: string; time: string | null; work: string; site: string; customer: string; phone: string; email: string; crew: string;
  /** Null for the electrician's; otherwise what the work is and who it's for. */
  trade: string | null; toName: string | null;
  files: { id: number; name: string }[];
};

/**
 * Change what a work order says: the day, the site, the work, who it's for.
 * Only the record changes here; a sent one is emailed again only when asked
 * (resendWorkOrder), since a typo fixed in the portal isn't news to Ross.
 * The lines move with the day, so the week sees it as in step with the job.
 */
export async function editWorkOrder(id: number, e: WorkOrderEdit): Promise<{ ok: boolean; error?: string }> {
  const po = await getOrder(id);
  if (!po || po.kind !== "work_order" || !po.details) return { ok: false, error: "That work order couldn't be found." };
  if (po.status === "approved") return { ok: false, error: "It's sending right now. Try again in a moment." };
  const d = po.details;
  const [first, ...rest] = d.jobs;
  const details: WorkOrderDetails = {
    ...d,
    date: e.date,
    // A changed day with the old time kept would be a time on the wrong day; both come from the form.
    start_at: e.time ? melbourneInstant(e.date, e.time) : null,
    end_at: e.date === d.date ? d.end_at : null,
    site_address: e.site.trim() || d.site_address,
    customer_name: e.customer.trim() || null,
    customer_phone: e.phone.trim() || null,
    customer_email: e.email.trim() || null,
    crew: e.crew.split(",").map((s) => s.trim()).filter(Boolean),
    jobs: first ? [{ ...first, work: e.work.trim() || null }, ...rest] : d.jobs,
    trade: e.trade?.trim() || null,
    to_name: e.trade?.trim() ? e.toName?.trim() || null : null,
    files: e.files,
  };
  await sbUpdate("purchase_orders", `id=eq.${id}`, { details, delivery_address: details.site_address, updated_at: new Date().toISOString() });
  if (e.date !== d.date || details.start_at !== d.start_at) {
    await sbUpdate("purchase_order_lines", `po_id=eq.${id}`, { install_date: e.date, appointment_start: details.start_at }).catch(() => undefined);
  }
  return { ok: true };
}
