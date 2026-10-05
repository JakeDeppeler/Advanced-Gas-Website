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
import { buildPace, type PaceData, type PaceSettings, type PaceView } from "./pace";
import { computePaceData } from "./paceData";
import { jobProfits, type ProfitSummary } from "./jobProfit";
import { crewFigures } from "../portal/crewRates";
import { currentYear, paceSettingsOf, yearSpans } from "../portal/yearGoal";
import {
  commissionFor,
  monthTargetsFromYearGoal,
  normaliseBoardSettings,
  byOpportunity,
  closeRate,
  pacePerDay,
  yearByNow,
  yearStart,
  type CommissionTier,
  type YearGoalShape,
} from "./boardSettings";

// Computes one dashboard snapshot from the local replica. Nothing here calls
// ServiceTitan directly — the sync job owns that — so this stays fast and keeps
// working when an upstream API is down.

/**
 * The ceiling on a quote the board will count.
 *
 * Advanced Gas sells residential work from the website. The same ServiceTitan
 * tenant also carries commercial estimates — $544K, $454K, $436K — and a
 * handful of them swamp every quote figure on the wall: "still out" read $4.9M
 * against a month that invoices in the tens of thousands, and the biggest-quote
 * tile showed a job nobody in the room is working on.
 *
 * Quotes at or above this are left out of every quote figure. The cap is on the
 * quote's own value, so nothing is attributed to the wrong person or period —
 * those jobs simply are not what this board is for.
 */
export const QUOTE_CAP = 50_000;

/**
 * Commercial work, kept off a residential wall.
 *
 * ServiceTitan names the side of the business on every record: "Commercial
 * Projects" and "Commercial Service" against the Domestic, Real Estate and
 * Retirement Village units. A commercial project at $119,000 is real money and
 * it is not what anybody standing in front of this screen is going to ring
 * about — it sat at the top of "still out" and pushed a week of actual quoting
 * off the bottom of the card.
 *
 * This does not replace QUOTE_CAP, it complements it. Half the quotes carry
 * "Imported Default Businessunit", the migration placeholder, so the unit is
 * simply unknown for most of them: the name catches commercial work priced like
 * residential, and the ceiling catches the unclassified outliers.
 *
 * Applied here rather than in the query. `business_unit` is null on 151 of the
 * 273 jobs completed in the last sixty days — ServiceTitan's import placeholder
 * resolves to no name — and `NULL NOT LIKE 'Commercial%'` is NULL in SQL, not
 * true, so a `not.like` filter would have dropped every one of those rows and
 * taken most of the areas map with them. An unknown unit is not commercial; it
 * is unknown, and the eight rows this actually excludes are not worth a filter
 * that silently decides otherwise.
 */
const isCommercial = (unit: string | null | undefined) =>
  unit != null && /^\s*commercial/i.test(unit);

/** Drops the commercial side of the business from a fetched set of rows. */
const domestic = <T extends { business_unit?: string | null }>(rows: T[]): T[] =>
  rows.filter((r) => !isCommercial(r.business_unit));

/**
 * Quotes that came across from Field Plus rather than being written in
 * ServiceTitan.
 *
 * The migration brought 3,460 estimates over and stamped every one of them
 * "Imported Default Businessunit", authored by the import service account,
 * named with its Field Plus reference, and dated the day the import ran —
 * 30 August. 1,998 of them are still "Open", because quotes in the old system
 * were never closed off when a customer went quiet.
 *
 * On the wall that meant the "still out" list was six rows that all said
 * "Quote", all said "33 days", and ran from $39,930 down — a page of migration
 * residue sitting where this week's actual quoting should be, and 1,673 of them
 * counted as a backlog to go and ring. They are not a backlog. They are the old
 * system, and nobody is chasing them.
 *
 * The business unit is the discriminator: all 3,460 carry it, no estimate
 * written in ServiceTitan since the import does, and it is the same placeholder
 * the job-type ranking already sets aside.
 */
const isFieldPlus = (unit: string | null | undefined) => unit != null && /^imported default/i.test(unit);

/**
 * Estimates the board is allowed to talk about: written in ServiceTitan, on the
 * residential side. Jobs keep `domestic` on its own — an imported job still
 * happened, in a real suburb, for a real amount, and the areas map says so.
 */
export const quotes = <T extends { business_unit?: string | null }>(rows: T[]): T[] =>
  domestic(rows).filter((r) => !isFieldPlus(r.business_unit));

/**
 * The key that identifies one quote rather than one option of it.
 *
 * A customer is priced several ways and picks one. Grouping on job_id alone was
 * not enough: everything imported from the old system arrived with no job_id,
 * so each option became its own quote — one August job came through as fourteen
 * rows between $29K and $454K. Customer plus the day it was written identifies
 * those, because options of one quote are written together, for one customer,
 * on one day.
 */
export function quoteKey(r: {
  id: number;
  job_id: number | null;
  customer_id?: number | null;
  created_on?: string | null;
}): string {
  if (r.job_id != null) return `j${r.job_id}`;
  if (r.customer_id != null && r.created_on) return `c${r.customer_id}-${r.created_on.slice(0, 10)}`;
  return `e${r.id}`;
}

export type SourceState = "ok" | "stale" | "error" | "not-configured";

