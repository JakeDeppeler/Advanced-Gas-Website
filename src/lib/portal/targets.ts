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

export type Targets = {
  /** Revenue to invoice over the year. */
  revenue: number;
  /** The share of quoted dollars that turn into jobs, 0-100. */
  winRate: number;
  /** What a job is worth on average, for turning dollars into a job count. */
  avgJob: number;
  /** Days a week the crew is on the tools. */
  daysWeek: number;
};

export const DEFAULT_TARGETS: Targets = { revenue: 1_500_000, winRate: 40, avgJob: 2_600, daysWeek: 5 };

export type Capacity = {
  /** Hours the crew can bill across the year. */
  billHrs: number;
  /** What an hour goes out at. */
  chargePerHr: number;
  /** Weeks the year is costed over. */
  weeksYear: number;
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
  };
}
