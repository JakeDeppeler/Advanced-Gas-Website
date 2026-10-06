import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { refreshBoard } from "@/lib/dashboard/refresh";

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

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("k");
  if (!screenTokenValid(token)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const r = await refreshBoard();
  return NextResponse.json(r, { status: r.error ? 500 : 200, headers: { "Cache-Control": "no-store" } });
}
