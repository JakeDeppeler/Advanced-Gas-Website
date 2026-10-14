import "server-only";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getOrder, type PoWithLines } from "./db";
import { orderDocument } from "./send";
import { dayLabel, dayTimeLabel, type Supplier } from "./plan";

/**
 * A sent order — Reclaim's tank, the electrician's work order — written onto
 * each job it's for in ServiceTitan: a note saying what was ordered and when,
 * and the order itself attached as a PDF. Whoever opens the job, in the office
 * or on the tablet, sees what's coming without asking.
 *
 * Done after the email has gone and never in the way of it: a refusal is kept
 * on the order (st_note_error, migration 0075) with a button to try again, and
 * a job already noted is skipped (st_notes), so a retry never doubles up.
 */

export type JobNoteDone = { job_id: number; note: boolean; file: boolean };

const KEY = "st_job_notes";

/**
 * Which suppliers' orders get noted. Unset means Reclaim and the electrician,
 * the two that were asked for; the rest arrive at the factory rather than the
 * job, so a note on the job would say little the purchase order doesn't.
 */
export async function loadJobNoteSuppliers(all: Pick<Supplier, "id" | "method">[]): Promise<string[]> {
  const s = await getSettings<{ suppliers?: unknown }>(KEY).catch(() => null);
  if (Array.isArray(s?.suppliers)) return s.suppliers.filter((x): x is string => typeof x === "string");
  return all.filter((x) => x.id === "reclaim" || x.method === "work_order").map((x) => x.id);
}

export async function saveJobNoteSuppliers(ids: string[]): Promise<boolean> {
  return (await saveSettings(KEY, { suppliers: ids })).ok;
}

/* ------------------------------------------------------------------ the PDF */

/**
 * The standard fonts only encode Windows-1252, and an order can carry a
 * character from anywhere (a pasted model, a customer's name). Anything the
 * font can't draw becomes "?" rather than failing the whole note.
 */
function drawable(font: PDFFont, s: string): string {
  let out = "";
  for (const ch of s.replace(/\t/g, "    ")) {
    try { font.encodeText(ch); out += ch; } catch { out += "?"; }
  }
  return out;
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const next = line + w;
      if (font.widthOfTextAtSize(next, size) <= width || !line.trim()) { line = next; continue; }
      out.push(line.trimEnd());
      line = w.trimStart();
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** The email as sent, on A4: who it went to and when, then the subject and the body word for word. */
export async function orderPdf(o: { subject: string; text: string; how: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(o.subject);
  doc.setAuthor("Advanced Gas & Aircon");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [W, H, M] = [595.28, 841.89, 50];
  let page = doc.addPage([W, H]);
  let y = H - M;
  const put = (s: string, f: PDFFont, size: number, gap: number) => {
    // Line by line: a newline isn't drawable either, and would come out as "?".
    for (const l of wrap(f, size, s.replace(/\r/g, "").split("\n").map((x) => drawable(f, x)).join("\n"), W - 2 * M)) {
      if (y < M + size) { page = doc.addPage([W, H]); y = H - M; }
      page.drawText(l, { x: M, y: y - size, size, font: f });
      y -= gap;
    }
  };
  put("Advanced Gas & Aircon", bold, 9, 13);
  put(o.how, font, 9, 22);
  put(o.subject, bold, 14, 19);
  y -= 8;
  put(o.text, font, 10, 14);
  return doc.save();
}

/* ------------------------------------------------------------------ the note */

/**
 * "sent Tue 13 Oct to orders@…" for an email; an order placed another way has
 * sent_to as how ("Ordered manually — rang Rinnai"), which reads as that.
 */
function howSent(po: Pick<PoWithLines, "sent_at" | "sent_to">): string {
  const day = po.sent_at ? dayLabel(isoDateMelbourne(new Date(po.sent_at))) : "today";
  if (po.sent_to?.includes("@")) return `sent ${day} to ${po.sent_to}`;
  return `placed ${day}${po.sent_to ? ` (${po.sent_to.replace(/^Ordered manually\b/, "ordered by the office").replace(/^\w/, (c) => c.toLowerCase())})` : ""}`;
}

const qtyOf = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function noteFor(po: PoWithLines, supplier: Pick<Supplier, "name">, jobId: number): string {
  if (po.kind === "work_order" && po.details) {
    const d = po.details;
    const when = d.start_at ? dayTimeLabel(d.start_at) : dayLabel(d.date);
    return `Electrician booked: ${supplier.name}, ${when}. Work order ${po.po_number} ${howSent(po)}. The work order is attached.`;
  }
  const lines = po.lines.filter((l) => l.job_id === jobId);
  const what = lines.map((l) => `${qtyOf(l.qty)} × ${l.supplier_model || l.sku_name || l.description || "item"}`).join("; ");
  const how = po.pickup ? "We collect it." : po.delivery_to_site ? "Delivered to site." : "Delivered to the factory.";
  return `Ordered from ${supplier.name}: ${what}. Order ${po.po_number} ${howSent(po)}. ${how} The order is attached.`;
}

function jobsOn(po: PoWithLines): number[] {
  const ids = po.kind === "work_order" ? (po.details?.jobs ?? []).map((j) => j.job_id) : po.lines.map((l) => l.job_id);
  return [...new Set(ids.filter((x): x is number => typeof x === "number" && x > 0))];
}

const plain = (e: unknown) => String((e as Error).message).replace(/^ServiceTitan (?:POST|PATCH) [^ ]+ failed: /, "");

/**
 * Note and attach on every job the order is for. Each half of each job is
 * recorded as it lands, so a refusal halfway leaves an exact record of what's
 * there and a retry does only the rest.
 */
export async function noteOrderOnJobs(poId: number): Promise<{ ok: boolean; done: JobNoteDone[]; error?: string }> {
  const po = (await getOrder(poId)) as (PoWithLines & { st_notes?: JobNoteDone[] | null }) | null;
  if (!po) return { ok: false, done: [], error: "That order couldn't be found." };
  if (po.status !== "sent") return { ok: false, done: [], error: "Send the order first." };
  const done: JobNoteDone[] = Array.isArray(po.st_notes) ? po.st_notes.map((d) => ({ ...d })) : [];
  const save = async (error: string | null) => {
    await sbUpdate("purchase_orders", `id=eq.${poId}`, { st_notes: done, st_note_error: error ? error.slice(0, 900) : null });
    return error ? { ok: false, done, error } : { ok: true, done };
  };

  const jobs = jobsOn(po);
  if (!jobs.length) return save(po.kind === "order" ? "Only factory stock on this order — there's no job to note." : "No jobs on this work order.");
  const [supplier] = await sbSelect<Pick<Supplier, "name">>("order_suppliers", `select=name&id=eq.${encodeURIComponent(po.supplier_id)}`);
  const doc = await orderDocument(poId);
  if ("error" in doc) return save(doc.error);
  const file = doc.pdf
    ? { name: doc.pdf.filename, bytes: new Uint8Array(Buffer.from(doc.pdf.base64, "base64")) }
    : { name: `${po.po_number} ${po.kind === "work_order" ? "work order" : "order"}.pdf`, bytes: await orderPdf({ subject: doc.subject, text: doc.text, how: `${po.kind === "work_order" ? "Work order" : "Order"} ${howSent(po)}${po.sent_at ? `, ${dayTimeLabel(po.sent_at).split(", ")[1]}` : ""}` }) };

  for (const jobId of jobs) {
    let d = done.find((x) => x.job_id === jobId);
    if (!d) { d = { job_id: jobId, note: false, file: false }; done.push(d); }
    try {
      if (!d.note) {
        await stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text: noteFor(po, supplier ?? { name: "the supplier" }, jobId), pinToTop: false });
        d.note = true;
      }
      if (!d.file) {
        await stUpload(stTenantPath("forms", `jobs/${jobId}/attachments`), file.name, file.bytes, "application/pdf");
        d.file = true;
      }
    } catch (e) {
      const m = plain(e);
      const what = d.note ? "attach files to" : "add notes to";
      // A 403 is the API app missing a scope, and is the same for every job.
      return save(/\b403\b/.test(m)
        ? `ServiceTitan won't let the portal ${what} jobs — tick ${d.note ? "Forms › Attachments" : "Job Planning › Jobs"} (write) on the portal's API app and have it re-authorised.`
        : `Couldn't ${what} job ${jobId}: ${m}`);
    }
  }
  return save(null);
}

