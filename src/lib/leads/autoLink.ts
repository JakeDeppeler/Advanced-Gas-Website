import "server-only";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { signedUrls } from "@/lib/portal/storage";
import { pushLeadToJob } from "./jobLink";

/**
 * Website leads into ServiceTitan without anyone typing a job number.
 *
 * Two parts, each its own switch on Settings › Automatic:
 *  - leadBooking: each new enquiry goes in as a Booking, so it lands in
 *    ServiceTitan's Bookings inbox with the customer's details, what they
 *    asked for and their photos, for the office to book from.
 *  - leadToJob: once a job exists for it (made from that booking, or booked by
 *    hand for the same phone or email), the lead is linked to the job and the
 *    form and photos go on it, as linking by hand always did.
 */

type Entry = { at: string; kind: string; ok: boolean; title: string; detail?: string; jobId?: number };
const now = () => new Date().toISOString();

/* --------------------------------------------------------------- the link */

type Match = { lead_id: string; job_id: number; job_number: string | null; status: string | null; how: "booking" | "contact" };
type LeadName = { id: string; name: string | null };
type JobName = { id: number; customer_name: string | null };

/** Uploads per run: a backlog spreads over a few syncs rather than one long one. */
const UPLOADS_PER_RUN = 5;

const words = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 2 && !["mr", "mrs", "ms", "dr", "and"].includes(w));

/**
 * A phone or email can be shared: a rental's site carries the tenant and the
 * agent, so "Knight Wang" matched Kylie Creelman's job on the same phone. A
 * match by contact only counts when a name agrees too, or either side has no
 * name to go by. One made from the lead's own booking is never doubted.
 */
export function namesAgree(lead: string | null, customer: string | null): boolean {
  const a = words(lead), b = words(customer);
  if (!a.length || !b.length) return true;
  return a.some((w) => b.includes(w));
}

export async function linkMatchedLeads(): Promise<Entry[]> {
  const matches = await sbSelect<Match>("lead_job_matches", "select=lead_id,job_id,job_number,status,how&limit=200");
  if (!matches.length) return [];
  const [leads, jobs] = await Promise.all([
    sbSelect<LeadName>("portal_leads", [q.select("id,name"), `id=in.(${matches.map((m) => m.lead_id).join(",")})`].join("&")),
    sbSelect<JobName>("st_jobs", [q.select("id,customer_name"), `id=in.(${[...new Set(matches.map((m) => m.job_id))].join(",")})`].join("&")),
  ]);
  const leadName = new Map(leads.map((l) => [l.id, l.name]));
  const jobName = new Map(jobs.map((j) => [j.id, j.customer_name]));
  const out: Entry[] = [];
  let uploads = 0;
  for (const m of matches) {
    if (m.how === "contact" && !namesAgree(leadName.get(m.lead_id) ?? null, jobName.get(m.job_id) ?? null)) continue;
    await sbUpdate("portal_leads", `id=eq.${m.lead_id}&st_job_id=is.null`, {
      st_job_id: m.job_id, st_job_number: m.job_number, linked_at: now(), linked_by: "Automatic", link_how: m.how,
    });
    const who = leadName.get(m.lead_id) ?? "A website enquiry";
    // A job that's already done gets the link, not a late pile of attachments.
    const upload = m.status !== "Completed" && uploads < UPLOADS_PER_RUN;
    if (!upload) {
      out.push({ at: now(), kind: "leadToJob", ok: true, jobId: m.job_id, title: `${who} linked to job ${m.job_number}${m.status === "Completed" ? " (already completed, nothing added to it)" : ""}` });
      continue;
    }
    uploads++;
    const r = await pushLeadToJob(m.lead_id).catch((e: Error) => ({ ok: false, error: e.message, note: undefined }));
    out.push(r.ok
      ? { at: now(), kind: "leadToJob", ok: true, jobId: m.job_id, title: `${who} linked to job ${m.job_number}: ${r.note ?? "form and photos on the job"}` }
      : { at: now(), kind: "leadToJob", ok: false, jobId: m.job_id, title: `${who} linked to job ${m.job_number}, but the form and photos didn't go on`, detail: (r.error ?? "").slice(0, 200) });
  }
  return out;
}

