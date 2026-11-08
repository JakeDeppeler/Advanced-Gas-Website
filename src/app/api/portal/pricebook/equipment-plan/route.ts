import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { applyPriceChanges } from "@/lib/pricebook/equipmentPlan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Each item is three calls (read, write, read back); this many fit in a function's minute with room to spare. */
const PER_CALL = 10;

/**
 * POST { ids } — write up to PER_CALL of the saved equipment price changes to
 * the ServiceTitan pricebook. Admins only: it changes what every quote charges.
 */
export async function POST(req: Request) {
  const user = await getPortalUser();
  if (!user || !can(user, "manage_users")) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  if (!serviceTitanConfigured()) return NextResponse.json({ ok: false, error: "ServiceTitan isn’t connected." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!ids.length || ids.length > PER_CALL) return NextResponse.json({ ok: false, error: `Send 1 to ${PER_CALL} items at a time.` }, { status: 400 });
  try {
    return NextResponse.json(await applyPriceChanges(ids));
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Couldn’t save the progress. ${(e as Error).message.slice(0, 160)}` }, { status: 502 });
  }
}
