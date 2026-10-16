import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { MAX_PER_POLL, leadWatermark, leadsSince } from "@/lib/leads/recent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * New enquiries, for the board's call-now alert.
 *
 * Its own route, polled far faster than the figures are. The snapshot is on a
 * 25-second recompute floor and the board reads it every 30 seconds, which is
 * the right cadence for money owed and the wrong one entirely for a rule the
 * office states in seconds: a lead riding on the snapshot can reach the wall
 * with fifteen of its sixty seconds left. This reads one indexed slice of one
 * table and nothing else.
 *
 * Without `since` it answers with the watermark and no leads. That is the board
 * opening: everything already in the table is history, and a television that
 * reloads itself overnight must not wake the room with yesterday's enquiries.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!screenTokenValid(url.searchParams.get("k"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const since = url.searchParams.get("since");
  const headers = { "Cache-Control": "no-store" };

  try {
    if (!since || Number.isNaN(Date.parse(since))) {
      return NextResponse.json({ next: await leadWatermark(), leads: [] }, { headers });
    }

    const { next, leads } = await leadsSince(since);
    /*
     * At most three take the wall, and they are the newest three.
     *
     * Each one holds it for a minute, so a backlog arriving in one poll — a
     * database that was unreachable for an hour, a form that queued — would
     * otherwise be a quarter of an hour in which the board shows no figures at
     * all. The watermark still moves past every one of them, so the ones not
     * shown are gone rather than queued up behind these.
     */
    return NextResponse.json({ next, leads: leads.slice(-MAX_PER_POLL) }, { headers });
  } catch (e) {
    // The board keeps its own watermark on a failure, so nothing is lost: the
    // next poll asks for the same window again.
    return NextResponse.json({ error: (e as Error).message }, { status: 503, headers });
  }
}