/** Linked earlier, upload failed or skipped for the per-run cap: tried again, a few a run. */
export async function retryLeadUploads(): Promise<Entry[]> {
  const rows = await sbSelect<{ id: string; name: string | null; st_job_id: number; st_job_number: string | null; st_upload: { ok?: boolean; jobId?: number } | null }>(
    "portal_leads",
    [q.select("id,name,st_job_id,st_job_number,st_upload"), "linked_by=eq.Automatic", "st_job_id=not.is.null", q.gte("linked_at", new Date(Date.now() - 14 * 86_400_000).toISOString()), "limit=50"].join("&"),
  );
  const todo = rows.filter((r) => !(r.st_upload?.ok && r.st_upload.jobId === r.st_job_id));
  if (!todo.length) return [];
  const jobs = await sbSelect<{ id: number; status: string | null }>("st_jobs", [q.select("id,status"), `id=in.(${todo.map((r) => r.st_job_id).join(",")})`].join("&"));
  const done = new Set(jobs.filter((j) => j.status === "Completed").map((j) => j.id));
  const out: Entry[] = [];
  for (const r of todo.filter((x) => !done.has(x.st_job_id)).slice(0, UPLOADS_PER_RUN)) {
    const res = await pushLeadToJob(r.id).catch((e: Error) => ({ ok: false, error: e.message, note: undefined }));
    out.push(res.ok
      ? { at: now(), kind: "leadToJob", ok: true, jobId: r.st_job_id, title: `${r.name ?? "A website enquiry"}: ${res.note ?? "form and photos on the job"}` }
      : { at: now(), kind: "leadToJob", ok: false, jobId: r.st_job_id, title: `${r.name ?? "A website enquiry"}: the form and photos didn't go on job ${r.st_job_number}`, detail: (res.error ?? "").slice(0, 200) });
  }
  return out;
}

/* ------------------------------------------------------------ the booking */

type LeadRow = {
  id: string; created_at: string; name: string | null; phone: string | null; email: string | null;
  address: string | null; suburb: string | null; postcode: string | null;
  service: string | null; headline: string | null; summary: string | null; notes: string | null;
  page_path: string | null; photo_paths: string[] | null; st_booking: { tries?: number; error?: string } | null;
};

const TRIES = 3;

/**
 * The suburb for a booking. The website form asks for one address line and a
 * postcode, never the suburb, and ServiceTitan refuses a booking with no city
 * (Jake's test enquiry, 4 Nov). The postcode decides it: the suburb most of
 * our own customers at that postcode have (3810 is Pakenham for 661 of them),
 * which also puts right a typed "Pakenaham". A postcode we've never served
 * falls back to the address line's last word.
 */
const cityCache = new Map<string, string | null>();
async function cityFor(postcode: string | null, address: string | null): Promise<string> {
  const pc = (postcode ?? "").replace(/\D/g, "");
  if (/^\d{4}$/.test(pc)) {
    if (!cityCache.has(pc)) {
      const rows = await sbSelect<{ city: string | null }>("st_locations", `select=city:raw->address->>city&raw->address->>zip=eq.${pc}&limit=400`).catch(() => []);
      const tally = new Map<string, { name: string; n: number }>();
      for (const r of rows) {
        const name = (r.city ?? "").trim();
        if (!name) continue;
        const k = name.toLowerCase();
        tally.set(k, { name: tally.get(k)?.name ?? name, n: (tally.get(k)?.n ?? 0) + 1 });
      }
      cityCache.set(pc, [...tally.values()].sort((a, b) => b.n - a.n)[0]?.name ?? null);
    }
    const hit = cityCache.get(pc);
    if (hit) return hit;
  }
  const last = (address ?? "").replace(/\b(vic|victoria|\d{4})\b/gi, "").trim().split(/[\s,]+/).filter(Boolean).pop();
  return last ? last.charAt(0).toUpperCase() + last.slice(1).toLowerCase() : "Not given";
}

