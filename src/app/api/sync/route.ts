import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { computeSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { syncServiceTitan } from "@/lib/dashboard/stSync";
// The portal owns the Xero refresh loop; this is the one scheduled thing that
// turns it. See ensureXeroToken for why it may only ever be called from here.
import { ensureXeroToken } from "@/lib/portal/xero";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Driven by the Dashboard sync workflow (.github/workflows/dashboard-sync.yml).
// Pulls ServiceTitan into the replica, recomputes the snapshot the screen reads,
// and stores it.
//
// Pass ?reset=1 to discard the stored continuation tokens and re-export from the
// beginning — needed once after go-live, or if the replica is ever rebuilt.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const reset = new URL(req.url).searchParams.get("reset") === "1";
  const startedAt = Date.now();

  /*
   * Keep Xero's token alive before anything reads it.
   *
   * It lives thirty minutes; this runs every ten, around the clock. Nothing
   * else refreshed it, so it lapsed whenever nobody opened a portal Finance
   * page — which overnight is always — and the board's overdue figures went
   * amber by morning with a fourteen-hour-old reading behind them.
   *
   * Failure here is not failure of the sync: a Xero that cannot be reached is
   * a tile carrying its last value, and ServiceTitan is most of the board.
   */
  const xeroToken = await ensureXeroToken().catch((e) => ({ ok: false, reason: (e as Error).message }));

  const sync = await syncServiceTitan(reset);

  // The snapshot is computed even when a sync leg failed — carry-forward inside
  // computeSnapshot keeps the last known value on screen rather than a blank.
  const snapshot = await computeSnapshot();

  try {
    await storeSnapshot(snapshot);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message, sync }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    sync,
    xeroToken,
    sources: snapshot.sources,
  });
}
