import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { sendWorkOrderSummary } from "@/lib/outlook/workOrderSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The end-of-day work orders email (lib/outlook/workOrderSummary.ts), from Vercel's daily cron. */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: true, off: "Supabase not configured" });
  return NextResponse.json({ ok: true, ...(await sendWorkOrderSummary()) });
}
