import { supabase } from "./supabase";
import { fetchXeroReceivables } from "./xero";
import {
  addDays,
  monthProgress,
  startOfDayMelbourne,
  startOfMonthMelbourne,
  startOfWeekMelbourne,
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
  overdueTotal: number | null;
  overdueCount: number | null;
  receivablesTotal: number | null;
  topSuburbs: Array<{ suburb: string; count: number }>;
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
    .select("total")
    .gte("invoice_date", startOfMonthMelbourne(now).toISOString().slice(0, 10));
  if (invErr) throw new Error(`st_invoices read failed: ${invErr.message}`);

  const revenueInvoicedMtd = (invoices ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0);
  void monthStart;

  return {
    jobsCompletedWeek,
    jobsScheduledNext7,
    estimatesOpenCount,
    estimatesOpenValue,
    closeRate30d,
    revenueInvoicedMtd,
  };
}

async function revenueTarget(): Promise<number | null> {
  const { data } = await supabase()
    .from("portal_settings")
    .select("value")
    .eq("key", "dashboard")
    .maybeSingle<{ value: { revenueTargetMonthly?: number } }>();
  const t = data?.value?.revenueTargetMonthly;
  return typeof t === "number" && t > 0 ? t : null;
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
    };
  }

  const xero = await fetchXeroReceivables();
  if (xero.ok) {
    sources.xero = { state: "ok", at: now.toISOString() };
  } else {
    sources.xero = { state: "stale", detail: xero.reason, at: previous?.computedAt };
  }

  const target = await revenueTarget().catch(() => null);
  const progress = monthProgress(now);
  const revenuePacePct =
    target && progress > 0 ? st.revenueInvoicedMtd / (target * progress) : null;

  return {
    metrics: {
      ...leads,
      ...st,
      revenueTargetMonthly: target,
      revenuePacePct,
      overdueTotal: xero.ok ? xero.overdueTotal : prev?.overdueTotal ?? null,
      overdueCount: xero.ok ? xero.overdueCount : prev?.overdueCount ?? null,
      receivablesTotal: xero.ok ? xero.receivablesTotal : prev?.receivablesTotal ?? null,
    },
    sources,
  };
}
