import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { readPlan } from "@/lib/ducted/planRead";
import { planOptions, planToTakeoff } from "@/lib/ducted/planShape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Read the duct plan saved in portal_settings.plan_probe ({ data?, mime?, notes })
 * as the Ducted quote page would, and save what came back to plan_probe_result.
 * For checking a real drawing's read from outside a signed-in page; it writes
 * nothing to ServiceTitan. Guarded by CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  const probe = await getSettings<{ data?: string; mime?: string; notes?: string }>("plan_probe").catch(() => null);
  if (!probe || (!probe.data && !probe.notes)) return NextResponse.json({ ok: false, error: "nothing in plan_probe" });
  const started = Date.now();
  try {
    // Notes alone are read as the page reads them when the designer's CSV was dropped instead of a drawing.
    const read = await readPlan(probe.data && probe.mime ? { data: probe.data, mime: probe.mime } : null, probe.notes ?? "");
    await saveSettings("plan_probe_result", { at: new Date().toISOString(), ms: Date.now() - started, read, takeoff: planToTakeoff(read), options: planOptions(read) });
    return NextResponse.json({ ok: true, ms: Date.now() - started, zones: read.zones.length });
  } catch (e) {
    await saveSettings("plan_probe_result", { at: new Date().toISOString(), ms: Date.now() - started, error: (e as Error).message });
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
