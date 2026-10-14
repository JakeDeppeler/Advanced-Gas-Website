import "server-only";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { stFetch, stList, stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getOrder, type PoWithLines } from "./db";
import { orderDocument } from "./send";
import { loadStPoSettings, pushOrderToServiceTitan } from "./stPurchaseOrders";
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

export type JobNoteDone = {
  job_id: number; note: boolean; file: boolean;
  /** The job's tags swapped from "not ordered" to "ordered" (or booked), and which went on. */
  tags?: boolean; tagged?: string[];
};

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

const plain = (e: unknown) => String((e as Error).message).replace(/^ServiceTitan (?:(?:POST|PATCH) )?[^ ]+ failed: /, "");

/* ------------------------------------------------------------------ tags */

/**
 * The office's own tag pairs in ServiceTitan, swapped once the thing is done:
 * the "not yet" one comes off and the done one goes on. Found by name, so a
 * renamed tag is skipped rather than guessed at; Supplier emails shows which
 * were found.
 */
export const TAG_SWAPS = [
  { key: "system", from: "System Not Ordered", to: "System Ordered", when: "equipment is on a sent order" },
  { key: "materials", from: "Materials Not Ordered", to: "Materials Ordered", when: "materials are on a sent order" },
  { key: "electrician", from: "GTE Not Booked", to: "GTE Booked", when: "the electrician's work order is sent" },
] as const;

// The office's tags carry emoji and stray spaces ("System Ordered "); only the words count.
export const tagKey = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

export type TagNames = { byName: Map<string, number>; names: Map<number, string> };

/**
 * Every active job tag, read live so a tag made in ServiceTitan this morning
 * is used on the next order rather than after the next sync. The synced copy
 * is the fallback.
 */
export async function tagTypes(): Promise<TagNames> {
  let rows: { id: number; name: string | null; active?: boolean | null }[];
  try {
    rows = await stList<{ id: number; name: string; active: boolean }>("settings", "tag-types", { active: "True" }, 5);
    if (!rows.length) throw new Error("no tags came back");
  } catch {
    rows = await sbSelect<{ id: number; name: string | null; active: boolean | null }>("st_job_tags", "select=id,name,active");
  }
  const live = rows.filter((r) => r.name && r.active !== false);
  return {
    byName: new Map(live.map((r) => [tagKey(r.name as string), r.id])),
    names: new Map(live.map((r) => [r.id, (r.name as string).trim()])),
  };
}

export async function tagTypesByName(): Promise<Map<string, number>> {
  return (await tagTypes()).byName;
}

/**
 * The office's brand tags: "Reclaim System Ordered", "Braemar System Order"…
 * Any tag named "<brand> System Ordered" counts, so a new brand needs only
 * the tag made in ServiceTitan. "<brand> System Not Ordered", when there is
 * one, is its "not yet".
 */
export function brandTags(t: TagNames): { brand: string; id: number; notId: number | null; name: string }[] {
  const out: { brand: string; id: number; notId: number | null; name: string }[] = [];
  for (const [k, id] of t.byName) {
    const m = k.match(/^(.+?) system order(?:ed)?$/);
    if (!m || /\bnot$/.test(m[1])) continue;
    const notId = t.byName.get(`${m[1]} system not ordered`) ?? t.byName.get(`${m[1]} system not order`) ?? null;
    out.push({ brand: m[1], id, notId, name: t.names.get(id) ?? k });
  }
  // Longest first, so "mitsubishi electric" wins over a bare "electric".
  return out.sort((x, y) => y.brand.length - x.brand.length);
}

type Item = { code: string | null; manufacturer: string | null };

/**
 * Whose system a line is. The item's own name decides first — a Brivis heater
 * comes through Rinnai, and one is even filed under Rinnai as manufacturer —
 * then the pricebook's manufacturer, then the supplier it was ordered from.
 */
