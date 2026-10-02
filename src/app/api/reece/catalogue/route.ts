import { NextResponse } from "next/server";
import { dashboardDbConfigured, q, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { reeceCataloguePage, reeceConfigured, reeceConnection, upsertSupplierItems } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls the maX catalogue (with our contractor pricing) into supplier_items.
// Driven nightly by .github/workflows/pricebook-sync.yml.
//
// Paged and capped per invocation, with the cursor stored in portal_sync_state,
// so a full catalogue takes several runs and each resumes where the last
// stopped. Pass ?reset=1 to start from the first page again.
//
// Skips cleanly when Reece credentials are not set — the price-file upload is
// the source then, and nothing downstream knows the difference.

const PAGE_CAP = 20;

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  if (!reeceConfigured()) {
    return NextResponse.json({ ok: true, status: "skipped", reason: "Reece API credentials not set — using uploaded price files" });
  }
  const connection = await reeceConnection();
  if (connection.status !== "connected") {
    return NextResponse.json({ ok: true, status: "skipped", reason: "Reece maX not connected — open /api/reece/connect?k=<SCREEN_TOKEN>" });
  }

  const reset = new URL(req.url).searchParams.get("reset") === "1";
  const startedAt = new Date().toISOString();

  const state = await sbSelectOne<{ continue_from: string | null }>(
    "portal_sync_state",
    [q.select("continue_from"), q.eq("provider", "reece"), q.eq("resource", "catalogue")].join("&"),
  );

  let cursor = reset ? null : state?.continue_from ?? null;
  let stored = 0;
  let pages = 0;
  let exhausted = false;

  try {
    for (; pages < PAGE_CAP; pages++) {
      const page = await reeceCataloguePage(cursor);
      if (page.items.length) stored += await upsertSupplierItems(page.items, "api");
      if (!page.next || page.rawCount === 0) {
        exhausted = true;
        cursor = null;
        break;
      }
      cursor = page.next;
    }

    await sbUpsert(
      "portal_sync_state",
      [
        {
          provider: "reece",
          resource: "catalogue",
          continue_from: cursor,
          last_run_at: startedAt,
          last_success_at: new Date().toISOString(),
          last_status: exhausted ? "up-to-date" : "more-pending",
          last_error: null,
          records_synced: stored,
        },
      ],
      "provider,resource",
    );
    return NextResponse.json({ ok: true, status: "ok", pages, stored, exhausted });
  } catch (e) {
    const message = (e as Error).message;
    await sbUpsert(
      "portal_sync_state",
      [{ provider: "reece", resource: "catalogue", last_run_at: startedAt, last_status: "error", last_error: message }],
      "provider,resource",
    ).catch(() => undefined);
    return NextResponse.json({ ok: false, status: "error", pages, stored, error: message }, { status: 502 });
  }
}
