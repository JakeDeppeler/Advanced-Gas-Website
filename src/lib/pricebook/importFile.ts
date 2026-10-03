import "server-only";
import { q, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
import { parsePriceFile, type ColumnMap } from "@/lib/pricebook/reeceFile";
import { upsertSupplierItems } from "@/lib/pricebook/reece";

export type ImportReport = {
  ok: boolean;
  dryRun: boolean;
  fileName: string | null;
  rows: number;
  items: number;
  skipped: number;
  columns: unknown;
  unmappedHeaders: string[];
  priceIncludedGst: boolean;
  warnings: string[];
  sample: unknown[];
  stored: number;
  error?: string;
};

/**
 * A Reece maX price file, parsed and stored.
 *
 * Shared by the scheduled import (api/reece/import) and the portal's upload
 * button, so a file brought in either way lands identically. Moved here from
 * the route unchanged.
 */
export async function importPriceFile(text: string, fileName: string | null, dryRun: boolean): Promise<{ status: number; report: ImportReport | { ok: false; error: string } }> {
  const settings = await sbSelectOne<{ value: { fileColumns?: ColumnMap } }>(
    "portal_settings",
    [q.select("value"), q.eq("key", "pricebook")].join("&"),
  );

  let parsed;
  try {
    parsed = parsePriceFile(text, settings?.value?.fileColumns ?? {});
  } catch (e) {
    return { status: 422, report: { ok: false, error: (e as Error).message } };
  }

  const report: ImportReport = {
    ok: true,
    dryRun,
    fileName,
    rows: parsed.rows,
    items: parsed.items.length,
    skipped: parsed.skipped,
    columns: parsed.columns,
    unmappedHeaders: parsed.unmappedHeaders,
    priceIncludedGst: parsed.priceIncludedGst,
    warnings: parsed.warnings,
    sample: parsed.items.slice(0, 5).map(({ raw: _raw, ...item }) => item),
    stored: 0,
  };

  if (dryRun) return { status: 200, report };

  try {
    report.stored = await upsertSupplierItems(parsed.items, "file");
  } catch (e) {
    return { status: 500, report: { ...report, ok: false, error: (e as Error).message } };
  }

  await sbUpsert(
    "portal_sync_state",
    [
      {
        provider: "reece",
        resource: "price-file",
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_status: "up-to-date",
        last_error: fileName,
        records_synced: report.stored,
      },
    ],
    "provider,resource",
  ).catch((e: Error) => console.warn("portal_sync_state not updated:", e.message));

  return { status: 200, report };
}
