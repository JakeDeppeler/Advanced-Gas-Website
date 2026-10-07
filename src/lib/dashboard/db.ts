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
/**
 * Reads every matching row, a page at a time.
 *
 * PostgREST caps a response at 1000 rows and says nothing about it. The board
 * reported "1000 quotes still out" for weeks of real data, which was the cap
 * rather than a count, and the value beside it was the sum of whichever
 * thousand came back. A metric computed from a silently truncated read is the
 * worst kind of wrong number: it looks measured.
 */
export { PAGE } from "./paging";
import { PAGE, pagedQuery, splitLimit } from "./paging";

/** `span` rows from `from`, or null when the database isn't configured. */
async function sbPage<T>(table: string, query: string, from: number, span: number): Promise<T[] | null> {
  const res = await sb(`${table}${query ? `?${query}` : ""}`, {
    headers: { Range: `${from}-${from + span - 1}`, "Range-Unit": "items" },
  });
  if (!res) return null;
  if (!res.ok) {
    throw new Error(`${table} read failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as T[];
}

/**
 * Every row matching the query, a page at a time.
 *
 * **A read that needs more than one page must say what order it wants.**
 * Postgres promises nothing about the order of rows without an ORDER BY, so
 * asking for "rows 1000–1999" of an unordered result can hand back rows the
 * first page already gave and never hand back others. The sum of such a read is
 * not a sum of anything.
 *
 * It did exactly that. The Pace page reads two years of invoices — 2,023 rows,
 * so three pages — and put $669,510 on the wall as the year to date against a
 * true $390,203, while last year came back short by whatever went missing. The
 * month and year on the Today page were right the whole time, because their
 * window fits in one page, so the board disagreed with itself and only the
 * three-page figure was wrong.
 *
 * So: one page, no ordering needed. More than one, and the read restarts under
 * an order ending in the table's key — the caller's own order where they named
 * one, with the key appended to settle its ties, because an order that isn't
 * unique leaves exactly the same hole. The extra page costs a few hundred
 * milliseconds on the handful of reads big enough to need it, and it is the
 * difference between a figure and a guess.
 *
 * A caller's own `limit=` is honoured as a ceiling but never sent alongside the
 * paging — see splitLimit for why the two cannot travel together.
 */
export async function sbSelect<T = Row>(table: string, query = ""): Promise<T[]> {
  const { query: base, limit } = splitLimit(query);
  const want = limit ?? Infinity;

  // The first page, in whatever order it arrives. Nothing was paged, so nothing
  // can have been doubled or dropped, and a read that ends here — short, or long
  // enough to fill the caller's ceiling — needs no order at all.
  const head = await sbPage<T>(table, base, 0, Math.min(want, PAGE));
  if (head == null) return [];
  if (head.length < PAGE || head.length >= want) return head;

  const stable = pagedQuery(base, table);
  const out: T[] = [];
  if (stable === base) {
    out.push(...head);
  } else {
    const first = await sbPage<T>(table, stable, 0, PAGE);
    if (first == null) return out;
    out.push(...first);
    if (first.length < PAGE) return out;
  }

  while (out.length < want) {
    const page = await sbPage<T>(table, stable, out.length, Math.min(want - out.length, PAGE));
    if (page == null) break;
    out.push(...page);
    // A short page is the last page. Guarding on the length rather than parsing
    // content-range keeps this working when the header is absent.
    if (page.length < PAGE) break;
  }
  return out;
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
 *
 * `col` is only ever used to name one cheap column to select. It defaults to
 * `id` because every table the dashboard counts has one — `supplier_items` is
 * keyed on (supplier, code) and does not, which asking for `id` answers with a
 * 400 rather than a count.
 */
export async function sbCount(table: string, query = "", col = "id"): Promise<number> {
  const res = await sb(`${table}?select=${encodeURIComponent(col)}${query ? `&${query}` : ""}`, {
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

/**
 * PATCH every row matching the filter and hand back the rows it changed. A
 * filter on the old value makes this a claim: two runs racing for the same
 * row, only one gets it back.
 */
export async function sbUpdateReturning<T = Row>(table: string, query: string, patch: Row): Promise<T[]> {
  const res = await sb(`${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res) return [];
  if (!res.ok) {
    throw new Error(`${table} update failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as T[];
}

/**
 * Insert a row unless one with the same conflict key is already there. True
 * when this call made it — a claim two runs can race for, and only one wins.
 */
export async function sbInsertIfAbsent(table: string, row: Row, onConflict: string): Promise<boolean> {
  const res = await sb(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res) return false;
  if (!res.ok) {
    throw new Error(`${table} insert failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return ((await res.json()) as unknown[]).length > 0;
}

/** DELETE every row matching the filter query. */
export async function sbDelete(table: string, query: string): Promise<void> {
  const res = await sb(`${table}?${query}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return;
  if (!res.ok) {
    throw new Error(`${table} delete failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}

/**
 * A function that returns rows, rather than one called for its effect.
 *
 * `sbRpc` throws away the body, which is right for the resolvers but not for
 * the shape report — that one's whole purpose is what it hands back.
 */
export async function sbRpcRows<T = Row>(fn: string, args: Row = {}): Promise<T[]> {
  const res = await sb(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  if (!res) return [];
  if (!res.ok) {
    throw new Error(`${fn}() failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  const body = await res.json().catch(() => null);
  return Array.isArray(body) ? (body as T[]) : [];
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
  gt: (col: string, v: string) => `${col}=gt.${encodeURIComponent(v)}`,
  eq: (col: string, v: string) => `${col}=eq.${encodeURIComponent(v)}`,
  isNull: (col: string) => `${col}=is.null`,
  notNull: (col: string) => `${col}=not.is.null`,
  notIn: (col: string, vs: string[]) => `${col}=not.in.(${vs.map((v) => `"${v}"`).join(",")})`,
  select: (cols: string) => `select=${encodeURIComponent(cols)}`,
  /**
   * Postgres sorts nulls first on a descending order, so "newest row" ordered
   * by a nullable column hands back the one row that has no value at all. That
   * cost the board a morning: a never-succeeded sync masked four working ones.
   * Pass nulls: "last" for any column that can be null.
   */
  order: (col: string, dir: "asc" | "desc" = "asc", nulls?: "first" | "last") =>
    `order=${col}.${dir}${nulls ? `.nulls${nulls}` : ""}`,
};
