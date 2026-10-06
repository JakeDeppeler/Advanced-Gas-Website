import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { computeSnapshot, storeSnapshot } from "@/lib/dashboard/metrics";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { syncServiceTitan } from "@/lib/dashboard/stSync";
import { runDueReports } from "@/lib/reports/run";
// The portal owns the Xero refresh loop. This turns it on a schedule, as the
// board's own refresh route does — safe to call from both because ensureXeroToken
// claims the refresh in the database first.
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
   * It lives thirty minutes. Nothing used to refresh it on a schedule, so it
   * lapsed whenever nobody had a portal Finance page open — which overnight is
   * always — and the board's overdue figures were thirteen hours old by morning
   * with the footer saying so.
   *
   * This leg is the overnight one. The schedule here asks for every ten minutes
   * and GitHub gives a few runs a day on a repository this quiet, which is not
   * enough on its own for a half-hour token; the board's refresh route carries
   * the working day. Both call it, and ensureXeroToken takes an atomic claim
   * before refreshing so the two can never race.
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

  // The evening reports' backstop: anything due and not yet sent goes now,
  // from the snapshot just taken. A failure here is the reports', not the sync's.
  const reports = await runDueReports(new Date(), { ...snapshot, computedAt: new Date().toISOString() })
    .catch((e) => [{ key: "reports", status: "error", error: (e as Error).message }]);

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    sync,
    xeroToken,
    reports,
    sources: snapshot.sources,
  });
}