function brandOf(line: PoWithLines["lines"][number], item: Item | undefined, supplier: string, brands: ReturnType<typeof brandTags>) {
  const has = (text: string | null | undefined) => {
    const k = ` ${tagKey(text ?? "")} `;
    return brands.find((b) => k.includes(` ${b.brand} `));
  };
  return has(`${item?.code ?? ""} ${line.sku_name ?? ""} ${line.supplier_model ?? ""} ${line.description ?? ""}`) ?? has(item?.manufacturer) ?? has(supplier);
}

type TagPlan = { add: number[]; drop: number[] };

/** The tags one job gets from this order. */
function planFor(po: PoWithLines, jobId: number, t: TagNames, items: Map<number, Item>, supplier: string): TagPlan {
  const id = (n: string) => t.byName.get(tagKey(n));
  const add: (number | undefined)[] = [];
  const drop: (number | null | undefined)[] = [];
  const pair = (key: (typeof TAG_SWAPS)[number]["key"]) => {
    const s = TAG_SWAPS.find((x) => x.key === key)!;
    drop.push(id(s.from));
    return id(s.to);
  };
  if (po.kind === "work_order") {
    add.push(pair("electrician"));
  } else {
    const lines = po.lines.filter((l) => l.job_id === jobId);
    const equipment = lines.filter((l) => (l.sku_type ?? "").toLowerCase() === "equipment");
    if (equipment.length) {
      const generic = pair("system");
      const brands = brandTags(t);
      for (const l of equipment) {
        const b = brandOf(l, l.sku_id != null ? items.get(l.sku_id) : undefined, supplier, brands);
        if (b) { add.push(b.id); drop.push(b.notId); } else add.push(generic);
      }
    }
    if (lines.some((l) => (l.sku_type ?? "").toLowerCase() === "material")) add.push(pair("materials"));
  }
  return { add: [...new Set(add.filter((x): x is number => x != null))], drop: [...new Set(drop.filter((x): x is number => x != null))] };
}

/**
 * Swap the tags on one job. ServiceTitan replaces a job's whole tag list on
 * every update, so the current list is read first and only ours change:
 * without it, the office's other tags (Dog, Key Safe…) would be wiped.
 */
async function swapTags(jobId: number, plan: TagPlan, t: TagNames): Promise<string[]> {
  if (!plan.add.length) return [];
  const job = await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${jobId}`));
  if (!Array.isArray(job.tagTypeIds)) throw new Error("ServiceTitan didn't return the job's current tags, so they were left alone");
  const drop = new Set(plan.drop.filter((x) => !plan.add.includes(x)));
  const want = new Set(job.tagTypeIds.filter((x) => !drop.has(x)));
  for (const x of plan.add) want.add(x);
  const same = want.size === job.tagTypeIds.length && job.tagTypeIds.every((x) => want.has(x));
  if (!same) await stSend("PATCH", stTenantPath("jpm", `jobs/${jobId}`), { tagTypeIds: [...want] });
  return plan.add.map((x) => t.names.get(x) ?? `#${x}`);
}

/* ------------------------------------------------------------------ the run */

async function notedSuppliers(): Promise<string[]> {
  return loadJobNoteSuppliers(await sbSelect<Pick<Supplier, "id" | "method">>("order_suppliers", "select=id,method"));
}

/**
 * Bring each of the order's jobs up to date in ServiceTitan: the tags swapped
 * for every supplier, and for the ticked ones a note with the order attached.
 * Each step of each job is recorded as it lands, so a refusal halfway leaves
 * an exact record of what's there and a retry does only the rest.
 */
