import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { addQuoteTemplates } from "@/lib/pricebook/quoteTemplatesAdd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The 15 Nov quote templates into ServiceTitan, as many as fit a call — see
 * src/lib/pricebook/quoteTemplatesAdd.ts. Called by the after-sync schedule,
 * not the sync itself: the sync already uses half its minute, and a hundred
 * or so writes would push the wall board's snapshot past the end of it. Once
 * everything is made it answers "all done" and does nothing.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase or ServiceTitan not configured" }, { status: 503 });
  }
  try {
    const r = await addQuoteTemplates(40_000);
    return NextResponse.json({ ok: r.failed.length === 0, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
