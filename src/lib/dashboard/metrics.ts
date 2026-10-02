import { q, sbCount, sbInsert, sbSelect, sbSelectOne } from "./db";
import { serviceTitanConfigured } from "./servicetitan";
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
  /** The two counts the rate is made of, so the card can show its own working. */
  closeRate30dSold: number;
  closeRate30dQuotes: number;

  // The quote funnel: written -> still out -> closed. Outstanding alone can't
  // tell you whether a thin pipeline means nobody is quoting or everybody is
  // closing, so the board shows what is being created beside what is sitting.
  quotesCreatedTodayValue: number;
  quotesCreatedTodayCount: number;
  /** Of the quotes written today, how many have already closed. */
  quotesCreatedTodaySold: number;
  quotesCreatedWeekValue: number;
  quotesCreatedWeekCount: number;
  quotesCreatedMonthValue: number;
  quotesCreatedMonthCount: number;

  /** Null when no invoice carries a cost — ServiceTitan rarely records one. */
  profitMtd: number | null;
  profitTargetMonthly: number | null;
  profitPacePct: number | null;
  profitCoverage: number;
  /** Gross profit over revenue. Null when too few invoices carry a cost to mean anything. */
  marginPct: number | null;

  soldCountToday: number;
  soldCountMonth: number;
  avgSoldValue: number | null;
  invoiceCountMonth: number;
  invoiceCountToday: number;
  avgInvoiceValue: number | null;
  /** Of the quotes written today, the share already closed. */
  conversionTodayPct: number | null;

  /** Today's quotes, newest first, for the Quotes page list. */
  quotesToday: Array<{ id: number; at: string; label: string; value: number; sold: boolean }>;
  /** Open quotes by value, largest first, with how long they have been out. */
  quotesOutstanding: Array<{ id: number; label: string; value: number; ageDays: number }>;

  bookingsMonth: number;
  bookingsTargetMonthly: number | null;
  bookingsPacePct: number | null;

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
  /** Invoices left out of the ranking because they carry no real job type. */
  jobTypeUnclassified: number;
  salesLeaderboard: Array<{
    name: string;
    sold: number;
    soldToday: number;
    soldWeek: number;
    jobs: number;
    /** Commission is computed but deliberately not rendered on the wall. */
    commission: number | null;
    tier: number | null;
    toNextTier: number | null;
  }>;

  /** Telecom data only appears once the Telecom scope is granted; empty until then. */
  callsByPerson: Array<{ name: string; today: number; week: number; month: number }>;

  /**
   * Sales closed in the last couple of hours, newest first — what the board
   * celebrates. Carries the estimate id so the screen can tell a genuinely new
   * sale from one it has already cheered.
   */
  recentSales: Array<{ id: number; name: string | null; value: number; soldOn: string }>;
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
const POSTCODE_TO_SUBURB = (() => {
  const m = new Map<string, string>();
  // First declared wins. Postcodes cover several suburbs — 3977 is Cranbourne
  // and six neighbours, 3810 is Pakenham and Pakenham Upper — and the list is
  // ordered with the principal one first. Building this with `new Map(pairs)`
  // keeps the *last* entry instead, which labelled every Cranbourne lead
  // "Devon Meadows" and every Pakenham lead "Pakenham Upper": the smallest
  // suburb in each postcode, confidently, on a wall.
  for (const s of suburbs) if (!m.has(s.postcode)) m.set(s.postcode, s.name);
  return m;
})();

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

type LeadRow = {
  suburb: string | null;
  postcode: string | null;
  service: string | null;
  address: string | null;
};

/** Street-type words, so a formatted address missing its suburb isn't mistaken for one. */
const STREET_SUFFIX =
  /\b(road|rd|street|st|drive|dr|way|crescent|cres|highway|hwy|avenue|ave|court|ct|place|pl|lane|ln|parade|pde|terrace|tce|close|cl|rise|boulevard|blvd|circuit|cct|grove|track)\b$/i;