/** After a send: note the jobs when this supplier is on the list. Never fails the send. */
export async function notesIfOn(poId: number): Promise<void> {
  try {
    const po = await getOrder(poId);
    if (!po) return;
    const suppliers = await sbSelect<Pick<Supplier, "id" | "method">>("order_suppliers", "select=id,method");
    if ((await loadJobNoteSuppliers(suppliers)).includes(po.supplier_id)) await noteOrderOnJobs(poId);
  } catch {
    // The order went; the note can be added from Sent.
  }
}

/**
 * Sent orders from the ticked suppliers whose jobs don't all have their note
 * and file yet: the ones sent before this existed, and any ServiceTitan
 * refused. Every week at once, so catching up doesn't mean paging through Sent.
 */
export async function ordersToNote(): Promise<number[]> {
  const suppliers = await sbSelect<Pick<Supplier, "id" | "method">>("order_suppliers", "select=id,method");
  const ids = await loadJobNoteSuppliers(suppliers);
  if (!ids.length) return [];
  const pos = await sbSelect<{ id: number; kind: string; details: { jobs?: { job_id: number }[] } | null; st_notes: JobNoteDone[] | null }>(
    "purchase_orders", `select=id,kind,details,st_notes&status=eq.sent&supplier_id=in.(${ids.map(encodeURIComponent).join(",")})&order=sent_at.asc`,
  );
  if (!pos.length) return [];
  const lines = await sbSelect<{ po_id: number; job_id: number | null }>("purchase_order_lines", `select=po_id,job_id&job_id=not.is.null&po_id=in.(${pos.map((p) => p.id).join(",")})`);
  return pos.filter((p) => {
    const jobs = p.kind === "work_order" ? (p.details?.jobs ?? []).map((j) => j.job_id) : lines.filter((l) => l.po_id === p.id).map((l) => l.job_id as number);
    const done = p.st_notes ?? [];
    return jobs.some((j) => !done.some((d) => d.job_id === j && d.note && d.file));
  }).map((p) => p.id);
}

/** Note every one of them, oldest first. A missing scope is the same for all, so that stops the run. */
export async function notePastOrders(): Promise<{ done: number; jobs: number; failed: string[] }> {
  const out = { done: 0, jobs: 0, failed: [] as string[] };
  for (const id of await ordersToNote()) {
    const r = await noteOrderOnJobs(id);
    if (r.ok) { out.done++; out.jobs += r.done.length; continue; }
    out.failed.push(r.error ?? "refused");
    if (/won't let the portal/.test(r.error ?? "")) break;
  }
  return out;
}
