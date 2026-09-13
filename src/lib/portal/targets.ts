/**
 * What has to happen each day and each week to hit a year's revenue.
 *
 * The chain runs backwards from the target: money in the door, then the work
 * that earns it, then the quoting that wins the work. Each step is a division
 * and none of it is clever, but having the three of them in one place is the
 * difference between a number on a wall and something a Monday can be run off.
 *
 * Nothing here reads the database. It takes the target, the crew's capacity
 * and the quoting history, and returns figures — so it can be checked against
 * real numbers without a browser or a login.
 */

/**
 * One kind of work, with what it is worth and how much of the year's money it
 * is expected to bring in. A multi-head and a heater service are both "a job"
 * and there is a factor of ten between them, so a single average ticket
 * answers the question badly for a business that sells both.
 *
 * `share` is a percentage of revenue, not of the job count: it is the number
 * you can actually estimate from last year's invoices.
 */
export type JobType = { id: string; name: string; value: number; share: number };

export type Targets = {
  /** Revenue to invoice over the year. */
  revenue: number;
  /** The share of quoted dollars that turn into jobs, 0-100. */
  winRate: number;
  /** What a job is worth on average, for turning dollars into a job count. */
  avgJob: number;
  /** Days a week the crew is on the tools. */
  daysWeek: number;
  /** The mix, when it has been filled in. Empty means use the average ticket. */
  jobTypes?: JobType[];
};

/**
 * The kinds of work, named but not priced. The names come from what the
 * business sells; the values do not, because a made-up average job would be
 * indistinguishable on screen from a real one and would quietly drive every
 * figure on the page. They start at zero and the mix is ignored until they
 * have been filled in off real invoices.
 */
export const DEFAULT_JOB_TYPES: JobType[] = [
  { id: "split", name: "Split system, single head", value: 0, share: 0 },
  { id: "multi", name: "Multi-head", value: 0, share: 0 },
  { id: "ducted", name: "Ducted split", value: 0, share: 0 },
  { id: "heatpump", name: "Heat pump hot water", value: 0, share: 0 },
  { id: "gasducted", name: "Gas ducted heater", value: 0, share: 0 },
  { id: "evap", name: "Evaporative cooler", value: 0, share: 0 },
  { id: "service", name: "Service and repair, per ticket", value: 0, share: 0 },
];

export const DEFAULT_TARGETS: Targets = { revenue: 1_500_000, winRate: 40, avgJob: 2_600, daysWeek: 5 };

export type Capacity = {
  /** Hours the crew can bill across the year. */
  billHrs: number;
  /** What an hour goes out at, blended across the whole crew. */
  chargePerHr: number;
  /** Weeks the year is costed over. */
  weeksYear: number;
  /** Vans on the road. Everything else here is the whole business; this is
   *  what lets the same week be read one van at a time. */
  vans: number;
};

export type Pace = {
  /** Money to invoice. */
  revenue: number;
  /** The same money as hours on the tools, at the charge-out rate. */
  hours: number | null;
  /** And as a number of jobs, at the average job. */
  jobs: number | null;
  /** What has to go out as quotes to win that much, at the win rate. */
  quoted: number | null;
  /** And as a number of quotes. */
  quotes: number | null;
};

export type TargetPlan = {
  year: Pace;
  week: Pace;
  day: Pace;
  /** Hours the crew has in a week, against the hours the target needs. */
  hoursAvailableWeek: number | null;
  /** Above 1 the target needs more hours than the crew has. */
  load: number | null;
  /** What the crew could invoice at full utilisation, for a sanity check. */
  ceiling: number | null;
  /** Vans on the road, so the week can be read per van as well as in total. */
  vans: number | null;
};

function pace(revenue: number, t: Targets, c: Capacity | null): Pace {
  const wr = t.winRate / 100;
  return {
    revenue,
    hours: c && c.chargePerHr > 0 ? revenue / c.chargePerHr : null,
    jobs: t.avgJob > 0 ? revenue / t.avgJob : null,
    quoted: wr > 0 ? revenue / wr : null,
    quotes: wr > 0 && t.avgJob > 0 ? revenue / wr / t.avgJob : null,
  };
}

export type TypeLine = {
  id: string; name: string; value: number; share: number;
  /** Revenue this kind of work has to bring in. */
  revenueYear: number; revenueWeek: number;
  jobsYear: number | null; jobsWeek: number | null; jobsDay: number | null;
  quotedWeek: number | null; quotesWeek: number | null;
};

/**
 * The mix, priced out. Returns null when it has not been filled in, so the
 * page can fall back to the single average ticket rather than showing a table
 * of zeroes as though they meant something.
 */
export function planTypes(t: Targets, weeksYear: number): { lines: TypeLine[]; shareTotal: number } | null {
  const types = (t.jobTypes ?? []).filter((j) => j.share > 0 && j.value > 0);
  if (!types.length) return null;
  const weeks = Math.max(1, weeksYear);
  const days = Math.max(1, t.daysWeek);
  const wr = t.winRate / 100;
  const shareTotal = (t.jobTypes ?? []).reduce((a, j) => a + (j.share || 0), 0);
  const lines = types.map((j) => {
    const revenueYear = t.revenue * (j.share / 100);
    const revenueWeek = revenueYear / weeks;
    const jobsYear = j.value > 0 ? revenueYear / j.value : null;
    const jobsWeek = jobsYear != null ? jobsYear / weeks : null;
    return {
      id: j.id, name: j.name, value: j.value, share: j.share,
      revenueYear, revenueWeek,
      jobsYear, jobsWeek, jobsDay: jobsWeek != null ? jobsWeek / days : null,
      quotedWeek: wr > 0 ? revenueWeek / wr : null,
      quotesWeek: wr > 0 && jobsWeek != null ? jobsWeek / wr : null,
    };
  });
  return { lines, shareTotal };
}

export function planTargets(t: Targets, c: Capacity | null): TargetPlan {
  const weeks = Math.max(1, c?.weeksYear ?? 52);
  const days = Math.max(1, t.daysWeek);
  const week = t.revenue / weeks;
  const day = week / days;

  const hoursAvailableWeek = c && c.billHrs > 0 ? c.billHrs / weeks : null;
  const weekPace = pace(week, t, c);
  const load =
    hoursAvailableWeek && weekPace.hours != null && hoursAvailableWeek > 0
      ? weekPace.hours / hoursAvailableWeek
      : null;

  return {
    year: pace(t.revenue, t, c),
    week: weekPace,
    day: pace(day, t, c),
    hoursAvailableWeek,
    load,
    ceiling: c && c.billHrs > 0 && c.chargePerHr > 0 ? c.billHrs * c.chargePerHr : null,
    vans: c && c.vans > 0 ? c.vans : null,
  };
}