export async function updateJobsFor(poId: number, opts: { notes: boolean }): Promise<{ ok: boolean; done: JobNoteDone[]; error?: string }> {
  const po = (await getOrder(poId)) as (PoWithLines & { st_notes?: JobNoteDone[] | null }) | null;
  if (!po) return { ok: false, done: [], error: "That order couldn't be found." };
  if (po.status !== "sent") return { ok: false, done: [], error: "Send the order first." };
  const done: JobNoteDone[] = Array.isArray(po.st_notes) ? po.st_notes.map((d) => ({ ...d })) : [];
  const save = async (error: string | null) => {
    await sbUpdate("purchase_orders", `id=eq.${poId}`, { st_notes: done, st_note_error: error ? error.slice(0, 900) : null });
    return error ? { ok: false, done, error } : { ok: true, done };
  };

  const jobs = jobsOn(po);
  if (!jobs.length) {
    // Stock for the factory has no job to tag; only say so when a note was asked for.
    return opts.notes ? save(po.kind === "order" ? "Only factory stock on this order — there's no job to note." : "No jobs on this work order.") : { ok: true, done };
  }
  let file: { name: string; bytes: Uint8Array } | null = null;
  let supplier: Pick<Supplier, "name"> = { name: "the supplier" };
  if (opts.notes && jobs.some((j) => !done.some((d) => d.job_id === j && d.note && d.file))) {
    const [s] = await sbSelect<Pick<Supplier, "name">>("order_suppliers", `select=name&id=eq.${encodeURIComponent(po.supplier_id)}`);
    if (s) supplier = s;
    const doc = await orderDocument(poId);
    if ("error" in doc) return save(doc.error);
    file = doc.pdf
      ? { name: doc.pdf.filename, bytes: new Uint8Array(Buffer.from(doc.pdf.base64, "base64")) }
      : { name: `${po.po_number} ${po.kind === "work_order" ? "work order" : "order"}.pdf`, bytes: await orderPdf({ subject: doc.subject, text: doc.text, how: `${po.kind === "work_order" ? "Work order" : "Order"} ${howSent(po)}${po.sent_at ? `, ${dayTimeLabel(po.sent_at).split(", ")[1]}` : ""}` }) };
  }
  const tags = await tagTypes().catch((): TagNames => ({ byName: new Map(), names: new Map() }));
  // The pricebook's name and manufacturer for each piece of equipment, to tell whose system it is.
  const skuIds = [...new Set(po.lines.filter((l) => l.sku_id != null && (l.sku_type ?? "").toLowerCase() === "equipment").map((l) => l.sku_id as number))];
  const items = new Map<number, Item>(skuIds.length
    ? (await sbSelect<{ id: number; code: string | null; manufacturer: string | null }>("st_pricebook_equipment", `select=id,code:raw->>code,manufacturer:raw->>manufacturer&id=in.(${skuIds.join(",")})`).catch(() => []))
      .map((r) => [r.id, { code: r.code, manufacturer: r.manufacturer }])
    : []);
  const supplierName = (await sbSelect<{ name: string }>("order_suppliers", `select=name&id=eq.${encodeURIComponent(po.supplier_id)}`).catch(() => []))[0]?.name ?? "";

  for (const jobId of jobs) {
    let d = done.find((x) => x.job_id === jobId);
    if (!d) { d = { job_id: jobId, note: false, file: false }; done.push(d); }
    let step: "note" | "file" | "tags" = "note";
    try {
      if (opts.notes && !d.note) {
        await stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text: noteFor(po, supplier, jobId), pinToTop: false });
        d.note = true;
      }
      step = "file";
      if (opts.notes && !d.file && file) {
        await stUpload(stTenantPath("forms", `jobs/${jobId}/attachments`), file.name, file.bytes, "application/pdf");
        d.file = true;
      }
      step = "tags";
      if (!d.tags) {
        d.tagged = await swapTags(jobId, planFor(po, jobId, tags, items, supplierName), tags);
        d.tags = true;
      }
    } catch (e) {
      const m = plain(e);
      const what = step === "note" ? "add notes to" : step === "file" ? "attach files to" : "change the tags on";
      // A 403 is the API app missing a scope, and is the same for every job.
      return save(/\b403\b/.test(m)
        ? `ServiceTitan won't let the portal ${what} jobs — tick ${step === "file" ? "Forms › Attachments" : "Job Planning › Jobs"} (write) on the portal's API app and have it re-authorised.`
        : `Couldn't ${what} job ${jobId}: ${m}`);
    }
  }
  return save(null);
}

