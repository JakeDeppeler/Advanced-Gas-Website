import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { applyPlan, planPricebookSync, recordRun } from "@/lib/pricebook/stPricebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reece pricing → ServiceTitan pricebook.
//
//   GET /api/pricebook/sync              dry run: plan only, nothing written
//   GET /api/pricebook/sync?apply=1      write up to `limit` changes (default 100)
//
// Every run, dry or applied, is recorded in pricebook_sync_runs with its full
// change list. A capped apply is safe to repeat until `remaining` is 0: each
// plan is computed from the live pricebook, so what already persisted drops out.
// Driven by .github/workflows/pricebook-sync.yml (dry run nightly, apply on demand).

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  if (!serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "ServiceTitan credentials not set — see DASHBOARD.md step 4" }, { status: 503 });
  }

  const url = new URL(req.url);
  const apply = url.searchParams.get("apply") === "1";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const startedAt = Date.now();

  let plan;
  try {
    plan = await planPricebookSync();
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }

  if (!apply) {
    const runId = await recordRun("dry-run", plan);
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      runId,
      durationMs: Date.now() - startedAt,
      vendor: plan.vendor,
      settings: plan.settings,
      summary: plan.summary,
      changes: plan.changes.slice(0, 200),
      missingInSupplier: plan.missingInSupplier.slice(0, 50),
    });
  }

  const result = await applyPlan(plan, limit);
  const runId = await recordRun("apply", plan, result);
  return NextResponse.json({
    ok: result.failed.length === 0,
    mode: "apply",
    runId,
    durationMs: Date.now() - startedAt,
    vendor: plan.vendor,
    summary: plan.summary,
    applied: result.applied,
    verified: result.verified,
    failed: result.failed,
    remaining: result.remaining,
  });
}