/** What the office reads in the Bookings inbox: what they want, then everything they wrote. */
function bookingSummary(l: LeadRow): string {
  return [
    l.headline || l.service ? `Website enquiry: ${l.headline ?? l.service}` : "Website enquiry",
    l.summary, l.notes ? `Their notes: ${l.notes}` : null,
    l.photo_paths?.length ? `${l.photo_paths.length} photo${l.photo_paths.length === 1 ? "" : "s"} attached in the portal; they go on the job once it's booked.` : null,
    l.page_path ? `Sent from ${l.page_path}` : null,
  ].filter(Boolean).join("\n\n").slice(0, 4000);
}

/**
 * Each enquiry since the switch went on, into ServiceTitan as a Booking from
 * the booking provider set on Settings › Automatic. Its id is kept, and the
 * job made from it is matched on it (lead_job_matches). Tried three times;
 * a refusal shows under Needs a look with ServiceTitan's reason.
 */
export async function bookNewLeads(provider: number, since: string): Promise<Entry[]> {
  const rows = await sbSelect<LeadRow>("portal_leads", [
    q.select("id,created_at,name,phone,email,address,suburb,postcode,service,headline,summary,notes,page_path,photo_paths,st_booking"),
    "kind=eq.quote", "st_booking_id=is.null", "st_job_id=is.null", q.gte("created_at", since), "order=created_at.asc", "limit=10",
  ].join("&"));
  const out: Entry[] = [];
  for (const l of rows) {
    const tries = l.st_booking?.tries ?? 0;
    if (tries >= TRIES) continue;
    const photos = l.photo_paths?.length ? await signedUrls(l.photo_paths, 7 * 86_400, "lead-photos").catch(() => new Map<string, string>()) : new Map<string, string>();
    const contacts = [
      ...(l.phone ? [{ type: "Phone", value: l.phone, memo: "From the website form" }] : []),
      ...(l.email ? [{ type: "Email", value: l.email, memo: "From the website form" }] : []),
    ];
    const body = {
      source: "Website",
      externalId: l.id,
      name: l.name || "Website enquiry",
      summary: bookingSummary(l),
      customerType: "Residential",
      isFirstTimeClient: true,
      isSendConfirmationEmail: false,
      address: { street: l.address || "Not given", city: l.suburb || await cityFor(l.postcode, l.address), state: "VIC", zip: l.postcode ?? "", country: "Australia" },
      contacts,
      ...(photos.size ? { uploadedImages: [...photos.values()] } : {}),
    };
    try {
      const made = await stSend<{ id?: number }>("POST", stTenantPath("crm", `booking-provider/${provider}/bookings`), body);
      await sbUpdate("portal_leads", `id=eq.${l.id}`, { st_booking_id: made?.id != null ? String(made.id) : "sent", st_booking: { at: now(), ok: true, tries: tries + 1 } });
      out.push({ at: now(), kind: "leadBooking", ok: true, title: `${l.name ?? "A website enquiry"} sent to ServiceTitan's Bookings${made?.id ? ` (booking ${made.id})` : ""}` });
    } catch (e) {
      // ServiceTitan's reason, never the request's credentials: stSend's message carries status and body only.
      const error = (e as Error).message.replace(/^ServiceTitan POST \S+ failed: /, "ServiceTitan said ").slice(0, 240);
      // Not allowed yet (the Bookings scope waiting on approval) isn't this enquiry's fault: it doesn't
      // use up a try, so it goes the moment access is granted rather than being given up on.
      const denied = /\b(401|403)\b/.test(error);
      await sbUpdate("portal_leads", `id=eq.${l.id}`, { st_booking: { at: now(), ok: false, tries: denied ? tries : tries + 1, error } });
      out.push({ at: now(), kind: "leadBooking", ok: false, title: `${l.name ?? "A website enquiry"} couldn't be sent to ServiceTitan's Bookings`, detail: /\b403\b/.test(error) ? "ServiceTitan won't let the portal make bookings: add CRM › Bookings (write) to the portal's API app and have it re-authorised." : error });
    }
  }
  return out;
}