/** Notes for the ticked suppliers, tags for everyone. */
export async function updateJobs(poId: number): Promise<{ ok: boolean; done: JobNoteDone[]; error?: string }> {
  const po = await getOrder(poId);
  if (!po) return { ok: false, done: [], error: "That order couldn't be found." };
  return updateJobsFor(poId, { notes: (await notedSuppliers()).includes(po.supplier_id) });
}

/** After a send: tags, and the note when this supplier is ticked. Never fails the send. */
export async function jobsAfterSend(poId: number): Promise<void> {
  try {
    await updateJobs(poId);
  } catch {
    // The order went; the jobs can be brought up to date from Sent.
  }
}

type PastPo = { id: number; supplier_id: string; kind: string; details: { jobs?: { job_id: number }[] } | null; st_notes: JobNoteDone[] | null; st_pos: unknown[] | null };

/**
 * Sent orders whose jobs aren't up to date in ServiceTitan: a tag not yet
 * swapped, a ticked supplier's note or file missing, or — once purchase orders
 * are set up — no purchase order yet. The ones sent before each of these
 * existed, and any ServiceTitan refused. Every week at once.
 */
export async function ordersToUpdate(): Promise<number[]> {
  const [ticked, pos, poSet] = await Promise.all([
    notedSuppliers(),
    sbSelect<PastPo>("purchase_orders", "select=id,supplier_id,kind,details,st_notes,st_pos&status=eq.sent&order=sent_at.asc"),
    loadStPoSettings(),
  ]);
  if (!pos.length) return [];
  const lines = await sbSelect<{ po_id: number; job_id: number | null; sku_id: number | null }>("purchase_order_lines", `select=po_id,job_id,sku_id&po_id=in.(${pos.map((p) => p.id).join(",")})`);
  const poReady = poSet.auto && !!poSet.typeId && !!poSet.warehouseId;
  return pos.filter((p) => {
    const mine = lines.filter((l) => l.po_id === p.id);
    const jobs = p.kind === "work_order" ? (p.details?.jobs ?? []).map((j) => j.job_id) : [...new Set(mine.map((l) => l.job_id).filter((x): x is number => x != null))];
    const noted = ticked.includes(p.supplier_id);
    const done = p.st_notes ?? [];
    const jobsBehind = jobs.some((j) => !done.some((d) => d.job_id === j && d.tags && (!noted || (d.note && d.file))));
    const groups = new Set(mine.filter((l) => l.sku_id != null).map((l) => l.job_id)).size;
    const poBehind = poReady && p.kind === "order" && groups > (p.st_pos?.length ?? 0);
    return jobsBehind || poBehind;
  }).map((p) => p.id);
}

/** Bring every one of them up to date, oldest first. A missing scope is the same for all, so that stops the run. */
export async function updatePastOrders(): Promise<{ done: number; failed: string[] }> {
  const out = { done: 0, failed: [] as string[] };
  const poSet = await loadStPoSettings();
  const poReady = poSet.auto && !!poSet.typeId && !!poSet.warehouseId;
  for (const id of await ordersToUpdate()) {
    const r = await updateJobs(id);
    let err = r.ok ? null : r.error ?? "refused";
    if (!err && poReady) {
      const po = await getOrder(id);
      if (po?.kind === "order") {
        const p = await pushOrderToServiceTitan(id);
        if (!p.ok) err = p.error ?? "ServiceTitan refused the purchase order";
      }
    }
    if (!err) { out.done++; continue; }
    out.failed.push(err);
    if (/won't let the portal/.test(err)) break;
  }
  return out;
}
