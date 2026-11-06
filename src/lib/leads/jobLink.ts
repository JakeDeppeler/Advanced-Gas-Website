import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { readObject, signedUrls } from "@/lib/portal/storage";
import { classifyLead } from "@/lib/portal/leadSource";

/**
 * Website leads › each quote form, tied to the ServiceTitan job it became.
 *
 * Someone types the job number on the lead; from then on the page follows
 * the job: quoted once ServiceTitan has an estimate on it, late when the
 * visit's five days gone with no quote, sold once one sells. Linking puts the
 * form (as a PDF) and its photos into the job's attachments, once, and keeps
 * a record of what went so a failure can be tried again.
 */

const BUCKET = "lead-photos";
/** How long after the visit a quote counts as late: the Pipeline's own first call is two days on. */
const LATE_DAYS = 5;

export type LeadUpload = { at: string; jobId: number; ok: boolean; files: string[]; error?: string };

export type FormLead = {
  id: string; createdAt: string; name: string | null; phone: string | null; email: string | null;
  suburb: string | null; postcode: string | null; address: string | null;
  service: string | null; headline: string | null; summary: string | null; notes: string | null;
  pagePath: string | null; cameFrom: string;
  photoCount: number; photoPaths: string[];
  stJobId: number | null; stJobNumber: string | null; linkedAt: string | null; linkedBy: string | null;
  upload: LeadUpload | null;
};

export type LeadStage = {
  linked: boolean; quoted: boolean; sold: boolean;
  /** Days since the job's first visit with no quote yet, once past LATE_DAYS. */
  lateBy: number | null;
};

type Row = {
  id: string; created_at: string; name: string | null; phone: string | null; email: string | null;
  suburb: string | null; postcode: string | null; address: string | null;
  service: string | null; headline: string | null; summary: string | null; notes: string | null;
  page_path: string | null; utm: Record<string, string> | null;
  photo_count: number | null; photo_paths: string[] | null;
  st_job_id: number | null; st_job_number: string | null; linked_at: string | null; linked_by: string | null;
  st_upload: LeadUpload | null;
};
const COLS = "id,created_at,name,phone,email,suburb,postcode,address,service,headline,summary,notes,page_path,utm,photo_count,photo_paths,st_job_id,st_job_number,linked_at,linked_by,st_upload";

const toLead = (r: Row): FormLead => ({
  id: r.id, createdAt: r.created_at, name: r.name, phone: r.phone, email: r.email,
  suburb: r.suburb, postcode: r.postcode, address: r.address,
  service: r.service, headline: r.headline, summary: r.summary, notes: r.notes,
  pagePath: r.page_path, cameFrom: classifyLead(r.utm ?? {}).label,
  photoCount: r.photo_count ?? 0, photoPaths: r.photo_paths ?? [],
  stJobId: r.st_job_id, stJobNumber: r.st_job_number, linkedAt: r.linked_at, linkedBy: r.linked_by,
  upload: r.st_upload && typeof r.st_upload === "object" ? r.st_upload : null,
});

/** Every quote form since `since`, newest first. */
export async function formLeads(since: string): Promise<FormLead[]> {
  const rows = await sbSelect<Row>("portal_leads", [q.select(COLS), "kind=eq.quote", q.gte("created_at", since), "order=created_at.desc", "limit=500"].join("&"));
  return rows.map(toLead);
}

async function oneLead(id: string): Promise<FormLead | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sbSelect<Row>("portal_leads", [q.select(COLS), `id=eq.${id}`, "limit=1"].join("&"));
  return r ? toLead(r) : null;
}

/** Where each linked lead's job is up to, from the synced estimates and appointments. */
export async function stagesFor(leads: FormLead[]): Promise<Map<string, LeadStage>> {
  const out = new Map<string, LeadStage>();
  const ids = [...new Set(leads.map((l) => l.stJobId).filter((x): x is number => x != null))];
  const [ests, appts] = ids.length ? await Promise.all([
    sbSelect<{ job_id: number; status: string | null; sold_on: string | null }>("st_estimates", [q.select("job_id,status,sold_on"), `job_id=in.(${ids.join(",")})`, "limit=2000"].join("&")).catch(() => []),
    sbSelect<{ job_id: number; start_at: string | null }>("st_appointments", [q.select("job_id,start_at"), `job_id=in.(${ids.join(",")})`, "status=neq.Canceled", "limit=2000"].join("&")).catch(() => []),
  ]) : [[], []];
  for (const l of leads) {
    if (l.stJobId == null) { out.set(l.id, { linked: false, quoted: false, sold: false, lateBy: null }); continue; }
    const mine = ests.filter((e) => e.job_id === l.stJobId);
    const quoted = mine.length > 0;
    const sold = mine.some((e) => e.sold_on || /^sold$/i.test(e.status ?? ""));
    const first = appts.filter((a) => a.job_id === l.stJobId && a.start_at).map((a) => Date.parse(a.start_at as string)).sort((a, b) => a - b)[0];
    const since = first ? Math.floor((Date.now() - first) / 86_400_000) : null;
    out.set(l.id, { linked: true, quoted, sold, lateBy: !quoted && since != null && since >= LATE_DAYS ? since : null });
  }
  return out;
}

/** Short-lived links to each lead's photos, for the page. */
export async function photoLinks(leads: FormLead[]): Promise<Map<string, string>> {
  return signedUrls(leads.flatMap((l) => l.photoPaths), 3600, BUCKET);
}

/* ------------------------------------------------------------------ linking */

export type LinkResult = { ok: boolean; error?: string; note?: string };

