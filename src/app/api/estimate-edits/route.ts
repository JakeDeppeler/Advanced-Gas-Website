import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { applyEstimateEdits } from "@/lib/ducted/estimateEdits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Run the queued changes to open quotes' lines (src/lib/ducted/estimateEdits.ts)
 * on their own, rather than waiting for the end of the sweep, which can spend
 * its minute before it gets there. Called by pg_cron's portal_cron_call.
 *
 * Guarded by CRON_SECRET, which the scheduled callers send as a bearer token.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase or ServiceTitan not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await applyEstimateEdits(Date.now() + 55_000)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
