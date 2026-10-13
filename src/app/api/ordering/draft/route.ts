import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { createHash } from "node:crypto";
import { TZ } from "@/lib/dashboard/dates";
import { draftWeek, loadOrderingSettings, loadSuppliers, loadWeekInputs, type DraftResult } from "@/lib/ordering/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { nextWeek, thisWeek, toApproveEmail, todayMelbourne, workRef, type NewToOrder, type PlannedLine, type Week } from "@/lib/ordering/plan";
import { sendReadyNotice } from "@/lib/ordering/send";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every weekday morning: draft whatever has been sold and booked since the
 * last run, so a job booked in for two days' time is on an order to approve
 * the same morning rather than waiting for someone to press Draft.
 *
 * This week is drafted every day. Next week is drafted from Wednesday — the
 * week-before rhythm the orders were built around; earlier in the week next
 * week's bookings are still moving, and three days' lead leaves time anyway.
 * (Combined suppliers already reach to the end of next week whichever week is
 * drafted.)
 *
 * Nothing goes to a supplier from here: each draft waits for approval on
 * Supply › Next week. Anything already ordered is never ordered again, even
 * if its install has moved — the move is listed for the office instead. Lines
 * on a draft the office cancelled are left out. The office is emailed only
 * when something new turned up, so a quiet morning sends nothing.
 *
 * `?mode=refresh` is what runs it: called after every ServiceTitan sync
 * (.github/workflows/dashboard-sync.yml, every ten minutes), so a job sold
 * and booked during the day is drafted, and the office told, within minutes.
 * It drafts only when the bookings and quotes it works from — or the date —
 * have changed since the last draft, and only 6am–7pm on weekdays; the first
 * refresh after 6am is the morning run. There is one caller, on purpose: two
 * runs drafting at once could each create the same order (the database now
 * refuses the second — migration 0069 — but better it never tries).
 *
 * Without `mode` it drafts unconditionally, whatever the hour — for the
 * "Order drafts" workflow's Run button.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  try {
    const now = new Date();
    const today = todayMelbourne();
    const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat, Melbourne date
    const weeks: Week[] = [thisWeek(now), ...(dow >= 3 || dow === 0 ? [nextWeek(now)] : [])];

    // What the drafts are worked out from, today to the end of next week. If
    // it hasn't changed since the last draft there is nothing to redraft.
    const inputs = await loadWeekInputs({ start: today, end: nextWeek(now).end });
    // The date and the weeks are in it too, so the first refresh of each
    // weekday (and Wednesday's, when next week comes in) always drafts: that
    // is the morning run.
    const fingerprint = createHash("sha1").update(JSON.stringify({ today, weeks, inputs })).digest("hex");
    if (new URL(req.url).searchParams.get("mode") === "refresh") {
      const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(now));
      if (dow === 0 || dow === 6 || hour < 6 || hour >= 19) return NextResponse.json({ ok: true, skipped: "outside office hours" });
      const last = await getSettings<{ fingerprint?: string }>("ordering_last_draft");
      if (last?.fingerprint === fingerprint) return NextResponse.json({ ok: true, skipped: "no change since the last draft" });
    }

    // This week first: a combined supplier's draft then settles on next week's
    // run if both are drafted, the same as pressing Draft on each tab.
    const runs: { week: Week; r: DraftResult }[] = [];
    for (const week of weeks) runs.push({ week, r: await draftWeek(week, { auto: true }) });
    await saveSettings("ordering_last_draft", { fingerprint, at: now.toISOString() });

    // A line can be "added" by the first run and moved by the second; count it once.
    const seen = new Set<string>();
    const bySupplier = new Map<string, PlannedLine[]>();
    for (const { r } of runs) {
      for (const a of r.added) {
        const k = `${a.supplier_id}:${a.line.job_id}:${a.line.sku_id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        bySupplier.set(a.supplier_id, [...(bySupplier.get(a.supplier_id) ?? []), a.line]);
      }
    }
    const work = [...new Map(runs.flatMap(({ r }) => r.addedWork).map((d) => [workRef(d), d])).keys()];
    const problems = runs.flatMap(({ r }) => r.plan.problems);

    let notified: string | null = null;
    if (bySupplier.size || work.length) {
      const [settings, suppliers] = await Promise.all([loadOrderingSettings(), loadSuppliers()]);
      const name = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;
      const orders: NewToOrder[] = [...bySupplier.entries()].map(([id, lines]) => ({ supplier: name(id), lines }));
      const parts = toApproveEmail({
        orders, workOrders: work, problems, today,
        // To this week's tab when anything new is for this week — that's the urgent end.
        link: `${site.url.replace(/\/$/, "")}/portal/supply/next-week${[...bySupplier.values()].flat().some((l) => (l.install_date ?? "") <= weeks[0].end) ? "?week=this" : ""}`,
      });
      const err = await sendReadyNotice(parts, settings.replyTo);
      notified = err ? `notice failed: ${err}` : settings.replyTo;
    }

    return NextResponse.json({
      ok: true,
      weeks: runs.map(({ week, r }) => ({ week, created: r.created, updated: r.updated, removed: r.removed, added: r.added.length, workAdded: r.addedWork.length })),
      newLines: seen.size, newWorkOrders: work.length, problems: problems.length, notified,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
