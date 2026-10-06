import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { refreshBoard } from "@/lib/dashboard/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The wall board page keeping its own figures fresh.
 *
 * The snapshot was only recomputed while the TV polled, so with the screen off
 * the portal page read "3 hours ago" however long it was left open. It asks
 * the same way the screen does, behind the portal's sign-in instead of the
 * screen token, and through the same floors — it can't make the server do
 * more than the TV already does.
 */
export async function POST() {
  const user = await getPortalUser();
  if (!user || !can(user, "overhead")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!dashboardDbConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const r = await refreshBoard();
  return NextResponse.json(r, { status: r.error ? 500 : 200, headers: { "Cache-Control": "no-store" } });
}
