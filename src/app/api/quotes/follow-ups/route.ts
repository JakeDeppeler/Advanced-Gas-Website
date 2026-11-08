import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { runFollowUps } from "@/lib/quotes/followUps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The quote follow-up emails (lib/quotes/followUps.ts), from the ten-minute
 * schedule. Does nothing while switched off. `?dry=1` says what each quote
 * is up to and what would go, without sending or writing anything.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: true, off: "Supabase not configured" });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  return NextResponse.json({ ok: true, dry, ...(await runFollowUps(new Date(), { dry })) });
}
