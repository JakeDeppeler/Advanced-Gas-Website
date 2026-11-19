import "server-only";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { stFetch, stList, stTenantPath } from "@/lib/dashboard/servicetitan";
import { conditionReports } from "@/lib/conditionReport/fetch";
import type { VisitReport } from "@/lib/installpack/summaryText";
import type { WorkOrderDetails } from "@/lib/ordering/plan";
import type { Doc, DocLine } from "./lines";
import type { Electrician, JobNote } from "./words";

/**
 * Everything the write-up is written from, for one job, read from
 * ServiceTitan as it is now (the quote and the invoice are what get written
 * back, so a copy an hour old won't do) with the replica for finding things.
 *
 * The quote can be on the job itself (20912's sold estimate is) or on the
 * visit before it at the same address, so both are looked at; the sold one
 * comes first. The forms and notes are the job's and those earlier visits'.
 */

export type JobFacts = {
  jobId: number;
  number: string | null;
  type: string | null;
  businessUnit: string | null;
  status: string | null;
  summary: string | null;
  customer: string | null;
  /** Every quote found, sold first then newest. */
  quotes: Doc[];
  invoice: Doc | null;
  reports: VisitReport[];
  notes: JobNote[];
  electricians: Electrician[];
  /** What couldn't be read, said on the page rather than failing it. */
  missing: string[];
};

type StEstimate = {
  id: number; jobId?: number | null; name?: string | null; summary?: string | null; soldOn?: string | null; active?: boolean | null;
  status?: { value?: number | null; name?: string | null } | string | null;
  items?: Array<{
    id: number; sku?: { id?: number | null; name?: string | null; displayName?: string | null; type?: string | null } | null;
    description?: string | null; qty?: number | null; unitRate?: number | null; total?: number | null; unitCost?: number | null;
    chargeable?: boolean | null; itemGroupName?: string | null; itemGroupRootId?: number | null;
  }> | null;
};

