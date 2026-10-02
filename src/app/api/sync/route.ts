import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { computeSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { syncServiceTitan } from "@/lib/dashboard/stSync";

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
    sources: snapshot.sources,
  });
}
