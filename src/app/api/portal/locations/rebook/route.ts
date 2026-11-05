import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { applyMoves } from "@/lib/locations/rebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Each visit is up to three calls to ServiceTitan; this many fit in a function's minute with room to spare. */
const PER_CALL = 12;

/**
 * POST { customerId, appointmentIds } — move up to PER_CALL of a site's visits
 * to where its saved rebooking plan puts them. The page sends the plan in
 * slices and shows progress. Admins only, as the rest of Site locations.
 */
export async function POST(req: Request) {
  const user = await getPortalUser();
  if (!user || !can(user, "manage_users")) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  if (!serviceTitanConfigured()) return NextResponse.json({ ok: false, error: "ServiceTitan isn’t connected." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const customerId = Number(body?.customerId);
  const ids = Array.isArray(body?.appointmentIds) ? body.appointmentIds.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!Number.isInteger(customerId) || customerId <= 0) return NextResponse.json({ ok: false, error: "Which site?" }, { status: 400 });
  if (!ids.length || ids.length > PER_CALL) return NextResponse.json({ ok: false, error: `Send 1 to ${PER_CALL} visits at a time.` }, { status: 400 });

  try {
    return NextResponse.json(await applyMoves(customerId, ids));
  } catch (e) {
    // Only the live read of who's on the visits gets here; nothing was changed.
    return NextResponse.json({ ok: false, error: `Couldn’t read the visits from ServiceTitan, so nothing was changed. ${(e as Error).message.slice(0, 160)}` }, { status: 502 });
  }
}
