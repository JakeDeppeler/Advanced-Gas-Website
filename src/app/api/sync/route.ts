import { NextResponse } from "next/server";
import { computeSnapshot } from "@/lib/metrics";
import { cronAuthorised } from "@/lib/screenAuth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { syncServiceTitan } from "@/lib/stSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Driven by Vercel Cron (see vercel.json). Pulls ServiceTitan into the replica,
// recomputes the snapshot the screen reads, and stores it.
//
// Pass ?reset=1 to discard the stored continuation tokens and re-export from the
// beginning — needed once after go-live, or if the replica is ever rebuilt.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const reset = new URL(req.url).searchParams.get("reset") === "1";
  const startedAt = Date.now();

  const sync = await syncServiceTitan(reset);

  // The snapshot is computed even when a sync leg failed — carry-forward inside
  // computeSnapshot keeps the last known value on screen rather than a blank.
  const snapshot = await computeSnapshot();

  const { error } = await supabase()
    .from("portal_metrics_snapshot")
    .insert({ metrics: snapshot.metrics, sources: snapshot.sources });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, sync }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    sync,
    sources: snapshot.sources,
  });
}
