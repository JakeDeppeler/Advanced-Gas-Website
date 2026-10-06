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
 * The query to page with: the caller's own order where it named one, otherwise
 * by primary key.
 *
 * Every table in this replica big enough to need a second page has an `id`. The
 * three that do not — portal_settings, portal_integrations, portal_page_views —
 * hold a handful of rows each and are read in one page.
 */
export const pagedQuery = (query: string) =>
  hasOrder(query) ? query : `${query ? `${query}&` : ""}order=id.asc`;