type StInvoice = {
  id: number; referenceNumber?: string | null; summary?: string | null; exportId?: string | number | null; syncStatus?: string | null;
  items?: Array<{
    id: number; skuId?: number | null; skuName?: string | null; displayName?: string | null; type?: string | null; description?: string | null;
    quantity?: number | string | null; price?: number | string | null; total?: number | string | null; cost?: number | string | null; isChargeable?: boolean | null;
  }> | null;
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const statusName = (s: StEstimate["status"]) => (typeof s === "string" ? s : s?.name ?? null);

export function estimateDoc(e: StEstimate): Doc {
  const lines: DocLine[] = (e.items ?? []).map((i) => ({
    id: i.id,
    skuId: i.sku?.id ?? null,
    code: (i.sku?.name ?? "").trim(),
    name: (i.sku?.displayName || i.sku?.name || "").trim(),
    type: i.sku?.type ?? "",
    qty: num(i.qty),
    unitPrice: num(i.unitRate),
    total: num(i.total),
    unitCost: num(i.unitCost),
    chargeable: i.chargeable ?? null,
    description: i.description ?? "",
    itemGroupName: i.itemGroupName ?? null,
    itemGroupRootId: i.itemGroupRootId ?? null,
  }));
  return { kind: "estimate", id: e.id, name: e.name ?? null, status: statusName(e.status), summary: e.summary ?? null, lines, soldOn: e.soldOn ?? null };
}

export function invoiceDoc(v: StInvoice): Doc {
  const lines: DocLine[] = (v.items ?? []).map((i) => ({
    id: i.id,
    skuId: i.skuId ?? null,
    code: (i.skuName ?? "").trim(),
    name: (i.displayName || i.skuName || "").trim(),
    type: i.type ?? "",
    qty: num(i.quantity),
    unitPrice: num(i.price),
    total: num(i.total),
    unitCost: num(i.cost),
    chargeable: i.isChargeable ?? null,
    description: i.description ?? "",
  }));
  // Anything past Pending has gone to the accounts (one "Posted" in October).
  const exported = (v.exportId != null && String(v.exportId) !== "") || (v.syncStatus != null && !/^pending$/i.test(v.syncStatus));
  return { kind: "invoice", id: v.id, name: v.referenceNumber ?? null, status: v.syncStatus ?? null, summary: v.summary ?? null, lines, exported };
}

/** One estimate as ServiceTitan has it now. */
export async function readEstimate(id: number): Promise<Doc> {
  return estimateDoc(await stFetch<StEstimate>(stTenantPath("sales", `estimates/${id}`)));
}

/** One invoice as ServiceTitan has it now. */
export async function readInvoice(id: number): Promise<Doc> {
  const r = await stFetch<{ data?: StInvoice[] }>(stTenantPath("accounting", "invoices"), { ids: String(id), pageSize: "1" });
  const v = (r.data ?? []).find((x) => x.id === id);
  if (!v) throw new Error(`ServiceTitan didn't return invoice ${id}`);
  return invoiceDoc(v);
}

type JobRow = {
  id: number; job_number: string | null; job_type: string | null; business_unit: string | null; status: string | null;
  customer_name: string | null; location_id: number | null; created_on: string | null;
  raw: { summary?: string | null; estimateIds?: number[] | null; invoiceId?: number | null } | null;
};

const JOB_COLS = "id,job_number,job_type,business_unit,status,customer_name,location_id,created_on,raw";

/** The job by its number (what the office types) or ServiceTitan id. */
export async function findJob(numberOrId: string): Promise<JobRow | null> {
  const v = numberOrId.trim().replace(/^#/, "");
  if (!/^\d+$/.test(v)) return null;
  const col = v.length >= 9 ? "id" : "job_number";
  return sbSelectOne<JobRow>("st_jobs", [q.select(JOB_COLS), q.eq(col, v)].join("&"));
}

/** The visits to the same address in the half-year before, where a quote or a form may sit. */
async function earlierJobs(j: JobRow): Promise<Array<{ id: number; job_number: string | null; job_type: string | null }>> {
  if (!j.location_id) return [];
  const since = new Date(Date.parse(j.created_on ?? new Date().toISOString()) - 180 * 864e5).toISOString();
  return sbSelect<{ id: number; job_number: string | null; job_type: string | null }>("st_jobs", [
    q.select("id,job_number,job_type"), q.eq("location_id", String(j.location_id)), `created_on=gte.${encodeURIComponent(since)}`,
    `id=neq.${j.id}`, "order=created_on.desc", "limit=4",
  ].join("&")).catch(() => []);
}

const noteText = (s: string | null | undefined) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** The estimates linked to the job, those written on it, and sold ones on the earlier visits. */
async function estimateIds(j: JobRow, jobIds: number[]): Promise<number[]> {
  const linked = (j.raw?.estimateIds ?? []).filter((x) => Number.isFinite(Number(x))).map(Number);
  const onJobs = await sbSelect<{ id: number; job_id: number; status: string | null }>("st_estimates", [
    q.select("id,job_id,status"), `job_id=in.(${jobIds.join(",")})`, "raw->>active=neq.false", "order=created_on.desc", "limit=30",
  ].join("&")).catch(() => []);
  return [...new Set([...linked, ...onJobs.filter((e) => e.job_id === j.id || /sold/i.test(e.status ?? "")).map((e) => e.id)])].slice(0, 12);
}

/**
 * Which quotes and invoice are this job's, without reading them: the button
 * checks the document it was sent is one of these, so a changed id in the
 * request can't reach another customer's.
 */
export async function jobDocIds(numberOrId: string): Promise<{ jobId: number; number: string | null; quoteIds: number[]; invoiceId: number | null } | null> {
  const j = await findJob(numberOrId);
  if (!j) return null;
  const earlier = await earlierJobs(j);
  const quoteIds = await estimateIds(j, [j.id, ...earlier.map((e) => e.id)]);
  return { jobId: j.id, number: j.job_number, quoteIds, invoiceId: j.raw?.invoiceId ? Number(j.raw.invoiceId) : null };
}

export async function loadJob(numberOrId: string): Promise<JobFacts | null> {
  const j = await findJob(numberOrId);
  if (!j) return null;
  const missing: string[] = [];
  const earlier = await earlierJobs(j);
  const jobIds = [j.id, ...earlier.map((e) => e.id)];
  const numberOf = new Map<number, string | null>([[j.id, j.job_number], ...earlier.map((e) => [e.id, e.job_number] as [number, string | null])]);
  const estIds = await estimateIds(j, jobIds);

  const [live, quotes, invoice, reports, notes, electricians] = await Promise.all([
    stFetch<{ summary?: string | null; jobStatus?: string | null; invoiceId?: number | null }>(stTenantPath("jpm", `jobs/${j.id}`)).catch(() => null),
    Promise.all(estIds.map((id) => readEstimate(id).catch(() => null))).then((xs) => xs.filter((x): x is Doc => x != null)),
    (async () => {
      const id = j.raw?.invoiceId;
      return id ? readInvoice(Number(id)).catch(() => { missing.push("the invoice"); return null; }) : null;
    })(),
    conditionReports(jobIds).then((subs) => subs.map((s): VisitReport => {
      const owner = (s.owners ?? []).find((o) => o.type === "Job" && jobIds.includes(Number(o.id)));
      const id = Number(owner?.id ?? j.id);
      const e = earlier.find((x) => x.id === id);
      return { jobId: id, jobNumber: numberOf.get(id) ?? null, jobType: e?.job_type ?? (id === j.id ? j.job_type : null), submission: s };
    })).catch(() => { missing.push("the forms"); return [] as VisitReport[]; }),
    Promise.all(jobIds.slice(0, 4).map((id) => stList<{ text?: string | null; createdOn?: string | null }>("jpm", `jobs/${id}/notes`, {}, 2)
      .then((ns) => ns.map((n): JobNote => ({ at: n.createdOn ?? null, text: noteText(n.text), jobNumber: numberOf.get(id) ?? null })))
      .catch(() => { missing.push(`the notes on job ${numberOf.get(id) ?? id}`); return [] as JobNote[]; })))
      .then((xs) => xs.flat().filter((n) => n.text).sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))),
    electriciansFor(j.id).catch(() => [] as Electrician[]),
  ]);
  if (estIds.length && quotes.length < estIds.length) missing.push(quotes.length ? "some of the quotes" : "the quote");

  // Sold first, then the newest; a dismissed one last.
  quotes.sort((a, b) => Number(/sold/i.test(b.status ?? "")) - Number(/sold/i.test(a.status ?? "")) || Number(/dismiss/i.test(a.status ?? "")) - Number(/dismiss/i.test(b.status ?? "")) || b.id - a.id);

  return {
    jobId: j.id,
    number: j.job_number,
    type: j.job_type,
    businessUnit: j.business_unit,
    status: live?.jobStatus ?? j.status,
    summary: live?.summary ?? j.raw?.summary ?? null,
    customer: j.customer_name,
    quotes,
    invoice,
    reports,
    notes,
    electricians,
    missing,
  };
}

/** The electrician (or other trade) booked for this job through Supply › Work orders. */
async function electriciansFor(jobId: number): Promise<Electrician[]> {
  const lines = await sbSelect<{ po_id: number }>("purchase_order_lines", [q.select("po_id"), q.eq("job_id", String(jobId))].join("&"));
  const ids = [...new Set(lines.map((l) => l.po_id))];
  if (!ids.length) return [];
  const [pos, suppliers] = await Promise.all([
    sbSelect<{ id: number; supplier_id: string; status: string; kind: string | null; details: WorkOrderDetails | null }>("purchase_orders", [
      q.select("id,supplier_id,status,kind,details"), `id=in.(${ids.join(",")})`, "kind=eq.work_order",
    ].join("&")),
    sbSelect<{ id: string; name: string }>("order_suppliers", q.select("id,name")),
  ]);
  const name = new Map(suppliers.map((s) => [s.id, s.name]));
  return pos.filter((p) => p.status !== "cancelled").map((p) => ({
    supplier: name.get(p.supplier_id) ?? "Electrician",
    date: p.details?.date ?? null,
    status: p.status,
    note: [p.details?.trade, p.details?.note].filter(Boolean).join(". ") || null,
  }));
}
