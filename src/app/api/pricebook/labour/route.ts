import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import {
  applyRefrigerant, applyServicePrices, applyTemplatePrices, planServicePrices, planTemplatePrices, recordLabourRun,
} from "@/lib/pricebook/labourSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Labour pricing → ServiceTitan (src/lib/pricebook/labour.ts has the rules).
//
//   GET /api/pricebook/labour?what=services            dry run: services at hours × crew rate
//   GET /api/pricebook/labour?what=services&apply=1    write them (up to `limit`, default 60)
//   GET /api/pricebook/labour?what=templates           dry run: aircon templates rebuilt
//   GET /api/pricebook/labour?what=templates&apply=1   write them (up to `limit`, default 15)
//
// Every run is a row in pricebook_sync_runs (supplier labour-services or
// labour-templates). Driven by .github/workflows/pricebook-labour.yml.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  if (!serviceTitanConfigured()) return NextResponse.json({ ok: false, error: "ServiceTitan credentials not set" }, { status: 503 });

  const url = new URL(req.url);
  const what = url.searchParams.get("what") === "templates" ? "templates" : "services";
  const apply = url.searchParams.get("apply") === "1";
  // A template is a PATCH and a read-back of a large record; fifteen fits the
  // function's minute with room. Services are small.
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || (what === "templates" ? 15 : 60)));
  const started = Date.now();

  try {
    if (what === "services") {
      // Services, and the refrigerant priced per kg, in one run.
      const plan = await planServicePrices();
      const summary = { rates: plan.rates, toUpdate: plan.changes.length, unchanged: plan.unchanged, skipped: plan.skipped.length, refrigerant: plan.materialChanges.length };
      const log = [...plan.changes, ...plan.materialChanges.map((m) => ({ ...m, kind: "refrigerant" }))];
      if (!apply) {
        const runId = await recordLabourRun("services", "dry-run", summary, log);
        return NextResponse.json({ ok: true, what, mode: "dry-run", runId, durationMs: Date.now() - started, summary, changes: plan.changes, materials: plan.materialChanges, skipped: plan.skipped });
      }
      const result = await applyServicePrices(plan.changes, limit);
      const gas = await applyRefrigerant(plan.materialChanges);
      const merged = { applied: result.applied + gas.applied, verified: result.verified + gas.verified, failed: [...result.failed, ...gas.failed], remaining: result.remaining };
      const runId = await recordLabourRun("services", "apply", summary, log, merged);
      return NextResponse.json({ ok: merged.failed.length === 0, what, mode: "apply", runId, durationMs: Date.now() - started, summary, changes: plan.changes.slice(0, limit), materials: plan.materialChanges, ...merged });
    }

    const plan = await planTemplatePrices();
    const rows = plan.plans.map(({ items: _items, ...p }) => p);
    const summary = { rates: plan.rates, toRebuild: plan.plans.length, skipped: plan.skipped.length };
    if (!apply) {
      const runId = await recordLabourRun("templates", "dry-run", summary, rows);
      return NextResponse.json({ ok: true, what, mode: "dry-run", runId, durationMs: Date.now() - started, summary, templates: rows, skipped: plan.skipped });
    }
    const result = await applyTemplatePrices(plan.plans, limit);
    const runId = await recordLabourRun("templates", "apply", summary, rows, result);
    return NextResponse.json({ ok: result.failed.length === 0, what, mode: "apply", runId, durationMs: Date.now() - started, summary, templates: rows.slice(0, limit), ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, what, error: (e as Error).message.slice(0, 500) }, { status: 502 });
  }
}
