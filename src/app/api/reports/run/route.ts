import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { runDueReports } from "@/lib/reports/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends whichever of the day's, week's and month's reports are due. Called by
 * the Vercel schedule each evening (vercel.json), which sends the CRON_SECRET
 * the sync already uses; the ServiceTitan sync calls the same function as a
 * backstop. Due and already sent is a no-op, so it can run any number of times.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  try {
    const sent = await runDueReports();
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
