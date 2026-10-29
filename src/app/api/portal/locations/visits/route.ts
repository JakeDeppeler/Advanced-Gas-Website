import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { swapTech } from "@/lib/locations/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Each visit is two calls to ServiceTitan; this many fit in a function's minute with room to spare. */
const PER_CALL = 12;

/**
 * POST { appointmentIds, from, to } — swap one tech for another on up to
 * PER_CALL visits. The page sends a day's worth in slices and shows progress.
 * Admins only, the same as the rest of Site locations.
 */
export async function POST(req: Request) {
  const user = await getPortalUser();
  if (!user || !can(user, "manage_users")) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  if (!serviceTitanConfigured()) return NextResponse.json({ ok: false, error: "ServiceTitan isn’t connected." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ids = Array.isArray(body?.appointmentIds) ? body.appointmentIds.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  const from = Number(body?.from);
  const to = Number(body?.to);
  if (!ids.length || ids.length > PER_CALL) return NextResponse.json({ ok: false, error: `Send 1 to ${PER_CALL} visits at a time.` }, { status: 400 });
  if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= 0 || from === to) {
    return NextResponse.json({ ok: false, error: "Pick two different techs." }, { status: 400 });
  }

  try {
    return NextResponse.json({ ok: true, results: await swapTech(ids, from, to) });
  } catch (e) {
    // Only the live read of who's on the visits gets here; nothing was changed.
    return NextResponse.json({ ok: false, error: `Couldn’t read who’s on the visits from ServiceTitan, so nothing was changed. ${(e as Error).message.slice(0, 160)}` }, { status: 502 });
  }
}
