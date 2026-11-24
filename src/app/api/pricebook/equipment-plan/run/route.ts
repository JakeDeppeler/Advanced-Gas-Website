import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { saveSettings } from "@/lib/portal/db";
import { logAuto } from "@/lib/automation/log";
import { applyPriceChanges, loadPricePlan, PLAN_KEY } from "@/lib/pricebook/equipmentPlan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Each item is three calls (read, write, read back); a slice this size, again while time is left. */
const SLICE = 5;
const BUDGET_MS = 40_000;

/**
 * The saved equipment price plan, written to the ServiceTitan pricebook by
 * the after-sync schedule, once it has Jake's go-ahead (plan.approved). The
 * same write as the button on Our prices (equipmentPlan.ts applyPriceChanges):
 * each item's live price is read first and left alone if someone has changed
 * it since the plan was made, then read back after. An item is tried once:
 * one left alone or refused stays on the page with the reason, not retried
 * every ten minutes. Nothing to do once every item has been tried.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase or ServiceTitan not configured" }, { status: 503 });
  }
  const started = Date.now();
  try {
    const plan = await loadPricePlan();
    if (!plan?.approved || plan.approved.finished) return NextResponse.json({ ok: true, idle: plan?.approved?.finished ? "done" : "nothing approved" });
    const todo = plan.changes.filter((c) => !plan.done[String(c.id)]).map((c) => c.id);
    let ok = 0, notOk = 0;
    const left: string[] = [];
    for (let k = 0; k < todo.length && Date.now() - started < BUDGET_MS; k += SLICE) {
      const r = await applyPriceChanges(todo.slice(k, k + SLICE));
      for (const x of r.results) {
        if (x.ok) ok++;
        else { notOk++; left.push(`${plan.changes.find((c) => c.id === x.id)?.name ?? x.id}: ${x.detail ?? "not changed"}`); }
      }
    }
    const after = await loadPricePlan();
    const remaining = after ? after.changes.filter((c) => !after.done[String(c.id)]).length : 0;
    if (after?.approved && !remaining) {
      after.approved.finished = new Date().toISOString();
      await saveSettings(PLAN_KEY, after);
    }
    if (ok || notOk) {
      await logAuto([{
        at: new Date().toISOString(), kind: "equipmentPrices", ok: notOk === 0,
        title: `Equipment prices: ${ok} updated in ServiceTitan${notOk ? `, ${notOk} left alone` : ""}`,
        detail: [remaining ? `${remaining} to go` : "all done", ...left.slice(0, 5)].join(". ").slice(0, 600),
      }]).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, updated: ok, leftAlone: notOk, remaining, left: left.slice(0, 20) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 500 });
  }
}
