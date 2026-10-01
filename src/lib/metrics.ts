import { supabase } from "./supabase";
import { fetchXeroReceivables } from "./xero";
import {
  addDays,
  DEFAULT_WORKING_CALENDAR,
  isoDateMelbourne,
  startOfDayMelbourne,
  startOfMonthMelbourne,
  startOfWeekMelbourne,
  workingDaysInMonth,
  type WorkingCalendar,
} from "./dates";

// Computes one dashboard snapshot from the local replica. Nothing here calls
// ServiceTitan directly — the sync job owns that — so this stays fast and keeps
// working when an upstream API is down.

export type SourceState = "ok" | "stale" | "error" | "not-configured";

export type Metrics = {
  leadsToday: number;
  leadsWeek: number;
  leadsPrevWeek: number;
  uncontactedLeads: number;
  avgFirstResponseMins: number | null;
  jobsCompletedWeek: number;
  jobsScheduledNext7: number;
  estimatesOpenCount: number;
  estimatesOpenValue: number;
  closeRate30d: number | null;
  revenueInvoicedMtd: number;
  revenueTargetMonthly: number | null;
  revenuePacePct: number | null;
  soldMtd: number;
  salesTargetMonthly: number | null;
  salesPacePct: number | null;
  overdueTotal: number | null;
  overdueCount: number | null;
  receivablesTotal: number | null;
  topSuburbs: Array<{ suburb: string; count: number }>;

  // The two daily numbers, each recomputed every sync so a big day visibly
  // lowers tomorrow's bar and a slow one raises it.
  //
  // They are deliberately separate measures, not two views of one. Work sold
  // today is invoiced days or weeks later, so revenue alone reports on quotes
  // closed well before this morning — by the time it sags, the sales week that
  // caused it is already gone. Sold leads, invoiced lags, and the gap between
  // them is the pipeline.
  revenueToday: number;
  dailyTarget: number | null;
  aheadBehind: number | null;
  soldToday: number;
  dailySalesTarget: number | null;
  salesAheadBehind: number | null;
  workingDaysLeft: number;
  workingDaysTotal: number;

  topJobTypes: Array<{ jobType: string; revenue: number; profit: number | null; jobs: number }>;
  jobTypeBasis: "profit" | "revenue";
  salesLeaderboard: Array<{ name: string; sold: number; jobs: number }>;
};

export type Snapshot = {
  metrics: Metrics;
  sources: Record<string, { state: SourceState; detail?: string; at?: string }>;
};

async function countSince(table: string, column: string, from: Date, to?: Date) {
  let q = supabase().from(table).select("*", { count: "exact", head: true }).gte(column, from.toISOString());
  if (to) q = q.lt(column, to.toISOString());
  const { count, error } = await q;
  if (error) throw new Error(`${table}.${column} count failed: ${error.message}`);
  return count ?? 0;
}

