import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { readRemote } from "@/lib/board/remote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The portal's remote, on its own. Boards ask for it every few seconds only
 * while somebody has the Remote page open; otherwise it comes with the figures.
 */
export async function GET(req: Request) {
  if (!screenTokenValid(new URL(req.url).searchParams.get("k"))) return new NextResponse("Not found", { status: 404 });
  if (!dashboardDbConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  return NextResponse.json(await readRemote(), { headers: { "Cache-Control": "no-store" } });
}