export type Metrics = {
  leadsToday: number;
  leadsWeek: number;
  leadsPrevWeek: number;
  /** Website enquiries since the 1st of the Melbourne month. */
  leadsMonth: number;
  /** Website leads by suburb. Thirty rows all up, so it is a trickle, not a map. */
  topSuburbs: Array<{ suburb: string; count: number }>;
  /**
   * Jobs actually done, by suburb — what the heat map on the Areas page draws,
   * with what the work in each place was worth.
   */
  topJobSuburbs: Array<{ suburb: string; count: number; revenue: number; avg: number | null }>;
  /** The single biggest job completed in the window, and where it was. */
  highestTicket: { value: number; jobType: string | null; suburb: string | null } | null;
  leadsByService: Array<{ service: string; count: number }>;

  jobsCompletedToday: number;
  jobsCompletedWeek: number;
  /**
   * Jobs billed today — an invoice with money on it whose lines were put on
   * today — whenever the job itself was done. Never the count of invoice
   * records: ServiceTitan opens one with every job, so that number is always
   * the whole day and says nothing.
   */
  jobsInvoicedToday: number;
  /**
   * Money banked today, and how many payments it came in. Null — not zero —
   * until the payments export has ever returned a row, so a sync that is not
   * running yet cannot read as a day nobody paid.
   */
  paidToday: number | null;
  paymentsToday: number | null;
  /**
   * Of the jobs billed today, how long each had been waiting — the gap between
   * the day the job finished and the day its invoice was actually priced.
   */
  jobsInvoicedTodayAge: { sameDay: number; days1to3: number; days4to7: number; older: number };
  /** Of those, the jobs that were finished on an earlier day: the office catching up. */
  jobsInvoicedTodayEarlier: number;
  /**
   * Null, not zero, when nothing in the replica carries an appointment time.
   * Every job row has `scheduled_on` null — ServiceTitan's jobs export doesn't
   * return appointment times, they live on the separate appointments resource —
   * so a count here would be a measured-looking zero for a business that is
   * fully booked.
   */
  jobsScheduledNext7: number | null;
  /** Open quotes older than the outstanding window — to chase or close off. */
  estimatesStaleCount: number;
  estimatesStaleValue: number;
  /** The window, in days, so the tile can say what it is counting. */
  outstandingDays: number;
  estimatesOpenCount: number;
  estimatesOpenValue: number;
  closeRate30d: number | null;
  /** The two counts the rate is made of, so the card can show its own working. */
  closeRate30dSold: number;
  /** Jobs quoted, which is the denominator — not options written. */
  closeRate30dQuotes: number;
  /** Options written across those jobs. About four to one. */
  closeRate30dOptions: number;
  /** Average price of a job quoted in the close-rate window, over its options. */
  avgQuote30d: number | null;
  /**
   * The same close rate split by the side of the business the work came from.
   *
   * Real estate work is a different sell from domestic — an agent deciding on
   * behalf of a landlord, against a householder spending their own money — and
   * one rate over both says nothing about either. Each row carries its own
   * denominator because the real estate side is eight jobs deep.
   */
  closeRateByUnit: Array<{ group: string; rate: number | null; won: number; quoted: number }>;

  // The quote funnel: written -> still out -> closed. Outstanding alone can't
  // tell you whether a thin pipeline means nobody is quoting or everybody is
  // closing, so the board shows what is being created beside what is sitting.
  quotesCreatedTodayValue: number;
  quotesCreatedTodayCount: number;
  /** Of the jobs quoted today, how many have already closed. */
  quotesCreatedTodaySold: number;
  /** Options written today, across those jobs. */
  quotesCreatedTodayOptions: number;
  /** The average option written today — a count of options says nothing about their size. */
  avgQuoteToday: number | null;
  avgQuoteMonth: number | null;
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
  /**
   * Today's quoting, one row per job rather than one per option: the value is
   * the average of what was put in front of that customer, with the count of
   * options beside it.
   */
  quotesToday: Array<{
    id: number;
    at: string;
    label: string;
    /** ServiceTitan's own job number, for looking the thing up. */
    jobNumber: string | null;
    value: number;
    options: number;
    sold: boolean;
    who: string | null;
  }>;
  /**
   * Open quotes by value, largest first, with how long they have been out.
   * One row per job, valued at the average of the options offered on it.
   */
  quotesOutstanding: Array<{
    id: number;
    label: string;
    jobNumber: string | null;
    value: number;
    options: number;
    ageDays: number;
  }>;
  /**
   * Open quotes, still inside the live window, where nothing has been written
   * for a week: the newest option on the job is 7+ days old and none has sold.
   * The ones to ring. Largest first, at most 200 — every one the 30-day window
   * holds in practice, so the portal can sort them and show them all; the
   * counts cover them all regardless. Who and where come from the job's
   * ServiceTitan location, since the jobs export carries no customer name.
   */
  quotesQuiet: Array<{
    id: number;
    label: string;
    value: number;
    options: number;
    ageDays: number;
    jobNumber?: string | null;
    customer?: string | null;
    suburb?: string | null;
  }>;
  quotesQuietCount: number;
  quotesQuietValue: number;

  bookingsMonth: number;
  bookingsTargetMonthly: number | null;
  bookingsPacePct: number | null;

  revenueInvoicedMtd: number;
  revenueTargetMonthly: number | null;

  /**
   * The year the business is actually driving at — the $3M goal — summed the
   * same way the month is, off invoice totals since the goal's year started.
   *
   * Null throughout when no year goal is set: the strip on the Pace page then
   * says so rather than pacing the wall against nothing.
   */
  revenueInvoicedYtd: number | null;
  revenueTargetYear: number | null;
  /** Where the year's target says we should be by today, pro-rata on months. */
  revenueYearByNow: number | null;
  /** Jobs completed this year over the weeks elapsed in it. */
  jobsPerWeek: number | null;
  /** The month's margin goal: its profit target over its revenue target. */
  marginGoal: number | null;
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
  dailyBookingsTarget: number | null;
  /**
   * What has to go out the door in quotes today to stay on for the month.
   *
   * The one figure on the board anybody can act on before lunch: "sell $12,000
   * today" is not a thing a person does, "put $48,000 of work in front of
   * customers today" is. Derived from the sold target and the planned win rate,
   * so it moves on its own as either changes.
   */
  dailyQuotedTarget: number | null;
  quotedTargetMonthly: number | null;
  quotedPacePct: number | null;
  /** The planned win rate, as a ratio. Flat across the month — it does not accrue. */
  winRateTarget: number | null;
  /** The configured tiers, so the board can state the thresholds it is measuring against. */
  commissionTiers: CommissionTier[];
  /** Jobs booked today, against the day's share of the monthly target. */
  bookingsToday: number;
  salesAheadBehind: number | null;
  workingDaysLeft: number;
  workingDaysTotal: number;

  overdueTotal: number | null;
  overdueCount: number | null;
  receivablesTotal: number | null;

  topJobTypes: Array<{
    jobType: string;
    revenue: number;
    profit: number | null;
    /** Invoices raised for this kind of work this month. */
    jobs: number;
    /** Jobs of this kind created this month, billed or not. */
    booked: number;
  }>;
  jobTypeBasis: "profit" | "revenue";
  /** Invoices left out of the ranking because they carry no real job type. */
  jobTypeUnclassified: number;
  salesLeaderboard: Array<{
    name: string;
    sold: number;
    soldToday: number;
    soldWeek: number;
    jobs: number;
    /** What they have written, sold or not — the measure while nothing closes through the site. */
    quoted: number;
    quotedToday: number;
    quotedWeek: number;
    quotes: number;
    /**
     * Per job, not per option. A customer priced three ways is one job quoted
     * and at most one job sold; counted per option every close rate on the page
     * would read at a third of what it is. These three say something about how
     * somebody quotes rather than how much, which is what the money columns
     * already cover.
     */
    quotedJobs: number;
    soldJobs: number;
    /** Of the jobs they wrote this month, the share that has closed. */
    closeRate: number | null;
    closeRateWon: number;
    /** What a job they sold was worth; what a job they quoted was priced at. */
    avgTicket: number | null;
    avgQuote: number | null;
    /** Options written per job quoted — whether they put a choice in front of people. */
    avgOptions: number | null;
    /** Commission is computed but deliberately not rendered on the wall. */
    commission: number | null;
    tier: number | null;
    toNextTier: number | null;
  }>;

  /** Telecom data only appears once the Telecom scope is granted; empty until then. */
  callsByPerson: Array<{ name: string; today: number; week: number; month: number }>;
  /**
   * Whether anything has ever come back from the Telecom export.
   *
   * It separates "the scope isn't granted" from "the scope is granted and this
   * month is empty", which need different words on the wall and send somebody to
   * two different places. The second is the live state: the export returns 21
   * calls across two months for a business doing eight jobs a day, so it is
   * carrying a sliver of the real traffic rather than all of it.
   */
  callsEverSynced: boolean;

  /**
   * Sales closed in the last couple of hours, newest first — what the board
   * celebrates. Carries the estimate id so the screen can tell a genuinely new
   * sale from one it has already cheered.
   */
  recentSales: Array<{ id: number; name: string | null; value: number; soldOn: string }>;

  /**
   * The year goal worked back through every stage — leads, booked, quoted,
   * sold, completed, invoiced — with where each stands this week and month,
   * and the year's gap now against yesterday and a week ago. Null with no
   * goal for this year. Built in pace.ts; the portal's Pace page rebuilds it
   * from `paceData` when somebody tries a different close rate.
   */
  pace: PaceView | null;
  paceData: PaceData | null;
  paceSettings: PaceSettings | null;
  /** Profit on the jobs invoiced this month, before GST. See jobProfit.ts. */
  jobProfitMonth: ProfitSummary | null;
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

export function serviceLabel(raw: string): string {
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

  const [leadsToday, leadsWeek, leadsPrevWeek, leadsMonth] = await Promise.all([
    sbCount("portal_leads", q.gte("created_at", dayStart.toISOString())),
    sbCount("portal_leads", q.gte("created_at", weekStart.toISOString())),
    sbCount(
      "portal_leads",
      [q.gte("created_at", prevWeekStart.toISOString()), q.lt("created_at", weekStart.toISOString())].join("&"),
    ),
    sbCount("portal_leads", q.gte("created_at", startOfMonthMelbourne(now).toISOString())),
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
    leadsMonth,
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

  // Today as well as the week. The week's figure alone, on a page headed Today,
  // was read as today's: thirty jobs since Monday looked like thirty since
  // breakfast. Showing both beats labelling one harder.
  const [jobsCompletedToday, jobsCompletedWeek, scheduledSoon, anyScheduled] = await Promise.all([
    sbCount("st_jobs", q.gte("completed_on", startOfDayMelbourne(now).toISOString())),
    sbCount("st_jobs", q.gte("completed_on", weekStart.toISOString())),
    sbCount(
      "st_jobs",
      [q.gte("scheduled_on", now.toISOString()), q.lt("scheduled_on", addDays(now, 7).toISOString())].join("&"),
    ),
    sbCount("st_jobs", q.notNull("scheduled_on")),
  ]);

  // Not one job in the replica carries an appointment time, so "0 scheduled"
  // would be a statement about the sync dressed up as a statement about next
  // week. Null blanks the tile instead, and the board says so.
  const jobsScheduledNext7 = anyScheduled > 0 ? scheduledSoon : null;

  /**
   * What customers actually paid today.
   *
   * Invoiced is what we asked for; this is what turned up, and on a day the
   * office spends chasing debtors it is the only figure on the page that moves.
   *
   * Null, never zero, until the payments export has ever brought a row back:
   * the resource is new and an empty table would otherwise put "$0 paid today"
   * on the wall on a day the office banked three cheques, which is the one kind
   * of wrong number this board must not show. Once a single payment has synced,
   * a genuine quiet day reads $0 and means it.
   */
  const [paidRows, everPaid] = await Promise.all([
    sbSelect<{ total: number | null }>(
      "st_payments",
      [q.select("total"), q.eq("paid_on", today)].join("&"),
    ).catch(() => []),
    sbCount("st_payments", "").catch(() => 0),
  ]);
  const paidToday = everPaid > 0 ? paidRows.reduce((t, p) => t + Number(p.total ?? 0), 0) : null;
  const paymentsToday = everPaid > 0 ? paidRows.length : null;

  /**
   * Everything billed today, whenever the job was done.
   *
   * By the day the invoice's lines were last put on (`invoiced_on`, migration
   * 0041), not ServiceTitan's invoice date, which is the day the job finished:
   * a job done on Thursday and priced on Monday is Monday's invoicing, and
   * counted by invoice date it vanished into last week while the office spent
   * the morning billing it. The month and the year still go by invoice date,
   * the date Xero carries.
   *
   * Jobs are counted on an invoice with money on it, never on the invoice
   * existing: ServiceTitan opens one with every job.
   */
  const billedToday = await sbSelect<{ id: number; job_id: number | null; total: number | null; invoice_date: string | null }>(
    "st_invoices",
    [q.select("id,job_id,total,invoice_date"), q.eq("invoiced_on", today)].join("&"),
  );
  const pricedToday = billedToday.filter((i) => Number(i.total ?? 0) > 0);
  const jobOf = (i: { id: number; job_id: number | null }) => (i.job_id != null ? `j${i.job_id}` : `i${i.id}`);
  const jobsInvoicedToday = new Set(pricedToday.map(jobOf)).size;
  const jobsInvoicedTodayEarlier = new Set(pricedToday.filter((i) => i.invoice_date != null && i.invoice_date < today).map(jobOf)).size;

  /**
   * How far behind the billing is, on what went out today.
   *
   * "2 done on an earlier day" said there was a lag and nothing about its size,
   * and the size is the whole point: two jobs billed a day late is the office
   * keeping up, two billed a fortnight late is money that sat there. Bucketed
   * rather than averaged — one job from June would drag a mean into nonsense
   * while the four buckets would show it for what it is, a single old one.
   *
   * Aged from the invoice date, which is ServiceTitan's day the job finished,
   * against `invoiced_on`, the day its lines were actually put on. The gap
   * between those two dates is the lag.
   */
  const DAY_MS = 24 * 60 * 60 * 1000;
  const billedAgeOf = new Map<string, number>();
  for (const i of pricedToday) {
    if (!i.invoice_date) continue;
    const days = Math.max(0, Math.round((Date.parse(today) - Date.parse(i.invoice_date)) / DAY_MS));
    const k = jobOf(i);
    // A job on two invoices is one job, at the oldest of them: the lag is how
    // long the job waited, not how long its last line did.
    billedAgeOf.set(k, Math.max(billedAgeOf.get(k) ?? 0, days));
  }
  const ages = [...billedAgeOf.values()];
  const jobsInvoicedTodayAge = {
    sameDay: ages.filter((d) => d <= 0).length,
    days1to3: ages.filter((d) => d >= 1 && d <= 3).length,
    days4to7: ages.filter((d) => d >= 4 && d <= 7).length,
    older: ages.filter((d) => d > 7).length,
  };

  /**
   * Open quotes, split at the outstanding window.
   *
   * Unbounded this reads 744 quotes and $7.3M going back to 2022 — quotes nobody
   * closed out rather than money anybody is chasing. Ninety days was the first
   * bound and it barely helped: 581 of the 744 fall inside it, so the wall still
   * said 582 quotes and $5.0M, and the office still didn't believe it.
   *
   * Thirty days is the window a quote is actually live for, and it matches the
   * close-rate window so the two tiles are talking about the same pipeline. What
   * falls outside isn't discarded — it is counted separately, because 471 quotes
   * nobody has closed off is a real thing to go and do, just not pipeline.
   */
  const OUTSTANDING_DAYS = 30;
  const openEstimates = quotes(
    await sbSelect<{
      id: number;
      job_id: number | null;
      customer_id: number | null;
      total: number | null;
      created_on: string | null;
      business_unit: string | null;
    }>(
      "st_estimates",
      [
        q.select("id,job_id,customer_id,total:total_inc,created_on,business_unit"),
        q.isNull("sold_on"),
        q.notIn("status", ["Dismissed", "Expired"]),
      ].join("&"),
    ),
  );

  /**
   * What is still out, per job rather than per option.
   *
   * Summing every open option counted the same job three and four times over
   * and put $1.35M on the wall against $755K of work that could actually land —
   * good, better and best are alternatives, and at most one of them sells. So
   * each job counts once, at the average of the prices we put in front of that
   * customer: the best case and the worst case are both a choice, and the
   * middle of what was offered is the one that needs least defending.
   */
  const freshFrom = addDays(now, -OUTSTANDING_DAYS).getTime();
  const openJobs = new Map<string, { fresh: boolean; sum: number; n: number; biggest: number }>();
  for (const e of openEstimates) {
    const key = quoteKey(e);
    // No created_on means it can't be aged, so it counts as current rather than
    // being quietly dropped out of both figures.
    const fresh = !e.created_on || new Date(e.created_on).getTime() >= freshFrom;
    const got = openJobs.get(key);
    if (got) {
      got.sum += Number(e.total ?? 0);
      got.n += 1;
      // A job is current if any option on it is.
      got.fresh = got.fresh || fresh;
      got.biggest = Math.max(got.biggest, Number(e.total ?? 0));
    } else {
      openJobs.set(key, { fresh, sum: Number(e.total ?? 0), n: 1, biggest: Number(e.total ?? 0) });
    }
  }

  let estimatesOpenCount = 0;
  let estimatesOpenValue = 0;
  let estimatesStaleCount = 0;
  let estimatesStaleValue = 0;
  for (const j of openJobs.values()) {
    // The ceiling is on the quote, not on each option. Judged one option at a
    // time, a job whose top option was $454K still contributed its cheaper ones.
    if (j.biggest >= QUOTE_CAP) continue;
    const typical = j.n > 0 ? j.sum / j.n : 0;
    if (j.fresh) {
      estimatesOpenCount += 1;
      estimatesOpenValue += typical;
    } else {
      estimatesStaleCount += 1;
      estimatesStaleValue += typical;
    }
  }

  // Close rate: of the JOBS quoted in the last 30 days, how many turned into
  // work. Per job, not per option — see closeRate() for why.
  const recentEstimates = quotes(
    await sbSelect<{
      id: number;
      job_id: number | null;
      sold_on: string | null;
      business_unit: string | null;
      customer_id: number | null;
      created_on: string | null;
      created_by: string | null;
      total: number | null;
    }>(
      "st_estimates",
      [
        q.select("id,job_id,sold_on,business_unit,customer_id,created_on,created_by,total:total_inc"),
        q.gte("created_on", addDays(now, -30).toISOString()),
        q.lt("total", String(QUOTE_CAP)),
      ].join("&"),
    ),
  );

  const close = closeRate(
    recentEstimates.map((e) => ({
      id: e.id,
      jobId: e.job_id,
      soldOn: e.sold_on,
      customerId: e.customer_id,
      createdOn: e.created_on,
    })),
  );
  const closeRate30dQuotes = close.quoted;
  const closeRate30dSold = close.won;
  const closeRate30dOptions = close.options;
  const closeRate30d = close.rate;

  /**
   * What a job quoted in that same window was priced at.
   *
   * Per job and averaged over its options, not per option: the close rate
   * beside it counts jobs, so an average that counted options would be the two
   * halves of one sentence disagreeing. Same window as the rate, for the same
   * reason the Team columns share one.
   */
  const quotedJobValues = new Map<string, { sum: number; n: number }>();
  for (const r of recentEstimates) {
    const k = quoteKey(r);
    const got = quotedJobValues.get(k);
    const v = Number(r.total ?? 0);
    if (got) {
      got.sum += v;
      got.n += 1;
    } else {
      quotedJobValues.set(k, { sum: v, n: 1 });
    }
  }
  /**
   * Per side of the business. ServiceTitan names the unit "Domestic -
   * Installation", "Real Estate - Repairs" and so on, so the part before the
   * dash is the side. Only the two Jake asked for are kept: the rest of the
   * tenant is a handful of jobs under names like "Quotation" that are not a
   * side of the business at all.
   */
  const UNIT_GROUPS = ["Domestic", "Real Estate"] as const;
  const byUnit = new Map<string, Map<string, boolean>>();
  for (const r of recentEstimates) {
    const group = String(r.business_unit ?? "").split(" - ")[0].trim();
    if (!UNIT_GROUPS.includes(group as (typeof UNIT_GROUPS)[number])) continue;
    const jobs = byUnit.get(group) ?? new Map<string, boolean>();
    const k = quoteKey(r);
    jobs.set(k, (jobs.get(k) ?? false) || Boolean(r.sold_on));
    byUnit.set(group, jobs);
  }
  const closeRateByUnit: Metrics["closeRateByUnit"] = UNIT_GROUPS.map((group) => {
    const jobs = [...(byUnit.get(group)?.values() ?? [])];
    const won = jobs.filter(Boolean).length;
    return { group: String(group), rate: jobs.length ? won / jobs.length : null, won, quoted: jobs.length };
  });

  const avgQuote30d = quotedJobValues.size
    ? [...quotedJobValues.values()].reduce((t, j) => t + (j.n > 0 ? j.sum / j.n : 0), 0) / quotedJobValues.size
    : null;

  // Quotes written this month, so the funnel reads created -> outstanding ->
  // closed. A thin pipeline means something different depending on which end
  // it is thin at.
  const createdRows = quotes(
    await sbSelect<{
      id: number;
      job_id: number | null;
      total: number | null;
      created_on: string | null;
      sold_on: string | null;
      created_by: string | null;
      business_unit: string | null;
      customer_id: number | null;
    }>(
      "st_estimates",
      [
        q.select("id,job_id,total:total_inc,created_on,sold_on,created_by,business_unit,customer_id"),
        q.gte("created_on", monthStart.toISOString()),
        q.lt("total", String(QUOTE_CAP)),
      ].join("&"),
    ),
  );

  const weekStartMs = weekStart.getTime();
  // Value sums over every option, because that is what was written. Counts are
  // per job, because "10 quotes today" for what was really two jobs priced
  // five ways is the same overcount that broke the close rate.
  const created = { todayV: 0, weekV: 0, monthV: 0, todayOptions: 0, monthOptions: 0 };
  const todayRowsForCount: { id: number; job_id: number | null; sold_on: string | null; customer_id: number | null; created_on: string | null }[] = [];
  const weekRowsForCount: { id: number; job_id: number | null; sold_on: string | null; customer_id: number | null; created_on: string | null }[] = [];
  for (const r of createdRows) {
    const v = Number(r.total ?? 0);
    created.monthV += v;
    created.monthOptions += 1;
    if (!r.created_on) continue;
    const at = new Date(r.created_on);
    if (at.getTime() >= weekStartMs) {
      created.weekV += v;
      weekRowsForCount.push({ id: r.id, job_id: r.job_id, sold_on: r.sold_on, customer_id: r.customer_id, created_on: r.created_on });
    }
    if (isoDateMelbourne(at) === today) {
      created.todayV += v;
      created.todayOptions += 1;
      todayRowsForCount.push({ id: r.id, job_id: r.job_id, sold_on: r.sold_on, customer_id: r.customer_id, created_on: r.created_on });
    }
  }
  const asOpt = (r: { id: number; job_id: number | null; sold_on: string | null; customer_id: number | null; created_on: string | null }) =>
    ({ id: r.id, jobId: r.job_id, soldOn: r.sold_on, customerId: r.customer_id, createdOn: r.created_on });
  const todayClose = closeRate(todayRowsForCount.map(asOpt));
  const monthOpportunities = byOpportunity(
    createdRows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      soldOn: r.sold_on,
      customerId: r.customer_id,
      createdOn: r.created_on,
    })),
  ).length;
  const weekOpportunities = byOpportunity(weekRowsForCount.map(asOpt)).length;

  /**
   * Where the work actually happened, by suburb.
   *
   * The Areas heat map drew website leads, of which there are about thirty in
   * the whole table — a map of the catchment built from a trickle, naming
   * whichever couple of suburbs had filled in the web form. Completed jobs carry
   * the same suburb and postcode columns and there are thousands of them.
   */
  // Sixty days, the same window the named quote lists use, so every "recent"
  // figure on the board means the same stretch of time.
  const AREA_DAYS = 60;
  const jobPlaces = domestic(
    await sbSelect<{
      suburb: string | null;
      postcode: string | null;
      total: number | null;
      job_type: string | null;
      business_unit: string | null;
    }>(
      "st_jobs",
      [
        q.select("suburb,postcode,total,job_type,business_unit"),
        q.gte("completed_on", addDays(now, -AREA_DAYS).toISOString()),
      ].join("&"),
    ),
  );

  // Count and value together: where the work is, and what it was worth there.
  // A suburb with four jobs at $3,000 is a different proposition to one with
  // twenty services, and the map alone cannot say which is which.
  const byJobSuburb = new Map<string, { count: number; revenue: number }>();
  let highestTicket: Metrics["highestTicket"] = null;
  for (const j of jobPlaces) {
    const place = j.suburb?.trim() || (j.postcode ? POSTCODE_TO_SUBURB.get(j.postcode.trim()) ?? j.postcode.trim() : null);
    const value = Number(j.total ?? 0);
    if (place) {
      const row = byJobSuburb.get(place) ?? { count: 0, revenue: 0 };
      byJobSuburb.set(place, { count: row.count + 1, revenue: row.revenue + value });
    }
    /**
     * The named job has to be one we can stand behind, which means one we can
     * classify. 144 of the 273 completed jobs in this window carry
     * ServiceTitan's import placeholder for a business unit — the id resolves
     * to nothing in the lookup tables — and the largest of them, $21,890 in
     * Sale, was topping this tile. Sale is 200km east of the corridor and the
     * row has no job type either, so the board could not say what the work was
     * or which side of the business it belonged to. Jake read it as commercial
     * and he had no way to tell otherwise.
     *
     * Unclassified jobs still count towards the map: they happened, in a real
     * suburb, for a real amount. They just don't get named.
     */
    const classified = j.business_unit != null && j.job_type != null;
    if (classified && value > 0 && (highestTicket == null || value > highestTicket.value)) {
      highestTicket = { value, jobType: j.job_type ?? null, suburb: place };
    }
  }
  const topJobSuburbs = [...byJobSuburb.entries()]
    .map(([suburb, r]) => ({ suburb, count: r.count, revenue: r.revenue, avg: r.count > 0 && r.revenue > 0 ? r.revenue / r.count : null }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Jobs booked this month — when the job was created, not when it is scheduled,
  // because booking is the act being measured.
  const bookingsMonth = await sbCount("st_jobs", q.gte("created_on", monthStart.toISOString()));
  const bookingsToday = await sbCount("st_jobs", q.gte("created_on", startOfDayMelbourne(now).toISOString()));

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
  const invoiceCountToday = pricedToday.length;
  const avgInvoiceValue = invoiceCountMonth ? revenueInvoicedMtd / invoiceCountMonth : null;

  // Margin is only meaningful over the invoices that actually carry a cost, and
  // only worth showing when enough of them do — otherwise it is a ratio of a
  // sample to the whole, which reads low and means nothing.
  const costedRevenue = costed.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const marginPct =
    profitMtd != null && profitCoverage >= 0.5 && costedRevenue > 0 ? profitMtd / costedRevenue : null;
  // Credits and adjustments billed today count against it, as they do on the books.
  const revenueToday = billedToday.reduce((s, i) => s + Number(i.total ?? 0), 0);

  // Job types for the month, not a rolling ninety days. The page is headed
  // "October so far" and the two tiles above read the month, so a table summing
  // $92K under an "Invoiced $21K" tile invited exactly one question and gave
  // the wrong answer to it. Ranked by gross profit where ServiceTitan gave us
  // cost on a meaningful share of invoices, otherwise by revenue.
  const profitRows = await sbSelect<{ job_type: string | null; total: number | null; cost: number | null }>(
    "st_invoices",
    [q.select("job_type,total,cost"), q.gte("invoice_date", isoDateMelbourne(monthStart)), q.notNull("job_type")].join("&"),
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

  /**
   * Jobs booked this month by kind of work, alongside what was invoiced.
   *
   * The table was invoices only, and invoices are what has been billed — which
   * trails what has been taken on, and in a month where a lot gets booked and
   * little gets billed the page reads as a quiet month when it was anything
   * but. Booked is the leading half of the same question.
   */
  const bookedRows = await sbSelect<{ job_type: string | null }>(
    "st_jobs",
    [q.select("job_type"), q.gte("created_on", monthStart.toISOString()), q.notNull("job_type")].join("&"),
  ).catch(() => []);
  const bookedByType = new Map<string, number>();
  for (const r of bookedRows) {
    const t = String(r.job_type);
    if (UNCLASSIFIED.test(t)) continue;
    bookedByType.set(t, (bookedByType.get(t) ?? 0) + 1);
  }

  const topJobTypes = [...byType.entries()]
    .map(([jobType, v]) => ({
      jobType,
      revenue: v.revenue,
      profit: v.hasCost ? v.revenue - v.cost : null,
      jobs: v.jobs,
      booked: bookedByType.get(jobType) ?? 0,
    }))
    .sort((a, b) => (jobTypeBasis === "profit" ? (b.profit ?? 0) - (a.profit ?? 0) : b.revenue - a.revenue))
    .slice(0, 5);

  // Everything sold this month: the month and today totals, and the leaderboard.
  // One query rather than three, and deliberately not filtered to rows that
  // carry a seller — an estimate closed without one still sold, and excluding it
  // would make the leaderboard rows sum to less than the headline figure.
  const soldRows = quotes(
    await sbSelect<{
      id: number;
      sold_by: string | null;
      created_by: string | null;
      total: number | null;
      sold_on: string | null;
      business_unit: string | null;
      job_id: number | null;
      customer_id: number | null;
      created_on: string | null;
    }>(
      "st_estimates",
      [
        q.select("id,sold_by,created_by,total:total_inc,sold_on,business_unit,job_id,customer_id,created_on"),
        q.gte("sold_on", monthStart.toISOString()),
        q.lt("total", String(QUOTE_CAP)),
      ].join("&"),
    ),
  );

  /**
   * Credit goes to whoever wrote the quote, not whoever happened to close it.
   *
   * ServiceTitan only stamps soldBy once an estimate closes, so a leaderboard
   * keyed on it listed the two people who had closed something this month while
   * six had been quoting. createdById is on every estimate.
   */
  const creditFor = (r: { created_by: string | null; sold_by: string | null }) => r.created_by ?? r.sold_by;

  const soldMtd = soldRows.reduce((s, r) => s + Number(r.total ?? 0), 0);

  // The celebration feed. Two hours is comfortably wider than the sync interval,
  // so a sale can't slip through between runs, and the screen's own de-duping
  // stops it being cheered twice.
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recentSales = soldRows
    .filter((r) => r.sold_on && Date.parse(r.sold_on) >= twoHoursAgo)
    .map((r) => ({
      id: Number(r.id),
      name: creditFor(r),
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
  const openRows = quotes(
    await sbSelect<{
      id: number;
      total: number | null;
      created_on: string | null;
      job_id: number | null;
      customer_id: number | null;
      business_unit: string | null;
    }>(
      "st_estimates",
      [
        q.select("id,total:total_inc,created_on,job_id,customer_id,business_unit"),
        q.isNull("sold_on"),
        q.notIn("status", ["Dismissed", "Expired"]),
        q.gte("created_on", addDays(now, -QUOTE_LIST_DAYS).toISOString()),
      ].join("&"),
    ),
  );

  /*
   * `customer_id` is not decoration here: `quoteKey` groups on the job, and
   * falls back to customer-plus-day for the estimates ServiceTitan writes with
   * no job attached. Leaving the column out of the select made that fallback
   * unreachable, so eight options of one quote — same customer, same minute,
   * same price to the dollar — listed as eight separate quotes on the wall.
   */
  const todayRows = createdRows.length
    ? quotes(
        await sbSelect<{
          id: number;
          total: number | null;
          created_on: string | null;
          sold_on: string | null;
          job_id: number | null;
          customer_id: number | null;
          sold_by: string | null;
          created_by: string | null;
          business_unit: string | null;
        }>(
          "st_estimates",
          [
            q.select("id,total:total_inc,created_on,sold_on,job_id,customer_id,sold_by,created_by,business_unit"),
            q.gte("created_on", startOfDayMelbourne(now).toISOString()),
            q.lt("total", String(QUOTE_CAP)),
          ].join("&"),
        ),
      )
    : [];

  const jobIds = [...new Set([...todayRows, ...openRows].map((r) => r.job_id).filter((v): v is number => v != null))];
  const jobTypeById = new Map<number, string>();
  // ServiceTitan's own job number, which is what anybody standing at the board
  // types into ServiceTitan to find the thing. The estimate id is ours; the job
  // number is theirs.
  const jobNumberById = new Map<number, string>();
  // Who the quote is for and where, for the quiet list the office rings from.
  const placeByJob = new Map<number, { customer: string | null; suburb: string | null }>();
  if (jobIds.length) {
    const jobs = await sbSelect<{ id: number; job_type: string | null; job_number: string | null; location_id: number | null }>(
      "st_jobs",
      [q.select("id,job_type,job_number,location_id"), `id=in.(${jobIds.slice(0, 200).join(",")})`].join("&"),
    ).catch(() => []);
    for (const j of jobs) {
      if (j.job_type) jobTypeById.set(Number(j.id), String(j.job_type));
      if (j.job_number) jobNumberById.set(Number(j.id), String(j.job_number));
    }
    const locIds = [...new Set(jobs.map((j) => j.location_id).filter((v): v is number => v != null))];
    const locs = locIds.length
      ? await sbSelect<{ id: number; name: string | null; suburb: string | null }>(
          "st_locations",
          [q.select("id,name:raw->>name,suburb"), `id=in.(${locIds.join(",")})`].join("&"),
        ).catch(() => [])
      : [];
    const locById = new Map(locs.map((l) => [Number(l.id), l]));
    for (const j of jobs) {
      const l = j.location_id != null ? locById.get(Number(j.location_id)) : undefined;
      if (l) placeByJob.set(Number(j.id), { customer: l.name?.trim() || null, suburb: l.suburb?.trim() || null });
    }
  }

  const labelFor = (jobId: number | null) => (jobId != null && jobTypeById.get(jobId)) || "Quote";
  const numberFor = (jobId: number | null) => (jobId != null ? jobNumberById.get(jobId) ?? null : null);

  /**
   * Today's quoting, one row per job rather than one per option.
   *
   * Priced four ways, a single kitchen filled the card: ten rows that all said
   * "Quotation", all said the same name, all said 1:34pm, and differed only in
   * the third digit of the price. That is not a list of today's work, it is one
   * job wearing ten hats, and at four metres it reads as a wall of noise.
   *
   * One row a job now, at the average of what was put in front of that
   * customer, with the option count beside it — the same convention the
   * outstanding list and the pipeline figures already use.
   */
  const todayByJob = new Map<
    string,
    { id: number; jobId: number | null; at: string; sum: number; n: number; sold: boolean; who: string | null }
  >();
  for (const r of todayRows) {
    if (!r.created_on) continue;
    const key = quoteKey(r);
    const v = Number(r.total ?? 0);
    const got = todayByJob.get(key);
    if (got) {
      got.sum += v;
      got.n += 1;
      got.sold = got.sold || Boolean(r.sold_on);
      // The time shown is when the job was first priced, not when the last
      // option was saved — the options of one quote are written together.
      if (Date.parse(String(r.created_on)) < Date.parse(got.at)) got.at = String(r.created_on);
    } else {
      todayByJob.set(key, {
        id: Number(r.id),
        jobId: r.job_id,
        at: String(r.created_on),
        sum: v,
        n: 1,
        sold: Boolean(r.sold_on),
        who: r.created_by ?? r.sold_by,
      });
    }
  }

  const quotesToday = [...todayByJob.values()]
    .map((j) => ({
      id: j.id,
      at: j.at,
      label: labelFor(j.jobId),
      jobNumber: numberFor(j.jobId),
      value: j.n > 0 ? j.sum / j.n : 0,
      options: j.n,
      sold: j.sold,
      who: j.who,
    }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 10);

  const dayMs = 24 * 60 * 60 * 1000;

  // One row per quote, not per option — see quoteKey.
  const outByJob = new Map<
    string,
    {
      id: number;
      jobId: number | null;
      label: string;
      jobNumber: string | null;
      sum: number;
      n: number;
      biggest: number;
      oldest: number;
      newest: number;
    }
  >();
  for (const r of openRows) {
    const key = quoteKey(r);
    const age = r.created_on ? Math.max(0, Math.floor((now.getTime() - Date.parse(r.created_on)) / dayMs)) : 0;
    const v = Number(r.total ?? 0);
    const got = outByJob.get(key);
    if (got) {
      got.sum += v;
      got.n += 1;
      got.biggest = Math.max(got.biggest, v);
      got.oldest = Math.max(got.oldest, age);
      got.newest = Math.min(got.newest, age);
    } else {
      outByJob.set(key, {
        id: Number(r.id),
        jobId: r.job_id,
        label: labelFor(r.job_id),
        jobNumber: numberFor(r.job_id),
        sum: v,
        n: 1,
        biggest: v,
        oldest: age,
        newest: age,
      });
    }
  }

  const quotesOutstanding = [...outByJob.values()]
    // The ceiling applies to the quote, not to each option of it. Judging
    // options one at a time let a job whose top option was $454K through on the
    // strength of its cheaper ones, which is how a commercial fit-out kept
    // appearing on a residential wall.
    .filter((j) => j.biggest < QUOTE_CAP)
    .map((j) => ({
      id: j.id,
      label: j.label,
      jobNumber: j.jobNumber,
      value: j.sum / j.n,
      options: j.n,
      ageDays: j.oldest,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Gone quiet: a quote still inside the live window that nobody has added an
  // option to for a week, and that hasn't sold. Judged on the newest option,
  // because a job re-priced on Tuesday is being worked on, however old its
  // first option is.
  const QUIET_DAYS = 7;
  const quiet = [...outByJob.values()]
    .filter((j) => j.biggest < QUOTE_CAP && j.newest >= QUIET_DAYS && j.newest <= OUTSTANDING_DAYS)
    .map((j) => {
      const place = j.jobId != null ? placeByJob.get(j.jobId) : undefined;
      return {
        id: j.id, label: j.label, value: j.sum / j.n, options: j.n, ageDays: j.newest,
        jobNumber: j.jobNumber, customer: place?.customer ?? null, suburb: place?.suburb ?? null,
      };
    })
    .sort((a, b) => b.value - a.value);
  const quotesQuietCount = quiet.length;
  const quotesQuietValue = quiet.reduce((n, j) => n + j.value, 0);
  const quotesQuiet = quiet.slice(0, 200);

  const soldCountMonth = soldRows.length;
  const soldCountToday = soldRows.filter(
    (r) => r.sold_on && isoDateMelbourne(new Date(r.sold_on)) === today,
  ).length;
  const avgSoldValue = soldCountMonth ? soldMtd / soldCountMonth : null;
  // Both halves are today's quotes. Dividing every quote sold today (whenever
  // it was written) by the ones written today mixed two populations and read
  // over 100% on any day the team closed something from last week.
  const conversionTodayPct = todayClose.rate;

  type Seller = {
    sold: number;
    soldToday: number;
    soldWeek: number;
    jobs: number;
    quoted: number;
    quotedToday: number;
    quotedWeek: number;
    quotes: number;
  };
  const blank = (): Seller => ({
    sold: 0,
    soldToday: 0,
    soldWeek: 0,
    jobs: 0,
    quoted: 0,
    quotedToday: 0,
    quotedWeek: 0,
    quotes: 0,
  });

  const bySeller = new Map<string, Seller>();

  /**
   * The same two populations again, grouped per job rather than per option.
   *
   * The money columns sum every option, because that is what was written. A
   * close rate and an average cannot: three prices on one kitchen are one job
   * quoted and at most one job sold, so counted per option everybody's close
   * rate reads at a third of the truth and their average quote at the price of
   * an option rather than of a job.
   */
  const quotedJobsBy = new Map<string, Map<string, { sum: number; n: number; won: boolean; wonValue: number }>>();

  /**
   * Thirty days, not the month, for anything that needs a quote to have had a
   * chance to close.
   *
   * On the third of October the month held eleven jobs quoted by one person and
   * none closed, which is a 0% against his name on a wall for the arithmetic
   * reason that nobody decides in three days. Over thirty days the same person
   * reads 12% of 65 and the woman selling reads 31% of 42 — rates you can put
   * two people beside each other on. It is also the window the headline close
   * rate already uses, so the two tiles are describing one pipeline.
   *
   * All three columns run off this one population, so they answer one question
   * between them: of the jobs you put a price on in the last thirty days, how
   * many came back, what were they worth, and what were you asking. A ticket
   * averaged over a different window than the rate beside it is the same trap
   * as the one the totals row on Performance was built to close.
   */
  for (const r of recentEstimates) {
    const key = r.created_by;
    if (key == null) continue;
    const jobs =
      quotedJobsBy.get(key) ?? new Map<string, { sum: number; n: number; won: boolean; wonValue: number }>();
    const jk = quoteKey(r);
    const v = Number(r.total ?? 0);
    const sold = Boolean(r.sold_on);
    const got = jobs.get(jk);
    if (got) {
      got.sum += v;
      got.n += 1;
      got.won = got.won || sold;
      // The ticket is the option that actually sold, not the average of the
      // options offered — the customer picked one and that is what was banked.
      if (sold) got.wonValue += v;
    } else {
      jobs.set(jk, { sum: v, n: 1, won: sold, wonValue: sold ? v : 0 });
    }
    quotedJobsBy.set(key, jobs);
  }

  for (const r of soldRows) {
    const key = creditFor(r);
    if (key == null) continue;
    const acc = bySeller.get(key) ?? blank();
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

  // Everyone who has written a quote this month, whether or not one has closed.
  // A page called Team that lists two of seven people reads as broken, and the
  // work the other five did is the pipeline the sold figures come out of.
  for (const r of createdRows) {
    const key = r.created_by;
    if (key == null) continue;
    const acc = bySeller.get(key) ?? blank();
    const v = Number(r.total ?? 0);
    acc.quoted += v;
    acc.quotes += 1;
    if (r.created_on) {
      const at = new Date(r.created_on);
      if (at.getTime() >= weekStartMs) acc.quotedWeek += v;
      if (isoDateMelbourne(at) === today) acc.quotedToday += v;
    }
    bySeller.set(key, acc);
  }

  // Commission is applied later, once the tiers have been read from settings.
  /**
   * ServiceTitan's own API user, which is not a person.
   *
   * Two estimates in the tenant were written by the integration account rather
   * than by anybody, and widening the roster below to thirty days brought it
   * onto the leaderboard. Matched by its exact name rather than by a shape —
   * "no space in it" would eventually drop a real person.
   */
  const SERVICE_ACCOUNT = "advancedgasairconditioningservices";

  /**
   * Everybody who shows up in either population, not just the month's.
   *
   * The roster was built from rows dated this month while three of the columns
   * measure thirty days, so somebody who quoted in late September and nothing
   * since was absent from a table that already held his close rate and his
   * averages. On the third of October that was two of the seven people quoting.
   */
  const roster = new Set<string>([...bySeller.keys(), ...quotedJobsBy.keys()]);
  roster.delete(SERVICE_ACCOUNT);

  const rawLeaderboard = [...roster]
    .map((name) => {
      const v = bySeller.get(name) ?? blank();
      const quoted = [...(quotedJobsBy.get(name)?.values() ?? [])];
      const wonJobs = quoted.filter((j) => j.won);
      const won = wonJobs.length;
      const options = quoted.reduce((t, j) => t + j.n, 0);
      return {
        name,
        ...v,
        quotedJobs: quoted.length,
        soldJobs: won,
        // Null, not zero, with nothing quoted: somebody credited only through
        // sold_by has written nothing this month, and a 0% against their name
        // would read as a month of losing every job.
        closeRate: quoted.length ? won / quoted.length : null,
        closeRateWon: won,
        avgTicket: won ? wonJobs.reduce((t, j) => t + j.wonValue, 0) / won : null,
        // The middle of what was put in front of the customer, averaged across
        // their jobs — the same convention the pipeline figure uses, because
        // the best case and the worst case are both a choice.
        avgQuote: quoted.length
          ? quoted.reduce((t, j) => t + (j.n > 0 ? j.sum / j.n : 0), 0) / quoted.length
          : null,
        avgOptions: quoted.length ? options / quoted.length : null,
      };
    })
    // Quoting is what the board measures for now — nothing is sold through the
    // site yet, so ranking on sold put a column of zeroes above the work people
    // are actually doing. Sold breaks the tie.
    // Quoting is what the board measures for now. Jobs quoted in the window
    // breaks the tie after that, so somebody who wrote nothing this month but
    // was quoting a fortnight ago still sorts above an empty row.
    .sort((a, b) => b.quoted - a.quoted || b.sold - a.sold || b.quotedJobs - a.quotedJobs)
    .slice(0, 8);

  return {
    jobsCompletedToday,
    jobsCompletedWeek,
    jobsInvoicedToday,
    paidToday,
    paymentsToday,
    jobsInvoicedTodayAge,
    jobsInvoicedTodayEarlier,
    jobsScheduledNext7,
    topJobSuburbs,
    highestTicket,
    estimatesStaleCount,
    estimatesStaleValue,
    outstandingDays: OUTSTANDING_DAYS,
    estimatesOpenCount,
    estimatesOpenValue,
    closeRate30d,
    closeRate30dSold,
    closeRate30dQuotes,
    closeRate30dOptions,
    avgQuote30d,
    closeRateByUnit,
    quotesCreatedTodayValue: created.todayV,
    quotesCreatedTodayCount: todayClose.quoted,
    quotesCreatedTodayOptions: created.todayOptions,
    quotesCreatedTodaySold: todayClose.won,
    avgQuoteToday: created.todayOptions ? created.todayV / created.todayOptions : null,
    avgQuoteMonth: created.monthOptions ? created.monthV / created.monthOptions : null,
    quotesCreatedWeekValue: created.weekV,
    quotesCreatedWeekCount: weekOpportunities,
    quotesCreatedMonthValue: created.monthV,
    quotesCreatedMonthCount: monthOpportunities,
    revenueInvoicedMtd,
    revenueToday,
    profitMtd,
    profitCoverage,
    bookingsMonth,
    bookingsToday,
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
    quotesQuiet,
    quotesQuietCount,
    quotesQuietValue,
  };
}

export type { CommissionTier } from "./boardSettings";

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
  quoted: number | null;
  winRate: number | null;
  tiers: CommissionTier[];
};

/**
 * Everything the board is told rather than measures: the four monthly targets
 * (from the year goal), the commission bands and the definition of a working
 * day (from the board's own row).
 *
 * The shapes and clamps live in `boardSettings.ts`, which the portal editors
 * write through as well — so a target the office can set is a target the board
 * can read, with no second definition in between to drift.
 */
async function boardConfig(now: Date): Promise<{ targets: Targets; calendar: WorkingCalendar; goal: YearGoalShape | null }> {
  const row = await sbSelectOne<{ value: unknown }>(
    "portal_settings",
    [q.select("value"), q.eq("key", "dashboard")].join("&"),
  );
  const cfg = normaliseBoardSettings(row?.value);

  // The year goal is the one place the business says what it is aiming at,
  // set on the portal's Year goal page. Every target on the wall is derived
  // from it here, on each snapshot, rather than copied across when it was
  // saved: a figure copied in October is the wrong figure in November, and
  // nothing on the wall would say so.
  const goal = (
    await sbSelectOne<{ value: YearGoalShape }>(
      "portal_settings",
      [q.select("value"), q.eq("key", "yeargoal")].join("&"),
    ).catch(() => null)
  )?.value ?? null;

  const calendar: WorkingCalendar = { days: cfg.workingDays, holidays: cfg.holidays };
  // Null for any target the goal doesn't cover — no goal, last year's goal,
  // no profit percentage, no planned week — and a null blanks that dial.
  const t = monthTargetsFromYearGoal(goal, isoDateMelbourne(now).slice(0, 7), workingDaysInMonth(now, calendar), calendar.days.length);

  return {
    targets: {
      revenue: t.revenue,
      sales: t.sales,
      profit: t.profit,
      bookings: t.bookings,
      quoted: t.quoted,
      winRate: t.winRate,
      tiers: cfg.commissionTiers,
    },
    calendar,
    goal,
  };
}

/** Most recent stored snapshot, used to carry a failed source's last known value. */
/** "3 hours", "2 days" — for saying how old a carried-forward figure is. */
function relativeHours(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  if (h < 48) return `${h} ${h === 1 ? "hour" : "hours"}`;
  return `${Math.round(h / 24)} days`;
}

/**
 * How old a Xero reading may be before the wall admits it.
 *
 * A Xero access token lives thirty minutes and the portal refreshes it when
 * somebody opens a Finance page — this file must never refresh it, see
 * dashboard/xero.ts for why. So on any evening or weekend with nobody in the
 * portal, the token lapses within half an hour; the board went amber and stayed
 * amber, with "xero access token expired" across the footer, while the figures
 * behind it were perfectly good.
 *
 * That is the board crying wolf, and a light that is permanently amber gets
 * read exactly as often as one that is permanently green: never. What the tile
 * carries is money owed to us, which moves when an invoice is raised or paid —
 * daily, not half-hourly. A reading from this morning is the right number to
 * put on a wall this afternoon.
 */
export const XERO_GOOD_FOR_MS = 12 * 60 * 60 * 1000;

/**
 * What the footer light should say about Xero.
 *
 * Exported so the rule can be exercised on its own: it is the one piece of the
 * snapshot that decides what the room believes, and it is reached only through
 * a full recompute otherwise.
 */
export function xeroSourceState(
  ok: boolean,
  lastReadAt: string | undefined,
  now: Date,
  reason: string,
): { state: SourceState; detail?: string; at?: string } {
  if (ok) return { state: "ok", at: now.toISOString() };

  // The time of the last successful READ, not of the last snapshot. Carrying
  // the snapshot's own timestamp meant this advanced every thirty seconds
  // whether or not Xero had answered, so it could never say how old the figures
  // were — which is the one thing it is for.
  const ageMs = lastReadAt ? now.getTime() - Date.parse(lastReadAt) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(ageMs) && ageMs < XERO_GOOD_FOR_MS) return { state: "ok", at: lastReadAt };
  return {
    state: "stale",
    detail: Number.isFinite(ageMs) ? `last read ${relativeHours(ageMs)} ago` : reason,
    at: lastReadAt,
  };
}

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
      leadsMonth: prev?.leadsMonth ?? 0,
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
      jobsCompletedToday: prev?.jobsCompletedToday ?? 0,
      jobsCompletedWeek: prev?.jobsCompletedWeek ?? 0,
      jobsInvoicedToday: prev?.jobsInvoicedToday ?? 0,
      jobsInvoicedTodayAge: prev?.jobsInvoicedTodayAge ?? { sameDay: 0, days1to3: 0, days4to7: 0, older: 0 },
      paidToday: prev?.paidToday ?? null,
      paymentsToday: prev?.paymentsToday ?? null,
      jobsInvoicedTodayEarlier: prev?.jobsInvoicedTodayEarlier ?? 0,
      // Null carries forward as null: a failed read has nothing to say about
      // next week's bookings, and zero would claim it does.
      jobsScheduledNext7: prev?.jobsScheduledNext7 ?? null,
      topJobSuburbs: prev?.topJobSuburbs ?? [],
      highestTicket: prev?.highestTicket ?? null,
      estimatesStaleCount: prev?.estimatesStaleCount ?? 0,
      estimatesStaleValue: prev?.estimatesStaleValue ?? 0,
      outstandingDays: prev?.outstandingDays ?? 30,
      estimatesOpenCount: prev?.estimatesOpenCount ?? 0,
      estimatesOpenValue: prev?.estimatesOpenValue ?? 0,
      closeRate30d: prev?.closeRate30d ?? null,
      closeRate30dSold: prev?.closeRate30dSold ?? 0,
      closeRate30dOptions: prev?.closeRate30dOptions ?? 0,
      avgQuote30d: prev?.avgQuote30d ?? null,
      closeRateByUnit: prev?.closeRateByUnit ?? [],
      closeRate30dQuotes: prev?.closeRate30dQuotes ?? 0,
      quotesCreatedTodayValue: prev?.quotesCreatedTodayValue ?? 0,
      quotesCreatedTodayCount: prev?.quotesCreatedTodayCount ?? 0,
      quotesCreatedTodaySold: prev?.quotesCreatedTodaySold ?? 0,
      quotesCreatedTodayOptions: prev?.quotesCreatedTodayOptions ?? 0,
      avgQuoteToday: prev?.avgQuoteToday ?? null,
      avgQuoteMonth: prev?.avgQuoteMonth ?? null,
      quotesCreatedWeekValue: prev?.quotesCreatedWeekValue ?? 0,
      quotesCreatedWeekCount: prev?.quotesCreatedWeekCount ?? 0,
      quotesCreatedMonthValue: prev?.quotesCreatedMonthValue ?? 0,
      quotesCreatedMonthCount: prev?.quotesCreatedMonthCount ?? 0,
      revenueInvoicedMtd: prev?.revenueInvoicedMtd ?? 0,
      revenueToday: prev?.revenueToday ?? 0,
      profitMtd: prev?.profitMtd ?? null,
      profitCoverage: prev?.profitCoverage ?? 0,
      bookingsMonth: prev?.bookingsMonth ?? 0,
      bookingsToday: prev?.bookingsToday ?? 0,
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
        quoted: r.quoted ?? 0,
        quotedToday: r.quotedToday ?? 0,
        quotedWeek: r.quotedWeek ?? 0,
        quotes: r.quotes ?? 0,
        quotedJobs: r.quotedJobs ?? 0,
        soldJobs: r.soldJobs ?? 0,
        closeRate: r.closeRate ?? null,
        closeRateWon: r.closeRateWon ?? 0,
        avgTicket: r.avgTicket ?? null,
        avgQuote: r.avgQuote ?? null,
        avgOptions: r.avgOptions ?? null,
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
      // Snapshots from before the quiet list carried who and where lack them.
      quotesQuiet: (prev?.quotesQuiet ?? []).map((r) => ({ ...r, jobNumber: r.jobNumber ?? null, customer: r.customer ?? null, suburb: r.suburb ?? null })),
      quotesQuietCount: prev?.quotesQuietCount ?? 0,
      quotesQuietValue: prev?.quotesQuietValue ?? 0,
      // Deliberately not carried forward: a stale feed would re-fire the rocket
      // for a sale the room already celebrated.
      recentSales: [],
    };
  }

  const xero = await fetchXeroReceivables();
  sources.xero = xeroSourceState(xero.ok, previous?.sources?.xero?.at, now, xero.ok ? "" : xero.reason);

  // A settings read that fails must not blank every target on the wall, so it
  // degrades to "nothing configured" and the default calendar, which the board
  // already renders as an admitted gap rather than as a zero.
  const { targets, calendar, goal } = await boardConfig(now).catch(() => ({
    targets: { revenue: null, sales: null, profit: null, bookings: null, quoted: null, winRate: null, tiers: [] } as Targets,
    calendar: DEFAULT_WORKING_CALENDAR,
    goal: null as YearGoalShape | null,
  }));

  /**
   * The year, summed the same way the month is.
   *
   * One extra read, and only when a goal exists — with no goal there is nothing
   * to pace against and the strip on the wall says so instead of showing a
   * running total nobody set a target for.
   */
  const yFrom = yearStart(goal);
  let revenueInvoicedYtd: number | null = null;
  let jobsPerWeek: number | null = null;
  if (yFrom) {
    const yearInvoices = await sbSelect<{ total: number | null }>(
      "st_invoices",
      [q.select("total"), q.gte("invoice_date", yFrom)].join("&"),
    ).catch(() => null);
    // A failed read keeps the last good figure rather than blanking the
    // strip — the same rule every other source on this board follows.
    revenueInvoicedYtd = yearInvoices
      ? yearInvoices.reduce((a, i) => a + Number(i.total ?? 0), 0)
      : previous?.metrics.revenueInvoicedYtd ?? null;

    const yearJobs = await sbCount("st_jobs", q.gte("completed_on", `${yFrom}T00:00:00.000Z`)).catch(() => null);
    const weeks = Math.max(1, (Date.parse(isoDateMelbourne(now)) - Date.parse(yFrom)) / (7 * 86_400_000));
    jobsPerWeek = yearJobs != null ? Math.round(yearJobs / weeks) : previous?.metrics.jobsPerWeek ?? null;
  }
  // The goal's own percentage. Profit over invoiced would read it ten per cent
  // low, because the invoiced target carries GST and the profit target doesn't.
  const marginGoal = targets.profit != null && goal?.profitPct ? goal.profitPct / 100 : null;
  const days = workingDaysInMonth(now, calendar);

  // The arithmetic lives in boardSettings.ts so the portal's editor can preview
  // these exact figures before anybody walks out to look at the wall.
  const perDay = (target: number | null, achieved: number | null) => pacePerDay(target, achieved, days);

  const revenue = perDay(targets.revenue, st.revenueInvoicedMtd);
  const sales = perDay(targets.sales, st.soldMtd);
  const profit = perDay(targets.profit, st.profitMtd);
  const bookings = perDay(targets.bookings, st.bookingsMonth);
  const quoted = perDay(targets.quoted, st.quotesCreatedMonthValue);

  const salesLeaderboard = st.rawLeaderboard.map((r) => ({
    ...r,
    ...commissionFor(r.sold, targets.tiers),
  }));

  // Telecom is a separate ServiceTitan scope. Until it is granted the table
  // stays empty and the team page says so rather than showing zeroes that look
  // like nobody picked up the phone.
  const callsByPerson = await callMetrics(now).catch(() => [] as Metrics["callsByPerson"]);
  const callsEverSynced = await sbCount("st_calls", "")
    .then((n) => n > 0)
    .catch(() => false);

  const { rawLeaderboard: _raw, ...stMetrics } = st;

  // The pace view and this month's job profit. Each degrades on its own to
  // the last snapshot's figures, the same as every other source on the wall.
  const paceSettings = paceSettingsOf(goal);
  // The year's running total starts from the goal's year, or this financial
  // year when no goal is saved yet — so the Pace page can show where the year
  // stands while somebody is still deciding what to aim at.
  const paceFrom = yFrom ?? yearSpans("financial", currentYear("financial", now))[0].from;
  const paceData = await computePaceData(now, calendar, paceFrom).catch(() => previous?.metrics.paceData ?? null);
  const pace = paceData ? buildPace(goal, paceSettings, paceData) : null;
  const jobProfitMonth = await crewFigures()
    .then((c) => jobProfits(isoDateMelbourne(startOfMonthMelbourne(now)), isoDateMelbourne(now), c.costPerHr, goal?.profitPct ?? null))
    .then((r) => r.summary)
    .catch(() => previous?.metrics.jobProfitMonth ?? null);

  return {
    metrics: {
      ...leads,
      ...stMetrics,
      salesLeaderboard,
      callsByPerson,
      callsEverSynced,
      profitTargetMonthly: targets.profit,
      profitPacePct: profit.pacePct,
      bookingsTargetMonthly: targets.bookings,
      bookingsPacePct: bookings.pacePct,
      revenueTargetMonthly: targets.revenue,
      revenuePacePct: revenue.pacePct,
      revenueInvoicedYtd,
      revenueTargetYear: goal && goal.revenue > 0 ? goal.revenue : null,
      revenueYearByNow: yearByNow(goal, isoDateMelbourne(now)),
      jobsPerWeek,
      marginGoal,
      dailyTarget: revenue.daily,
      aheadBehind: revenue.aheadBehind,
      salesTargetMonthly: targets.sales,
      salesPacePct: sales.pacePct,
      dailySalesTarget: sales.daily,
      dailyBookingsTarget: bookings.daily,
      dailyQuotedTarget: quoted.daily,
      quotedTargetMonthly: targets.quoted,
      quotedPacePct: quoted.pacePct,
      winRateTarget: targets.winRate,
      commissionTiers: targets.tiers,
      salesAheadBehind: sales.aheadBehind,
      workingDaysLeft: days.remaining,
      workingDaysTotal: days.total,
      overdueTotal: xero.ok ? xero.overdueTotal : prev?.overdueTotal ?? null,
      overdueCount: xero.ok ? xero.overdueCount : prev?.overdueCount ?? null,
      receivablesTotal: xero.ok ? xero.receivablesTotal : prev?.receivablesTotal ?? null,
      pace,
      paceData,
      paceSettings,
      jobProfitMonth,
    },
    sources,
  };
}
