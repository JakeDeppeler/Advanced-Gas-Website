import "server-only";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { listJobFiles } from "@/lib/ordering/jobFiles";
import type { OrderLine, PackFacts, Photo, QuoteItem } from "./build";

/** One row of install_pack_jobs (0090): an install job with a visit still to come, and its sold quote if it has one. */
export type InstallJob = {
  job_id: number;
  job_number: string | null;
  job_type: string | null;
  customer_name: string | null;
  job_summary: string | null;
  estimate_id: number | null;
  quote_job_id: number | null;
  appointment_start: string;
  all_visits: string | null;
  site_address: string | null;
  site_phone: string | null;
  crew: string | null;
};

const COLS = "job_id,job_number,job_type,customer_name,job_summary,estimate_id,quote_job_id,appointment_start,all_visits,site_address,site_phone,crew";

/** Soonest first: the install that's tomorrow matters more than one next month. */
export async function installJobs(): Promise<InstallJob[]> {
  return sbSelect<InstallJob>("install_pack_jobs", [q.select(COLS), "order=appointment_start.asc"].join("&"));
}

/** By ServiceTitan job id or by job number, for the office's preview. */
export async function installJob(idOrNumber: string): Promise<InstallJob | null> {
  const col = /^\d{9,}$/.test(idOrNumber) ? "job_id" : "job_number";
  return sbSelectOne<InstallJob>("install_pack_jobs", [q.select(COLS), q.eq(col, idOrNumber)].join("&"));
}

type RawItem = { qty?: number | string | null; sku?: { id?: number | string | null; name?: string | null; displayName?: string | null; type?: string | null } | null };
type RawEstimate = { name?: string | null; summary?: string | null; soldOn?: string | null; jobNumber?: string | null; items?: RawItem[] | null };

/**
 * The facts for every job asked for, in four reads however many jobs there
 * are: this runs after every ServiceTitan pull, and a read per job per pull
 * is the kind of load that took the portal down on 27 Oct.
 */
export async function packFactsFor(jobs: InstallJob[]): Promise<Map<number, PackFacts>> {
  if (!jobs.length) return new Map();
  const estIds = [...new Set(jobs.flatMap((j) => (j.estimate_id == null ? [] : [j.estimate_id])))];
  const [ests, lines, suppliers] = await Promise.all([
    estIds.length ? sbSelect<{ id: number; raw: RawEstimate }>("st_estimates", [q.select("id,raw"), `id=in.(${estIds.join(",")})`].join("&")) : Promise.resolve([]),
    sbSelect<{ po_id: number; job_id: number; sku_id: number | null }>("purchase_order_lines", [q.select("po_id,job_id,sku_id"), `job_id=in.(${jobs.map((j) => j.job_id).join(",")})`].join("&")),
    sbSelect<{ id: string; name: string }>("order_suppliers", q.select("id,name")),
  ]);
  const poIds = [...new Set(lines.map((l) => l.po_id))];
  const pos = poIds.length
    ? await sbSelect<{ id: number; po_number: string; supplier_id: string; status: OrderLine["status"]; kind: OrderLine["kind"]; sent_at: string | null; pickup: boolean }>(
        "purchase_orders", [q.select("id,po_number,supplier_id,status,kind,sent_at,pickup"), `id=in.(${poIds.join(",")})`].join("&"))
    : [];
  const byPo = new Map(pos.map((p) => [p.id, p]));
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const estById = new Map(ests.map((e) => [e.id, e.raw ?? {}]));

  const out = new Map<number, PackFacts>();
  for (const j of jobs) {
    const raw = j.estimate_id == null ? {} : estById.get(j.estimate_id) ?? {};
    const items: QuoteItem[] = (raw.items ?? []).map((i) => ({
      skuId: i.sku?.id != null ? Number(i.sku.id) : null,
      type: i.sku?.type ?? "",
      code: i.sku?.name ?? "",
      name: i.sku?.displayName ?? null,
      qty: Number(i.qty ?? 1) || 0,
    }));
    const orders: OrderLine[] = lines.filter((l) => l.job_id === j.job_id).flatMap((l) => {
      const p = byPo.get(l.po_id);
      return p ? [{ skuId: l.sku_id, supplier: supplierName.get(p.supplier_id) ?? p.supplier_id, po: p.po_number, status: p.status, kind: p.kind, sentAt: p.sent_at, pickup: p.pickup }] : [];
    });
    out.set(j.job_id, {
      jobId: j.job_id,
      jobNumber: j.job_number,
      jobType: j.job_type,
      customer: j.customer_name,
      siteAddress: j.site_address,
      sitePhone: j.site_phone,
      visits: j.all_visits,
      crew: j.crew,
      quote: j.estimate_id == null ? null : {
        id: j.estimate_id,
        name: raw.name ?? null,
        fromJob: j.quote_job_id && j.quote_job_id !== j.job_id ? raw.jobNumber ?? String(j.quote_job_id) : null,
        soldOn: raw.soldOn ?? null,
      },
      jobSummary: j.job_summary,
      items,
      orders,
    });
  }
  return out;
}

/**
 * Only formats a PDF can carry as they are. A phone's HEIC can't be drawn
 * without decoding it, and no image library is installed for one job; those
 * are counted and left on the job, where ServiceTitan shows them.
 */
const EMBEDDABLE = /\.(jpe?g|png)$/i;
const PHOTO = /\.(jpe?g|png|heic|heif|webp|gif)$/i;

/**
 * The photos on the install job and, when the quote was written on another
 * job, on that one too: the quote visit is where somebody photographed the
 * switchboard, the wall and the old unit. Newest first. Our own install
 * packs are PDFs, so they never come back round as photos.
 */
export async function packPhotos(j: InstallJob): Promise<{ photos: Photo[]; notShown: number } | { error: string }> {
  const jobs = [{ id: j.job_id, quote: false }];
  if (j.quote_job_id && j.quote_job_id !== j.job_id) jobs.push({ id: j.quote_job_id, quote: true });
  const photos: Photo[] = [];
  let notShown = 0;
  for (const x of jobs) {
    const r = await listJobFiles(x.id);
    if ("error" in r) return { error: r.error };
    for (const f of r.files) {
      if (!PHOTO.test(f.name)) continue;
      if (EMBEDDABLE.test(f.name)) photos.push({ id: f.id, name: f.name, at: f.at, quoteVisit: x.quote });
      else notShown++;
    }
  }
  photos.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  return { photos, notShown };
}

export type PackStatus = InstallJob & { version: number | null; attached_at: string | null; last_error: string | null; current: boolean };

/**
 * Every install a pack is due on, soonest first, with where its pack stands,
 * for To order › Automation. `current` is false while the pack on the job is
 * from an older layout and waiting its turn to be made again.
 */
export async function packStatuses(layout: string): Promise<PackStatus[]> {
  const jobs = await installJobs();
  if (!jobs.length) return [];
  const rows = await sbSelect<{ job_id: number; version: number; attached_at: string | null; last_error: string | null; layout: string | null }>(
    "install_packs", [q.select("job_id,version,attached_at,last_error,layout:parts->>layout"), `job_id=in.(${jobs.map((j) => j.job_id).join(",")})`].join("&"));
  const by = new Map(rows.map((r) => [r.job_id, r]));
  return jobs.map((j) => {
    const r = by.get(j.job_id);
    return { ...j, version: r?.attached_at ? r.version : null, attached_at: r?.attached_at ?? null, last_error: r?.last_error ?? null, current: r?.layout === layout };
  });
}
