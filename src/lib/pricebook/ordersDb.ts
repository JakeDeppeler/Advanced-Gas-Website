/**
 * Reading orders out of Supabase, with their pickup branches named.
 *
 * Split from `orders.ts` because the client component that draws the order
 * table imports the types and status labels from there, and anything marked
 * `server-only` in a client import graph fails the build.
 */

import "server-only";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { reeceBranches, reeceConnection } from "@/lib/pricebook/reece";
import { normaliseOrder, type CartRow, type SupplyOrder } from "@/lib/pricebook/orders";

const COLUMNS =
  "id,received_at,status,cart,resolved_lines,cart_token,reece_order_id,reece_order,st_purchase_order_id,st_job_id,error";

/**
 * Branch number → name, so an order says "Dandenong" rather than "Branch 412".
 *
 * One call for the whole page, and a failure is not an error: the normaliser
 * falls back to the branch number, which still answers "where is this going".
 */
async function branchNames(): Promise<Record<string, string>> {
  try {
    const conn = await reeceConnection();
    if (conn.status !== "ready") return {};
    const out: Record<string, string> = {};
    for (const b of await reeceBranches()) out[b.branchNumber] = b.name;
    return out;
  } catch {
    return {};
  }
}

/**
 * Recent orders, newest first.
 *
 * Capped rather than paged: the point of the page is a search box over
 * everything that has been sent, and filtering client-side keeps a search that
 * reaches inside the line items — which is how somebody looks for "that order
 * with the 20mm copper on it" — without a round trip per keystroke. If the cap
 * is ever reached the page says so rather than quietly showing a prefix.
 */
export async function listOrders(limit = 500): Promise<SupplyOrder[]> {
  const [rows, names] = await Promise.all([
    sbSelect<CartRow>(
      "reece_punchout_carts",
      [q.select(COLUMNS), q.order("received_at", "desc"), `limit=${limit}`].join("&"),
    ),
    branchNames(),
  ]);
  return rows.map((r) => normaliseOrder(r, names));
}

export async function getOrder(id: string): Promise<SupplyOrder | null> {
  // Guarded because the id goes into a PostgREST filter: anything that is not
  // a uuid is a bad link, not a query worth making.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await sbSelectOne<CartRow>("reece_punchout_carts", [q.select(COLUMNS), q.eq("id", id)].join("&"));
  if (!row) return null;
  return normaliseOrder(row, await branchNames());
}
