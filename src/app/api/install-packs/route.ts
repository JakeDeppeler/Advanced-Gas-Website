import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { runInstallPacks } from "@/lib/installpack/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Put install packs on booked installs that need one, a couple a call — see
 * src/lib/installpack/run.ts. The Actions sync calls it after each pull and a
 * Vercel cron each weekday morning, beside the wall board's refresh, which
 * makes one at a time while the board or a portal page is open.
 *
 * Guarded by CRON_SECRET, which Vercel's cron sends as a bearer token.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase or ServiceTitan not configured" }, { status: 503 });
  }
  const started = Date.now();
  try {
    const r = await runInstallPacks({ max: 2, deadline: started + 55_000 });
    return NextResponse.json({ ok: r.ran.every((x) => x.did !== "failed"), ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
