import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { autoDraft } from "@/lib/ordering/autoDraft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Draft whatever has been sold and booked since the last draft — see
 * src/lib/ordering/autoDraft.ts for what that means and when it does nothing.
 *
 * `?mode=refresh` drafts only if something changed, in office hours: that is
 * how the Actions sync (after each pull) and the weekday-morning Vercel cron
 * call it. Without it, it drafts now regardless — the "Order drafts"
 * workflow's Run button. The wall board's refresh calls autoDraft directly.
 *
 * Guarded by CRON_SECRET, which Vercel's cron sends as a bearer token.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  try {
    const force = new URL(req.url).searchParams.get("mode") !== "refresh";
    return NextResponse.json(await autoDraft({ force }));
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
