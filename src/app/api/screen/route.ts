import { NextResponse } from "next/server";
import { latestSnapshot } from "@/lib/metrics";
import { screenTokenValid } from "@/lib/screenAuth";
import { supabaseConfigured } from "@/lib/supabase";

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
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const snapshot = await latestSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "No snapshot yet — run the sync job" }, { status: 503 });
  }

  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
