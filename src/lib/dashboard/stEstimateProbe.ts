import "server-only";
import { stFetch, stTenantPath } from "./servicetitan";

/**
 * Does ServiceTitan tell us an estimate is still a draft?
 *
 * Its estimate screen has a Draft tick, and a draft quote is one the customer
 * may never have seen, which is the "quoted, not sent" list the job tracker
 * can't make. The export feed the sync reads has no such field on any of our
 * 4,400 estimates, so this asks for named estimates the two other ways the API
 * offers (one by id, and the list endpoint filtered to those ids) and reports
 * every field name each returns, with the values of any that look like a
 * draft, sent or status flag. Nothing about the customer is returned.
 *
 * Read-only, and only behind CRON_SECRET (see /api/servicetitan/check).
 */

const FLAG = /draft|sent|email|present|publish|status|review|signature|finali[sz]ed|locked/i;

type Probe = { ok: boolean; error?: string; fields: string[]; flags: Record<string, unknown> };

/** Field paths two levels deep, "items[]" standing for the first item. */
function paths(v: unknown, prefix = "", depth = 0, out: string[] = []): string[] {
  if (Array.isArray(v)) {
    if (v.length && depth < 2) paths(v[0], `${prefix}[]`, depth + 1, out);
    return out;
  }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const p = prefix ? `${prefix}.${k}` : k;
      out.push(p);
      if (depth < 2 && x && typeof x === "object") paths(x, p, depth + 1, out);
    }
  }
  return out;
}

/** The value at each flag-like top-level or status path, primitives and status objects only. */
function flags(rec: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (!FLAG.test(k)) continue;
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) out[k] = v;
    else if (typeof v === "object" && !Array.isArray(v)) out[k] = Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x === null || typeof x !== "object"));
  }
  return out;
}

const describe = (rec: Record<string, unknown> | undefined): Probe =>
  rec ? { ok: true, fields: paths(rec), flags: flags(rec) } : { ok: false, error: "not returned", fields: [], flags: {} };

export async function probeEstimates(ids: number[]): Promise<Record<string, { single: Probe; list: Probe }>> {
  const list = await stFetch<{ data?: Array<Record<string, unknown>> }>(stTenantPath("sales", "estimates"), { ids: ids.join(","), pageSize: String(ids.length) })
    .then((r) => r.data ?? [])
    .catch((e: unknown) => e instanceof Error ? e.message : "failed");
  const out: Record<string, { single: Probe; list: Probe }> = {};
  for (const id of ids) {
    const single = await stFetch<Record<string, unknown>>(stTenantPath("sales", `estimates/${id}`))
      .then((r) => describe(r))
      .catch((e: unknown): Probe => ({ ok: false, error: e instanceof Error ? e.message : "failed", fields: [], flags: {} }));
    out[String(id)] = {
      single,
      list: typeof list === "string" ? { ok: false, error: list, fields: [], flags: {} } : describe(list.find((r) => Number(r.id) === id)),
    };
  }
  return out;
}
