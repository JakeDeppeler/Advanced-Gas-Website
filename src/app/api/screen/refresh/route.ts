import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { computeSnapshot, latestSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { syncServiceTitan } from "@/lib/dashboard/stSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The board keeping itself fresh.
 *
 * The scheduled sync is a GitHub Actions cron, and GitHub does not honour a
 * ten-minute schedule on a repository this quiet: since the workflow went live
 * it has fired once, and the board sat three hours stale behind it. Actions
 * stays as the belt — it syncs overnight with nothing on screen — and this is
 * the braces: the panel is on all day, so the thing that needs the numbers asks
 * for them.
 *
 * Authorised by the screen token rather than CRON_SECRET, because the caller is
 * the display. That token already reads every figure on the board; what it
 * gains here is the ability to make the server do work, which the staleness
 * floor bounds to one sync per interval however often it is called.
 */
const STALE_AFTER_MS = 8 * 60_000;

// Two tabs on two machines can pass the staleness check together. Within one
// instance this collapses them; across instances the floor above holds the
// duplicate rate to a handful a day, and every write in the sync is an upsert,
// so losing that race costs time rather than correctness.
let inFlight: Promise<unknown> | null = null;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("k");
  if (!screenTokenValid(token)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const current = await latestSnapshot();
  const age = current ? Date.now() - Date.parse(current.computedAt) : Infinity;
  if (age < STALE_AFTER_MS) {
    return NextResponse.json({ refreshed: false, ageMs: age }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!inFlight) {
    inFlight = run().finally(() => {
      inFlight = null;
    });
  }

  try {
    await inFlight;
  } catch (e) {
    return NextResponse.json({ refreshed: false, error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ refreshed: true }, { headers: { "Cache-Control": "no-store" } });
}

async function run() {
  // Same order as /api/sync: pull, then recompute. The snapshot is written even
  // when a leg failed, because carry-forward inside computeSnapshot keeps the
  // last known figures on the wall rather than blanking them.
  await syncServiceTitan(false);
  await storeSnapshot(await computeSnapshot());
}
