/**
 * The cheap read of where the Reece ↔ ServiceTitan link stands.
 *
 * Deliberately separate from `checkServiceTitan()`, which proves the link by
 * calling seven ServiceTitan endpoints and takes seconds. Everything here is a
 * Supabase read, so the overview page loads at once and the slow, definitive
 * probe lives on its own page that you open on purpose.
 *
 * Every field can be null, and null means "we don't know" — never zero. A
 * catalogue that failed to read is a different sentence from a catalogue with
 * nothing in it, and the page says which.
 */

import "server-only";
import { q, sbCount, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { reeceConnection, reeceConfigured, type ReeceConnection } from "@/lib/pricebook/reece";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";

export type CatalogueState = {
  /** Items in the replica. Null when the read failed. */
  items: number | null;
  /** When any item was last seen in an import. */
  lastSeenAt: string | null;
  /** Where the newest items came from — an uploaded price file, or the API. */
  lastSource: "file" | "api" | null;
  /** How many carry a price. An item with no cost cannot sync. */
  priced: number | null;
};

export type SyncRun = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  mode: string;
  summary: Record<string, unknown>;
  changes: unknown[];
  errors: unknown[];
};

export type SupplyState = {
  /** False when Supabase itself is not configured — everything below is then null. */
  dbReady: boolean;
  serviceTitan: { configured: boolean };
  reece: ReeceConnection & { punchoutConfigured: boolean };
  catalogue: CatalogueState;
  lastRun: SyncRun | null;
  orders: { total: number | null; needingAttention: number | null };
};

const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Each read is caught on its own. One failing table must not blank the page —
 * the same rule the wall board runs on, for the same reason.
 */
async function safe<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await f();
  } catch {
    return fallback;
  }
}

export async function loadSupplyState(): Promise<SupplyState> {
  const dbReady = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const reece = await safe(reeceConnection, { status: "not-configured" } as ReeceConnection);

  const base: SupplyState = {
    dbReady,
    serviceTitan: { configured: serviceTitanConfigured() },
    reece: { ...reece, punchoutConfigured: reeceConfigured() },
    catalogue: { items: null, lastSeenAt: null, lastSource: null, priced: null },
    lastRun: null,
    orders: { total: null, needingAttention: null },
  };
  if (!dbReady) return base;

  const [items, priced, newest, lastRun, orders, attention] = await Promise.all([
    safe(() => sbCount("supplier_items", "", "code"), null as number | null),
    safe(() => sbCount("supplier_items", "cost=not.is.null", "code"), null as number | null),
    safe(
      () =>
        sbSelectOne<{ seen_at: string; source: string }>(
          "supplier_items",
          [q.select("seen_at,source"), q.order("seen_at", "desc")].join("&"),
        ),
      null,
    ),
    safe(
      () =>
        sbSelectOne<{
          id: string;
          started_at: string;
          finished_at: string | null;
          mode: string;
          summary: Record<string, unknown>;
          changes: unknown[];
          errors: unknown[];
        }>("pricebook_sync_runs", [q.select("id,started_at,finished_at,mode,summary,changes,errors"), q.order("started_at", "desc")].join("&")),
      null,
    ),
    safe(() => sbCount("reece_punchout_carts"), null as number | null),
    // "Needing attention" is deliberately errors only. A cart sitting at
    // `received` is waiting on the next resolve, which is normal; an errored
    // one is waiting on a person.
    safe(() => sbCount("reece_punchout_carts", q.eq("status", "error")), null as number | null),
  ]);

  return {
    ...base,
    catalogue: {
      items: n(items),
      priced: n(priced),
      lastSeenAt: newest?.seen_at ?? null,
      lastSource: newest?.source === "api" ? "api" : newest?.source === "file" ? "file" : null,
    },
    lastRun: lastRun
      ? {
          id: lastRun.id,
          startedAt: lastRun.started_at,
          finishedAt: lastRun.finished_at,
          mode: lastRun.mode,
          summary: lastRun.summary ?? {},
          changes: Array.isArray(lastRun.changes) ? lastRun.changes : [],
          errors: Array.isArray(lastRun.errors) ? lastRun.errors : [],
        }
      : null,
    orders: { total: n(orders), needingAttention: n(attention) },
  };
}

/** Every sync run, newest first, for the history page. */
export async function listSyncRuns(limit = 60): Promise<SyncRun[]> {
  const rows = await sbSelect<{
    id: string;
    started_at: string;
    finished_at: string | null;
    mode: string;
    summary: Record<string, unknown>;
    changes: unknown[];
    errors: unknown[];
  }>(
    "pricebook_sync_runs",
    [q.select("id,started_at,finished_at,mode,summary,changes,errors"), q.order("started_at", "desc"), `limit=${limit}`].join("&"),
  );
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    mode: r.mode,
    summary: r.summary ?? {},
    changes: Array.isArray(r.changes) ? r.changes : [],
    errors: Array.isArray(r.errors) ? r.errors : [],
  }));
}

/**
 * Search the local catalogue replica.
 *
 * The live maX search endpoint is better when Reece is connected, but it needs
 * credentials nobody has yet. This reads the same rows the sync writes, so the
 * quoting lookup works off an uploaded price file on day one and the page says
 * which of the two answered.
 */
export async function searchCatalogue(term: string, limit = 40): Promise<
  Array<{ code: string; description: string | null; cost: number | null; uom: string | null; seenAt: string }>
> {
  const t = term.trim();
  if (!t) return [];
  // `or` with two ilike patterns: a code is typed exactly, a description is
  // typed in fragments, and people do both in the same box.
  const pattern = `*${t.replace(/[*,()]/g, " ")}*`;
  const rows = await sbSelect<{ code: string; description: string | null; cost: number | null; uom: string | null; seen_at: string }>(
    "supplier_items",
    [
      q.select("code,description,cost,uom,seen_at"),
      `or=(code.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})`,
      q.order("seen_at", "desc"),
      `limit=${limit}`,
    ].join("&"),
  );
  return rows.map((r) => ({ code: r.code, description: r.description, cost: r.cost, uom: r.uom, seenAt: r.seen_at }));
}
