import { q, sbCount, sbInsert, sbSelect, sbSelectOne } from "./db";
import { fetchXeroReceivables } from "./xero";
import { suburbs } from "../suburbs";
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
  topSuburbs: Array<{ suburb: string; count: number }>;
  leadsByService: Array<{ service: string; count: number }>;

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

  overdueTotal: number | null;
  overdueCount: number | null;
  receivablesTotal: number | null;

  topJobTypes: Array<{ jobType: string; revenue: number; profit: number | null; jobs: number }>;
  jobTypeBasis: "profit" | "revenue";
  salesLeaderboard: Array<{ name: string; sold: number; jobs: number }>;
};

export type Snapshot = {
  metrics: Metrics;
  sources: Record<string, { state: SourceState; detail?: string; at?: string }>;
};

/**
 * Leads carry a postcode on every row but a suburb on none of them — the quote
 * form asks for the postcode. The site already keeps the suburb list, so the
 * board shows the name and falls back to the bare postcode for anywhere outside
 * the service area.
 */
const POSTCODE_TO_SUBURB = new Map(suburbs.map((s) => [s.postcode, s.name]));

/** Mirrors the quote form's own labels, so the board names a service the way the customer picked it. */
const SERVICE_LABELS: Record<string, string> = {
  hp: "Heat pump hot water",
  split: "Split system aircon",
  ducted: "Ducted aircon",
  service: "Service / repair",
  water: "Water filtration",
};

