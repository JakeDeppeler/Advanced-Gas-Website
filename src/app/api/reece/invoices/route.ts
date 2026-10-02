import { NextResponse } from "next/server";
import { dashboardDbConfigured, q, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { reeceConfigured, reeceConnection, reeceInvoiceHeaders, reeceInvoices } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls Reece invoices and credit notes into reece_invoices. Driven nightly by
// .github/workflows/pricebook-sync.yml.
//
// Two passes: headers for the window (?days=, default 35, so a nightly run
// overlaps the previous one and nothing slips through a missed night), then
// details for any document not yet fetched, in batches of 100. Totals and
// due dates come from the detail record; the header has only the basics.

type Raw = Record<string, unknown>;
const num = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown) => (v == null ? null : String(v));
const dateOnly = (v: unknown) => {
  const s = str(v);
  return s ? s.slice(0, 10) : null;
};

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  if (!reeceConfigured()) return NextResponse.json({ ok: true, status: "skipped", reason: "Reece API credentials not set" });
  if ((await reeceConnection()).status !== "ready") {
    return NextResponse.json({ ok: true, status: "skipped", reason: "No Reece customer identity" });
  }

  const days = Math.min(366, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 35));
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const startedAt = new Date().toISOString();

  try {
    const headers = await reeceInvoiceHeaders(iso(from), iso(to));
    const now = new Date().toISOString();
    if (headers.length) {
      await sbUpsert(
        "reece_invoices",
        headers.map((h) => ({
          document_number: h.documentNumber,
          document_type: h.documentType,
          document_date: dateOnly(h.documentDate),
          customer_number: h.customerNumber,
          job_number: h.jobNumber,
          order_number: h.orderNumber,
          updated_at: now,
        })),
        "document_number",
      );
    }

    // Details for whatever has none yet, newest first, capped per run.
    const pending = await sbSelect<{ document_number: number }>(
      "reece_invoices",
      [q.select("document_number"), q.isNull("detail_fetched_at"), q.order("document_date", "desc"), "limit=300"].join("&"),
    );
    let detailed = 0;
    for (let i = 0; i < pending.length; i += 100) {
      const batch = pending.slice(i, i + 100).map((p) => p.document_number);
      const docs = await reeceInvoices(batch);
      if (!docs.length) break;
      await sbUpsert(
        "reece_invoices",
        docs.map((d: Raw) => {
          const totals = (d.totals ?? {}) as Raw;
          const docTotal = (totals.documentTotal ?? totals.total ?? {}) as Raw;
          return {
            document_number: num(d.documentNumber),
            document_type: str(d.documentType) ?? "UNKNOWN",
            document_date: dateOnly(d.documentDate),
            document_due_date: dateOnly(d.documentDueDate),
            customer_number: num((d.customer as Raw | undefined)?.customerNumber ?? d.customerNumber),
            job_number: str(d.jobNumber),
            order_number: str(d.orderNumber),
            total_ex_gst: num(docTotal.excludingGst ?? docTotal.exGst ?? docTotal.amountExcludingGst),
            total_inc_gst: num(docTotal.includingGst ?? docTotal.incGst ?? docTotal.amountIncludingGst),
            invoice_url: str(d.invoiceUrl),
            raw: d,
            detail_fetched_at: now,
            updated_at: now,
          };
        }).filter((r) => r.document_number != null),
        "document_number",
      );
      detailed += docs.length;
    }

    await sbUpsert(
      "portal_sync_state",
      [{ provider: "reece", resource: "invoices", last_run_at: startedAt, last_success_at: now, last_status: "up-to-date", last_error: null, records_synced: headers.length }],
      "provider,resource",
    ).catch(() => undefined);
    return NextResponse.json({ ok: true, status: "ok", window: { from: iso(from), to: iso(to) }, headers: headers.length, detailed, remaining: Math.max(0, pending.length - detailed) });
  } catch (e) {
    const message = (e as Error).message;
    await sbUpsert(
      "portal_sync_state",
      [{ provider: "reece", resource: "invoices", last_run_at: startedAt, last_status: "error", last_error: message }],
      "provider,resource",
    ).catch(() => undefined);
    return NextResponse.json({ ok: false, status: "error", error: message }, { status: 502 });
  }
}
