/**
 * How a multi-page read is kept honest.
 *
 * Its own module, with no `server-only` and no database in its import graph, so
 * scripts/check-paging.ts can exercise the rule directly. The bug this guards
 * against returns the right number of rows, all of them real, and a total that
 * is simply wrong — there is no error to catch and nothing looks odd, so it has
 * to be tested rather than watched for.
 */

/**
 * Rows per request. PostgREST will serve more, but a page is also the unit the
 * read is resumed on, and a thousand rows is a comfortable response.
 */
export const PAGE = 1000;

/**
 * Does this query already say what order it wants its rows in?
 *
 * Anchored to the start or an ampersand so a column whose name merely ends in
 * "order" — `reorder`, `work_order` — is not mistaken for the directive.
 */
export const hasOrder = (query: string) => /(?:^|&)order=/.test(query);

/**
 * Tables whose primary key is not `id`.
 *
 * Paging needs a column combination no two rows can share, and all but a
 * handful of tables here have `id`. The ones that don't are listed, because the
 * alternative is a read that 400s on `order=id.asc` the first time it grows
 * past a page — which, for `supplier_items`, is the first Reece price file.
 */
const KEY: Record<string, string[]> = {
  allowed_users: ["email"],
  portal_integrations: ["provider"],
  portal_page_views: ["path", "day"],
  portal_settings: ["key"],
  portal_sync_state: ["provider", "resource"],
  reece_invoices: ["document_number"],
  supplier_items: ["supplier", "code"],
};

/** The columns that identify a row of `table`, for paging to hold on to. */
export const keyColumns = (table: string): string[] => KEY[table] ?? ["id"];

/** The columns a query's own `order=` names, bare of direction and nulls. */
export function orderedColumns(query: string): string[] {
  const m = /(?:^|&)order=([^&]*)/.exec(query);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((term) => term.split(".")[0])
    .filter(Boolean);
}

/**
 * The query to page with: the caller's own order, finished off by the key.
 *
 * **An order that isn't unique is no safer than no order at all.** Postgres
 * sorts by what it was asked to sort by and is free to arrange the ties however
 * it likes, differently on each query — so `order=completed_on.desc` over a
 * fortnight of jobs finished on the same afternoon can hand page two rows that
 * page one already gave. The failure looks exactly like the unordered one: real
 * rows, right count, wrong total.
 *
 * So the key goes on the end of whatever the caller asked for, which leaves the
 * meaning of their order intact and makes it total. Columns the caller already
 * named are not repeated.
 */
export function pagedQuery(query: string, table: string): string {
  const named = new Set(orderedColumns(query));
  const add = keyColumns(table)
    .filter((c) => !named.has(c))
    .map((c) => `${c}.asc`)
    .join(",");
  if (!add) return query;
  if (!hasOrder(query)) return `${query ? `${query}&` : ""}order=${add}`;
  return query.replace(/(^|&)order=([^&]*)/, (_m, amp: string, own: string) => `${amp}order=${own},${add}`);
}

/**
 * A caller's own `limit=` lifted out of the query, for the loop to apply itself.
 *
 * PostgREST takes a row window two ways — the `Range` header and the
 * `limit`/`offset` parameters — and which one wins when a request carries both
 * is a detail of the version you happen to be talking to. Neither outcome is
 * survivable: if `limit` wins, every page comes back as the *first* thousand
 * rows, full, forever, and the loop never ends. So the two are never sent
 * together. The header is the paging, and the caller's limit becomes a ceiling
 * on what the loop keeps.
 *
 * `offset=` is refused outright rather than guessed at. It means the caller is
 * paging by hand, which this already does; it throws on the first run, in
 * development, which is the only safe place for it to be noticed.
 */
export function splitLimit(query: string): { query: string; limit: number | null } {
  if (/(?:^|&)offset=/.test(query)) {
    throw new Error(`paged read cannot carry its own offset: ${query}`);
  }
  const m = /(?:^|&)limit=(\d+)(?=&|$)/.exec(query);
  if (!m) return { query, limit: null };
  const n = Number(m[1]);
  const rest = query.replace(/(?:^|&)limit=\d+(?=&|$)/, "").replace(/^&/, "");
  return { query: rest, limit: Number.isFinite(n) ? n : null };
}
