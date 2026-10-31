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

/**
 * Does a job's history in ServiceTitan record a quote being sent? The
 * estimate itself doesn't say (above), so Awaiting Quote Approval is guessed
 * from a priced quote sitting unchanged for a day, and drafts get it (job
 * 20527, 31 Oct). This lists what each history-like endpoint returns for a
 * job: its status, the field names, and the distinct values of the fields
 * that name an event's kind. No notes, names or contact details.
 */
const KIND = /type|event|action|kind/i;
const HISTORY_PATHS: [string, (id: number) => string][] = [
  ["jpm", (id) => `jobs/${id}/history`],
  ["jpm", (id) => `jobs/${id}/notes`],
];

export async function probeJobHistory(jobIds: number[]): Promise<Record<string, Record<string, { ok: boolean; error?: string; count?: number; fields?: string[]; kinds?: Record<string, string[]> }>>> {
  const out: Record<string, Record<string, { ok: boolean; error?: string; count?: number; fields?: string[]; kinds?: Record<string, string[]> }>> = {};
  for (const id of jobIds) {
    out[String(id)] = {};
    for (const [module, path] of HISTORY_PATHS) {
      const label = `${module} ${path(0).replace("/0/", "/{id}/")}`;
      try {
        const r = await stFetch<{ data?: Array<Record<string, unknown>>; history?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(stTenantPath(module, path(id)), { pageSize: "100" });
        const rows = Array.isArray(r) ? r : r.data ?? r.history ?? [];
        const kinds: Record<string, string[]> = {};
        for (const row of rows) {
          for (const [k, v] of Object.entries(row)) {
            if (!KIND.test(k) || typeof v !== "string" || v.length > 60) continue;
            (kinds[k] ??= []).includes(v) || kinds[k].push(v);
          }
        }
        out[String(id)][label] = { ok: true, count: rows.length, fields: [...new Set(rows.flatMap((x) => paths(x)))], kinds };
      } catch (e) {
        out[String(id)][label] = { ok: false, error: (e instanceof Error ? e.message : "failed").slice(0, 160) };
      }
    }
  }
  return out;
}

/**
 * Can the portal read a completed form, so a work order can carry the job's
 * Condition Report (Jake, 31 Oct)? Lists the tenant's forms by name, then the
 * newest few submissions of those whose name matches: who they belong to,
 * their status, and the shape of what they hold. Field names and types only,
 * never the answers, which can be anything a tech wrote about a customer.
 */
export async function probeForms(match: string): Promise<{ forms?: unknown; submissions?: unknown; error?: string }> {
  const re = new RegExp(match.replace(/[^a-z0-9 ]/gi, "").trim() || "condition", "i");
  let forms: Array<Record<string, unknown>>;
  try {
    const r = await stFetch<{ data?: Array<Record<string, unknown>> }>(stTenantPath("forms", "forms"), { pageSize: "200" });
    forms = r.data ?? [];
  } catch (e) {
    return { error: `forms: ${(e instanceof Error ? e.message : "failed").slice(0, 200)}` };
  }
  const named = forms.map((f) => ({ id: f.id, name: f.name, active: f.active, published: f.published ?? f.status ?? null }));
  const ids = forms.filter((f) => re.test(String(f.name ?? ""))).map((f) => String(f.id));
  if (!ids.length) return { forms: named, submissions: "no form name matched" };
  try {
    const r = await stFetch<{ data?: Array<Record<string, unknown>>; totalCount?: number }>(stTenantPath("forms", "submissions"), { formIds: ids.join(","), pageSize: "5", includeTotal: "true" });
    const rows = r.data ?? [];
    return {
      forms: named,
      submissions: {
        total: r.totalCount ?? null,
        fields: [...new Set(rows.flatMap((x) => paths(x)))],
        each: rows.map((x) => ({
          id: x.id, formId: x.formId, status: x.status, submittedOn: x.submittedOn ?? x.createdOn ?? null,
          owners: Array.isArray(x.owners) ? (x.owners as Array<Record<string, unknown>>).map((o) => ({ type: o.type, id: o.id })) : null,
        })),
      },
    };
  } catch (e) {
    return { forms: named, error: `submissions: ${(e instanceof Error ? e.message : "failed").slice(0, 200)}` };
  }
}