function serviceLabel(raw: string): string {
  if (SERVICE_LABELS[raw]) return SERVICE_LABELS[raw];
  // Page-derived slugs like "air-conditioning-installation" arrive from landing
  // pages rather than the form's own picker.
  return raw.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

type LeadRow = { suburb: string | null; postcode: string | null; service: string | null };

async function leadMetrics(now: Date) {
  const dayStart = startOfDayMelbourne(now);
  const weekStart = startOfWeekMelbourne(now);
  const prevWeekStart = addDays(weekStart, -7);

  const [leadsToday, leadsWeek, leadsPrevWeek] = await Promise.all([
    sbCount("portal_leads", q.gte("created_at", dayStart.toISOString())),
    sbCount("portal_leads", q.gte("created_at", weekStart.toISOString())),
    sbCount(
      "portal_leads",
      [q.gte("created_at", prevWeekStart.toISOString()), q.lt("created_at", weekStart.toISOString())].join("&"),
    ),
  ]);

  const recent = await sbSelect<LeadRow>(
    "portal_leads",
    [q.select("suburb,postcode,service"), q.gte("created_at", addDays(now, -30).toISOString())].join("&"),
  );

  const bySuburb = new Map<string, number>();
  const byService = new Map<string, number>();

  for (const l of recent) {
    const place = l.suburb?.trim() || (l.postcode ? POSTCODE_TO_SUBURB.get(l.postcode.trim()) ?? l.postcode.trim() : null);
    if (place) bySuburb.set(place, (bySuburb.get(place) ?? 0) + 1);

    const svc = l.service?.trim();
    if (svc) {
      const label = serviceLabel(svc);
      byService.set(label, (byService.get(label) ?? 0) + 1);
    }
  }

  const rank = <K extends string>(m: Map<string, number>, key: K) =>
    [...m.entries()]
      .map(([k, count]) => ({ [key]: k, count }) as { [P in K]: string } & { count: number })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  return {
    leadsToday,
    leadsWeek,
    leadsPrevWeek,
    topSuburbs: rank(bySuburb, "suburb"),
    leadsByService: rank(byService, "service"),
  };
}

async function serviceTitanMetrics(now: Date) {
  const weekStart = startOfWeekMelbourne(now);
  const monthStart = startOfMonthMelbourne(now);
  const today = isoDateMelbourne(now);

  const [jobsCompletedWeek, jobsScheduledNext7] = await Promise.all([
    sbCount("st_jobs", q.gte("completed_on", weekStart.toISOString())),
    sbCount(
      "st_jobs",
      [q.gte("scheduled_on", now.toISOString()), q.lt("scheduled_on", addDays(now, 7).toISOString())].join("&"),
    ),
  ]);

  const openEstimates = await sbSelect<{ total: number | null }>(
    "st_estimates",
    [q.select("total"), q.isNull("sold_on"), q.notIn("status", ["Dismissed", "Expired"])].join("&"),
  );

  const estimatesOpenCount = openEstimates.length;
  const estimatesOpenValue = openEstimates.reduce((s, e) => s + Number(e.total ?? 0), 0);

  // Close rate: of the quotes written in the last 30 days, how many sold.
  const recentEstimates = await sbSelect<{ sold_on: string | null }>(
    "st_estimates",
    [q.select("sold_on"), q.gte("created_on", addDays(now, -30).toISOString())].join("&"),
  );

  const closeRate30d = recentEstimates.length
    ? recentEstimates.filter((e) => e.sold_on).length / recentEstimates.length
    : null;

  const invoices = await sbSelect<{ total: number | null; invoice_date: string | null }>(
    "st_invoices",
    [q.select("total,invoice_date"), q.gte("invoice_date", isoDateMelbourne(monthStart))].join("&"),
  );

  const revenueInvoicedMtd = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const revenueToday = invoices
    .filter((i) => i.invoice_date === today)
    .reduce((s, i) => s + Number(i.total ?? 0), 0);

  // Job types, ranked over a 90-day window so a quiet month doesn't reshuffle
  // the board. Ranked by gross profit where ServiceTitan gave us cost on a
  // meaningful share of invoices, otherwise by revenue — the tile says which.
  const profitRows = await sbSelect<{ job_type: string | null; total: number | null; cost: number | null }>(
    "st_invoices",
    [q.select("job_type,total,cost"), q.gte("invoice_date", isoDateMelbourne(addDays(now, -90))), q.notNull("job_type")].join("&"),
  );

  const withCost = profitRows.filter((r) => r.cost != null).length;
  const jobTypeBasis: "profit" | "revenue" =
    profitRows.length && withCost / profitRows.length >= 0.5 ? "profit" : "revenue";

  const byType = new Map<string, { revenue: number; cost: number; hasCost: boolean; jobs: number }>();
  for (const r of profitRows) {
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
    .sort((a, b) => (jobTypeBasis === "profit" ? (b.profit ?? 0) - (a.profit ?? 0) : b.revenue - a.revenue))
    .slice(0, 5);

  // Everything sold this month: the month and today totals, and the leaderboard.
  // One query rather than three, and deliberately not filtered to rows that
  // carry a seller — an estimate closed without one still sold, and excluding it
  // would make the leaderboard rows sum to less than the headline figure.
  const soldRows = await sbSelect<{ sold_by: string | null; total: number | null; sold_on: string | null }>(
    "st_estimates",
    [q.select("sold_by,total,sold_on"), q.gte("sold_on", monthStart.toISOString())].join("&"),
  );

  const soldMtd = soldRows.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const soldToday = soldRows
    .filter((r) => r.sold_on && isoDateMelbourne(new Date(r.sold_on)) === today)
    .reduce((s, r) => s + Number(r.total ?? 0), 0);

  const bySeller = new Map<string, { sold: number; jobs: number }>();
  for (const r of soldRows) {
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
  const row = await sbSelectOne<{ value: { revenueTargetMonthly?: number; salesTargetMonthly?: number } }>(
    "portal_settings",
    [q.select("value"), q.eq("key", "dashboard")].join("&"),
  );

  const positive = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  return {
    revenue: positive(row?.value?.revenueTargetMonthly),
    sales: positive(row?.value?.salesTargetMonthly),
  };
}

async function workingCalendar(): Promise<WorkingCalendar> {
  const row = await sbSelectOne<{ value: { workingDays?: number[]; holidays?: string[] } }>(
    "portal_settings",
    [q.select("value"), q.eq("key", "dashboard")].join("&"),
  );

  return {
    days: row?.value?.workingDays?.length ? row.value.workingDays : DEFAULT_WORKING_CALENDAR.days,
    holidays: row?.value?.holidays ?? [],
  };
}

/** Most recent stored snapshot, used to carry a failed source's last known value. */
export async function latestSnapshot(): Promise<(Snapshot & { computedAt: string }) | null> {
  const row = await sbSelectOne<{ computed_at: string; metrics: Metrics; sources: Snapshot["sources"] }>(
    "portal_metrics_snapshot",
    [q.select("computed_at,metrics,sources"), q.order("computed_at", "desc")].join("&"),
  ).catch(() => null);

  if (!row) return null;
  return { computedAt: row.computed_at, metrics: row.metrics, sources: row.sources };
}

export async function storeSnapshot(snapshot: Snapshot): Promise<void> {
  await sbInsert("portal_metrics_snapshot", { metrics: snapshot.metrics, sources: snapshot.sources });
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
      topSuburbs: prev?.topSuburbs ?? [],
      leadsByService: prev?.leadsByService ?? [],
    };
  }

  let st: Awaited<ReturnType<typeof serviceTitanMetrics>>;
  try {
    st = await serviceTitanMetrics(now);
    const syncRow = await sbSelectOne<{ last_success_at: string | null; last_status: string | null }>(
      "portal_sync_state",
      [q.select("last_success_at,last_status"), q.eq("provider", "servicetitan"), q.order("last_success_at", "desc")].join("&"),
    );

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
