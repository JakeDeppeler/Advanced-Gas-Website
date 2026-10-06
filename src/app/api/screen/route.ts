import { NextResponse } from "next/server";
import { latestSnapshot } from "@/lib/dashboard/metrics";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { readRemote } from "@/lib/board/remote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polled by the wall display every 30s. Reads one pre-computed row — no upstream
// API calls happen here, so the screen paints instantly and never shows a
// spinner while Xero or ServiceTitan is slow.

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("k");
  if (!screenTokenValid(token)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const snapshot = await latestSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "No snapshot yet — run the sync job" }, { status: 503 });
  }

  // The portal's remote rides along with the figures, so a board that isn't
  // being driven costs no extra request to hear about it.
  const remote = await readRemote().catch(() => null);
  return NextResponse.json({ ...snapshot, remote }, {
    headers: { "Cache-Control": "no-store" },
  });
}
