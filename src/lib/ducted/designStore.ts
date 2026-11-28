import "server-only";
import { q, sbSelect, sbSelectOne, sbUpdate, sbUpsert } from "@/lib/dashboard/db";
import { signedUrls, uploadPhoto } from "@/lib/portal/storage";
import type { PickItem, Picks } from "./picks";

/**
 * A job's ducted design, kept against the ServiceTitan job (migration 0124):
 * the designer's job file, its plan images in the private duct-plans bucket,
 * and the quote it last put on the job. And the office's picks for parts the
 * pricebook has no match for.
 */

const BUCKET = "duct-plans";

export type DesignRow = {
  job_id: number; job_number: string; project: Record<string, unknown>; summary: Record<string, unknown> | null;
  images: Record<string, string>; estimate_id: number | null; quoted_total: number | null; quoted_at: string | null; quoted_by: string | null;
  quote_options: Record<string, unknown> | null; updated_at: string; updated_by: string | null;
};

export async function loadDesign(jobId: number): Promise<DesignRow | null> {
  return sbSelectOne<DesignRow>("ducted_designs", `select=*&${q.eq("job_id", String(jobId))}`).catch(() => null);
}

export async function saveDesign(jobId: number, jobNumber: string, project: unknown, by: string): Promise<void> {
  const have = await loadDesign(jobId);
  if (have) await sbUpdate("ducted_designs", q.eq("job_id", String(jobId)), { project, updated_at: new Date().toISOString(), updated_by: by });
  else await sbUpsert("ducted_designs", [{ job_id: jobId, job_number: jobNumber, project, images: {}, updated_by: by }], "job_id");
}

export async function noteQuoted(jobId: number, patch: { estimate_id: number; quoted_total: number; quoted_by: string; summary: unknown; quote_options: unknown }): Promise<void> {
  await sbUpdate("ducted_designs", q.eq("job_id", String(jobId)), { ...patch, quoted_at: new Date().toISOString() });
}

/** A plan image's name as the designer gives it, safe as a storage path. */
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);

export async function saveDesignImage(jobId: number, name: string, body: Uint8Array, mime: string): Promise<{ ok: boolean; error?: string }> {
  const row = await loadDesign(jobId);
  if (!row) return { ok: false, error: "Save the design first." };
  const path = `${jobId}/${safeName(name)}`;
  const up = await uploadPhoto(path, body, mime, BUCKET);
  if (!up.ok) return up;
  await sbUpdate("ducted_designs", q.eq("job_id", String(jobId)), { images: { ...(row.images ?? {}), [name]: path } });
  return { ok: true };
}

/** The plan images as short-lived links, by the designer's own names. */
export async function designImageLinks(row: DesignRow): Promise<Record<string, string>> {
  const entries = Object.entries(row.images ?? {});
  if (!entries.length) return {};
  const links = await signedUrls(entries.map(([, p]) => p), 600, BUCKET);
  const out: Record<string, string> = {};
  for (const [name, path] of entries) { const u = links.get(path); if (u) out[name] = u; }
  return out;
}

export async function loadPicks(): Promise<Picks> {
  const rows = await sbSelect<{ need: string; items: PickItem[] }>("ducted_part_picks", "select=need,items&limit=1000").catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.need, r.items]));
}

export async function savePick(need: string, items: PickItem[], by: string): Promise<void> {
  await sbUpsert("ducted_part_picks", [{ need, items, picked_by: by, picked_at: new Date().toISOString() }], "need");
}