/**
 * The suburb as the customer's own address gives it.
 *
 * The form stores a Google-formatted address — "12 Lamont Crescent, Cranbourne,
 * Melbourne, Victoria, 3977, Australia" — and never fills the suburb column.
 * The postcode column it does fill is typed by hand and often disagrees with
 * the address beside it (3825 against an address in St Albans, 3021), so the
 * address wins where there is one.
 *
 * Takes the last component once the country, state, postcode and the "Melbourne"
 * metro qualifier are dropped. Returns null rather than guessing when that
 * leaves a street name or nothing, so the caller can fall back to the postcode.
 */
function suburbFromAddress(address: string | null): string | null {
  if (!address) return null;

  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !/^australia$/i.test(p) &&
        !/^(victoria|vic)$/i.test(p) &&
        !/^\d{4}$/.test(p) &&
        !/^melbourne$/i.test(p),
    );

  // A single-line address puts the number on the front of the suburb
  // ("12 Pakenham"); no Victorian suburb starts with a digit.
  const last = parts[parts.length - 1]?.replace(/^\d+[a-z]?[\s/-]+/i, "").trim();
  if (!last || STREET_SUFFIX.test(last)) return null;
  // A lone street number, or anything else without a letter, is not a place.
  if (!/[a-z]/i.test(last)) return null;
  return last;
}

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
    [q.select("suburb,postcode,service,address"), q.gte("created_at", addDays(now, -30).toISOString())].join("&"),
  );

  const bySuburb = new Map<string, number>();
  const byService = new Map<string, number>();

  for (const l of recent) {
    // Address first, then the service-area postcode map, then the postcode
    // itself. The map only covers the suburbs the site has pages for, so a lead
    // from Bendigo or Traralgon used to land on the wall as a bare "3556".
    const pc = l.postcode?.trim();
    const place =
      l.suburb?.trim() ||
      suburbFromAddress(l.address) ||
      (pc ? (POSTCODE_TO_SUBURB.get(pc) ?? (/^\d{4}$/.test(pc) ? pc : null)) : null);
    if (place) bySuburb.set(place, (bySuburb.get(place) ?? 0) + 1);

    const svc = l.service?.trim();
    if (svc) {
      const label = serviceLabel(svc);
      byService.set(label, (byService.get(label) ?? 0) + 1);
    }
  }

  const rank = <K extends string>(m: Map<string, number>, key: K, limit = 5) =>
    [...m.entries()]
      .map(([k, count]) => ({ [key]: k, count }) as { [P in K]: string } & { count: number })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    leadsToday,
    leadsWeek,
    leadsPrevWeek,
    // The heat map wants the whole catchment, not a top five; the lists that
    // only have room for a handful take their own slice.
    topSuburbs: rank(bySuburb, "suburb", 12),
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

  // Open quotes from the last 90 days, not every quote ServiceTitan has never
  // marked sold. Unbounded, this reads 725 quotes and $7.2M going back to 2022 —
  // quotes nobody closed out rather than money anybody is chasing. Ninety days
  // covers a real follow-up cycle on a ducted job.
  const QUOTE_WINDOW_DAYS = 90;
  const openEstimates = await sbSelect<{ total: number | null }>(
    "st_estimates",
    [
      q.select("total"),
      q.isNull("sold_on"),
      q.notIn("status", ["Dismissed", "Expired"]),
      q.gte("created_on", addDays(now, -QUOTE_WINDOW_DAYS).toISOString()),
    ].join("&"),
  );

  const estimatesOpenCount = openEstimates.length;
  const estimatesOpenValue = openEstimates.reduce((s, e) => s + Number(e.total ?? 0), 0);

  // Close rate: of the quotes written in the last 30 days, how many sold.
  const recentEstimates = await sbSelect<{ sold_on: string | null }>(
    "st_estimates",
    [q.select("sold_on"), q.gte("created_on", addDays(now, -30).toISOString())].join("&"),
  );

  const closeRate30dQuotes = recentEstimates.length;
  const closeRate30dSold = recentEstimates.filter((e) => e.sold_on).length;
  const closeRate30d = closeRate30dQuotes ? closeRate30dSold / closeRate30dQuotes : null;

  // Quotes written this month, so the funnel reads created -> outstanding ->
  // closed. A thin pipeline means something different depending on which end
  // it is thin at.
  const createdRows = await sbSelect<{ total: number | null; created_on: string | null; sold_on: string | null }>(
    "st_estimates",
    [q.select("total,created_on,sold_on"), q.gte("created_on", monthStart.toISOString())].join("&"),
  );

  const weekStartMs = weekStart.getTime();
  const created = { todayV: 0, todayC: 0, weekV: 0, weekC: 0, monthV: 0, monthC: 0, todaySold: 0 };
  for (const r of createdRows) {
    const v = Number(r.total ?? 0);
    created.monthV += v;
    created.monthC += 1;
    if (!r.created_on) continue;
    const at = new Date(r.created_on);
    if (at.getTime() >= weekStartMs) {
      created.weekV += v;
      created.weekC += 1;
    }
    if (isoDateMelbourne(at) === today) {
      created.todayV += v;
      created.todayC += 1;
      if (r.sold_on) created.todaySold += 1;
    }
  }

  // Jobs booked this month — when the job was created, not when it is scheduled,
  // because booking is the act being measured.
  const bookingsMonth = await sbCount("st_jobs", q.gte("created_on", monthStart.toISOString()));

  const invoices = await sbSelect<{ total: number | null; cost: number | null; invoice_date: string | null }>(
    "st_invoices",
    [q.select("total,cost,invoice_date"), q.gte("invoice_date", isoDateMelbourne(monthStart))].join("&"),
  );

  const revenueInvoicedMtd = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);

  // Profit only counts invoices that actually carry a cost. `profitCoverage`
  // says what share that is, so a gauge built on a third of the data can say so
  // rather than quietly understating the month.
  const costed = invoices.filter((i) => i.cost != null);
  const profitCoverage = invoices.length ? costed.length / invoices.length : 0;
  // No costed invoice means no profit figure — not a profit of zero. Across the
  // whole replica 88 of 4,791 invoice line items carry a cost, so this is the
  // normal case here rather than an edge one, and a dial reading $0 of target
  // would be the most prominent wrong number on the wall.
  const profitMtd = costed.length
    ? costed.reduce((s, i) => s + (Number(i.total ?? 0) - Number(i.cost ?? 0)), 0)
    : null;

  const invoiceCountMonth = invoices.length;
  const invoiceCountToday = invoices.filter((i) => i.invoice_date === today).length;
  const avgInvoiceValue = invoiceCountMonth ? revenueInvoicedMtd / invoiceCountMonth : null;

  // Margin is only meaningful over the invoices that actually carry a cost, and
  // only worth showing when enough of them do — otherwise it is a ratio of a
  // sample to the whole, which reads low and means nothing.
  const costedRevenue = costed.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const marginPct =
    profitMtd != null && profitCoverage >= 0.5 && costedRevenue > 0 ? profitMtd / costedRevenue : null;
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

  /**
   * ServiceTitan's placeholder for records imported without a job type. It is
   * not a kind of work — it is the absence of one — and it accounts for most
   * invoices in this tenant, so left in the ranking it sits permanently at
   * number one and crowds out the types the room can actually act on. The tile
   * says how many were set aside rather than quietly dropping them.
   */
  const UNCLASSIFIED = /^imported default/i;

  let jobTypeUnclassified = 0;
  const byType = new Map<string, { revenue: number; cost: number; hasCost: boolean; jobs: number }>();
  for (const r of profitRows) {
    if (UNCLASSIFIED.test(String(r.job_type))) {
      jobTypeUnclassified += 1;
      continue;
    }
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
  const soldRows = await sbSelect<{ id: number; sold_by: string | null; total: number | null; sold_on: string | null }>(
    "st_estimates",
    [q.select("id,sold_by,total,sold_on"), q.gte("sold_on", monthStart.toISOString())].join("&"),
  );

  const soldMtd = soldRows.reduce((s, r) => s + Number(r.total ?? 0), 0);

  // The celebration feed. Two hours is comfortably wider than the sync interval,
  // so a sale can't slip through between runs, and the screen's own de-duping
  // stops it being cheered twice.
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recentSales = soldRows
    .filter((r) => r.sold_on && Date.parse(r.sold_on) >= twoHoursAgo)
    .map((r) => ({
      id: Number(r.id),
      name: r.sold_by ? String(r.sold_by) : null,
      value: Number(r.total ?? 0),
      soldOn: String(r.sold_on),
    }))
    .filter((r) => Number.isFinite(r.id))
    .sort((a, b) => Date.parse(b.soldOn) - Date.parse(a.soldOn))
    .slice(0, 10);
  const soldToday = soldRows
    .filter((r) => r.sold_on && isoDateMelbourne(new Date(r.sold_on)) === today)
    .reduce((s, r) => s + Number(r.total ?? 0), 0);

  // Today's quotes and the biggest ones still out — the Quotes page lists both.
  // An estimate carries no description of its own, so the label comes from the
  // job it belongs to; where that join finds nothing the row says "Quote"
  // rather than inventing a service name.
  // The named quotes — largest still out, oldest still out, biggest on the Areas
  // page — are the last two months only. A $544K quote from June topping the
  // list every day is not something anybody is chasing, and it pushed this
  // month's real work off the bottom of the card.
  const QUOTE_LIST_DAYS = 60;
  const openRows = await sbSelect<{ id: number; total: number | null; created_on: string | null; job_id: number | null }>(
    "st_estimates",
    [
      q.select("id,total,created_on,job_id"),
      q.isNull("sold_on"),
      q.notIn("status", ["Dismissed", "Expired"]),
      q.gte("created_on", addDays(now, -QUOTE_LIST_DAYS).toISOString()),
    ].join("&"),
  );

  const todayRows = createdRows.length
    ? await sbSelect<{ id: number; total: number | null; created_on: string | null; sold_on: string | null; job_id: number | null }>(
        "st_estimates",
        [q.select("id,total,created_on,sold_on,job_id"), q.gte("created_on", startOfDayMelbourne(now).toISOString())].join("&"),
      )
    : [];

  const jobIds = [...new Set([...todayRows, ...openRows].map((r) => r.job_id).filter((v): v is number => v != null))];
  const jobTypeById = new Map<number, string>();
  if (jobIds.length) {
    const jobs = await sbSelect<{ id: number; job_type: string | null }>(
      "st_jobs",
      [q.select("id,job_type"), `id=in.(${jobIds.slice(0, 200).join(",")})`].join("&"),
    ).catch(() => []);
    for (const j of jobs) if (j.job_type) jobTypeById.set(Number(j.id), String(j.job_type));
  }

  const labelFor = (jobId: number | null) => (jobId != null && jobTypeById.get(jobId)) || "Quote";

  const quotesToday = todayRows
    .filter((r) => r.created_on)
    .map((r) => ({
      id: Number(r.id),
      at: String(r.created_on),
      label: labelFor(r.job_id),
      value: Number(r.total ?? 0),
      sold: Boolean(r.sold_on),
    }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 10);

  const dayMs = 24 * 60 * 60 * 1000;
  const quotesOutstanding = openRows
    .map((r) => ({
      id: Number(r.id),
      label: labelFor(r.job_id),
      value: Number(r.total ?? 0),
      ageDays: r.created_on ? Math.max(0, Math.floor((now.getTime() - Date.parse(r.created_on)) / dayMs)) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const soldCountMonth = soldRows.length;
  const soldCountToday = soldRows.filter(
    (r) => r.sold_on && isoDateMelbourne(new Date(r.sold_on)) === today,
  ).length;
  const avgSoldValue = soldCountMonth ? soldMtd / soldCountMonth : null;
  // Both halves are today's quotes. Dividing every quote sold today (whenever
  // it was written) by the ones written today mixed two populations and read
  // over 100% on any day the team closed something from last week.
  const conversionTodayPct = created.todayC ? created.todaySold / created.todayC : null;

  const bySeller = new Map<string, { sold: number; soldToday: number; soldWeek: number; jobs: number }>();
  for (const r of soldRows) {
    if (r.sold_by == null) continue;
    const key = String(r.sold_by);
    const acc = bySeller.get(key) ?? { sold: 0, soldToday: 0, soldWeek: 0, jobs: 0 };
    const v = Number(r.total ?? 0);
    acc.sold += v;
    acc.jobs += 1;
    if (r.sold_on) {
      const at = new Date(r.sold_on);
      if (at.getTime() >= weekStartMs) acc.soldWeek += v;
      if (isoDateMelbourne(at) === today) acc.soldToday += v;
    }
    bySeller.set(key, acc);
  }

  // Commission is applied later, once the tiers have been read from settings.
  const rawLeaderboard = [...bySeller.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return {
    jobsCompletedWeek,
    jobsScheduledNext7,
    estimatesOpenCount,
    estimatesOpenValue,
    closeRate30d,
    closeRate30dSold,
    closeRate30dQuotes,
    quotesCreatedTodayValue: created.todayV,
    quotesCreatedTodayCount: created.todayC,
    quotesCreatedTodaySold: created.todaySold,
    quotesCreatedWeekValue: created.weekV,
    quotesCreatedWeekCount: created.weekC,
    quotesCreatedMonthValue: created.monthV,
    quotesCreatedMonthCount: created.monthC,
    revenueInvoicedMtd,
    revenueToday,
    profitMtd,
    profitCoverage,
    bookingsMonth,
    soldMtd,
    soldToday,
    topJobTypes,
    jobTypeBasis,
    jobTypeUnclassified,
    rawLeaderboard,
    recentSales,
    invoiceCountMonth,
    invoiceCountToday,
    avgInvoiceValue,
    marginPct,
    soldCountMonth,
    soldCountToday,
    avgSoldValue,
    conversionTodayPct,
    quotesToday,
    quotesOutstanding,
  };
}

export type CommissionTier = { from: number; rate: number };

/**
 * Calls per person for today, this week and this month.
 *
 * Reads the replica, which the sync only fills once ServiceTitan's **Telecom**
 * scope is granted to the app — a scope the tenant has to re-authorise, not a
 * code change. Until then st_calls is empty and this returns nothing, which the
 * board renders as "not connected" rather than as a row of zeroes.
 */
async function callMetrics(now: Date): Promise<Metrics["callsByPerson"]> {
  const monthStart = startOfMonthMelbourne(now);
  const weekStartMs = startOfWeekMelbourne(now).getTime();
  const today = isoDateMelbourne(now);

  const rows = await sbSelect<{ agent: string | null; received_on: string | null }>(
    "st_calls",
    [q.select("agent,received_on"), q.gte("received_on", monthStart.toISOString()), q.notNull("agent")].join("&"),
  );

  const byAgent = new Map<string, { today: number; week: number; month: number }>();
  for (const r of rows) {
    if (!r.received_on) continue;
    const name = String(r.agent);
    const acc = byAgent.get(name) ?? { today: 0, week: 0, month: 0 };
    const at = new Date(r.received_on);
    acc.month += 1;
    if (at.getTime() >= weekStartMs) acc.week += 1;
    if (isoDateMelbourne(at) === today) acc.today += 1;
    byAgent.set(name, acc);
  }

  return [...byAgent.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.month - a.month)
    .slice(0, 6);
}

type Targets = {
  revenue: number | null;
  sales: number | null;
  profit: number | null;
  bookings: number | null;
  tiers: CommissionTier[];
};

/**
 * Commission on a month's sold total, under a tiered rate.
 *
 * Tiers are marginal, not cliff-edged: crossing a threshold lifts the rate on
 * the amount above it only. A cliff would mean a $1 sale could be worth
 * thousands, which is how commission schemes end up gamed.
 */
function commissionFor(sold: number, tiers: CommissionTier[]) {
  if (!tiers.length) return { commission: null, tier: null, toNextTier: null };

  const steps = [...tiers].sort((a, b) => a.from - b.from);
  let commission = 0;
  let tier = 0;

  for (let i = 0; i < steps.length; i++) {
    const from = steps[i].from;
    if (sold <= from) break;
    const to = i + 1 < steps.length ? Math.min(sold, steps[i + 1].from) : sold;
    commission += (to - from) * steps[i].rate;
    tier = i + 1;
  }

  const next = steps[tier];
  return {
    commission,
    tier,
    toNextTier: next && sold < next.from ? next.from - sold : null,
  };
}

/**
 * The two monthly targets. Either can be absent: a board with only a revenue
 * target still shows the revenue number and leaves the sales one blank, rather
 * than inventing a figure nobody agreed to.
 */
async function monthlyTargets(): Promise<Targets> {
  const row = await sbSelectOne<{
    value: {
      revenueTargetMonthly?: number;
      salesTargetMonthly?: number;
      profitTargetMonthly?: number;
      bookingsTargetMonthly?: number;
      commissionTiers?: CommissionTier[];
    };
  }>("portal_settings", [q.select("value"), q.eq("key", "dashboard")].join("&"));

  const positive = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  const tiers = Array.isArray(row?.value?.commissionTiers)
    ? row!.value.commissionTiers!.filter(
        (t) => typeof t?.from === "number" && typeof t?.rate === "number" && t.rate >= 0,
      )
    : [];

  return {
    revenue: positive(row?.value?.revenueTargetMonthly),
    sales: positive(row?.value?.salesTargetMonthly),
    profit: positive(row?.value?.profitTargetMonthly),
    bookings: positive(row?.value?.bookingsTargetMonthly),
    tiers,
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
    const syncRows = await sbSelect<{
      resource: string;
      last_success_at: string | null;
      last_status: string | null;
    }>(
      "portal_sync_state",
      [q.select("resource,last_success_at,last_status"), q.eq("provider", "servicetitan")].join("&"),
    );

    // The newest success across every resource, not the newest row.
    //
    // This used to read one row ordered by last_success_at descending, and
    // Postgres sorts nulls first on a descending order. Telecom calls returns
    // 403 without the scope and so has never succeeded, which put its null at
    // the top and made the board report the whole integration as unconfigured
    // while jobs, invoices, estimates and leads were syncing every few minutes.
    const lastOk = Math.max(
      0,
      ...syncRows.map((r) => (r.last_success_at ? Date.parse(r.last_success_at) : 0)),
    );
    const failing = syncRows.filter((r) => r.last_status === "error").map((r) => r.resource);
    const stale = !lastOk || Date.now() - lastOk > 45 * 60 * 1000;
    // "Not configured" covers two different problems whose fixes differ, so the
    // board says which: credentials that were never added to the deployment, or
    // credentials that are there but have never produced a successful run.
    sources.servicetitan = {
      state: !lastOk ? "not-configured" : stale ? "stale" : "ok",
      at: lastOk ? new Date(lastOk).toISOString() : undefined,
      detail: !lastOk
        ? serviceTitanConfigured()
          ? "credentials set, no sync has succeeded yet"
          : "credentials not set on this deployment"
        : failing.length
          ? `${failing.join(", ")} not syncing`
          : undefined,
    };
  } catch (e) {
    sources.servicetitan = { state: "error", detail: (e as Error).message };
    st = {
      jobsCompletedWeek: prev?.jobsCompletedWeek ?? 0,
      jobsScheduledNext7: prev?.jobsScheduledNext7 ?? 0,
      estimatesOpenCount: prev?.estimatesOpenCount ?? 0,
      estimatesOpenValue: prev?.estimatesOpenValue ?? 0,
      closeRate30d: prev?.closeRate30d ?? null,
      closeRate30dSold: prev?.closeRate30dSold ?? 0,
      closeRate30dQuotes: prev?.closeRate30dQuotes ?? 0,
      quotesCreatedTodayValue: prev?.quotesCreatedTodayValue ?? 0,
      quotesCreatedTodayCount: prev?.quotesCreatedTodayCount ?? 0,
      quotesCreatedTodaySold: prev?.quotesCreatedTodaySold ?? 0,
      quotesCreatedWeekValue: prev?.quotesCreatedWeekValue ?? 0,
      quotesCreatedWeekCount: prev?.quotesCreatedWeekCount ?? 0,
      quotesCreatedMonthValue: prev?.quotesCreatedMonthValue ?? 0,
      quotesCreatedMonthCount: prev?.quotesCreatedMonthCount ?? 0,
      revenueInvoicedMtd: prev?.revenueInvoicedMtd ?? 0,
      revenueToday: prev?.revenueToday ?? 0,
      profitMtd: prev?.profitMtd ?? null,
      profitCoverage: prev?.profitCoverage ?? 0,
      bookingsMonth: prev?.bookingsMonth ?? 0,
      soldMtd: prev?.soldMtd ?? 0,
      soldToday: prev?.soldToday ?? 0,
      topJobTypes: prev?.topJobTypes ?? [],
      jobTypeBasis: prev?.jobTypeBasis ?? "revenue",
      jobTypeUnclassified: prev?.jobTypeUnclassified ?? 0,
      rawLeaderboard: (prev?.salesLeaderboard ?? []).map((r) => ({
        name: r.name,
        sold: r.sold,
        soldToday: r.soldToday ?? 0,
        soldWeek: r.soldWeek ?? 0,
        jobs: r.jobs,
      })),
      invoiceCountMonth: prev?.invoiceCountMonth ?? 0,
      invoiceCountToday: prev?.invoiceCountToday ?? 0,
      avgInvoiceValue: prev?.avgInvoiceValue ?? null,
      marginPct: prev?.marginPct ?? null,
      soldCountMonth: prev?.soldCountMonth ?? 0,
      soldCountToday: prev?.soldCountToday ?? 0,
      avgSoldValue: prev?.avgSoldValue ?? null,
      conversionTodayPct: prev?.conversionTodayPct ?? null,
      quotesToday: [],
      quotesOutstanding: [],
      // Deliberately not carried forward: a stale feed would re-fire the rocket
      // for a sale the room already celebrated.
      recentSales: [],
    };
  }

  const xero = await fetchXeroReceivables();
  if (xero.ok) {
    sources.xero = { state: "ok", at: now.toISOString() };
  } else {
    sources.xero = { state: "stale", detail: xero.reason, at: previous?.computedAt };
  }

  const targets = await monthlyTargets().catch((): Targets => ({ revenue: null, sales: null, profit: null, bookings: null, tiers: [] }));
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
  const perDay = (target: number | null, achieved: number | null) => ({
    pacePct: target && achieved != null && progress > 0 ? achieved / (target * progress) : null,
    // An unmeasurable figure leaves the daily number unset too: "$8,000 a day to
    // go" computed against a null is just the target spread over the days left,
    // dressed up as a shortfall.
    daily:
      target == null || achieved == null
        ? null
        : Math.max(0, target - achieved) / Math.max(1, days.remaining),
    aheadBehind: target && achieved != null ? achieved - target * progress : null,
  });

  const revenue = perDay(targets.revenue, st.revenueInvoicedMtd);
  const sales = perDay(targets.sales, st.soldMtd);
  const profit = perDay(targets.profit, st.profitMtd);
  const bookings = perDay(targets.bookings, st.bookingsMonth);

  const salesLeaderboard = st.rawLeaderboard.map((r) => ({
    ...r,
    ...commissionFor(r.sold, targets.tiers),
  }));

  // Telecom is a separate ServiceTitan scope. Until it is granted the table
  // stays empty and the team page says so rather than showing zeroes that look
  // like nobody picked up the phone.
  const callsByPerson = await callMetrics(now).catch(() => [] as Metrics["callsByPerson"]);

  const { rawLeaderboard: _raw, ...stMetrics } = st;

  return {
    metrics: {
      ...leads,
      ...stMetrics,
      salesLeaderboard,
      callsByPerson,
      profitTargetMonthly: targets.profit,
      profitPacePct: profit.pacePct,
      bookingsTargetMonthly: targets.bookings,
      bookingsPacePct: bookings.pacePct,
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
