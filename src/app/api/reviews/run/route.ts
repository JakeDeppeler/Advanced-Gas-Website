import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { runReviewRequests } from "@/lib/reviews/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The Google review emails (lib/reviews/requests.ts), from the ten-minute schedule. Does nothing while switched off. */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: true, off: "Supabase not configured" });
  return NextResponse.json({ ok: true, ...(await runReviewRequests()) });
}