async function leadMetrics(now: Date) {
  const dayStart = startOfDayMelbourne(now);
  const weekStart = startOfWeekMelbourne(now);
  const prevWeekStart = addDays(weekStart, -7);

  const [leadsToday, leadsWeek, leadsPrevWeek] = await Promise.all([
    countSince("portal_leads", "created_at", dayStart),
    countSince("portal_leads", "created_at", weekStart),
    countSince("portal_leads", "created_at", prevWeekStart, weekStart),
  ]);

  // Response time and suburb mix both read the last 30 days of leads.
  const { data: recent, error } = await supabase()
    .from("portal_leads")
    .select("suburb, created_at, first_contacted_at")
    .gte("created_at", addDays(now, -30).toISOString());
  if (error) throw new Error(`portal_leads read failed: ${error.message}`);

  const responded = (recent ?? []).filter((l) => l.first_contacted_at);
  const avgFirstResponseMins = responded.length
    ? Math.round(
        responded.reduce(
          (sum, l) =>
            sum + (Date.parse(l.first_contacted_at as string) - Date.parse(l.created_at as string)) / 60000,
          0,
        ) / responded.length,
      )
    : null;

  const uncontactedLeads = (recent ?? []).filter((l) => !l.first_contacted_at).length;

  const bySuburb = new Map<string, number>();
  for (const l of recent ?? []) {
    const s = (l.suburb as string | null)?.trim();
    if (s) bySuburb.set(s, (bySuburb.get(s) ?? 0) + 1);
  }
  const topSuburbs = [...bySuburb.entries()]
    .map(([suburb, count]) => ({ suburb, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { leadsToday, leadsWeek, leadsPrevWeek, avgFirstResponseMins, uncontactedLeads, topSuburbs };
}

async function serviceTitanMetrics(now: Date) {
  const weekStart = startOfWeekMelbourne(now);
  const monthStart = startOfMonthMelbourne(now);
  const thirtyDaysAgo = addDays(now, -30);

  const [jobsCompletedWeek, jobsScheduledNext7] = await Promise.all([
    countSince("st_jobs", "completed_on", weekStart),
    countSince("st_jobs", "scheduled_on", now, addDays(now, 7)),
  ]);

  const { data: openEstimates, error: estErr } = await supabase()
    .from("st_estimates")
    .select("total")
    .is("sold_on", null)
    .not("status", "in", '("Dismissed","Expired")');
  if (estErr) throw new Error(`st_estimates read failed: ${estErr.message}`);

  const estimatesOpenCount = openEstimates?.length ?? 0;
  const estimatesOpenValue = (openEstimates ?? []).reduce((s, e) => s + Number(e.total ?? 0), 0);

  // Close rate: of the quotes written in the last 30 days, how many sold.
  const { data: recentEstimates, error: recentErr } = await supabase()
    .from("st_estimates")
    .select("sold_on")
    .gte("created_on", thirtyDaysAgo.toISOString());
  if (recentErr) throw new Error(`st_estimates recent read failed: ${recentErr.message}`);

  const closeRate30d = recentEstimates?.length
    ? recentEstimates.filter((e) => e.sold_on).length / recentEstimates.length
    : null;

  const { data: invoices, error: invErr } = await supabase()
    .from("st_invoices")
    .select("total, invoice_date")
    .gte("invoice_date", startOfMonthMelbourne(now).toISOString().slice(0, 10));
  if (invErr) throw new Error(`st_invoices read failed: ${invErr.message}`);

  const revenueInvoicedMtd = (invoices ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0);

  const today = isoDateMelbourne(now);
  const revenueToday = (invoices ?? [])
    .filter((i) => i.invoice_date === today)
    .reduce((s, i) => s + Number(i.total ?? 0), 0);

  // Job types, ranked over a 90-day window so a quiet month doesn't reshuffle
  // the board. Ranked by gross profit where ServiceTitan gave us cost on a
  // meaningful share of invoices, otherwise by revenue — the tile says which.
  const { data: profitRows, error: profitErr } = await supabase()
    .from("st_invoices")
    .select("job_type, total, cost")
    .gte("invoice_date", isoDateMelbourne(addDays(now, -90)))
    .not("job_type", "is", null);
  if (profitErr) throw new Error(`st_invoices job-type read failed: ${profitErr.message}`);

  const withCost = (profitRows ?? []).filter((r) => r.cost != null).length;
  const jobTypeBasis: "profit" | "revenue" =
    profitRows?.length && withCost / profitRows.length >= 0.5 ? "profit" : "revenue";

  const byType = new Map<string, { revenue: number; cost: number; hasCost: boolean; jobs: number }>();
  for (const r of profitRows ?? []) {
    const key = String(r.job_type);
    const acc = byType.get(key) ?? { revenue: 0, cost: 0, hasCost: false, jobs: 0 };
    acc.revenue += Number(r.total ?? 0);
    if (r.cost != null) {
      acc.cost += Number(r.cost);
      acc.hasCost = true;
    }
    acc.jobs += 1;
    byType.set(key, acc);
  }

  const topJobTypes = [...byType.entries()]
    .map(([jobType, v]) => ({
      jobType,
      revenue: v.revenue,
      profit: v.hasCost ? v.revenue - v.cost : null,
      jobs: v.jobs,
    }))
    .sort((a, b) =>
      jobTypeBasis === "profit" ? (b.profit ?? 0) - (a.profit ?? 0) : b.revenue - a.revenue,
    )
    .slice(0, 5);

  // Everything sold this month: the month and today totals, and the leaderboard.
  // One query rather than three, and deliberately not filtered to rows that
  // carry a seller — an estimate closed without one still sold, and excluding it
  // would make the leaderboard rows sum to less than the headline figure.
  const { data: soldRows, error: soldErr } = await supabase()
    .from("st_estimates")
    .select("sold_by, total, sold_on")
    .gte("sold_on", monthStart.toISOString());
  if (soldErr) throw new Error(`st_estimates sold read failed: ${soldErr.message}`);

  const soldMtd = (soldRows ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);

  const soldToday = (soldRows ?? [])
    .filter((r) => r.sold_on && isoDateMelbourne(new Date(String(r.sold_on))) === today)
    .reduce((s, r) => s + Number(r.total ?? 0), 0);

  const bySeller = new Map<string, { sold: number; jobs: number }>();
  for (const r of soldRows ?? []) {
    if (r.sold_by == null) continue;
    const key = String(r.sold_by);
    const acc = bySeller.get(key) ?? { sold: 0, jobs: 0 };
    acc.sold += Number(r.total ?? 0);
    acc.jobs += 1;
    bySeller.set(key, acc);
  }

  const salesLeaderboard = [...bySeller.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return {
    jobsCompletedWeek,
    jobsScheduledNext7,
    estimatesOpenCount,
    estimatesOpenValue,
    closeRate30d,
    revenueInvoicedMtd,
    revenueToday,
    soldMtd,
    soldToday,
    topJobTypes,
    jobTypeBasis,
    salesLeaderboard,
  };
}

type Targets = { revenue: number | null; sales: number | null };

/**
 * The two monthly targets. Either can be absent: a board with only a revenue
 * target still shows the revenue number and leaves the sales one blank, rather
 * than inventing a figure nobody agreed to.
 */
async function monthlyTargets(): Promise<Targets> {
  const { data } = await supabase()
    .from("portal_settings")
    .select("value")
    .eq("key", "dashboard")
    .maybeSingle<{ value: { revenueTargetMonthly?: number; salesTargetMonthly?: number } }>();

  const positive = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  return {
    revenue: positive(data?.value?.revenueTargetMonthly),
    sales: positive(data?.value?.salesTargetMonthly),
  };
}

async function workingCalendar(): Promise<WorkingCalendar> {
  const { data } = await supabase()
    .from("portal_settings")
    .select("value")
    .eq("key", "dashboard")
    .maybeSingle<{ value: { workingDays?: number[]; holidays?: string[] } }>();

  return {
    days: data?.value?.workingDays?.length ? data.value.workingDays : DEFAULT_WORKING_CALENDAR.days,
    holidays: data?.value?.holidays ?? [],
  };
}

/** Most recent stored snapshot, used to carry a failed source's last known value. */
export async function latestSnapshot(): Promise<(Snapshot & { computedAt: string }) | null> {
  const { data } = await supabase()
    .from("portal_metrics_snapshot")
    .select("computed_at, metrics, sources")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ computed_at: string; metrics: Metrics; sources: Snapshot["sources"] }>();

  if (!data) return null;
  return { computedAt: data.computed_at, metrics: data.metrics, sources: data.sources };
}

export async function computeSnapshot(now = new Date()): Promise<Snapshot> {
  const previous = await latestSnapshot();
  const prev = previous?.metrics;
  const sources: Snapshot["sources"] = {};

  // Each source degrades on its own. One failing integration must never blank
  // the whole board — a dashboard that shows nothing gets ignored within a week.
  let leads: Awaited<ReturnType<typeof leadMetrics>>;
  try {
    leads = await leadMetrics(now);
    sources.leads = { state: "ok", at: now.toISOString() };
  } catch (e) {
    sources.leads = { state: "error", detail: (e as Error).message };
    leads = {
      leadsToday: prev?.leadsToday ?? 0,
      leadsWeek: prev?.leadsWeek ?? 0,
      leadsPrevWeek: prev?.leadsPrevWeek ?? 0,
      avgFirstResponseMins: prev?.avgFirstResponseMins ?? null,
      uncontactedLeads: prev?.uncontactedLeads ?? 0,
      topSuburbs: prev?.topSuburbs ?? [],
    };
  }

  let st: Awaited<ReturnType<typeof serviceTitanMetrics>>;
  try {
    st = await serviceTitanMetrics(now);
    const { data: syncRow } = await supabase()
      .from("portal_sync_state")
      .select("last_success_at, last_status")
      .eq("provider", "servicetitan")
      .order("last_success_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ last_success_at: string | null; last_status: string | null }>();

    const lastOk = syncRow?.last_success_at ? Date.parse(syncRow.last_success_at) : 0;
    const stale = !lastOk || Date.now() - lastOk > 45 * 60 * 1000;
    sources.servicetitan = {
      state: !lastOk ? "not-configured" : stale ? "stale" : "ok",
      at: syncRow?.last_success_at ?? undefined,
      detail: syncRow?.last_status ?? undefined,
    };
  } catch (e) {
    sources.servicetitan = { state: "error", detail: (e as Error).message };
    st = {
      jobsCompletedWeek: prev?.jobsCompletedWeek ?? 0,
      jobsScheduledNext7: prev?.jobsScheduledNext7 ?? 0,
      estimatesOpenCount: prev?.estimatesOpenCount ?? 0,
      estimatesOpenValue: prev?.estimatesOpenValue ?? 0,
      closeRate30d: prev?.closeRate30d ?? null,
      revenueInvoicedMtd: prev?.revenueInvoicedMtd ?? 0,
      revenueToday: prev?.revenueToday ?? 0,
      soldMtd: prev?.soldMtd ?? 0,
      soldToday: prev?.soldToday ?? 0,
      topJobTypes: prev?.topJobTypes ?? [],
      jobTypeBasis: prev?.jobTypeBasis ?? "revenue",
      salesLeaderboard: prev?.salesLeaderboard ?? [],
    };
  }

  const xero = await fetchXeroReceivables();
  if (xero.ok) {
    sources.xero = { state: "ok", at: now.toISOString() };
  } else {
    sources.xero = { state: "stale", detail: xero.reason, at: previous?.computedAt };
  }

  const targets = await monthlyTargets().catch((): Targets => ({ revenue: null, sales: null }));
  const calendar = await workingCalendar().catch(() => DEFAULT_WORKING_CALENDAR);
  const days = workingDaysInMonth(now, calendar);

  // Pace measured against working days elapsed, not calendar days: being "80%
  // through the month" means nothing if the remaining days are a long weekend.
  const progress = days.total > 0 ? days.elapsed / days.total : 0;

  /**
   * What has to happen per remaining working day to still land on the target.
   *
   * `Math.max(0, …)` floors the shortfall rather than the rate: once the target
   * is met the number is 0, not a negative figure that would read as money owed
   * back. `Math.max(1, …)` guards the last day of the month, where dividing by
   * zero remaining days would otherwise print Infinity on the wall.
   */
  const perDay = (target: number | null, achieved: number) => ({
    pacePct: target && progress > 0 ? achieved / (target * progress) : null,
    daily: target == null ? null : Math.max(0, target - achieved) / Math.max(1, days.remaining),
    aheadBehind: target ? achieved - target * progress : null,
  });

  const revenue = perDay(targets.revenue, st.revenueInvoicedMtd);
  const sales = perDay(targets.sales, st.soldMtd);

  return {
    metrics: {
      ...leads,
      ...st,
      revenueTargetMonthly: targets.revenue,
      revenuePacePct: revenue.pacePct,
      dailyTarget: revenue.daily,
      aheadBehind: revenue.aheadBehind,
      salesTargetMonthly: targets.sales,
      salesPacePct: sales.pacePct,
      dailySalesTarget: sales.daily,
      salesAheadBehind: sales.aheadBehind,
      workingDaysLeft: days.remaining,
      workingDaysTotal: days.total,
      overdueTotal: xero.ok ? xero.overdueTotal : prev?.overdueTotal ?? null,
      overdueCount: xero.ok ? xero.overdueCount : prev?.overdueCount ?? null,
      receivablesTotal: xero.ok ? xero.receivablesTotal : prev?.receivablesTotal ?? null,
    },
    sources,
  };
}
