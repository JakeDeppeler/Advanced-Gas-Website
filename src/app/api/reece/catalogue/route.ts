import { NextResponse } from "next/server";
import { dashboardDbConfigured, q, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { reeceConfigured, reeceConnection, reecePriceFile, reeceTriggerPriceFile, toSupplierItem, upsertSupplierItems } from "@/lib/pricebook/reece";
import { parsePriceFile, type ColumnMap } from "@/lib/pricebook/reeceFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls our Reece price file into supplier_items. Driven nightly by
// .github/workflows/pricebook-sync.yml.
//
// Reece generates the file on their side, on a schedule of their own; this
// fetches whatever is current. A 204 from Reece means no file has been built
// yet (or the price-file settings have not been chosen in maX) and is reported
// as `pending`, not as an error. Pass ?trigger=1 to ask Reece to rebuild it
// first — it is queued, so the file lands on a later run, not this one.
//
// The CSV goes through the same parser as a manual maX upload, so the column
// mapping is visible in the response and pinnable in portal_settings.pricebook.
// Skips cleanly when Reece credentials are not set.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  if (!reeceConfigured()) {
    return NextResponse.json({ ok: true, status: "skipped", reason: "Reece API credentials not set — using uploaded price files" });
  }
  const connection = await reeceConnection();
  if (connection.status !== "ready") {
    return NextResponse.json({ ok: true, status: "skipped", reason: "No Reece customer identity — set REECE_CUSTOMER_NUMBER or complete /api/reece/connect" });
  }

  const url = new URL(req.url);
  const trigger = url.searchParams.get("trigger") === "1";
  const startedAt = new Date().toISOString();

  const state = async (patch: Record<string, unknown>) =>
    sbUpsert("portal_sync_state", [{ provider: "reece", resource: "catalogue", last_run_at: startedAt, ...patch }], "provider,resource").catch(
      () => undefined,
    );

  try {
    let triggered = false;
    if (trigger) {
      await reeceTriggerPriceFile();
      triggered = true;
    }

    const file = await reecePriceFile();
    if (file.status === "pending") {
      await state({ last_status: "pending", last_error: null });
      return NextResponse.json({
        ok: true,
        status: "pending",
        triggered,
        reason: "Reece has not generated a price file for this account yet. Choose the price-file setting in maX (Typical is the right size), then run again with ?trigger=1 and give it a while.",
      });
    }

    let items;
    let mapping: unknown = null;
    if (file.format === "MAX_CSV") {
      const settings = await sbSelectOne<{ value: { fileColumns?: ColumnMap } }>(
        "portal_settings",
        [q.select("value"), q.eq("key", "pricebook")].join("&"),
      );
      const parsed = parsePriceFile(file.text, settings?.value?.fileColumns ?? {});
      items = parsed.items;
      mapping = { columns: parsed.columns, unmappedHeaders: parsed.unmappedHeaders, priceIncludedGst: parsed.priceIncludedGst, warnings: parsed.warnings, skipped: parsed.skipped };
    } else {
      const j = file.json as { products?: unknown[]; items?: unknown[] } | unknown[];
      const list = Array.isArray(j) ? j : (j.products ?? j.items ?? []);
      items = (list as Record<string, unknown>[]).map(toSupplierItem).filter((i): i is NonNullable<typeof i> => i != null);
    }

    const stored = await upsertSupplierItems(items, "api");
    await state({ last_success_at: new Date().toISOString(), last_status: "up-to-date", last_error: null, records_synced: stored });
    return NextResponse.json({ ok: true, status: "ok", triggered, format: file.format, items: items.length, stored, mapping });
  } catch (e) {
    const message = (e as Error).message;
    await state({ last_status: "error", last_error: message });
    return NextResponse.json({ ok: false, status: "error", error: message }, { status: 502 });
  }
}