/** Tie a lead to a job by its number, then put the form and photos on it. */
export async function linkLead(id: string, jobNumber: string, who: string): Promise<LinkResult> {
  const lead = await oneLead(id);
  if (!lead) return { ok: false, error: "That enquiry couldn't be found." };
  const n = jobNumber.replace(/[^\d]/g, "");
  if (!n) return { ok: false, error: "Type the ServiceTitan job number." };
  const [job] = await sbSelect<{ id: number; job_number: string | null }>("st_jobs", [q.select("id,job_number"), q.eq("job_number", n), "limit=1"].join("&")).catch(() => []);
  if (!job) return { ok: false, error: `There's no job ${n} in the synced ServiceTitan jobs. A new one takes a few minutes to come across.` };
  await sbUpdate("portal_leads", `id=eq.${id}`, { st_job_id: job.id, st_job_number: job.job_number ?? n, linked_at: new Date().toISOString(), linked_by: who });
  const r = await pushLeadToJob(id);
  const why = r.error ? `${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` : "the form and photos didn't go on";
  return r.ok ? { ok: true, note: `Linked to job ${n}. ${r.note ?? ""}`.trim() } : { ok: true, note: `Linked to job ${n}, but ${why}` };
}

/** Untie it. What already went onto the job stays there: ServiceTitan keeps attachments. */
export async function unlinkLead(id: string): Promise<LinkResult> {
  if (!(await oneLead(id))) return { ok: false, error: "That enquiry couldn't be found." };
  await sbUpdate("portal_leads", `id=eq.${id}`, { st_job_id: null, st_job_number: null, linked_at: null, linked_by: null });
  return { ok: true, note: "Unlinked. Anything already put on the job in ServiceTitan stays there." };
}

/**
 * The form as a PDF and each kept photo, into the linked job's attachments.
 * Once per job: done already, it isn't sent twice. A failure is recorded so
 * the page can say what went wrong and offer to try again.
 */
export async function pushLeadToJob(id: string): Promise<LinkResult> {
  const lead = await oneLead(id);
  if (!lead || lead.stJobId == null) return { ok: false, error: "It isn't linked to a job." };
  if (lead.upload?.ok && lead.upload.jobId === lead.stJobId) return { ok: true, note: "The form and photos are already on the job." };
  const path = stTenantPath("forms", `jobs/${lead.stJobId}/attachments`);
  const files: string[] = [];
  let error: string | undefined;
  try {
    const pdf = await formPdf(lead);
    const name = `Website enquiry - ${(lead.name ?? "customer").replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
    await stUpload(path, name, pdf, "application/pdf");
    files.push(name);
    for (const [i, p] of lead.photoPaths.entries()) {
      const obj = await readObject(p, BUCKET);
      if (!obj.ok) { error = `photo ${i + 1} couldn't be read back from storage`; continue; }
      const fname = `Website enquiry photo ${i + 1}${/\.(jpe?g|png|webp|heic|gif)$/i.exec(p)?.[0] ?? ".jpg"}`;
      await stUpload(path, fname, new Uint8Array(obj.body), obj.type);
      files.push(fname);
    }
  } catch (e) {
    // Its message carries the status and ServiceTitan's reason, never credentials.
    error = (e as Error).message.replace(/^ServiceTitan POST \S+ failed: /, "ServiceTitan said ").slice(0, 240);
  }
  const ok = !error;
  const upload: LeadUpload = { at: new Date().toISOString(), jobId: lead.stJobId, ok, files, ...(error ? { error } : {}) };
  await sbUpdate("portal_leads", `id=eq.${id}`, { st_upload: upload });
  const what = `the form${lead.photoPaths.length ? ` and ${lead.photoPaths.length} ${lead.photoPaths.length === 1 ? "photo" : "photos"}` : ""}`;
  return ok ? { ok: true, note: `Put ${what} on job ${lead.stJobNumber}.` } : { ok: false, error: `${files.length ? `${files.length} of ${lead.photoPaths.length + 1} went on, then ` : ""}${error}` };
}

/* ---------------------------------------------------------------- the PDF */

/** WinAnsi only: the standard fonts can't draw anything else, and one stray emoji would sink the whole file. */
const clean = (s: string) => s.replace(/[^\x20-\x7E -ÿ–—‘’“”•…]/g, "");

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Exported for the check that renders it; nothing else needs it. */
export async function formPdf(l: FormLead): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  const L = 50, W = 495;
  let y = 790;
  const ink = rgb(0.1, 0.1, 0.12), grey = rgb(0.42, 0.42, 0.45);
  page.drawText("Website enquiry", { x: L, y, size: 20, font: bold, color: ink });
  y -= 22;
  page.drawText(clean(`Sent ${new Date(l.createdAt).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" })} from advancedgas.com.au`), { x: L, y, size: 10, font: reg, color: grey });
  y -= 30;
  const rows: [string, string | null][] = [
    ["Name", l.name], ["Phone", l.phone], ["Email", l.email], ["Address", l.address],
    ["Suburb", [l.suburb, l.postcode].filter(Boolean).join(" ") || null],
    ["What for", l.headline ?? l.service], ["The detail", l.summary], ["Their message", l.notes],
    ["Photos", l.photoPaths.length ? `${l.photoPaths.length}, attached to this job` : l.photoCount ? `${l.photoCount}, sent by email only` : "none"],
    ["Came from", [l.cameFrom, l.pagePath].filter(Boolean).join(", ")],
  ];
  for (const [k, v] of rows) {
    if (!v) continue;
    const lines = wrap(v, reg, 11, W - 120);
    if (y - lines.length * 15 < 50) { page = doc.addPage([595, 842]); y = 790; }
    page.drawText(k, { x: L, y, size: 10, font: bold, color: grey });
    for (const line of lines) { page.drawText(line, { x: L + 120, y, size: 11, font: reg, color: ink }); y -= 15; }
    y -= 8;
  }
  return doc.save();
}
