import "server-only";
import { createHash } from "node:crypto";
import { sbInsert, sbSelectOne, sbUpdateReturning } from "@/lib/dashboard/db";
import { TZ } from "@/lib/dashboard/dates";
import { site } from "@/lib/site";
import { draftWeek, loadOrderingSettings, loadSuppliers, loadWeekInputs, type DraftResult } from "./db";
import { nextWeek, thisWeek, toApproveEmail, todayMelbourne, workRef, type NewToOrder, type PlannedLine, type Week } from "./plan";
import { sendReadyNotice } from "./send";

/**
 * Draft whatever has been sold and booked since the last draft, and tell the
 * office if anything is new. Run after every ServiceTitan pull — by the wall
 * board's refresh (every couple of minutes while it's on screen), by the
 * Actions sync, and once each weekday morning by a Vercel cron as a backstop —
 * so a job booked in for two days' time is on an order to approve within
 * minutes rather than when someone remembers to press Draft.
 *
 * This week is drafted every day; next week from Wednesday, the week-before
 * rhythm the orders were built around (combined suppliers reach to the end of
 * next week either way). Nothing goes to a supplier from here: each draft
 * waits for approval on Supply › Next week. Already-ordered lines are never
 * ordered again, even if the job moves; lines on drafts the office cancelled
 * are left out.
 *
 * It only drafts when what it drafts from — the bookings and quotes for today
 * to the end of next week, and the date itself — has changed since last time,
 * and only 6am–7pm on weekdays unless forced. Several callers can arrive at
 * once (two screens, the cron), and two drafting together would each rewrite
 * the same draft's lines, so each run first claims the work in one
 * conditional update on portal_settings: only a caller that sees a changed
 * fingerprint and no run in progress gets the row back.
 */

const KEY = "ordering_last_draft";
const RUN_FOR_MS = 3 * 60_000;

type State = { fingerprint: string; running_until: string; at?: string };

export type AutoDraftResult =
  | { ok: true; skipped: string }
  | { ok: true; weeks: { week: Week; created: number; updated: number; removed: number; added: number; workAdded: number }[];
      newLines: number; newWorkOrders: number; problems: number; notified: string | null };

async function claim(fingerprint: string, force: boolean): Promise<boolean> {
  const now = new Date();
  // The row has to exist for the conditional update to have something to match.
  const row = await sbSelectOne<{ value: State }>("portal_settings", `select=value&key=eq.${KEY}`);
  if (!row) {
    await sbInsert("portal_settings", { key: KEY, value: { fingerprint: "", running_until: "" }, updated_at: now.toISOString() })
      .catch(() => undefined); // someone else inserted it first: fine
  }
  const filter = [
    `key=eq.${KEY}`,
    // An ISO time compares correctly as text; "" is before every one of them.
    `value->>running_until=lt.${encodeURIComponent(now.toISOString())}`,
    ...(force ? [] : [`value->>fingerprint=neq.${fingerprint}`]),
  ].join("&");
  const got = await sbUpdateReturning("portal_settings", filter, {
    value: { fingerprint, running_until: new Date(now.getTime() + RUN_FOR_MS).toISOString(), at: now.toISOString() },
    updated_at: now.toISOString(),
  });
  return got.length > 0;
}

async function release(fingerprint: string) {
  await sbUpdateReturning("portal_settings", `key=eq.${KEY}`, {
    value: { fingerprint, running_until: "", at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }).catch(() => undefined);
}

export async function autoDraft(opts: { force?: boolean; anyHour?: boolean } = {}): Promise<AutoDraftResult> {
  const now = new Date();
  const today = todayMelbourne();
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat, Melbourne date
  // anyHour: someone has To order open and asked for it fresh, so the office
  // hours don't apply; the fingerprint still stops it redrafting for nothing.
  if (!opts.force && !opts.anyHour) {
    const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(now));
    if (dow === 0 || dow === 6 || hour < 6 || hour >= 19) return { ok: true, skipped: "outside office hours" };
  }
  const weeks: Week[] = [thisWeek(now), ...(dow >= 3 || dow === 0 ? [nextWeek(now)] : [])];
  // Monday and Tuesday: next week's electrician work orders still, the rest of next week on Wednesday.
  const workOnlyNext = weeks.length === 1;

  // The date and the weeks are in it, so the first run of each weekday (and
  // Wednesday's, when next week comes in) always drafts: that is the morning run.
  const inputs = await loadWeekInputs({ start: today, end: nextWeek(now).end });
  const fingerprint = createHash("sha1").update(JSON.stringify({ today, weeks, inputs })).digest("hex");
  if (!(await claim(fingerprint, !!opts.force))) return { ok: true, skipped: "no change since the last draft, or a draft is running" };

  const runs: { week: Week; r: DraftResult }[] = [];
  try {
    // This week first: a combined supplier's draft then settles on next
    // week's run if both are drafted, the same as pressing Draft on each tab.
    for (const week of weeks) runs.push({ week, r: await draftWeek(week, { auto: true }) });
    if (workOnlyNext) runs.push({ week: nextWeek(now), r: await draftWeek(nextWeek(now), { auto: true, workOnly: true }) });
  } catch (e) {
    // Not marked done, so the next caller tries again.
    await release("");
    throw e;
  }
  await release(fingerprint);

  // A line can be "added" by the first week's run and moved by the second; count it once.
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
  return {
    ok: true,
    weeks: runs.map(({ week, r }) => ({ week, created: r.created, updated: r.updated, removed: r.removed, added: r.added.length, workAdded: r.addedWork.length })),
    newLines: seen.size, newWorkOrders: work.length, problems: problems.length, notified,
  };
}
