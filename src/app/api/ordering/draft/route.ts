import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { draftWeek, loadOrderingSettings, loadSuppliers } from "@/lib/ordering/db";
import { linesTotal, nextWeek, readyEmail } from "@/lib/ordering/plan";
import { sendReadyNotice } from "@/lib/ordering/send";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Wednesday morning: draft next week's supplier orders and electrician work
 * orders from the bookings and sold quotes, then tell the office they're
 * ready. Nothing goes to a supplier from here — sending is a button on
 * Supply › Next week.
 *
 * Called by .github/workflows/order-drafts.yml with the CRON_SECRET the sync
 * uses. Twice, an hour apart, so one of them lands at 7am Melbourne either
 * side of daylight saving; the second finds nothing new to create and stays
 * quiet.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  try {
    const week = nextWeek(new Date());
    const r = await draftWeek(week);
    let notified: string | null = null;
    if (r.created > 0) {
      const [settings, suppliers] = await Promise.all([loadOrderingSettings(), loadSuppliers()]);
      const name = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;
      const parts = readyEmail({
        week,
        orders: r.plan.orders.map((o) => ({ name: name(o.supplier_id), lines: o.lines.length, total: linesTotal(o.lines) })),
        workOrders: r.plan.workOrders.length,
        problems: r.plan.problems,
        link: `${site.url.replace(/\/$/, "")}/portal/supply/next-week`,
      });
      const err = await sendReadyNotice(parts, settings.replyTo);
      notified = err ? `notice failed: ${err}` : settings.replyTo;
    }
    return NextResponse.json({
      ok: true, week, created: r.created, updated: r.updated, removed: r.removed,
      orders: r.plan.orders.length, workOrders: r.plan.workOrders.length, problems: r.plan.problems.length, notified,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
