import "server-only";
import { q, sbSelectOne } from "@/lib/dashboard/db";
import { computeSnapshot, latestSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";
import { syncServiceTitan } from "@/lib/dashboard/stSync";
import { ensureXeroToken } from "@/lib/portal/xero";

/**
 * Bring the board's snapshot up to date, if it's due.
 *
 * Called by the wall display on its poll, and by the portal's wall board page
 * while somebody has it open — so the page reads live when the TV is off. Both
 * go through the same floors, so a second caller adds no load to ServiceTitan.
 *
 * Two floors, because the halves of a refresh cost wildly different things.
 *
 * Recomputing the snapshot reads the local replica and nothing else, so it runs
 * on every poll — that is what makes the board live rather than a photograph
 * taken some minutes ago. Pulling from ServiceTitan is an export request against
 * a tenant that throttles, and asking it for changes every thirty seconds all
 * day would get the integration rate-limited to move a number that hadn't
 * changed.
 */
const RECOMPUTE_AFTER_MS = 25_000;
const SYNC_AFTER_MS = 2 * 60_000;

// Two tabs on two machines can pass the staleness check together. Within one
// instance this collapses them; across instances the floor above holds the
// duplicate rate to a handful a day, and every write in the sync is an upsert,
// so losing that race costs time rather than correctness.
let inFlight: Promise<unknown> | null = null;

/** When ServiceTitan was last asked for changes. Unknown counts as not due. */
async function syncDue(): Promise<boolean> {
  try {
    const row = await sbSelectOne<{ last_run_at: string | null }>(
      "portal_sync_state",
      [q.select("last_run_at"), q.eq("provider", "servicetitan"), q.order("last_run_at", "desc")].join("&"),
    );
    if (!row?.last_run_at) return true;
    return Date.now() - Date.parse(row.last_run_at) >= SYNC_AFTER_MS;
  } catch {
    return false;
  }
}

async function run(pull: boolean) {
  /*
   * Turn Xero's handle before reading it.
   *
   * The same argument as the sync above, for the same reason: the Actions cron
   * fires a few times a day on a repository this quiet and a Xero token lives
   * half an hour, so the cron alone left it dead for most of the day. The panel
   * is on all day, so the thing that needs the numbers keeps the token alive
   * for them — which is how ServiceTitan already works here.
   *
   * Unlike the sync, this cannot be left to a staleness floor. Xero rotates the
   * refresh token on every use, so two instances refreshing at once disconnects
   * it rather than costing a wasted call; ensureXeroToken takes an atomic claim
   * in the database before it touches anything, and no-ops on the common case
   * of a token with twenty minutes left. Awaited rather than fired off, so a
   * refresh lands before computeSnapshot reads receivables — and swallowed,
   * because a Xero that cannot be reached is one tile carrying its last value.
   */
  await ensureXeroToken().catch(() => undefined);

  // Same order as /api/sync: pull, then recompute. The snapshot is written even
  // when a leg failed, because carry-forward inside computeSnapshot keeps the
  // last known figures on the wall rather than blanking them.
  if (pull) await syncServiceTitan(false);
  await storeSnapshot(await computeSnapshot());
}

export async function refreshBoard(): Promise<{ refreshed: boolean; ageMs?: number; synced?: boolean; error?: string }> {
  const current = await latestSnapshot();
  const age = current ? Date.now() - Date.parse(current.computedAt) : Infinity;
  if (age < RECOMPUTE_AFTER_MS) return { refreshed: false, ageMs: age };

  // Whether to pull from ServiceTitan as well comes from the sync's own record
  // of when it last ran, not a timer in this process: serverless instances are
  // recycled constantly, and a per-instance timer would read as "due" on every
  // cold start.
  const pull = await syncDue();

  if (!inFlight) {
    inFlight = run(pull).finally(() => {
      inFlight = null;
    });
  }
  try {
    await inFlight;
  } catch (e) {
    return { refreshed: false, error: (e as Error).message };
  }
  return { refreshed: true, synced: pull };
}
