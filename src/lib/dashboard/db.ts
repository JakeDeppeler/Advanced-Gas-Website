/**
 * The wall dashboard's data layer.
 *
 * Talks to Supabase over REST with the service-role key, the same pattern as
 * `src/lib/portal/db.ts` and the quote form — this repo has no supabase-js
 * dependency and does not need one for the handful of queries below.
 *
 * Server-only: the service-role key bypasses RLS and must never reach the
 * browser. Every helper degrades to an empty result when the database isn't
 * configured, so a preview build with no credentials renders an empty board
 * rather than crashing.
 */

import "server-only";

export type Row = Record<string, unknown>;

export function dashboardDbConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function conf() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

async function sb(path: string, init: RequestInit = {}): Promise<Response | null> {
  const c = conf();
  if (!c) return null;
  return fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/**
 * Throws rather than returning an empty array on an error status.
 *
 * The snapshot builder catches per source and carries the previous value
 * forward, so a failed read has to be loud enough for it to notice. Silently
 * returning [] would publish a zero as though it were measured.
 */
export async function sbSelect<T = Row>(table: string, query = ""): Promise<T[]> {
  const res = await sb(`${table}${query ? `?${query}` : ""}`);
  if (!res) return [];
  if (!res.ok) {
    throw new Error(`${table} read failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as T[];
}

/** First row or null, for the single-row lookups (settings, latest snapshot). */
export async function sbSelectOne<T = Row>(table: string, query = ""): Promise<T | null> {
  const rows = await sbSelect<T>(table, query ? `${query}&limit=1` : "limit=1");
  return rows[0] ?? null;
}

/**
 * Row count without transferring the rows.
 *
 * PostgREST reports it in the content-range header as `0-0/123` when asked for
 * an exact count, so a counting query costs one row of bandwidth rather than
 * the whole table.
 */
export async function sbCount(table: string, query = ""): Promise<number> {
  const res = await sb(`${table}?select=id${query ? `&${query}` : ""}`, {
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  if (!res) return 0;
  if (!res.ok && res.status !== 206) {
    throw new Error(`${table} count failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  const total = res.headers.get("content-range")?.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

/** Insert-or-update on a conflict target. Chunked by the caller. */
export async function sbUpsert(table: string, rows: Row[], onConflict: string): Promise<void> {
  if (!rows.length) return;
  const res = await sb(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res) return;
  if (!res.ok) {
    throw new Error(`${table} upsert failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}

export async function sbInsert(table: string, row: Row): Promise<void> {
  const res = await sb(table, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res) return;
  if (!res.ok) {
    throw new Error(`${table} insert failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}

/** PATCH every row matching the filter query. */
export async function sbUpdate(table: string, query: string, patch: Row): Promise<void> {
  const res = await sb(`${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res) return;
  if (!res.ok) {
    throw new Error(`${table} update failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}

export async function sbRpc(fn: string, args: Row = {}): Promise<void> {
  const res = await sb(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  if (!res) return;
  if (!res.ok) {
    throw new Error(`${fn}() failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}

/** PostgREST reads a filter value after the operator, so commas and dots need escaping. */
export const q = {
  gte: (col: string, v: string) => `${col}=gte.${encodeURIComponent(v)}`,
  lt: (col: string, v: string) => `${col}=lt.${encodeURIComponent(v)}`,
  eq: (col: string, v: string) => `${col}=eq.${encodeURIComponent(v)}`,
  isNull: (col: string) => `${col}=is.null`,
  notNull: (col: string) => `${col}=not.is.null`,
  notIn: (col: string, vs: string[]) => `${col}=not.in.(${vs.map((v) => `"${v}"`).join(",")})`,
  select: (cols: string) => `select=${encodeURIComponent(cols)}`,
  order: (col: string, dir: "asc" | "desc" = "asc") => `order=${col}.${dir}`,
};
